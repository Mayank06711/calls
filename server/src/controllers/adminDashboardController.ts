import express from "express";
import { UserModel } from "../models/userModel";
import { ExpertModel } from "../models/expertModel";
import { ExpertApplicationModel } from "../models/expertApplicationModel";
import { SubscriptionModel } from "../models/subscriptionModel";
import { SessionModel } from "../models/sessionModel";
import { ExpertComplaintModel } from "../models/expertComplaintModel";
import BugFeedback from "../models/bugFeedbackModel";
import ExpertFeedback from "../models/expertFeedbackModel";
import { ClothingItemModel } from "../models/clothModel";
import { OutfitModel } from "../models/outfitModel";
import { NotificationModel } from "../models/notificationModel";
import Admin from "../models/adminModel";
import { ApiError } from "../utils/apiError";
import { AsyncHandler } from "../utils/AsyncHandler";
import { successResponse } from "../utils/apiResponse";

class AdminDashboardController {
  /**
   * GET /overview — Aggregate counts for dashboard cards.
   */
  private static async _getOverview(
    req: express.Request,
    res: express.Response
  ) {
    const admin = await Admin.findById(req.admin?._id);
    if (!admin?.hasPermission("canViewAnalytics")) {
      throw new ApiError(403, "Insufficient permissions");
    }

    const [
      totalUsers,
      activeUsers,
      totalExperts,
      activeSubscriptions,
      pendingApplications,
      openComplaints,
      totalBugReports,
      totalClothingItems,
      totalOutfits,
    ] = await Promise.all([
      UserModel.countDocuments(),
      UserModel.countDocuments({ isActive: true }),
      ExpertModel.countDocuments(),
      SubscriptionModel.countDocuments({ status: "Active" }),
      ExpertApplicationModel.countDocuments({ status: "submitted" }),
      ExpertComplaintModel.countDocuments({ status: { $in: ["pending", "under_review"] } }),
      BugFeedback.countDocuments(),
      ClothingItemModel.countDocuments(),
      OutfitModel.countDocuments(),
    ]);

    // Revenue from completed subscriptions
    const revenueResult = await SubscriptionModel.aggregate([
      { $match: { paymentStatus: "Completed" } },
      { $group: { _id: null, totalRevenue: { $sum: "$amount" } } },
    ]);
    const totalRevenue = revenueResult[0]?.totalRevenue || 0;

    // New users today
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const newUsersToday = await UserModel.countDocuments({
      createdAt: { $gte: todayStart },
    });

    return res.status(200).json(
      successResponse({
        totalUsers,
        activeUsers,
        newUsersToday,
        totalExperts,
        activeSubscriptions,
        totalRevenue,
        pendingApplications,
        openComplaints,
        totalBugReports,
        totalClothingItems,
        totalOutfits,
      })
    );
  }

