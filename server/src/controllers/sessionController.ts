import express from "express";
import { SessionModel } from "../models/sessionModel";
import { ApiError } from "../utils/apiError";
import { AsyncHandler } from "../utils/AsyncHandler";
import { successResponse } from "../utils/apiResponse";
import {
  parseUserAgent,
  getClientIp,
  createLocationInfo,
  generateTokenId,
  getDeviceDescription,
} from "../helper/sessionHelper";
import { ISession } from "../interface/ISession";

// Extend Express Request to include sessionTokenId
declare global {
  namespace Express {
    interface Request {
      sessionTokenId?: string;
    }
  }
}

class SessionController {
  /**
   * Create a new session when user logs in
   */
  static async createSession(
    userId: string,
    req: express.Request,
    tokenId: string,
    refreshTokenId?: string,
    loginMethod: ISession["loginMethod"] = "password"
  ) {
    try {
      const userAgent = req.headers["user-agent"] || "unknown";
      const device = parseUserAgent(userAgent, req); // Pass req for custom headers
      const ip = getClientIp(req);
      const location = createLocationInfo(ip);

      // Calculate expiry (15 days for refresh token)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 15);

      const session = await SessionModel.create({
        userId,
        tokenId,
        refreshTokenId,
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
   * Update last active timestamp for a session
   */
  static async updateLastActive(tokenId: string) {
    try {
      await SessionModel.findOneAndUpdate(
        { tokenId, isActive: true },
        { lastActiveAt: new Date() }
      );
    } catch (error) {
      console.error("[SESSION] Error updating last active:", error);
    }
  }

  /**
   * Invalidate a session on logout
   */
  static async invalidateSession(
    userId: string,
    tokenId?: string,
    reason: string = "User logged out"
  ) {
    try {
      if (tokenId) {
        // Invalidate specific session
        await SessionModel.findOneAndUpdate(
          { userId, tokenId, isActive: true },
          {
            isActive: false,
            revokedAt: new Date(),
            revokedReason: reason,
            revokedBy: userId,
          }
        );
        console.log(`[SESSION] Invalidated session ${tokenId} for user ${userId}`);
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

      const sessions = await SessionModel.find({
        userId,
        isActive: true,
        revokedAt: { $exists: false },
        expiresAt: { $gt: new Date() },
      })
        .sort({ lastActiveAt: -1 })
        .select("-__v -refreshTokenId")
        .lean();

      // Transform sessions for frontend
      const transformedSessions = sessions.map((session: any) => ({
        id: session._id,
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
        isCurrent: session.tokenId === req.sessionTokenId,
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

      const session = await SessionModel.findOneAndUpdate(
        {
          _id: sessionId,
          userId,
          isActive: true,
        },
        {
          isActive: false,
          revokedAt: new Date(),
          revokedReason: "Revoked by user",
          revokedBy: userId,
        },
        { new: true }
      );

      if (!session) {
        throw new ApiError(404, "Session not found or already revoked");
      }

      console.log(`[SESSION] User ${userId} revoked session ${sessionId}`);

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

      // If keepCurrent is true and we have current session token, exclude it
      if (keepCurrent && req.sessionTokenId) {
        filter.tokenId = { $ne: req.sessionTokenId };
      }

      const result = await SessionModel.updateMany(filter, {
        isActive: false,
        revokedAt: new Date(),
        revokedReason: "Revoked all sessions by user",
        revokedBy: userId,
      });

      console.log(
        `[SESSION] User ${userId} revoked ${result.modifiedCount} sessions`
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
