import express from "express";
import { SessionModel } from "../models/sessionModel";
import { ApiError } from "../utils/apiError";
import { AsyncHandler } from "../utils/AsyncHandler";
import { successResponse } from "../utils/apiResponse";
import {
  parseUserAgent,
  createLocationInfo,
  getDeviceDescription,
} from "../helper/sessionHelper";
import { ISession, SessionRequestInfo } from "../interface/ISession";
import { RedisManager } from "../utils/redisClient";
import { SocketManager } from "../socket";

class SessionController {
  /**
   * Create a new session when user logs in
   */
  static async createSession(
    userId: string,
    reqInfo: SessionRequestInfo,
    refreshTokenId: string,
    refreshToken: string,
    loginMethod: ISession["loginMethod"] = "password"
  ) {
    try {
      const device = parseUserAgent(reqInfo.userAgent, reqInfo.customHeaders);
      const location = createLocationInfo(reqInfo.ip);

      // Calculate expiry (15 days for refresh token)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 15);

      const session = await SessionModel.create({
        userId,
        refreshTokenId,
        refreshToken,
        device,
        location,
        isActive: true,
        lastActiveAt: new Date(),
        expiresAt,
        loginMethod,
      });

      console.log(
        `[SESSION] Created new session for user ${userId}: ${getDeviceDescription(device)}`
      );

      return session;
    } catch (error) {
      console.error("[SESSION] Error creating session:", error);
      throw error;
    }
  }

  /**
   * Invalidate a session on logout
   * @param sessionId - The session identifier (sess_<uuid>) stored as refreshTokenId in MongoDB
   */
  static async invalidateSession(
    userId: string,
    sessionId?: string,
    reason: string = "User logged out"
  ) {
    try {
      if (sessionId) {
        // Invalidate specific session by refreshTokenId (the sess_<uuid> from JWT)
        await SessionModel.findOneAndUpdate(
          { userId, refreshTokenId: sessionId, isActive: true },
          {
            isActive: false,
            revokedAt: new Date(),
            revokedReason: reason,
            revokedBy: userId,
          }
        );
        console.log(`[SESSION] Invalidated session ${sessionId} for user ${userId}`);
      } else {
        // Invalidate all sessions for user
        await SessionModel.updateMany(
          { userId, isActive: true },
          {
            isActive: false,
            revokedAt: new Date(),
            revokedReason: reason,
            revokedBy: userId,
          }
        );
        console.log(`[SESSION] Invalidated all sessions for user ${userId}`);
      }
    } catch (error) {
      console.error("[SESSION] Error invalidating session:", error);
    }
  }