  /**
   * GET /user-growth — Time-series user registrations.
   * Query: ?period=7d|30d|90d|1y
   */
  private static async _getUserGrowth(
    req: express.Request,
    res: express.Response
  ) {
    const admin = await Admin.findById(req.admin?._id);
    if (!admin?.hasPermission("canViewAnalytics")) {
      throw new ApiError(403, "Insufficient permissions");
    }

    const period = (req.query.period as string) || "30d";
    const days = period === "7d" ? 7 : period === "90d" ? 90 : period === "1y" ? 365 : 30;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const growth = await UserModel.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      { $project: { date: "$_id", count: 1, _id: 0 } },
    ]);

    return res.status(200).json(successResponse({ growth, period }));
  }

  /**
   * GET /subscription-revenue — Revenue by type + time.
   * Query: ?period=30d|90d|1y
   */
  private static async _getSubscriptionRevenue(
    req: express.Request,
    res: express.Response
  ) {
    const admin = await Admin.findById(req.admin?._id);
    if (!admin?.hasPermission("canViewAnalytics")) {
      throw new ApiError(403, "Insufficient permissions");
    }

    const period = (req.query.period as string) || "30d";
    const days = period === "90d" ? 90 : period === "1y" ? 365 : 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [revenueByType, revenueOverTime, distributionByStatus] = await Promise.all([
      SubscriptionModel.aggregate([
        { $match: { paymentStatus: "Completed", createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: "$type",
            totalRevenue: { $sum: "$amount" },
            count: { $sum: 1 },
          },
        },
        { $project: { type: "$_id", totalRevenue: 1, count: 1, _id: 0 } },
      ]),
      SubscriptionModel.aggregate([
        { $match: { paymentStatus: "Completed", createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            revenue: { $sum: "$amount" },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
        { $project: { date: "$_id", revenue: 1, count: 1, _id: 0 } },
      ]),
      SubscriptionModel.aggregate([
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
          },
        },
        { $project: { status: "$_id", count: 1, _id: 0 } },
      ]),
    ]);

    return res.status(200).json(
      successResponse({ revenueByType, revenueOverTime, distributionByStatus, period })
    );
  }

  /**
   * GET /expert-stats — Application pipeline + expert metrics.
   */
  private static async _getExpertStats(
    req: express.Request,
    res: express.Response
  ) {
    const admin = await Admin.findById(req.admin?._id);
    if (!admin?.hasPermission("canViewAnalytics")) {
      throw new ApiError(403, "Insufficient permissions");
    }

    const [applicationsByStatus, totalExperts, avgRatingResult] = await Promise.all([
      ExpertApplicationModel.aggregate([
        { $group: { _id: "$status", count: { $sum: 1 } } },
        { $project: { status: "$_id", count: 1, _id: 0 } },
      ]),
      ExpertModel.countDocuments(),
      ExpertFeedback.aggregate([
        { $group: { _id: null, avgRating: { $avg: "$stars" }, totalReviews: { $sum: 1 } } },
      ]),
    ]);

    return res.status(200).json(
      successResponse({
        applicationsByStatus,
        totalExperts,
        avgRating: avgRatingResult[0]?.avgRating || 0,
        totalReviews: avgRatingResult[0]?.totalReviews || 0,
      })
    );
  }

  /**
   * GET /platform-activity — Sessions by device, platform, geographic.
   */
  private static async _getPlatformActivity(
    req: express.Request,
    res: express.Response
  ) {
    const admin = await Admin.findById(req.admin?._id);
    if (!admin?.hasPermission("canViewAnalytics")) {
      throw new ApiError(403, "Insufficient permissions");
    }

    const [byDeviceType, byPlatform, byBrowser, byCountry, activeSessions] =
      await Promise.all([
        SessionModel.aggregate([
          { $match: { isActive: true } },
          { $group: { _id: "$device.type", count: { $sum: 1 } } },
          { $project: { type: "$_id", count: 1, _id: 0 } },
        ]),
        SessionModel.aggregate([
          { $match: { isActive: true } },
          { $group: { _id: "$device.platform", count: { $sum: 1 } } },
          { $project: { platform: "$_id", count: 1, _id: 0 } },
        ]),
        SessionModel.aggregate([
          { $match: { isActive: true } },
          { $group: { _id: "$device.browser", count: { $sum: 1 } } },
          { $project: { browser: "$_id", count: 1, _id: 0 } },
        ]),
        SessionModel.aggregate([
          { $match: { isActive: true } },
          { $group: { _id: "$location.country", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 10 },
          { $project: { country: "$_id", count: 1, _id: 0 } },
        ]),
        SessionModel.countDocuments({ isActive: true }),
      ]);

    return res.status(200).json(
      successResponse({
        activeSessions,
        byDeviceType,
        byPlatform,
        byBrowser,
        byCountry,
      })
    );
  }

  /**
   * GET /recent-activity — Latest signups, subscriptions, complaints.
   */
  private static async _getRecentActivity(
    req: express.Request,
    res: express.Response
  ) {
    const admin = await Admin.findById(req.admin?._id);
    if (!admin?.hasPermission("canViewAnalytics")) {
      throw new ApiError(403, "Insufficient permissions");
    }

    const limit = Math.min(parseInt(req.query.limit as string) || 10, 30);

    const [recentUsers, recentSubscriptions, recentApplications, recentComplaints] =
      await Promise.all([
        UserModel.find()
          .sort({ createdAt: -1 })
          .limit(limit)
          .select("fullName username email createdAt isExpert isAdmin")
          .lean(),
        SubscriptionModel.find()
          .sort({ createdAt: -1 })
          .limit(limit)
          .populate("userId", "fullName username")
          .select("type status amount createdAt userId")
          .lean(),
        ExpertApplicationModel.find()
          .sort({ createdAt: -1 })
          .limit(limit)
          .populate("user", "fullName username")
          .select("status submittedAt user personalInfo.fullName")
          .lean(),
        ExpertComplaintModel.find()
          .sort({ createdAt: -1 })
          .limit(limit)
          .populate("complainant expert", "fullName username")
          .select("status category createdAt complainant expert")
          .lean(),
      ]);

    return res.status(200).json(
      successResponse({
        recentUsers,
        recentSubscriptions,
        recentApplications,
        recentComplaints,
      })
    );
  }

  // Public wrappers
  static getOverview = AsyncHandler.wrap(AdminDashboardController._getOverview);
  static getUserGrowth = AsyncHandler.wrap(AdminDashboardController._getUserGrowth);
  static getSubscriptionRevenue = AsyncHandler.wrap(AdminDashboardController._getSubscriptionRevenue);
  static getExpertStats = AsyncHandler.wrap(AdminDashboardController._getExpertStats);
  static getPlatformActivity = AsyncHandler.wrap(AdminDashboardController._getPlatformActivity);
  static getRecentActivity = AsyncHandler.wrap(AdminDashboardController._getRecentActivity);
}

export default AdminDashboardController;
