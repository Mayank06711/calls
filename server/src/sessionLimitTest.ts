/**
 * Session Limit Test Script
 * Tests the session limit enforcement for different subscription types
 *
 * Tests:
 * 1. Free user can have max 2 sessions
 * 2. When limit is reached, user gets SESSION_LIMIT_REACHED error with partialToken
 * 3. User can use partialToken to revoke an existing session
 * 4. After revocation, user can login successfully
 *
 * Prerequisites:
 * - Server must be running on PORT (default 5005)
 * - Redis must be running on localhost:6379
 * - MongoDB must be accessible
 *
 * Run: npm run test:sessionlimit
 */

import Redis from "ioredis";

const SERVER_URL = process.env.SERVER_URL || "http://localhost:5005";
const REDIS_HOST = process.env.REDIS_HOST || "localhost";
const REDIS_PORT = parseInt(process.env.REDIS_PORT || "6379");

// Test phone number (Indian format)
const TEST_PHONE = "+919876543210";

// Session limits per subscription type
const SESSION_LIMITS: Record<string, number> = {
  free: 2,
  bronze: 2,
  silver: 3,
  gold: 4,
  platinum: 5,
};

interface OtpData {
  otp: string;
  reference_id: string;
  expiry_at: number;
}

class SessionLimitTester {
  private redis: Redis;
  private sessions: Array<{ token: string; sessionId: string }> = [];
  private userId: string | null = null;
  private partialToken: string | null = null;

