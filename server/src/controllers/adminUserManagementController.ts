import express from "express";
import { UserModel } from "../models/userModel";
import { SubscriptionModel } from "../models/subscriptionModel";
import { SessionModel } from "../models/sessionModel";
import { ClothingItemModel } from "../models/clothModel";
import { OutfitModel } from "../models/outfitModel";
import { ExpertModel } from "../models/expertModel";
import BugFeedback from "../models/bugFeedbackModel";
import ExpertFeedback from "../models/expertFeedbackModel";
import Admin from "../models/adminModel";
import { ApiError } from "../utils/apiError";
import { AsyncHandler } from "../utils/AsyncHandler";
import { successResponse } from "../utils/apiResponse";
import { RedisManager } from "../utils/redisClient";

class AdminUserManagementController {
  /**
   * GET / — List all users with search, filter, pagination.
   */
  private static async _listUsers(
    req: express.Request,
    res: express.Response
  ) {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, parseInt(req.query.limit as string) || 20);
    const skip = (page - 1) * limit;
    const sortBy = (req.query.sortBy as string) || "createdAt";
    const sortOrder = req.query.sortOrder === "asc" ? 1 : -1;
    const search = req.query.search as string;

    const filter: any = {};

    // Boolean filters
    if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === "true";
    if (req.query.isAdmin !== undefined) filter.isAdmin = req.query.isAdmin === "true";
    if (req.query.isExpert !== undefined) filter.isExpert = req.query.isExpert === "true";
    if (req.query.isSubscribed !== undefined) filter.isSubscribed = req.query.isSubscribed === "true";
    if (req.query.isBlockedByAdmin !== undefined) filter.isBlockedByAdmin = req.query.isBlockedByAdmin === "true";

    // Search
    if (search) {
      filter.$or = [
        { fullName: { $regex: search, $options: "i" } },
        { username: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phoneNumber: { $regex: search, $options: "i" } },
      ];
    }

    const [users, total] = await Promise.all([
      UserModel.find(filter)
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(limit)
        .select("fullName username email phoneNumber profilePhoto gender city isActive isAdmin isExpert isSubscribed isBlockedByAdmin createdAt")
        .lean(),
      UserModel.countDocuments(filter),
    ]);