  /**
   * Get all active sessions for current user
   */
  static getSessions = AsyncHandler.wrap(
    async (req: express.Request, res: express.Response) => {
      const userId = req.user?._id;

      if (!userId) {
        throw new ApiError(401, "Unauthorized access");
      }

      // Redis is the source of truth for active sessions
      const redisSessionIds = await RedisManager.getActiveSessionIds(userId.toString());
      const redisSet = new Set(redisSessionIds);

      // Query MongoDB (include refreshTokenId for reconciliation, exclude later)
      const sessions = await SessionModel.find({
        userId,
        isActive: true,
        revokedAt: { $exists: false },
        expiresAt: { $gt: new Date() },
      })
        .sort({ lastActiveAt: -1 })
        .select("-__v")
        .lean();

      // Reconcile: mark MongoDB sessions not in Redis as inactive
      const staleSessionIds = sessions
        .filter((s: any) => s.refreshTokenId && !redisSet.has(s.refreshTokenId))
        .map((s: any) => s._id);

      if (staleSessionIds.length > 0) {
        await SessionModel.updateMany(
          { _id: { $in: staleSessionIds } },
          {
            isActive: false,
            revokedAt: new Date(),
            revokedReason: "Session expired (Redis reconciliation)",
          }
        );
        console.log(
          `[SESSION] Reconciled ${staleSessionIds.length} stale MongoDB session(s) for user ${userId}`
        );
      }

      // Clean up orphaned Redis activity keys (fire-and-forget)
      RedisManager.cleanupOrphanedActivityKeys(userId.toString()).catch((err) =>
        console.error("[SESSION] Orphaned activity cleanup failed:", err)
      );

      // Only return sessions that are active in Redis
      const activeSessions = sessions.filter(
        (s: any) => s.refreshTokenId && redisSet.has(s.refreshTokenId)
      );

      // Transform sessions for frontend (exclude sensitive fields)
      const transformedSessions = activeSessions.map((session: any) => ({
        id: session.refreshTokenId,
        device: {
          type: session.device.type,
          platform: session.device.platform,
          browser: session.device.browser,
          brand: session.device.deviceBrand,
          model: session.device.deviceModel,
          description: getDeviceDescription(session.device),
        },
        location: {
          ip: session.location.ip,
          city: session.location.city,
          country: session.location.country,
        },
        loginMethod: session.loginMethod,
        lastActiveAt: session.lastActiveAt,
        createdAt: session.createdAt,
        isCurrent: session.refreshTokenId === req.user?.sessionId,
      }));

      return res.status(200).json(
        successResponse(
          {
            sessions: transformedSessions,
            count: transformedSessions.length,
          },
          "Sessions retrieved successfully"
        )
      );
    }
  );

  /**
   * Revoke a specific session
   */
  static revokeSession = AsyncHandler.wrap(
    async (req: express.Request, res: express.Response) => {
      const userId = req.user?._id;
      const { sessionId } = req.params;

      if (!userId) {
        throw new ApiError(401, "Unauthorized access");
      }

      if (!sessionId) {
        throw new ApiError(400, "Session ID is required");
      }

      const sessionDoc = await SessionModel.findOne({
        refreshTokenId: sessionId,
        userId,
        isActive: true,
      });

      if (!sessionDoc) {
        throw new ApiError(404, "Session not found or already revoked");
      }

      // The Redis sessionId is stored in refreshTokenId
      const redisSessionId = sessionDoc.refreshTokenId;
      let lastActiveAt = sessionDoc.lastActiveAt;

      if (redisSessionId) {
        const activity = await RedisManager.getSessionActivity(
          userId.toString(),
          redisSessionId
        );
        if (activity?.lastActiveAt) {
          lastActiveAt = new Date(activity.lastActiveAt);
        }
      }

      // Use atomic operation pattern: Redis first, then MongoDB
      // If MongoDB fails, we rollback Redis (add session back)
      let redisRemoved = false;

      try {
        // Step 1: Remove from Redis first
        if (redisSessionId) {
          await RedisManager.removeActiveSession(
            userId.toString(),
            redisSessionId
          );
          redisRemoved = true;
        }

        // Step 2: Update MongoDB
        const session = await SessionModel.findOneAndUpdate(
          {
            _id: sessionDoc._id,
            userId,
            isActive: true,
          },
          {
            isActive: false,
            revokedAt: new Date(),
            revokedReason: "Revoked by user",
            revokedBy: userId,
            lastActiveAt,
          },
          { new: true }
        );

        if (!session) {
          // MongoDB update failed, rollback Redis
          if (redisRemoved && redisSessionId) {
            console.warn("[SESSION] MongoDB update failed, rolling back Redis");
            // Note: We can't fully rollback because we don't have the original metadata
            // But this is a rare edge case and the session will be recreated on next login
          }
          throw new ApiError(500, "Failed to revoke session in database");
        }

        // Step 3: Disconnect sockets (non-critical, don't fail on error)
        if (redisSessionId) {
          try {
            const socketManager = SocketManager.getInstance();
            const disconnectedCount = await socketManager.disconnectBySessionId(
              userId.toString(),
              redisSessionId
            );
            if (disconnectedCount > 0) {
              console.log(`[SESSION] Disconnected ${disconnectedCount} socket(s) for session ${redisSessionId}`);
            }
          } catch (socketError) {
            console.error("[SESSION] Failed to disconnect sockets:", socketError);
          }
        }
      } catch (error) {
        // If anything fails after Redis removal, log the inconsistency
        if (redisRemoved) {
          console.error("[SESSION] Inconsistency: Redis removed but operation failed:", error);
        }
        throw error;
      }

      console.log(`[SESSION] User ${userId} revoked session ${sessionId} (Redis: ${redisSessionId})`)

      return res.status(200).json(
        successResponse({}, "Session revoked successfully")
      );
    }
  );

