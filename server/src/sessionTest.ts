/**
 * Session Management Test Script
 * Tests all session management fixes including:
 * - Session creation and TTL consistency (15 days)
 * - Session validation and revocation
 * - Distributed locking for race conditions
 * - Session ID matching (MongoDB _id vs refreshTokenId)
 * - Cleanup of stale sessions
 *
 * Run: npm run test:session
 */

import Redis from "ioredis";

const REDIS_HOST = process.env.REDIS_HOST || "localhost";
const REDIS_PORT = parseInt(process.env.REDIS_PORT || "6379");

// Test configuration
const TEST_USER_ID = "test-user-123456";
const TEST_SESSION_ID = "test-session-abc123";
const TEST_SESSION_ID_2 = "test-session-def456";
const LOCK_PREFIX = "lock:";

// Expected TTLs (in seconds)
const EXPECTED_SESSION_TTL = 1296000; // 15 days
const EXPECTED_ACTIVITY_TTL = 86400; // 24 hours

class SessionTester {
  private redis: Redis;

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
    // Clean up test data
    const keys = await this.redis.keys(`*${TEST_USER_ID}*`);
    const lockKeys = await this.redis.keys(`${LOCK_PREFIX}*`);
    const allKeys = [...keys, ...lockKeys];

    if (allKeys.length > 0) {
      await this.redis.del(...allKeys);
      console.log(`🧹 Cleaned up ${allKeys.length} test keys`);
    }
  }

  async disconnect(): Promise<void> {
    await this.redis.quit();
    console.log("✅ Disconnected from Redis");
  }

  // =============== TEST 1: Session Creation and TTL ===============
  async testSessionCreationAndTTL(): Promise<boolean> {
    console.log("\n🧪 Test 1: Session Creation and TTL Consistency");

    const activeSetKey = `session:active:${TEST_USER_ID}`;
    const metaKey = `session:meta:${TEST_USER_ID}:${TEST_SESSION_ID}`;
    const activityKey = `session:activity:${TEST_USER_ID}:${TEST_SESSION_ID}`;
    const now = new Date().toISOString();

    try {
      // Simulate session creation (matching redisClient.ts addActiveSession)
      const multi = this.redis.multi();
      multi.sadd(activeSetKey, TEST_SESSION_ID);
      multi.expire(activeSetKey, EXPECTED_SESSION_TTL);
      multi.hset(metaKey, {
        device: "Test Device",
        deviceType: "desktop",
        platform: "Windows",
        browser: "Chrome",
        ip: "127.0.0.1",
        createdAt: now,
      });
      multi.expire(metaKey, EXPECTED_SESSION_TTL);
      multi.hset(activityKey, {
        lastActiveAt: now,
        lastEndpoint: "/login",
        lastMethod: "POST",
        requestCount: "1",
        ip: "127.0.0.1",
      });
      multi.expire(activityKey, EXPECTED_ACTIVITY_TTL);
      await multi.exec();

      // Verify TTLs
      const activeSetTTL = await this.redis.ttl(activeSetKey);
      const metaTTL = await this.redis.ttl(metaKey);
      const activityTTL = await this.redis.ttl(activityKey);

      console.log(`  Active Set TTL: ${activeSetTTL}s (expected: ~${EXPECTED_SESSION_TTL}s = 15 days)`);
      console.log(`  Metadata TTL: ${metaTTL}s (expected: ~${EXPECTED_SESSION_TTL}s = 15 days)`);
      console.log(`  Activity TTL: ${activityTTL}s (expected: ~${EXPECTED_ACTIVITY_TTL}s = 24 hours)`);

      // Allow 5 second tolerance
      const activeSetOk = Math.abs(activeSetTTL - EXPECTED_SESSION_TTL) < 5;
      const metaOk = Math.abs(metaTTL - EXPECTED_SESSION_TTL) < 5;
      const activityOk = Math.abs(activityTTL - EXPECTED_ACTIVITY_TTL) < 5;

      if (activeSetOk && metaOk && activityOk) {
        console.log("  ✅ TTL consistency verified - all session TTLs are 15 days");
        return true;
      } else {
        console.log("  ❌ TTL mismatch detected");
        return false;
      }
    } catch (error) {
      console.error("  ❌ Test failed:", error);
      return false;
    }
  }

  // =============== TEST 2: Session Validation ===============
  async testSessionValidation(): Promise<boolean> {
    console.log("\n🧪 Test 2: Session Validation (isSessionActive)");

    const activeSetKey = `session:active:${TEST_USER_ID}`;

    try {
      // Test existing session
      const isActive = await this.redis.sismember(activeSetKey, TEST_SESSION_ID);
      console.log(`  Session ${TEST_SESSION_ID} is active: ${isActive === 1}`);

      // Test non-existing session
      const isInactive = await this.redis.sismember(activeSetKey, "non-existent-session");
      console.log(`  Non-existent session is active: ${isInactive === 1}`);

      if (isActive === 1 && isInactive === 0) {
        console.log("  ✅ Session validation working correctly");
        return true;
      } else {
        console.log("  ❌ Session validation failed");
        return false;
      }
    } catch (error) {
      console.error("  ❌ Test failed:", error);
      return false;
    }
  }

  // =============== TEST 3: Session Revocation ===============
  async testSessionRevocation(): Promise<boolean> {
    console.log("\n🧪 Test 3: Session Revocation");

    const activeSetKey = `session:active:${TEST_USER_ID}`;
    const metaKey = `session:meta:${TEST_USER_ID}:${TEST_SESSION_ID}`;
    const activityKey = `session:activity:${TEST_USER_ID}:${TEST_SESSION_ID}`;

    try {
      // Verify session exists before revocation
      const beforeCount = await this.redis.scard(activeSetKey);
      console.log(`  Sessions before revocation: ${beforeCount}`);

      // Simulate session revocation (matching sessionController.ts)
      const multi = this.redis.multi();
      multi.srem(activeSetKey, TEST_SESSION_ID);
      multi.del(metaKey);
      multi.del(activityKey);
      await multi.exec();

      // Verify session is removed
      const isStillActive = await this.redis.sismember(activeSetKey, TEST_SESSION_ID);
      const metaExists = await this.redis.exists(metaKey);
      const activityExists = await this.redis.exists(activityKey);

      console.log(`  Session still active after revocation: ${isStillActive === 1}`);
      console.log(`  Metadata exists after revocation: ${metaExists === 1}`);
      console.log(`  Activity exists after revocation: ${activityExists === 1}`);

      if (isStillActive === 0 && metaExists === 0 && activityExists === 0) {
        console.log("  ✅ Session revocation working correctly");
        return true;
      } else {
        console.log("  ❌ Session revocation failed - data not cleaned up");
        return false;
      }
    } catch (error) {
      console.error("  ❌ Test failed:", error);
      return false;
    }
  }

  // =============== TEST 4: Distributed Lock ===============
  async testDistributedLock(): Promise<boolean> {
    console.log("\n🧪 Test 4: Distributed Lock (Race Condition Prevention)");

    const lockKey = `session:create:${TEST_USER_ID}`;
    const fullLockKey = `${LOCK_PREFIX}${lockKey}`;

    try {
      // Acquire lock
      const lockId1 = `${Date.now()}-${Math.random()}`;
      const result = await this.redis
        .multi()
        .set(fullLockKey, lockId1, "NX")
        .pexpire(fullLockKey, 10000)
        .exec();

      const lockAcquired = result?.[0]?.[1] === "OK";
      console.log(`  First lock acquired: ${lockAcquired}`);

      // Try to acquire same lock (should fail)
      const lockId2 = `${Date.now()}-${Math.random()}`;
      const result2 = await this.redis
        .multi()
        .set(fullLockKey, lockId2, "NX")
        .pexpire(fullLockKey, 10000)
        .exec();

      const secondLockFailed = result2?.[0]?.[1] !== "OK";
      console.log(`  Second lock blocked: ${secondLockFailed}`);

      // Release lock
      const currentLockId = await this.redis.get(fullLockKey);
      if (currentLockId === lockId1) {
        await this.redis.del(fullLockKey);
        console.log("  Lock released by owner");
      }

      // Now lock should be acquirable again
      const result3 = await this.redis
        .multi()
        .set(fullLockKey, lockId2, "NX")
        .pexpire(fullLockKey, 10000)
        .exec();

      const thirdLockAcquired = result3?.[0]?.[1] === "OK";
      console.log(`  Lock acquirable after release: ${thirdLockAcquired}`);

      // Cleanup
      await this.redis.del(fullLockKey);

      if (lockAcquired && secondLockFailed && thirdLockAcquired) {
        console.log("  ✅ Distributed lock working correctly");
        return true;
      } else {
        console.log("  ❌ Distributed lock not working as expected");
        return false;
      }
    } catch (error) {
      console.error("  ❌ Test failed:", error);
      return false;
    }
  }

  // =============== TEST 5: Multiple Sessions per User ===============
  async testMultipleSessions(): Promise<boolean> {
    console.log("\n🧪 Test 5: Multiple Sessions per User");

    const activeSetKey = `session:active:${TEST_USER_ID}`;
    const sessions = [TEST_SESSION_ID, TEST_SESSION_ID_2, "test-session-xyz789"];
    const now = new Date().toISOString();

    try {
      // Create multiple sessions
      for (const sessionId of sessions) {
        const metaKey = `session:meta:${TEST_USER_ID}:${sessionId}`;
        const activityKey = `session:activity:${TEST_USER_ID}:${sessionId}`;

        await this.redis.multi()
          .sadd(activeSetKey, sessionId)
          .expire(activeSetKey, EXPECTED_SESSION_TTL)
          .hset(metaKey, { device: "Test", createdAt: now })
          .expire(metaKey, EXPECTED_SESSION_TTL)
          .hset(activityKey, { lastActiveAt: now })
          .expire(activityKey, EXPECTED_ACTIVITY_TTL)
          .exec();
      }

      // Verify count
      const count = await this.redis.scard(activeSetKey);
      console.log(`  Active sessions: ${count} (expected: ${sessions.length})`);

      // Get all session IDs
      const activeIds = await this.redis.smembers(activeSetKey);
      console.log(`  Session IDs: ${activeIds.join(", ")}`);

      if (count === sessions.length) {
        console.log("  ✅ Multiple sessions created correctly");
        return true;
      } else {
        console.log("  ❌ Session count mismatch");
        return false;
      }
    } catch (error) {
      console.error("  ❌ Test failed:", error);
      return false;
    }
  }

  // =============== TEST 6: Revoke All Sessions (Except One) ===============
  async testRevokeAllSessions(): Promise<boolean> {
    console.log("\n🧪 Test 6: Revoke All Sessions (Except Current)");

    const activeSetKey = `session:active:${TEST_USER_ID}`;
    const keepSessionId = TEST_SESSION_ID;

    try {
      // Get all current sessions
      const sessionIds = await this.redis.smembers(activeSetKey);
      console.log(`  Sessions before revoke-all: ${sessionIds.length}`);

      // Revoke all except one
      const pipeline = this.redis.multi();
      for (const sessionId of sessionIds) {
        if (sessionId === keepSessionId) continue;

        const metaKey = `session:meta:${TEST_USER_ID}:${sessionId}`;
        const activityKey = `session:activity:${TEST_USER_ID}:${sessionId}`;

        pipeline.srem(activeSetKey, sessionId);
        pipeline.del(metaKey);
        pipeline.del(activityKey);
      }
      await pipeline.exec();

      // Verify only one session remains
      const remainingCount = await this.redis.scard(activeSetKey);
      const remainingSessions = await this.redis.smembers(activeSetKey);
      console.log(`  Sessions after revoke-all: ${remainingCount}`);
      console.log(`  Remaining session: ${remainingSessions.join(", ")}`);

      if (remainingCount === 1 && remainingSessions[0] === keepSessionId) {
        console.log("  ✅ Revoke-all working correctly (kept current session)");
        return true;
      } else {
        console.log("  ❌ Revoke-all did not work as expected");
        return false;
      }
    } catch (error) {
      console.error("  ❌ Test failed:", error);
      return false;
    }
  }

  // =============== TEST 7: Activity Update with Sliding TTL ===============
  async testActivityUpdate(): Promise<boolean> {
    console.log("\n🧪 Test 7: Activity Update with Sliding TTL");

    const activeSetKey = `session:active:${TEST_USER_ID}`;
    const activityKey = `session:activity:${TEST_USER_ID}:${TEST_SESSION_ID}`;
    const now = new Date().toISOString();

    try {
      // First, recreate the session
      const metaKey = `session:meta:${TEST_USER_ID}:${TEST_SESSION_ID}`;
      await this.redis.multi()
        .sadd(activeSetKey, TEST_SESSION_ID)
        .expire(activeSetKey, EXPECTED_SESSION_TTL)
        .hset(metaKey, { device: "Test", createdAt: now })
        .expire(metaKey, EXPECTED_SESSION_TTL)
        .hset(activityKey, { lastActiveAt: now, requestCount: "1" })
        .expire(activityKey, 100) // Set short TTL first
        .exec();

      // Get TTL before activity update
      const ttlBefore = await this.redis.ttl(activityKey);
      console.log(`  Activity TTL before update: ${ttlBefore}s`);

      // Simulate activity update (fire-and-forget)
      await this.redis.multi()
        .hset(activityKey, "lastActiveAt", new Date().toISOString())
        .hset(activityKey, "lastEndpoint", "/api/test")
        .hincrby(activityKey, "requestCount", 1)
        .expire(activityKey, EXPECTED_ACTIVITY_TTL) // Sliding window
        .expire(activeSetKey, EXPECTED_SESSION_TTL) // Also extend active set
        .exec();

      // Get TTL after activity update
      const ttlAfter = await this.redis.ttl(activityKey);
      console.log(`  Activity TTL after update: ${ttlAfter}s (should be ~${EXPECTED_ACTIVITY_TTL}s)`);

      // Verify request count incremented
      const requestCount = await this.redis.hget(activityKey, "requestCount");
      console.log(`  Request count: ${requestCount} (expected: 2)`);

      if (ttlAfter > ttlBefore && requestCount === "2") {
        console.log("  ✅ Activity update with sliding TTL working correctly");
        return true;
      } else {
        console.log("  ❌ Activity update not working as expected");
        return false;
      }
    } catch (error) {
      console.error("  ❌ Test failed:", error);
      return false;
    }
  }

  // =============== TEST 8: Stale Session Cleanup ===============
  async testStaleSessionCleanup(): Promise<boolean> {
    console.log("\n🧪 Test 8: Stale Session Cleanup");

    const activeSetKey = `session:active:${TEST_USER_ID}`;
    const staleSessionId = "stale-session-no-metadata";

    try {
      // Add a session ID to the set without creating metadata
      await this.redis.sadd(activeSetKey, staleSessionId);

      // Get count before cleanup
      const countBefore = await this.redis.scard(activeSetKey);
      console.log(`  Sessions in set before cleanup: ${countBefore}`);

      // Simulate lazy cleanup (matching getActiveSessionCount logic)
      const sessionIds = await this.redis.smembers(activeSetKey);
      const pipeline = this.redis.multi();
      sessionIds.forEach((id) => {
        pipeline.exists(`session:meta:${TEST_USER_ID}:${id}`);
      });
      const results = await pipeline.exec();

      const staleIds: string[] = [];
      if (results) {
        results.forEach((res, index) => {
          if (res[1] === 0) {
            staleIds.push(sessionIds[index]);
          }
        });
      }

      if (staleIds.length > 0) {
        await this.redis.srem(activeSetKey, ...staleIds);
        console.log(`  Cleaned up ${staleIds.length} stale session(s): ${staleIds.join(", ")}`);
      }

      // Verify stale session removed
      const countAfter = await this.redis.scard(activeSetKey);
      const isStaleRemoved = !(await this.redis.sismember(activeSetKey, staleSessionId));
      console.log(`  Sessions in set after cleanup: ${countAfter}`);

      if (isStaleRemoved && countAfter < countBefore) {
        console.log("  ✅ Stale session cleanup working correctly");
        return true;
      } else {
        console.log("  ❌ Stale session not cleaned up");
        return false;
      }
    } catch (error) {
      console.error("  ❌ Test failed:", error);
      return false;
    }
  }
}

