import express from "express";
import { CallModel } from "../models/callModel";
import { ServiceModel } from "../models/callsModel";
import { SubscriptionModel } from "../models/subscriptionModel";
import { SubscriptionHistoryModel } from "../models/subscriptionHistoryModel";
import { ExpertTipModel } from "../models/expertTipModel";
import ExpertFeedbackModel from "../models/expertFeedbackModel";
import { ExpertComplaintModel } from "../models/expertComplaintModel";
import { ExpertBlockRequestModel } from "../models/expertBlockRequestModel";
import { SessionModel } from "../models/sessionModel";
import { UserModel } from "../models/userModel";
import { ApiError } from "../utils/apiError";
import { AsyncHandler } from "../utils/AsyncHandler";
import { successResponse } from "../utils/apiResponse";
import { Types } from "mongoose";

class HistoryController {
  // ─── User History ─────────────────────────────────────────────

  /**
   * GET /api/v1/history/calls
   * Call history for the authenticated user (as caller or callee).
   * Query: ?page=1&limit=20&status=completed
   */
  private static async _getCallHistory(req: express.Request, res: express.Response) {
    const userId = req.user?._id;
    if (!userId) throw new ApiError(401, "Unauthorized");

    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;
    const statusFilter = req.query.status as string;

    const filter: any = {
      $or: [{ caller: userId }, { callee: userId }],
    };
    if (statusFilter) filter.status = statusFilter;

    const [calls, total] = await Promise.all([
      CallModel.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("caller", "fullName profilePhotoId isExpert")
        .populate("callee", "fullName profilePhotoId isExpert")
        .lean(),
      CallModel.countDocuments(filter),
    ]);

    // Compute summary stats
    const stats = await CallModel.aggregate([
      { $match: { $or: [{ caller: new Types.ObjectId(String(userId)) }, { callee: new Types.ObjectId(String(userId)) }] } },
      {
        $group: {
          _id: null,
          totalCalls: { $sum: 1 },
          completedCalls: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } },
          missedCalls: { $sum: { $cond: [{ $eq: ["$status", "missed"] }, 1, 0] } },
          totalDurationSeconds: { $sum: { $ifNull: ["$duration", 0] } },
          avgDurationSeconds: { $avg: { $cond: [{ $gt: ["$duration", 0] }, "$duration", null] } },
        },
      },
    ]);

    return res.status(200).json(
      successResponse({
        calls,
        stats: stats[0] || { totalCalls: 0, completedCalls: 0, missedCalls: 0, totalDurationSeconds: 0, avgDurationSeconds: 0 },
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      }, "Call history fetched")
    );
  }

  /**
   * GET /api/v1/history/subscriptions
   * Subscription history for the authenticated user.
   */
  private static async _getSubscriptionHistory(req: express.Request, res: express.Response) {
    const userId = req.user?._id;
    if (!userId) throw new ApiError(401, "Unauthorized");

    const [currentSub, history] = await Promise.all([
      SubscriptionModel.findOne({ userId, status: "Active" }).lean(),
      SubscriptionHistoryModel.findOne({ userId }).lean(),
    ]);

    return res.status(200).json(
      successResponse({
        currentSubscription: currentSub || null,
        history: history?.subscriptions || [],
        statistics: history?.statistics || null,
      }, "Subscription history fetched")
    );
  }

  /**
   * GET /api/v1/history/payments
   * Unified payment history: subscriptions + tips sent.
   * Query: ?page=1&limit=20
   */
  private static async _getPaymentHistory(req: express.Request, res: express.Response) {
    const userId = req.user?._id;
    if (!userId) throw new ApiError(401, "Unauthorized");

    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;

    // Fetch tips sent by this user
    const [tips, tipCount, tipStats] = await Promise.all([
      ExpertTipModel.find({ tipper: userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("expert", "fullName profilePhotoId")
        .lean(),
      ExpertTipModel.countDocuments({ tipper: userId }),
      ExpertTipModel.aggregate([
        { $match: { tipper: new Types.ObjectId(String(userId)) } },
        {
          $group: {
            _id: null,
            totalTipped: { $sum: "$amount" },
            completedTips: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, "$amount", 0] } },
            tipCount: { $sum: 1 },
          },
        },
      ]),
    ]);

    // Subscription payments from history
    const history = await SubscriptionHistoryModel.findOne({ userId }).lean();
    const subscriptionPayments = (history?.subscriptions || [])
      .filter((s: any) => s.paymentStatus === "Completed")
      .map((s: any) => ({
        type: "subscription",
        planType: s.type,
        amount: s.amount,
        paymentMethod: s.paymentMethod,
        paymentId: s.paymentId,
        date: s.startDate,
        status: s.paymentStatus,
      }));

    return res.status(200).json(
      successResponse({
        tips: { items: tips, total: tipCount, stats: tipStats[0] || { totalTipped: 0, completedTips: 0, tipCount: 0 } },
        subscriptionPayments,
        pagination: { page, limit, total: tipCount, totalPages: Math.ceil(tipCount / limit) },
      }, "Payment history fetched")
    );
  }

  /**
   * GET /api/v1/history/sessions
   * Login session history for the authenticated user.
   * Query: ?page=1&limit=20&active=true
   */
  private static async _getSessionHistory(req: express.Request, res: express.Response) {
    const userId = req.user?._id;
    if (!userId) throw new ApiError(401, "Unauthorized");

    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;
    const activeOnly = req.query.active === "true";

    const filter: any = { userId };
    if (activeOnly) filter.isActive = true;

    const [sessions, total] = await Promise.all([
      SessionModel.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select("device location isActive lastActiveAt loginMethod createdAt expiresAt revokedAt revokedReason")
        .lean(),
      SessionModel.countDocuments(filter),
    ]);

    return res.status(200).json(
      successResponse({
        sessions,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      }, "Session history fetched")
    );
  }

  /**
   * GET /api/v1/history/ratings
   * Ratings given by the authenticated user to experts.
   * Query: ?page=1&limit=20
   */
  private static async _getRatingsGiven(req: express.Request, res: express.Response) {
    const userId = req.user?._id;
    if (!userId) throw new ApiError(401, "Unauthorized");

    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;

    const [ratings, total] = await Promise.all([
      ExpertFeedbackModel.find({ user: userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("expert", "fullName profilePhotoId")
        .lean(),
      ExpertFeedbackModel.countDocuments({ user: userId }),
    ]);

    return res.status(200).json(
      successResponse({
        ratings,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      }, "Ratings given fetched")
    );
  }

  // ─── Expert History ───────────────────────────────────────────

  /**
   * GET /api/v1/history/expert/performance
   * Expert's rating performance, trends, and aspect breakdown.
   */
  private static async _getExpertPerformance(req: express.Request, res: express.Response) {
    const userId = req.user?._id;
    if (!userId) throw new ApiError(401, "Unauthorized");

    const user = await UserModel.findById(userId).select("isExpert").lean();
    if (!(user as any)?.isExpert) throw new ApiError(403, "Expert access required");

    // Aggregated rating stats
    const ratingStats = await (ExpertFeedbackModel as any).getExpertRating(userId);

    // Aspect breakdown
    const aspectBreakdown = await ExpertFeedbackModel.aggregate([
      { $match: { expert: new Types.ObjectId(String(userId)) } },
      { $unwind: "$aspects" },
      { $group: { _id: "$aspects", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    // Monthly rating trend (last 12 months)
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const ratingTrend = await ExpertFeedbackModel.aggregate([
      { $match: { expert: new Types.ObjectId(String(userId)), createdAt: { $gte: twelveMonthsAgo } } },
      {
        $group: {
          _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } },
          avgRating: { $avg: "$stars" },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    // Recent reviews
    const recentReviews = await ExpertFeedbackModel.find({ expert: userId })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate("user", "fullName profilePhotoId")
      .lean();

    return res.status(200).json(
      successResponse({
        ratingStats: ratingStats || { averageRating: 0, totalRatings: 0 },
        aspectBreakdown,
        ratingTrend,
        recentReviews,
      }, "Expert performance fetched")
    );
  }

  /**
   * GET /api/v1/history/expert/earnings
   * Expert's earnings from calls and tips.
   */
  private static async _getExpertEarnings(req: express.Request, res: express.Response) {
    const userId = req.user?._id;
    if (!userId) throw new ApiError(401, "Unauthorized");

    const user = await UserModel.findById(userId).select("isExpert").lean();
    if (!(user as any)?.isExpert) throw new ApiError(403, "Expert access required");

    // Call earnings from Service model
    const callEarnings = await ServiceModel.aggregate([
      { $match: { expert: new Types.ObjectId(String(userId)) } },
      {
        $group: {
          _id: null,
          totalCallEarnings: { $sum: "$amount" },
          totalCalls: { $sum: 1 },
          totalDurationSeconds: { $sum: "$duration" },
          avgCallDuration: { $avg: "$duration" },
        },
      },
    ]);

    // Tip earnings
    const tipEarnings = await ExpertTipModel.aggregate([
      { $match: { expert: new Types.ObjectId(String(userId)), status: "completed" } },
      {
        $group: {
          _id: null,
          totalTipEarnings: { $sum: "$amount" },
          tipCount: { $sum: 1 },
          uniqueTippers: { $addToSet: "$tipper" },
          avgTip: { $avg: "$amount" },
        },
      },
      { $addFields: { uniqueTipperCount: { $size: "$uniqueTippers" } } },
      { $project: { uniqueTippers: 0 } },
    ]);

    // Monthly earnings trend (last 12 months)
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const [callTrend, tipTrend] = await Promise.all([
      ServiceModel.aggregate([
        { $match: { expert: new Types.ObjectId(String(userId)), createdAt: { $gte: twelveMonthsAgo } } },
        {
          $group: {
            _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } },
            earnings: { $sum: "$amount" },
            calls: { $sum: 1 },
          },
        },
        { $sort: { "_id.year": 1, "_id.month": 1 } },
      ]),
      ExpertTipModel.aggregate([
        { $match: { expert: new Types.ObjectId(String(userId)), status: "completed", createdAt: { $gte: twelveMonthsAgo } } },
        {
          $group: {
            _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } },
            earnings: { $sum: "$amount" },
            tips: { $sum: 1 },
          },
        },
        { $sort: { "_id.year": 1, "_id.month": 1 } },
      ]),
    ]);

    // Recent tips with tipper info
    const recentTips = await ExpertTipModel.find({ expert: userId, status: "completed" })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate("tipper", "fullName profilePhotoId")
      .lean();

    const calls = callEarnings[0] || { totalCallEarnings: 0, totalCalls: 0, totalDurationSeconds: 0, avgCallDuration: 0 };
    const tips = tipEarnings[0] || { totalTipEarnings: 0, tipCount: 0, uniqueTipperCount: 0, avgTip: 0 };

    return res.status(200).json(
      successResponse({
        summary: {
          totalEarnings: calls.totalCallEarnings + tips.totalTipEarnings,
          callEarnings: calls.totalCallEarnings,
          tipEarnings: tips.totalTipEarnings,
          totalCalls: calls.totalCalls,
          totalHours: Math.round((calls.totalDurationSeconds / 3600) * 10) / 10,
          avgCallMinutes: Math.round((calls.avgCallDuration / 60) * 10) / 10,
          tipCount: tips.tipCount,
          uniqueTippers: tips.uniqueTipperCount,
          avgTip: Math.round(tips.avgTip * 100) / 100,
        },
        trends: { calls: callTrend, tips: tipTrend },
        recentTips,
      }, "Expert earnings fetched")
    );
  }

  /**
   * GET /api/v1/history/expert/complaints
   * Complaints filed against this expert + block requests filed by this expert.
   */
  private static async _getExpertComplaints(req: express.Request, res: express.Response) {
    const userId = req.user?._id;
    if (!userId) throw new ApiError(401, "Unauthorized");

    const user = await UserModel.findById(userId).select("isExpert").lean();
    if (!(user as any)?.isExpert) throw new ApiError(403, "Expert access required");

    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;

    // Complaints against this expert
    const [complaints, complaintCount, complaintStats] = await Promise.all([
      ExpertComplaintModel.find({ expert: userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select("complainant category reason status createdAt adminNotes")
        .populate("complainant", "fullName profilePhotoId")
        .lean(),
      ExpertComplaintModel.countDocuments({ expert: userId }),
      ExpertComplaintModel.aggregate([
        { $match: { expert: new Types.ObjectId(String(userId)) } },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    // Block requests filed by this expert
    const [blockRequests, blockCount] = await Promise.all([
      ExpertBlockRequestModel.find({ expert: userId })
        .sort({ createdAt: -1 })
        .limit(10)
        .select("blockedUser reason status adminAction createdAt")
        .populate("blockedUser", "fullName profilePhotoId")
        .lean(),
      ExpertBlockRequestModel.countDocuments({ expert: userId }),
    ]);

    return res.status(200).json(
      successResponse({
        complaints: {
          items: complaints,
          total: complaintCount,
          statusBreakdown: complaintStats,
        },
        blockRequests: {
          items: blockRequests,
          total: blockCount,
        },
        pagination: { page, limit, total: complaintCount, totalPages: Math.ceil(complaintCount / limit) },
      }, "Expert complaints fetched")
    );
  }

  /**
   * GET /api/v1/history/expert/summary
   * Full expert dashboard summary — all key metrics in one call.
   */
  private static async _getExpertSummary(req: express.Request, res: express.Response) {
    const userId = req.user?._id;
    if (!userId) throw new ApiError(401, "Unauthorized");

    const user = await UserModel.findById(userId).select("isExpert").lean();
    if (!(user as any)?.isExpert) throw new ApiError(403, "Expert access required");

    const { ExpertModel } = await import("../models/expertModel");

    const [expertDoc, ratingStats, callStats, tipStats, complaintCount, blockCount] = await Promise.all([
      ExpertModel.findOne({ user: userId }).select("experienceInYears qualification totalCustomersHandled bonus degree").lean(),
      (ExpertFeedbackModel as any).getExpertRating(userId),
      ServiceModel.aggregate([
        { $match: { expert: new Types.ObjectId(String(userId)) } },
        {
          $group: {
            _id: null,
            totalCalls: { $sum: 1 },
            totalEarnings: { $sum: "$amount" },
            totalDurationSeconds: { $sum: "$duration" },
          },
        },
      ]),
      ExpertTipModel.aggregate([
        { $match: { expert: new Types.ObjectId(String(userId)), status: "completed" } },
        {
          $group: {
            _id: null,
            totalTips: { $sum: "$amount" },
            tipCount: { $sum: 1 },
          },
        },
      ]),
      ExpertComplaintModel.countDocuments({ expert: userId }),
      ExpertBlockRequestModel.countDocuments({ expert: userId }),
    ]);

    const calls = callStats[0] || { totalCalls: 0, totalEarnings: 0, totalDurationSeconds: 0 };
    const tips = tipStats[0] || { totalTips: 0, tipCount: 0 };

    return res.status(200).json(
      successResponse({
        profile: expertDoc || null,
        rating: ratingStats || { averageRating: 0, totalRatings: 0 },
        calls: {
          total: calls.totalCalls,
          totalHours: Math.round((calls.totalDurationSeconds / 3600) * 10) / 10,
          earnings: calls.totalEarnings,
        },
        tips: {
          total: tips.totalTips,
          count: tips.tipCount,
        },
        totalEarnings: calls.totalEarnings + tips.totalTips,
        complaints: complaintCount,
        blockRequests: blockCount,
      }, "Expert summary fetched")
    );
  }

  // ─── Public wrappers ──────────────────────────────────────────

  // User endpoints
  public static getCallHistory = AsyncHandler.wrap(HistoryController._getCallHistory);
  public static getSubscriptionHistory = AsyncHandler.wrap(HistoryController._getSubscriptionHistory);
  public static getPaymentHistory = AsyncHandler.wrap(HistoryController._getPaymentHistory);
  public static getSessionHistory = AsyncHandler.wrap(HistoryController._getSessionHistory);
  public static getRatingsGiven = AsyncHandler.wrap(HistoryController._getRatingsGiven);

  // Expert endpoints
  public static getExpertPerformance = AsyncHandler.wrap(HistoryController._getExpertPerformance);
  public static getExpertEarnings = AsyncHandler.wrap(HistoryController._getExpertEarnings);
  public static getExpertComplaints = AsyncHandler.wrap(HistoryController._getExpertComplaints);
  public static getExpertSummary = AsyncHandler.wrap(HistoryController._getExpertSummary);
}

export default HistoryController;