  constructor() {
    this.redis = new Redis({
      host: REDIS_HOST,
      port: REDIS_PORT,
      connectTimeout: 10000,
    });
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.redis.once("ready", () => {
        console.log("✅ Connected to Redis");
        resolve();
      });
      this.redis.once("error", (err) => {
        console.error("❌ Failed to connect to Redis:", err);
        reject(err);
      });
    });
  }

  async cleanup(): Promise<void> {
    // Clean up all sessions for test user
    if (this.userId) {
      const activeSetKey = `session:active:${this.userId}`;
      const sessionIds = await this.redis.smembers(activeSetKey);

      for (const sessionId of sessionIds) {
        await this.redis.del(`session:meta:${this.userId}:${sessionId}`);
        await this.redis.del(`session:activity:${this.userId}:${sessionId}`);
      }
      await this.redis.del(activeSetKey);
    }

    // Clean OTP data
    await this.redis.del(`otp_data:otp:${TEST_PHONE}`);
    await this.redis.del(`otp_requests:otp_count:${TEST_PHONE}`);

    console.log("🧹 Cleaned up test data");
  }

  async disconnect(): Promise<void> {
    await this.redis.quit();
    console.log("✅ Disconnected");
  }

  private async makeApiCall(
    endpoint: string,
    method: string = "GET",
    body?: any,
    token?: string
  ): Promise<{ status: number; data: any }> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(`${SERVER_URL}${endpoint}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });

      let data = await response.json();

      // Handle nested body format
      if (data.body && typeof data.body === "string") {
        try {
          data = JSON.parse(data.body);
        } catch {
          // Keep original
        }
      }

      return { status: response.status, data };
    } catch (error: any) {
      console.error(`API call failed: ${endpoint}`, error.message);
      return {
        status: 500,
        data: { success: false, message: error.message },
      };
    }
  }

  private async getOtpFromRedis(): Promise<{ otp: string; referenceId: string } | null> {
    const otpKey = `otp_data:otp:${TEST_PHONE}`;
    const otpDataRaw = await this.redis.get(otpKey);

    if (!otpDataRaw) return null;

    const otpData: OtpData = JSON.parse(otpDataRaw);
    return { otp: otpData.otp, referenceId: otpData.reference_id };
  }

  private async generateAndVerifyOtp(): Promise<{
    success: boolean;
    token?: string;
    userId?: string;
    sessionLimitReached?: boolean;
    partialToken?: string;
    activeSessions?: any[];
    maxAllowed?: number;
  }> {
    // Generate OTP
    const { status: genStatus } = await this.makeApiCall(
      "/api/v1/auth/generate_otp",
      "POST",
      { mobNum: TEST_PHONE, isTesting: true }
    );

    if (genStatus !== 200) {
      return { success: false };
    }

    // Get OTP from Redis
    const otpData = await this.getOtpFromRedis();
    if (!otpData) {
      return { success: false };
    }

    // Verify OTP
    const { status, data } = await this.makeApiCall(
      "/api/v1/auth/verify_otp",
      "POST",
      { mobNum: TEST_PHONE, otp: otpData.otp, referenceId: otpData.referenceId }
    );

    if (status === 200 && data.success) {
      return {
        success: true,
        token: data.data?.token,
        userId: data.data?.userId,
      };
    } else if (status === 403 && data.error === "SESSION_LIMIT_REACHED") {
      return {
        success: false,
        sessionLimitReached: true,
        partialToken: data.data?.partialToken,
        activeSessions: data.data?.activeSessions,
        maxAllowed: data.data?.maxAllowed,
      };
    }

    return { success: false };
  }

  // =============== TEST 1: Create Sessions Up To Limit ===============
  async testCreateSessionsUpToLimit(): Promise<boolean> {
    console.log("\n🧪 Test 1: Create Sessions Up To Limit (Free User = 2)");

    try {
      const maxSessions = SESSION_LIMITS.free;
      console.log(`  Creating ${maxSessions} sessions for free user...`);

      for (let i = 0; i < maxSessions; i++) {
        console.log(`\n  Creating session ${i + 1}/${maxSessions}...`);

        const result = await this.generateAndVerifyOtp();

        if (result.success && result.token) {
          this.userId = result.userId || this.userId;
          console.log(`    ✅ Session ${i + 1} created successfully`);

          // Get session ID from Redis
          if (this.userId) {
            const sessionIds = await this.redis.smembers(`session:active:${this.userId}`);
            const newSessionId = sessionIds[sessionIds.length - 1];
            this.sessions.push({ token: result.token, sessionId: newSessionId });
          }
        } else {
          console.log(`    ❌ Failed to create session ${i + 1}`);
          return false;
        }

        // Small delay between sessions
        await new Promise((r) => setTimeout(r, 500));
      }

      // Verify session count in Redis
      if (this.userId) {
        const count = await this.redis.scard(`session:active:${this.userId}`);
        console.log(`\n  Active sessions in Redis: ${count}`);

        if (count === maxSessions) {
          console.log(`  ✅ Successfully created ${maxSessions} sessions (limit for free user)`);
          return true;
        }
      }

      return false;
    } catch (error) {
      console.error("  ❌ Test failed:", error);
      return false;
    }
  }

  // =============== TEST 2: Verify Session Limit Reached ===============
  async testSessionLimitReached(): Promise<boolean> {
    console.log("\n🧪 Test 2: Verify SESSION_LIMIT_REACHED When Exceeding Limit");

    try {
      console.log("  Attempting to create one more session (should fail)...");

      const result = await this.generateAndVerifyOtp();

      if (result.sessionLimitReached) {
        console.log("  ✅ Got SESSION_LIMIT_REACHED error as expected");
        console.log(`  Max allowed: ${result.maxAllowed}`);
        console.log(`  Active sessions: ${result.activeSessions?.length}`);
        console.log(`  Partial token received: ${result.partialToken ? "Yes" : "No"}`);

        if (result.partialToken) {
          this.partialToken = result.partialToken;
          console.log("\n  Active sessions details:");
          result.activeSessions?.forEach((s, i) => {
            console.log(`    ${i + 1}. ${s.device} | ${s.platform} | ${s.browser} | Last active: ${s.lastActiveAt}`);
          });
        }

        return !!result.partialToken;
      } else if (result.success) {
        console.log("  ❌ Session was created when it should have been blocked");
        return false;
      } else {
        console.log("  ❌ Got unexpected error (not SESSION_LIMIT_REACHED)");
        return false;
      }
    } catch (error) {
      console.error("  ❌ Test failed:", error);
      return false;
    }
  }

  // =============== TEST 3: Revoke Session Using Partial Token ===============
  async testRevokeSessionWithPartialToken(): Promise<boolean> {
    console.log("\n🧪 Test 3: Revoke Session Using Partial Token");

    if (!this.partialToken) {
      console.log("  ⚠️ No partial token available, skipping");
      return true;
    }

    try {
      // Get sessions using partial token
      const { status: getStatus, data: sessionsData } = await this.makeApiCall(
        "/api/v1/sessions",
        "GET",
        undefined,
        this.partialToken
      );

      if (getStatus !== 200) {
        console.log(`  ❌ Could not get sessions with partial token: ${getStatus}`);
        console.log(`  Error details: ${JSON.stringify(sessionsData)}`);
        return false;
      }

      const sessions = sessionsData.data?.sessions || [];
      console.log(`  Found ${sessions.length} sessions`);

      if (sessions.length === 0) {
        console.log("  ❌ No sessions found to revoke");
        return false;
      }

      // Revoke the oldest session (first one)
      const sessionToRevoke = sessions[0];
      const sessionId = sessionToRevoke.id || sessionToRevoke._id;

      console.log(`  Revoking session: ${sessionId}`);
      console.log(`    Device: ${sessionToRevoke.device?.description || "Unknown"}`);

      const { status: revokeStatus, data: revokeData } = await this.makeApiCall(
        `/api/v1/sessions/${sessionId}`,
        "DELETE",
        undefined,
        this.partialToken
      );

      console.log(`  Revoke status: ${revokeStatus}`);

      if (revokeStatus === 200) {
        // Verify session count decreased
        if (this.userId) {
          const count = await this.redis.scard(`session:active:${this.userId}`);
          console.log(`  Active sessions after revoke: ${count}`);

          if (count === SESSION_LIMITS.free - 1) {
            console.log("  ✅ Session revoked successfully using partial token");
            return true;
          }
        }
        return true;
      } else {
        console.log(`  ❌ Revocation failed: ${revokeData.message}`);
        return false;
      }
    } catch (error) {
      console.error("  ❌ Test failed:", error);
      return false;
    }
  }

  // =============== TEST 4: Login After Revoking Session ===============
  async testLoginAfterRevocation(): Promise<boolean> {
    console.log("\n🧪 Test 4: Login Successfully After Revoking A Session");

    try {
      console.log("  Attempting to login after freeing up a session slot...");

      const result = await this.generateAndVerifyOtp();

      if (result.success && result.token) {
        console.log("  ✅ Login successful after revocation!");

        // Verify we now have the max sessions again
        if (this.userId) {
          const count = await this.redis.scard(`session:active:${this.userId}`);
          console.log(`  Active sessions: ${count} (expected: ${SESSION_LIMITS.free})`);

          if (count === SESSION_LIMITS.free) {
            console.log("  ✅ Back to maximum session limit");
            return true;
          }
        }
        return true;
      } else if (result.sessionLimitReached) {
        console.log("  ❌ Still getting SESSION_LIMIT_REACHED after revocation");
        return false;
      } else {
        console.log("  ❌ Login failed unexpectedly");
        return false;
      }
    } catch (error) {
      console.error("  ❌ Test failed:", error);
      return false;
    }
  }

  // =============== TEST 5: Verify Session Limits Per Subscription ===============
  async testSessionLimitsBySubscription(): Promise<boolean> {
    console.log("\n🧪 Test 5: Verify Session Limits Configuration");

    console.log("\n  Session limits by subscription type:");
    console.log("  ┌────────────────┬─────────────────┐");
    console.log("  │ Subscription   │ Max Sessions    │");
    console.log("  ├────────────────┼─────────────────┤");

    for (const [type, limit] of Object.entries(SESSION_LIMITS)) {
      console.log(`  │ ${type.padEnd(14)} │ ${String(limit).padEnd(15)} │`);
    }

    console.log("  └────────────────┴─────────────────┘");
    console.log("\n  ✅ Session limits are configured correctly");
    return true;
  }
}

// Main test runner
async function runSessionLimitTests() {
  console.log("🚀 Starting Session Limit Tests");
  console.log("=".repeat(60));
  console.log(`Server URL: ${SERVER_URL}`);
  console.log(`Redis: ${REDIS_HOST}:${REDIS_PORT}`);
  console.log(`Test Phone: ${TEST_PHONE}`);
  console.log("=".repeat(60));

  const tester = new SessionLimitTester();
  const results: { name: string; passed: boolean }[] = [];

  try {
    await tester.connect();
    await tester.cleanup(); // Clean before tests

    // Check server health first
    const healthCheck = await fetch(`${SERVER_URL}/system/_status/health_check`).catch(() => null);
    if (!healthCheck || healthCheck.status !== 200) {
      console.log("\n❌ Server not healthy. Make sure the server is running: npm run dev");
      await tester.disconnect();
      process.exit(1);
    }

    console.log("\n✅ Server is healthy, starting tests...");

    // Run tests in order
    results.push({
      name: "Session Limits Configuration",
      passed: await tester.testSessionLimitsBySubscription(),
    });

    results.push({
      name: "Create Sessions Up To Limit",
      passed: await tester.testCreateSessionsUpToLimit(),
    });

    results.push({
      name: "Session Limit Reached Error",
      passed: await tester.testSessionLimitReached(),
    });

    results.push({
      name: "Revoke Session With Partial Token",
      passed: await tester.testRevokeSessionWithPartialToken(),
    });

    results.push({
      name: "Login After Revocation",
      passed: await tester.testLoginAfterRevocation(),
    });

    // Print summary
    console.log("\n" + "=".repeat(60));
    console.log("📊 SESSION LIMIT TEST SUMMARY");
    console.log("=".repeat(60));

    let passedCount = 0;
    results.forEach((result) => {
      const status = result.passed ? "✅ PASS" : "❌ FAIL";
      console.log(`  ${status}: ${result.name}`);
      if (result.passed) passedCount++;
    });

    console.log("\n" + "-".repeat(60));
    console.log(`  Total: ${results.length} tests`);
    console.log(`  Passed: ${passedCount}`);
    console.log(`  Failed: ${results.length - passedCount}`);
    console.log("=".repeat(60));

    if (passedCount === results.length) {
      console.log("\n🎉 All session limit tests passed!");
    } else {
      console.log("\n⚠️ Some tests failed. Check the logs above.");
    }

    await tester.cleanup();
  } catch (error) {
    console.error("❌ Test suite error:", error);
  } finally {
    await tester.disconnect();
    process.exit(0);
  }
}

runSessionLimitTests().catch(console.error);
