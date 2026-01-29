/**
 * Comprehensive Real-World Session Test
 *
 * Tests the ENTIRE session lifecycle EXACTLY as a real user would experience it:
 * API calls + Socket connections TOGETHER, cleaning BOTH Redis AND MongoDB.
 *
 * Test Suites:
 *   A: Full User Lifecycle  (login -> socket -> API call -> logout -> verify cleanup)
 *   B: Session Limits       (Free=2, Silver=3, Gold=4, Platinum=5)
 *   C: Socket Revocation    (revoke session -> socket receives event + disconnects)
 *   D: Token Refresh Flow   (login -> refresh -> verify new tokens + old invalidated)
 *
 * Prerequisites:
 *   - Server running (npm run dev) on PORT (default 5005)
 *   - Redis running on localhost:6379
 *   - MongoDB accessible via MONGO_URI in .env
 *
 * Run: npm run test:realworld
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env" });

import Redis from "ioredis";
import mongoose from "mongoose";
import { io as ioClient, Socket as ClientSocket } from "socket.io-client";

// Import models so mongoose knows about them
import { SessionModel } from "./models/sessionModel";
import { UserModel } from "./models/userModel";
import { SubscriptionModel } from "./models/subscriptionModel";

// ────────── CONFIG ──────────

const SERVER_URL = process.env.SERVER_URL || "http://localhost:5005";
const REDIS_HOST = process.env.REDIS_HOST || "localhost";
const REDIS_PORT = parseInt(process.env.REDIS_PORT || "6379");
const MONGO_URI = process.env.MONGO_URI!;

const TEST_PHONE = "+919876543210";

const SESSION_LIMITS: Record<string, number> = {
  free: 2,
  silver: 3,
  gold: 4,
  platinum: 5,
};

// Mobile headers — server returns tokens in x-access-token / x-refresh-token headers
const MOBILE_HEADERS: Record<string, string> = {
  "Content-Type": "application/json",
  "x-platform": "mobile",
};

// ────────── TYPES ──────────

interface SessionInfo {
  accessToken: string;
  refreshToken: string;
  userId: string;
}

interface TestResult {
  suite: string;
  name: string;
  passed: boolean;
  error?: string;
}

// ────────── TESTER CLASS ──────────

class RealWorldSessionTester {
  private redis!: Redis;
  private userId: string | null = null;
  private testSubscriptionIds: string[] = [];
  private activeSockets: ClientSocket[] = [];
  private results: TestResult[] = [];

  // ═══════════ SETUP & CLEANUP ═══════════

  async connect(): Promise<void> {
    this.redis = new Redis({ host: REDIS_HOST, port: REDIS_PORT, connectTimeout: 10000 });
    await new Promise<void>((resolve, reject) => {
      this.redis.once("ready", () => { console.log("  Connected to Redis"); resolve(); });
      this.redis.once("error", reject);
    });

    if (!MONGO_URI) {
      throw new Error("MONGO_URI is not set in .env");
    }
    await mongoose.connect(MONGO_URI);
    console.log("  Connected to MongoDB");
  }

  /**
   * Wipe every piece of test state from BOTH Redis and MongoDB
   * so each suite starts completely fresh.
   */
  async fullCleanup(): Promise<void> {
    // Disconnect any lingering sockets first
    this.disconnectAllSockets();

    if (this.userId) {
      // ── Redis ──
      const activeSetKey = `session:active:${this.userId}`;
      const sessionIds = await this.redis.smembers(activeSetKey);
      for (const sid of sessionIds) {
        await this.redis.del(`session:meta:${this.userId}:${sid}`);
        await this.redis.del(`session:activity:${this.userId}:${sid}`);
      }
      await this.redis.del(activeSetKey);

      // Also clear distributed lock keys
      await this.redis.del(`lock:session:create:${this.userId}`);

      // ── MongoDB sessions ──
      const deletedSessions = await SessionModel.deleteMany({ userId: this.userId });
      if (deletedSessions.deletedCount > 0) {
        console.log(`    Cleaned ${deletedSessions.deletedCount} MongoDB sessions`);
      }

      // ── Test subscriptions ──
      if (this.testSubscriptionIds.length > 0) {
        await SubscriptionModel.deleteMany({ _id: { $in: this.testSubscriptionIds } });
        this.testSubscriptionIds = [];
      }

      // Reset user's subscription link
      await UserModel.updateOne(
        { _id: this.userId },
        { $unset: { currentSubscriptionId: "" }, isSubscribed: false }
      );
    }

    // OTP data
    await this.redis.del(`otp_data:otp:${TEST_PHONE}`);
    await this.redis.del(`otp_requests:otp_count:${TEST_PHONE}`);
  }

  private disconnectAllSockets(): void {
    for (const s of this.activeSockets) {
      if (s.connected) s.disconnect();
    }
    this.activeSockets = [];
  }

  async disconnect(): Promise<void> {
    this.disconnectAllSockets();
    await this.redis.quit();
    await mongoose.disconnect();
    console.log("  Disconnected");
  }

  // ═══════════ HTTP HELPERS ═══════════

  private async api(
    endpoint: string,
    method = "GET",
    body?: any,
    token?: string,
    extraHeaders?: Record<string, string>
  ): Promise<{ status: number; data: any; headers: Headers }> {
    const headers: Record<string, string> = { ...MOBILE_HEADERS, ...extraHeaders };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    try {
      const res = await fetch(`${SERVER_URL}${endpoint}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });

      let data: any;
      try { data = await res.json(); } catch { data = {}; }

      // Some endpoints wrap the response in {body: "stringified JSON"}
      if (data.body && typeof data.body === "string") {
        try { data = JSON.parse(data.body); } catch { /* keep */ }
      }

      return { status: res.status, data, headers: res.headers };
    } catch (err: any) {
      return { status: 500, data: { success: false, message: err.message }, headers: new Headers() };
    }
  }

  private async getOtpFromRedis(): Promise<{ otp: string; referenceId: string } | null> {
    const raw = await this.redis.get(`otp_data:otp:${TEST_PHONE}`);
    if (!raw) return null;
    const d = JSON.parse(raw);
    return { otp: d.otp, referenceId: d.reference_id };
  }

  // ═══════════ LOGIN FLOW (exactly like a real client) ═══════════

  /**
   * Full OTP login flow: generate_otp → read OTP from Redis → verify_otp
   * Returns tokens on success, or session-limit info on 403.
   */
  private async login(): Promise<{
    ok: boolean;
    accessToken?: string;
    refreshToken?: string;
    userId?: string;
    limitReached?: boolean;
    partialToken?: string;
    activeSessions?: any[];
    maxAllowed?: number;
  }> {
    // 1. Generate OTP
    const { status: gs } = await this.api("/api/v1/auth/generate_otp", "POST", {
      mobNum: TEST_PHONE,
      isTesting: true,
    });
    if (gs !== 200) return { ok: false };

    // 2. Read OTP from Redis (simulates user reading SMS)
    const otpData = await this.getOtpFromRedis();
    if (!otpData) return { ok: false };

    // 3. Verify OTP → server returns tokens
    const { status, data, headers } = await this.api("/api/v1/auth/verify_otp", "POST", {
      mobNum: TEST_PHONE,
      otp: otpData.otp,
      referenceId: otpData.referenceId,
    });

    if (status === 200 && data.success) {
      const accessToken = headers.get("x-access-token") || data.data?.token;
      const refreshToken = headers.get("x-refresh-token") || "";
      const userId = (data.data?.userId || "").toString();
      if (!this.userId) this.userId = userId;
      return { ok: true, accessToken, refreshToken, userId };
    }

    if (status === 403 && data.error === "SESSION_LIMIT_REACHED") {
      return {
        ok: false,
        limitReached: true,
        partialToken: data.data?.partialToken,
        activeSessions: data.data?.activeSessions,
        maxAllowed: data.data?.maxAllowed,
      };
    }

    return { ok: false };
  }

  // ═══════════ SOCKET HELPER (real websocket + authenticate event) ═══════════

  private connectSocket(accessToken: string): Promise<ClientSocket> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error("Socket auth timeout 15 s"));
      }, 15000);

      const socket = ioClient(SERVER_URL, {
        transports: ["websocket", "polling"],
        autoConnect: true,
        forceNew: true,
      });
      this.activeSockets.push(socket);

      socket.on("connect", () => {
        socket.emit("authenticate", { accessToken }, (resp: any) => {
          clearTimeout(timer);
          if (resp?.status === "authenticated" || resp?.status === "refreshed") {
            resolve(socket);
          } else {
            reject(new Error(`Socket auth: ${JSON.stringify(resp)}`));
          }
        });
      });

      socket.on("connect_error", (e) => {
        clearTimeout(timer);
        reject(e);
      });
    });
  }

  // ═══════════ SUBSCRIPTION HELPER ═══════════

  private async setSubscription(type: string): Promise<void> {
    if (!this.userId) throw new Error("setSubscription: no userId yet");

    // Capitalize for model enum (Free | Silver | Gold | Platinum)
    const cap = type.charAt(0).toUpperCase() + type.slice(1);

    const sub = await SubscriptionModel.create({
      userId: this.userId,
      type: cap,
      status: "Active",
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 86400000),
      durationInDays: 30,
      amount: 0,
      paymentStatus: "Completed",
      historyId: new mongoose.Types.ObjectId(), // placeholder — ref not validated at runtime
    });

    this.testSubscriptionIds.push(sub._id.toString());

    await UserModel.updateOne(
      { _id: this.userId },
      { currentSubscriptionId: sub._id, isSubscribed: true }
    );
  }

  // ═══════════ REDIS / MONGO VERIFICATION HELPERS ═══════════

  private async redisSessionCount(): Promise<number> {
    if (!this.userId) return 0;
    return this.redis.scard(`session:active:${this.userId}`);
  }

  private async redisSessionIds(): Promise<string[]> {
    if (!this.userId) return [];
    return this.redis.smembers(`session:active:${this.userId}`);
  }

  private async isSessionInRedis(sessionId: string): Promise<boolean> {
    if (!this.userId) return false;
    return (await this.redis.sismember(`session:active:${this.userId}`, sessionId)) === 1;
  }

  private async mongoActiveSessionCount(): Promise<number> {
    if (!this.userId) return 0;
    return SessionModel.countDocuments({
      userId: this.userId,
      isActive: true,
      revokedAt: { $exists: false },
    });
  }

  private pass(suite: string, name: string) {
    this.results.push({ suite, name, passed: true });
  }
  private fail(suite: string, name: string, error?: string) {
    this.results.push({ suite, name, passed: false, error });
  }

  // ╔═══════════════════════════════════════════════════════════════╗
  // ║                SUITE A — FULL USER LIFECYCLE                 ║
  // ╚═══════════════════════════════════════════════════════════════╝

  async suiteA(): Promise<void> {
    console.log("\n" + "=".repeat(60));
    console.log("  SUITE A: FULL USER LIFECYCLE");
    console.log("  login -> socket -> API call -> logout -> verify cleanup");
    console.log("=".repeat(60));

    await this.fullCleanup();
    await sleep(300);

    // A1: Login
    console.log("\n  A1: Login (OTP flow)...");
    const sess = await this.login();
    if (!sess.ok || !sess.accessToken) {
      this.fail("A", "A1: Login with OTP", "Login failed");
      return;
    }
    console.log(`    userId: ${sess.userId}`);
    console.log(`    access:  ${sess.accessToken.substring(0, 40)}...`);
    console.log(`    refresh: ${sess.refreshToken!.substring(0, 40)}...`);
    this.pass("A", "A1: Login with OTP");

    const sessionIdsBefore = await this.redisSessionIds();
    const currentSid = sessionIdsBefore[sessionIdsBefore.length - 1];

    // A2: Connect socket
    console.log("\n  A2: Socket connect + authenticate...");
    let socket: ClientSocket;
    try {
      socket = await this.connectSocket(sess.accessToken);
      console.log(`    Socket ID: ${socket.id}`);
      this.pass("A", "A2: Socket connect + auth");
    } catch (e: any) {
      this.fail("A", "A2: Socket connect + auth", e.message);
      return;
    }

    // A3: Authenticated API call
    console.log("\n  A3: API call GET /sessions...");
    const { status: s3, data: d3 } = await this.api("/api/v1/sessions", "GET", undefined, sess.accessToken);
    if (s3 === 200 && d3.success) {
      console.log(`    Sessions count: ${d3.data?.count ?? d3.data?.sessions?.length}`);
      this.pass("A", "A3: Authenticated API call");
    } else {
      this.fail("A", "A3: Authenticated API call", `status ${s3}`);
    }

    // A4: Logout
    console.log("\n  A4: Logout...");
    const socketDisc = waitForEvent(socket, "disconnect", 10000);
    const { status: s4 } = await this.api("/api/v1/users/logout", "POST", undefined, sess.accessToken);
    console.log(`    Logout API: ${s4}`);

    const discReason = await socketDisc;
    console.log(`    Socket disconnect reason: ${discReason}`);

    await sleep(1000);

    const redisAfter = await this.redisSessionCount();
    const stillInRedis = currentSid ? await this.isSessionInRedis(currentSid) : false;
    const mongoActive = await this.mongoActiveSessionCount();

    console.log(`    Redis sessions after: ${redisAfter}`);
    console.log(`    Session still in Redis: ${stillInRedis}`);
    console.log(`    MongoDB active sessions: ${mongoActive}`);
    console.log(`    Socket connected: ${socket.connected}`);

    const ok = s4 === 200 && !stillInRedis && !socket.connected;
    ok
      ? this.pass("A", "A4: Logout + cleanup verification")
      : this.fail("A", "A4: Logout + cleanup verification", `api=${s4} redis=${stillInRedis} sock=${socket.connected}`);
  }

  // ╔═══════════════════════════════════════════════════════════════╗
  // ║           SUITE B — SESSION LIMITS PER SUBSCRIPTION          ║
  // ╚═══════════════════════════════════════════════════════════════╝

  async suiteB(): Promise<void> {
    console.log("\n" + "=".repeat(60));
    console.log("  SUITE B: SESSION LIMITS PER SUBSCRIPTION TYPE");
    console.log("=".repeat(60));

    // Make sure user exists first
    if (!this.userId) {
      const s = await this.login();
      if (s.ok) {
        await this.api("/api/v1/users/logout", "POST", undefined, s.accessToken);
        await sleep(300);
      }
    }

    for (const { type, limit, label } of [
      { type: "free", limit: 2, label: "Free" },
      { type: "silver", limit: 3, label: "Silver" },
      { type: "gold", limit: 4, label: "Gold" },
      { type: "platinum", limit: 5, label: "Platinum" },
    ]) {
      await this.testLimitForType(type, limit, label);
    }
  }

  private async testLimitForType(type: string, limit: number, label: string): Promise<void> {
    console.log(`\n  --- ${label} (max ${limit} sessions) ---`);

    // Clean slate
    await this.fullCleanup();
    await sleep(300);

    // Set subscription (skip for free)
    if (type !== "free") await this.setSubscription(type);

    // B1: Create sessions up to the limit
    console.log(`    B1: Creating ${limit} sessions...`);
    const tokens: SessionInfo[] = [];
    let allOk = true;

    for (let i = 0; i < limit; i++) {
      const r = await this.login();
      if (r.ok && r.accessToken) {
        tokens.push({ accessToken: r.accessToken, refreshToken: r.refreshToken || "", userId: r.userId || "" });
        console.log(`      ${i + 1}/${limit} created`);
      } else {
        console.log(`      ${i + 1}/${limit} FAILED`);
        allOk = false;
        break;
      }
      await sleep(300);
    }

    const count1 = await this.redisSessionCount();
    console.log(`    Redis count: ${count1} (expected ${limit})`);
    allOk && count1 === limit
      ? this.pass("B", `B1: Create ${limit} sessions (${label})`)
      : this.fail("B", `B1: Create ${limit} sessions (${label})`, `created=${tokens.length} redis=${count1}`);

    if (!allOk) return;

    // B2: One more should hit the limit
    console.log(`    B2: Session ${limit + 1} (expect SESSION_LIMIT_REACHED)...`);
    const lr = await this.login();

    if (!lr.limitReached) {
      this.fail("B", `B2: Limit reached (${label})`, lr.ok ? "Session was created beyond limit!" : "unexpected error");
      return;
    }

    console.log(`      SESSION_LIMIT_REACHED  max=${lr.maxAllowed}  partial=${lr.partialToken ? "yes" : "no"}`);
    lr.partialToken && lr.maxAllowed === limit
      ? this.pass("B", `B2: Limit reached (${label})`)
      : this.fail("B", `B2: Limit reached (${label})`, `max=${lr.maxAllowed} partial=${!!lr.partialToken}`);

    if (!lr.partialToken) return;

    // B3: Revoke one session using the partial token
    console.log(`    B3: Revoke a session via partial token...`);
    const { status: gs, data: gd } = await this.api("/api/v1/sessions", "GET", undefined, lr.partialToken);

    if (gs !== 200) {
      this.fail("B", `B3: Revoke via partial token (${label})`, `GET sessions status=${gs}`);
      return;
    }

    const mongoSess = gd.data?.sessions || [];
    console.log(`      MongoDB sessions found: ${mongoSess.length}`);

    if (mongoSess.length === 0) {
      this.fail("B", `B3: Revoke via partial token (${label})`, "no sessions to revoke");
      return;
    }

    const revokeId = mongoSess[0].id || mongoSess[0]._id;
    const { status: rs } = await this.api(`/api/v1/sessions/${revokeId}`, "DELETE", undefined, lr.partialToken);

    if (rs !== 200) {
      this.fail("B", `B3: Revoke via partial token (${label})`, `DELETE status=${rs}`);
      return;
    }

    await sleep(500);
    const count2 = await this.redisSessionCount();
    console.log(`      Redis count after revoke: ${count2} (expected ${limit - 1})`);
    count2 === limit - 1
      ? this.pass("B", `B3: Revoke via partial token (${label})`)
      : this.fail("B", `B3: Revoke via partial token (${label})`, `redis=${count2}`);

    // B4: Login again should succeed
    console.log(`    B4: Re-login after revoke...`);
    const re = await this.login();
    if (re.ok) {
      const count3 = await this.redisSessionCount();
      console.log(`      Re-login OK. Redis count: ${count3} (expected ${limit})`);
      count3 === limit
        ? this.pass("B", `B4: Re-login (${label})`)
        : this.fail("B", `B4: Re-login (${label})`, `redis=${count3}`);
    } else {
      this.fail("B", `B4: Re-login (${label})`, "login failed");
    }
  }

  // ╔═══════════════════════════════════════════════════════════════╗
  // ║        SUITE C — SOCKET DISCONNECT ON SESSION REVOKE         ║
  // ╚═══════════════════════════════════════════════════════════════╝

  async suiteC(): Promise<void> {
    console.log("\n" + "=".repeat(60));
    console.log("  SUITE C: SOCKET DISCONNECT ON SESSION REVOCATION");
    console.log("=".repeat(60));

    await this.fullCleanup();
    await sleep(300);

    // C1: Session 1 + socket 1
    console.log("\n  C1: Login session 1 + socket...");
    const s1 = await this.login();
    if (!s1.ok) { this.fail("C", "C1: Session 1 login"); return; }

    let sock1: ClientSocket;
    try {
      sock1 = await this.connectSocket(s1.accessToken!);
      console.log(`    Session 1 socket: ${sock1.id}`);
      this.pass("C", "C1: Session 1 + socket");
    } catch (e: any) {
      this.fail("C", "C1: Session 1 + socket", e.message);
      return;
    }

    await sleep(500);

    // C2: Session 2 + socket 2
    console.log("\n  C2: Login session 2 + socket...");
    const s2 = await this.login();
    if (!s2.ok) { this.fail("C", "C2: Session 2 login"); return; }

    let sock2: ClientSocket;
    try {
      sock2 = await this.connectSocket(s2.accessToken!);
      console.log(`    Session 2 socket: ${sock2.id}`);
      this.pass("C", "C2: Session 2 + socket");
    } catch (e: any) {
      this.fail("C", "C2: Session 2 + socket", e.message);
      return;
    }

    // Find session 1 in MongoDB
    const { data: sessData } = await this.api("/api/v1/sessions", "GET", undefined, s2.accessToken);
    const allSess = sessData.data?.sessions || [];
    console.log(`    MongoDB sessions: ${allSess.length}`);

    if (allSess.length < 2) {
      this.fail("C", "C3: Revoke session 1", `only ${allSess.length} sessions found`);
      return;
    }

    // The oldest session is session 1 (sorted lastActiveAt desc → last entry)
    const session1Id = allSess[allSess.length - 1].id || allSess[allSess.length - 1]._id;

    // C3: Revoke session 1 from session 2
    console.log(`\n  C3: Revoking session 1 (${session1Id}) from session 2...`);

    // Listen for events on socket 1 BEFORE revoking
    const revokeEventP = waitForEvent(sock1, "session_revoked", 10000);
    const disc1P = waitForEvent(sock1, "disconnect", 10000);

    const { status: revSt } = await this.api(`/api/v1/sessions/${session1Id}`, "DELETE", undefined, s2.accessToken);
    console.log(`    Revoke API: ${revSt}`);

    const revokeEvt = await revokeEventP;
    const disc1 = await disc1P;

    console.log(`    Socket 1 "session_revoked" event: ${revokeEvt !== "timeout" ? "received" : "NOT received"}`);
    console.log(`    Socket 1 disconnected: ${disc1 !== "timeout"}`);
    console.log(`    Socket 2 still connected: ${sock2.connected}`);

    await sleep(500);
    const redisAfter = await this.redisSessionCount();
    console.log(`    Redis sessions: ${redisAfter} (expected 1)`);

    const ok = revSt === 200 && disc1 !== "timeout" && sock2.connected && redisAfter === 1;
    ok
      ? this.pass("C", "C3: Revoke session 1 -> socket 1 disconnects")
      : this.fail("C", "C3: Revoke session 1 -> socket 1 disconnects",
          `api=${revSt} disc=${disc1 !== "timeout"} s2=${sock2.connected} redis=${redisAfter}`);

    // C4: Session 2 still works
    console.log("\n  C4: Session 2 still functional...");
    const { status: s2api } = await this.api("/api/v1/sessions", "GET", undefined, s2.accessToken);
    s2api === 200
      ? this.pass("C", "C4: Session 2 still works")
      : this.fail("C", "C4: Session 2 still works", `status=${s2api}`);
  }

  // ╔═══════════════════════════════════════════════════════════════╗
  // ║              SUITE D — TOKEN REFRESH FLOW                    ║
  // ╚═══════════════════════════════════════════════════════════════╝

  async suiteD(): Promise<void> {
    console.log("\n" + "=".repeat(60));
    console.log("  SUITE D: TOKEN REFRESH FLOW");
    console.log("=".repeat(60));

    await this.fullCleanup();
    await sleep(300);

    // D1: Login
    console.log("\n  D1: Initial login...");
    const sess = await this.login();
    if (!sess.ok || !sess.accessToken || !sess.refreshToken) {
      this.fail("D", "D1: Initial login");
      return;
    }
    this.pass("D", "D1: Initial login");

    // D2: Access token works
    console.log("\n  D2: Access token works...");
    const { status: s2 } = await this.api("/api/v1/sessions", "GET", undefined, sess.accessToken);
    s2 === 200 ? this.pass("D", "D2: Access token works") : this.fail("D", "D2: Access token works", `${s2}`);

    // D3: Refresh endpoint
    console.log("\n  D3: Refresh token...");
    const { status: rs, data: rd, headers: rh } = await this.api(
      "/api/v1/auth/refresh_token",
      "POST",
      undefined,
      sess.refreshToken // passed as Bearer for mobile flow
    );

    if (rs !== 200) {
      this.fail("D", "D3: Token refresh", `status=${rs} ${JSON.stringify(rd)}`);
      return;
    }

    const newAccess = rh.get("x-access-token") || rd.data?.token;
    const newRefresh = rh.get("x-refresh-token") || "";

    console.log(`    New access:  ${newAccess?.substring(0, 40)}...`);
    console.log(`    New refresh: ${newRefresh ? newRefresh.substring(0, 40) + "..." : "N/A (check headers)"}`);
    this.pass("D", "D3: Token refresh");

    // D4: New access token works
    console.log("\n  D4: New access token works...");
    const { status: s4 } = await this.api("/api/v1/sessions", "GET", undefined, newAccess);
    s4 === 200 ? this.pass("D", "D4: New access token works") : this.fail("D", "D4: New access token works", `${s4}`);

    // D5: Old refresh token should be invalid (user.refreshToken was updated)
    console.log("\n  D5: Old refresh token invalidated...");
    const { status: s5 } = await this.api("/api/v1/auth/refresh_token", "POST", undefined, sess.refreshToken);
    const oldBad = s5 !== 200;
    console.log(`    Old refresh returned ${s5} -> ${oldBad ? "correctly rejected" : "STILL WORKS (unexpected)"}`);
    oldBad
      ? this.pass("D", "D5: Old refresh token invalidated")
      : this.fail("D", "D5: Old refresh token invalidated", `status=${s5}`);

    // D6: Socket with new token
    console.log("\n  D6: Socket with refreshed access token...");
    try {
      const sock = await this.connectSocket(newAccess);
      console.log(`    Socket ${sock.id} connected`);
      this.pass("D", "D6: Socket with new token");
    } catch (e: any) {
      this.fail("D", "D6: Socket with new token", e.message);
    }
  }

  // ═══════════ SUMMARY ═══════════

  printSummary(): boolean {
    console.log("\n" + "=".repeat(60));
    console.log("  COMPREHENSIVE TEST SUMMARY");
    console.log("=".repeat(60));

    const suites: Record<string, TestResult[]> = {};
    for (const r of this.results) {
      (suites[r.suite] ??= []).push(r);
    }

    let passed = 0, failed = 0;

    for (const [suite, tests] of Object.entries(suites)) {
      console.log(`\n  Suite ${suite}:`);
      for (const t of tests) {
        const icon = t.passed ? "PASS" : "FAIL";
        console.log(`    ${icon}: ${t.name}${t.error ? ` (${t.error})` : ""}`);
        t.passed ? passed++ : failed++;
      }
    }

    console.log("\n" + "-".repeat(60));
    console.log(`  Total: ${this.results.length} | Passed: ${passed} | Failed: ${failed}`);
    console.log("=".repeat(60));

    if (failed === 0) {
      console.log("\n  ALL TESTS PASSED — session management verified end-to-end.\n");
    } else {
      console.log(`\n  ${failed} test(s) failed. Review logs above.\n`);
    }

    return failed === 0;
  }
}

// ────────── UTILITIES ──────────

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function waitForEvent(socket: ClientSocket, event: string, timeoutMs: number): Promise<any> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve("timeout"), timeoutMs);
    socket.once(event, (...args: any[]) => {
      clearTimeout(timer);
      resolve(args[0] ?? true);
    });
  });
}

// ────────── MAIN ──────────

async function main() {
  console.log("\n  COMPREHENSIVE REAL-WORLD SESSION TEST");
  console.log("=".repeat(60));
  console.log(`  Server : ${SERVER_URL}`);
  console.log(`  Redis  : ${REDIS_HOST}:${REDIS_PORT}`);
  console.log(`  MongoDB: ${MONGO_URI ? MONGO_URI.replace(/\/\/[^:]+:[^@]+@/, "//***:***@") : "NOT SET"}`);
  console.log(`  Phone  : ${TEST_PHONE}`);
  console.log("=".repeat(60));

  const t = new RealWorldSessionTester();

  try {
    console.log("\n  Connecting...");
    await t.connect();

    // Health check
    const h = await fetch(`${SERVER_URL}/system/_status/health_check`).catch(() => null);
    if (!h || h.status !== 200) {
      console.log("\n  Server not healthy. Start it first: npm run dev");
      process.exit(1);
    }
    console.log("  Server healthy\n");

    await t.fullCleanup();

    await t.suiteA();
    await t.suiteB();
    await t.suiteC();
    await t.suiteD();

    await t.fullCleanup();
    t.printSummary();
  } catch (err) {
    console.error("\n  Test suite crashed:", err);
  } finally {
    await t.disconnect();
    process.exit(0);
  }
}

main().catch(console.error);