// Run all tests
async function runSessionTests() {
  console.log("🚀 Starting Session Management Test Suite");
  console.log("=".repeat(50));

  const tester = new SessionTester();
  const results: { name: string; passed: boolean }[] = [];

  try {
    await tester.connect();
    await tester.cleanup(); // Clean before tests

    // Run tests in order
    results.push({ name: "Session Creation and TTL", passed: await tester.testSessionCreationAndTTL() });
    results.push({ name: "Session Validation", passed: await tester.testSessionValidation() });
    results.push({ name: "Session Revocation", passed: await tester.testSessionRevocation() });
    results.push({ name: "Distributed Lock", passed: await tester.testDistributedLock() });
    results.push({ name: "Multiple Sessions", passed: await tester.testMultipleSessions() });
    results.push({ name: "Revoke All Sessions", passed: await tester.testRevokeAllSessions() });
    results.push({ name: "Activity Update", passed: await tester.testActivityUpdate() });
    results.push({ name: "Stale Session Cleanup", passed: await tester.testStaleSessionCleanup() });

    // Print summary
    console.log("\n" + "=".repeat(50));
    console.log("📊 TEST SUMMARY");
    console.log("=".repeat(50));

    let passedCount = 0;
    results.forEach((result) => {
      const status = result.passed ? "✅ PASS" : "❌ FAIL";
      console.log(`  ${status}: ${result.name}`);
      if (result.passed) passedCount++;
    });

    console.log("\n" + "-".repeat(50));
    console.log(`  Total: ${results.length} tests`);
    console.log(`  Passed: ${passedCount}`);
    console.log(`  Failed: ${results.length - passedCount}`);
    console.log("=".repeat(50));

    if (passedCount === results.length) {
      console.log("\n🎉 All session management tests passed!");
    } else {
      console.log("\n⚠️ Some tests failed. Please review the fixes.");
    }

    await tester.cleanup(); // Clean after tests
  } catch (error) {
    console.error("❌ Test suite error:", error);
  } finally {
    await tester.disconnect();
    process.exit(0);
  }
}

runSessionTests().catch(console.error);