    return res.status(200).json(
      successResponse({ users, total, page, pages: Math.ceil(total / limit) })
    );
  }

  /**
   * GET /:userId — Detailed user profile with related data.
   */
  private static async _getUserDetail(
    req: express.Request,
    res: express.Response
  ) {
    const { userId } = req.params;

    const user = await UserModel.findById(userId)
      .select("-password -__v")
      .lean();

    if (!user) throw new ApiError(404, "User not found");

    const [
      subscription,
      sessionCount,
      clothingCount,
      outfitCount,
      expertProfile,
      bugFeedbackCount,
      expertFeedbackCount,
    ] = await Promise.all([
      SubscriptionModel.findOne({ userId, status: "Active" }).lean(),
      SessionModel.countDocuments({ userId, isActive: true }),
      ClothingItemModel.countDocuments({ user: userId }),
      OutfitModel.countDocuments({ user: userId }),
      ExpertModel.findOne({ user: userId }).lean(),
      BugFeedback.countDocuments({ user: userId }),
      ExpertFeedback.countDocuments({ user: userId }),
    ]);

    return res.status(200).json(
      successResponse({
        user,
        subscription,
        stats: {
          activeSessions: sessionCount,
          clothingItems: clothingCount,
          outfits: outfitCount,
          bugReports: bugFeedbackCount,
          expertReviews: expertFeedbackCount,
        },
        expertProfile,
      })
    );
  }

  /**
   * GET /:userId/sessions — List sessions for a user.
   */
  private static async _getUserSessions(
    req: express.Request,
    res: express.Response
  ) {
    const { userId } = req.params;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, parseInt(req.query.limit as string) || 20);
    const skip = (page - 1) * limit;

    const filter: any = { userId };
    if (req.query.active !== undefined) filter.isActive = req.query.active === "true";

    const [sessions, total] = await Promise.all([
      SessionModel.find(filter)
        .sort({ lastActiveAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      SessionModel.countDocuments(filter),
    ]);

    return res.status(200).json(
      successResponse({ sessions, total, page, pages: Math.ceil(total / limit) })
    );
  }

  /**
   * POST /:userId/force-logout — Revoke all sessions for a user.
   */
  private static async _forceLogout(
    req: express.Request,
    res: express.Response
  ) {
    const { userId } = req.params;

    const user = await UserModel.findById(userId);
    if (!user) throw new ApiError(404, "User not found");

    // Revoke all active sessions in DB
    const result = await SessionModel.updateMany(
      { userId, isActive: true },
      {
        isActive: false,
        revokedAt: new Date(),
        revokedReason: "admin_forced",
      }
    );

    // Clear Redis sessions
    try {
      await RedisManager.removeAllActiveSessions(userId);
    } catch {
      // Redis might not have the sessions — non-critical
    }

    return res.status(200).json(
      successResponse(
        { revokedCount: result.modifiedCount },
        "User sessions revoked"
      )
    );
  }

  /**
   * DELETE /:userId — Soft-delete user.
   */
  private static async _softDeleteUser(
    req: express.Request,
    res: express.Response
  ) {
    const admin = await Admin.findById(req.admin?._id);
    if (!admin?.hasPermission("canDeleteUsers")) {
      throw new ApiError(403, "Insufficient permissions");
    }

    const { userId } = req.params;
    const user = await UserModel.findById(userId);
    if (!user) throw new ApiError(404, "User not found");
    if (user.isAdmin) throw new ApiError(400, "Cannot delete an admin user");

    user.isActive = false;
    await user.save();

    // Revoke all sessions
    await SessionModel.updateMany(
      { userId, isActive: true },
      { isActive: false, revokedAt: new Date(), revokedReason: "admin_deleted" }
    );

    // Clear Redis sessions
    try {
      await RedisManager.removeAllActiveSessions(userId);
    } catch {
      // Redis might not have the sessions — non-critical
    }

    return res.status(200).json(
      successResponse({ userId }, "User deactivated")
    );
  }

  /**
   * POST /:userId/reactivate — Reactivate a soft-deleted user.
   */
  private static async _reactivateUser(
    req: express.Request,
    res: express.Response
  ) {
    const admin = await Admin.findById(req.admin?._id);
    if (!admin?.hasPermission("canDeleteUsers")) {
      throw new ApiError(403, "Insufficient permissions");
    }

    const { userId } = req.params;
    const user = await UserModel.findById(userId);
    if (!user) throw new ApiError(404, "User not found");

    if (user.isActive) {
      throw new ApiError(400, "User is already active");
    }

    user.isActive = true;
    await user.save();

    return res.status(200).json(
      successResponse({ userId }, "User reactivated")
    );
  }

  /**
   * POST /:userId/sessions/:sessionId/revoke — Revoke a single session for a user.
   */
  private static async _revokeUserSession(
    req: express.Request,
    res: express.Response
  ) {
    const { userId, sessionId } = req.params;

    const user = await UserModel.findById(userId);
    if (!user) throw new ApiError(404, "User not found");

    const session = await SessionModel.findOne({ _id: sessionId, userId });
    if (!session) throw new ApiError(404, "Session not found for this user");

    if (!session.isActive) {
      throw new ApiError(400, "Session is already revoked");
    }

    session.isActive = false;
    session.revokedAt = new Date();
    session.revokedReason = "admin_revoked";
    await session.save();

    // Clear from Redis
    try {
      await RedisManager.removeActiveSession(userId, (session._id as string).toString());
    } catch {
      // Redis might not have the session — non-critical
    }

    return res.status(200).json(
      successResponse({ sessionId, userId }, "Session revoked")
    );
  }

  /**
   * GET /search — Autocomplete search for users.
   */
  private static async _searchUsers(
    req: express.Request,
    res: express.Response
  ) {
    const q = req.query.q as string;
    if (!q || q.length < 2) {
      return res.status(200).json(successResponse({ users: [] }));
    }

    const users = await UserModel.find({
      $or: [
        { fullName: { $regex: q, $options: "i" } },
        { username: { $regex: q, $options: "i" } },
        { email: { $regex: q, $options: "i" } },
      ],
    })
      .limit(10)
      .select("fullName username email profilePhoto isExpert isAdmin")
      .lean();

    return res.status(200).json(successResponse({ users }));
  }

  // Public wrappers
  static listUsers = AsyncHandler.wrap(AdminUserManagementController._listUsers);
  static getUserDetail = AsyncHandler.wrap(AdminUserManagementController._getUserDetail);
  static getUserSessions = AsyncHandler.wrap(AdminUserManagementController._getUserSessions);
  static forceLogout = AsyncHandler.wrap(AdminUserManagementController._forceLogout);
  static softDeleteUser = AsyncHandler.wrap(AdminUserManagementController._softDeleteUser);
  static reactivateUser = AsyncHandler.wrap(AdminUserManagementController._reactivateUser);
  static revokeUserSession = AsyncHandler.wrap(AdminUserManagementController._revokeUserSession);
  static searchUsers = AsyncHandler.wrap(AdminUserManagementController._searchUsers);
}

export default AdminUserManagementController;