  /**
   * Revoke all sessions except current
   */
  static revokeAllSessions = AsyncHandler.wrap(
    async (req: express.Request, res: express.Response) => {
      const userId = req.user?._id;
      const { keepCurrent } = req.body;

      if (!userId) {
        throw new ApiError(401, "Unauthorized access");
      }

      let filter: any = {
        userId,
        isActive: true,
      };

      // If keepCurrent is true and we have current session ID, exclude it
      if (keepCurrent && req.user?.sessionId) {
        filter.refreshTokenId = { $ne: req.user.sessionId };
      }

      const result = await SessionModel.updateMany(filter, {
        isActive: false,
        revokedAt: new Date(),
        revokedReason: "Revoked all sessions by user",
        revokedBy: userId,
      });

      // Clear sessions from Redis
      const currentSessionId = req.user?.sessionId;
      // If keepCurrent is true and we have a session ID, pass it to excluded
      const excludedSessionId = keepCurrent ? currentSessionId : undefined;

      await RedisManager.removeAllActiveSessions(userId.toString(), excludedSessionId);

      // Disconnect all sockets for this user (except current session if keepCurrent)
      try {
        const socketManager = SocketManager.getInstance();
        if (keepCurrent && currentSessionId) {
          // Get all sessions and disconnect each except current
          const sockets = await socketManager.getSocketStatus();
          const userSockets = sockets.filter(
            (s: any) => s.userId === userId.toString() && s.sessionId !== currentSessionId
          );
          for (const socket of userSockets) {
            if (socket.sessionId) {
              await socketManager.disconnectBySessionId(userId.toString(), socket.sessionId);
            }
          }
        } else {
          // Disconnect all user sockets
          await socketManager.disconnectUser(userId.toString());
        }
      } catch (socketError) {
        console.error("[SESSION] Failed to disconnect sockets:", socketError);
      }

      console.log(
        `[SESSION] User ${userId} revoked ${result.modifiedCount} sessions. Redis cleared.`
      );

      return res.status(200).json(
        successResponse(
          { revokedCount: result.modifiedCount },
          `${result.modifiedCount} session(s) revoked successfully`
        )
      );
    }
  );

  /**
   * Get session statistics for user
   */
  static getSessionStats = AsyncHandler.wrap(
    async (req: express.Request, res: express.Response) => {
      const userId = req.user?._id;

      if (!userId) {
        throw new ApiError(401, "Unauthorized access");
      }

      const [activeCount, totalCount, deviceStats] = await Promise.all([
        SessionModel.countDocuments({
          userId,
          isActive: true,
          expiresAt: { $gt: new Date() },
        }),
        SessionModel.countDocuments({ userId }),
        SessionModel.aggregate([
          {
            $match: {
              userId,
              isActive: true,
              expiresAt: { $gt: new Date() },
            },
          },
          {
            $group: {
              _id: "$device.type",
              count: { $sum: 1 },
            },
          },
        ]),
      ]);

      const deviceBreakdown = deviceStats.reduce(
        (acc: Record<string, number>, item: { _id: string; count: number }) => {
          acc[item._id] = item.count;
          return acc;
        },
        {}
      );

      return res.status(200).json(
        successResponse(
          {
            activeSessions: activeCount,
            totalSessions: totalCount,
            deviceBreakdown,
          },
          "Session statistics retrieved"
        )
      );
    }
  );
}

export { SessionController };
