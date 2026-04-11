import express from "express";
import { SessionModel } from "../models/sessionModel";
import Admin from "../models/adminModel";
import { ApiError } from "../utils/apiError";
import { AsyncHandler } from "../utils/AsyncHandler";
import { successResponse } from "../utils/apiResponse";
import { RedisManager } from "../utils/redisClient";

class AdminSessionManagementController {
  /**
   * GET / — List all active sessions.
   */
  private static async _listSessions(
    req: express.Request,
    res: express.Response
  ) {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, parseInt(req.query.limit as string) || 20);
    const skip = (page - 1) * limit;

    const filter: any = {};
    if (req.query.active !== undefined) filter.isActive = req.query.active === "true";
    else filter.isActive = true; // Default to active only

    if (req.query.deviceType) filter["device.type"] = req.query.deviceType;
    if (req.query.platform) filter["device.platform"] = req.query.platform;

    const [sessions, total] = await Promise.all([
      SessionModel.find(filter)
        .sort({ lastActiveAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("userId", "fullName username email profilePhoto")
        .lean(),
      SessionModel.countDocuments(filter),
    ]);

    return res.status(200).json(
      successResponse({ sessions, total, page, pages: Math.ceil(total / limit) })
    );
  }

  /**
   * GET /stats — Session analytics.
   */
  private static async _getStats(
    req: express.Request,
    res: express.Response
  ) {
    const admin = await Admin.findById(req.admin?._id);
    if (!admin?.hasPermission("canViewAnalytics")) {
      throw new ApiError(403, "Insufficient permissions");
    }

    const activeFilter = { isActive: true };

    const [
      totalActive,
      byDeviceType,
      byPlatform,
      byBrowser,
      byCountry,
    ] = await Promise.all([
      SessionModel.countDocuments(activeFilter),
      SessionModel.aggregate([
        { $match: activeFilter },
        { $group: { _id: "$device.type", count: { $sum: 1 } } },
        { $project: { type: "$_id", count: 1, _id: 0 } },
      ]),
      SessionModel.aggregate([
        { $match: activeFilter },
        { $group: { _id: "$device.platform", count: { $sum: 1 } } },
        { $project: { platform: "$_id", count: 1, _id: 0 } },
      ]),
      SessionModel.aggregate([
        { $match: activeFilter },
        { $group: { _id: "$device.browser", count: { $sum: 1 } } },
        { $project: { browser: "$_id", count: 1, _id: 0 } },
      ]),
      SessionModel.aggregate([
        { $match: activeFilter },
        { $group: { _id: "$location.country", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
        { $project: { country: "$_id", count: 1, _id: 0 } },
      ]),
    ]);

    return res.status(200).json(
      successResponse({ totalActive, byDeviceType, byPlatform, byBrowser, byCountry })
    );
  }

  /**
   * POST /:sessionId/revoke — Revoke a specific session.
   */
  private static async _revokeSession(
    req: express.Request,
    res: express.Response
  ) {
    const session = await SessionModel.findById(req.params.sessionId);
    if (!session) throw new ApiError(404, "Session not found");

    session.isActive = false;
    session.revokedAt = new Date();
    session.revokedReason = "admin_revoked";
    await session.save();

    try {
      await RedisManager.removeActiveSession(session.userId.toString(), (session._id as string).toString());
    } catch {
      // Non-critical
    }

    return res.status(200).json(
      successResponse({ sessionId: session._id }, "Session revoked")
    );
  }

  /**
   * POST /revoke-bulk — Revoke multiple sessions.
   */
  private static async _revokeBulk(
    req: express.Request,
    res: express.Response
  ) {
    const { sessionIds, reason } = req.body;
    if (!Array.isArray(sessionIds) || sessionIds.length === 0) {
      throw new ApiError(400, "sessionIds array is required");
    }
    if (sessionIds.length > 100) {
      throw new ApiError(400, "Maximum 100 sessions per batch");
    }

    const result = await SessionModel.updateMany(
      { _id: { $in: sessionIds }, isActive: true },
      {
        isActive: false,
        revokedAt: new Date(),
        revokedReason: reason || "admin_bulk_revoked",
      }
    );

    return res.status(200).json(
      successResponse(
        { revokedCount: result.modifiedCount },
        "Sessions revoked"
      )
    );
  }

  // Public wrappers
  static listSessions = AsyncHandler.wrap(AdminSessionManagementController._listSessions);
  static getStats = AsyncHandler.wrap(AdminSessionManagementController._getStats);
  static revokeSession = AsyncHandler.wrap(AdminSessionManagementController._revokeSession);
  static revokeBulk = AsyncHandler.wrap(AdminSessionManagementController._revokeBulk);
}

export default AdminSessionManagementController;
