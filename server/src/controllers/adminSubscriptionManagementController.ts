import express from "express";
import { SubscriptionModel } from "../models/subscriptionModel";
import { SubscriptionHistoryModel } from "../models/subscriptionHistoryModel";
import Admin from "../models/adminModel";
import { ApiError } from "../utils/apiError";
import { AsyncHandler } from "../utils/AsyncHandler";
import { successResponse } from "../utils/apiResponse";

class AdminSubscriptionManagementController {
  /**
   * GET / — List all subscriptions with filters.
   */
  private static async _listSubscriptions(
    req: express.Request,
    res: express.Response
  ) {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, parseInt(req.query.limit as string) || 20);
    const skip = (page - 1) * limit;

    const filter: any = {};
    if (req.query.type) filter.type = req.query.type;
    if (req.query.status) filter.status = req.query.status;
    if (req.query.paymentStatus) filter.paymentStatus = req.query.paymentStatus;

    if (req.query.from || req.query.to) {
      filter.createdAt = {};
      if (req.query.from) filter.createdAt.$gte = new Date(req.query.from as string);
      if (req.query.to) filter.createdAt.$lte = new Date(req.query.to as string);
    }

    const [subscriptions, total] = await Promise.all([
      SubscriptionModel.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("userId", "fullName username email profilePhoto")
        .lean(),
      SubscriptionModel.countDocuments(filter),
    ]);

    return res.status(200).json(
      successResponse({ subscriptions, total, page, pages: Math.ceil(total / limit) })
    );
  }

  /**
   * GET /stats — Subscription analytics.
   */
  private static async _getStats(
    req: express.Request,
    res: express.Response
  ) {
    const admin = await Admin.findById(req.admin?._id);
    if (!admin?.hasPermission("canViewAnalytics")) {
      throw new ApiError(403, "Insufficient permissions");
    }

    const [byType, byStatus, revenueTotal, monthlyRevenue] = await Promise.all([
      SubscriptionModel.aggregate([
        { $group: { _id: "$type", count: { $sum: 1 } } },
        { $project: { type: "$_id", count: 1, _id: 0 } },
      ]),
      SubscriptionModel.aggregate([
        { $group: { _id: "$status", count: { $sum: 1 } } },
        { $project: { status: "$_id", count: 1, _id: 0 } },
      ]),
      SubscriptionModel.aggregate([
        { $match: { paymentStatus: "Completed" } },
        { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } },
      ]),
      SubscriptionModel.aggregate([
        { $match: { paymentStatus: "Completed" } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
            revenue: { $sum: "$amount" },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: -1 } },
        { $limit: 12 },
        { $project: { month: "$_id", revenue: 1, count: 1, _id: 0 } },
      ]),
    ]);

    return res.status(200).json(
      successResponse({
        byType,
        byStatus,
        totalRevenue: revenueTotal[0]?.total || 0,
        totalPaidSubscriptions: revenueTotal[0]?.count || 0,
        monthlyRevenue,
      })
    );
  }

  /**
   * GET /:subscriptionId — Single subscription detail.
   */
  private static async _getDetail(
    req: express.Request,
    res: express.Response
  ) {
    const subscription = await SubscriptionModel.findById(req.params.subscriptionId)
      .populate("userId", "fullName username email profilePhoto phone")
      .lean();

    if (!subscription) throw new ApiError(404, "Subscription not found");

    return res.status(200).json(successResponse({ subscription }));
  }

  /**
   * GET /user/:userId — Subscription history for a user.
   */
  private static async _getUserSubscriptions(
    req: express.Request,
    res: express.Response
  ) {
    const { userId } = req.params;

    const [current, history] = await Promise.all([
      SubscriptionModel.findOne({ userId, status: "Active" }).lean(),
      SubscriptionModel.find({ userId })
        .sort({ createdAt: -1 })
        .lean(),
    ]);

    return res.status(200).json(
      successResponse({ current, history })
    );
  }

  /**
   * PATCH /:subscriptionId/extend — Extend a subscription.
   */
  private static async _extendSubscription(
    req: express.Request,
    res: express.Response
  ) {
    const admin = await Admin.findById(req.admin?._id);
    if (!admin?.hasPermission("canManageContent")) {
      throw new ApiError(403, "Insufficient permissions");
    }

    const { days, reason } = req.body;
    if (!days || days < 1 || days > 365) {
      throw new ApiError(400, "Days must be between 1 and 365");
    }

    const subscription = await SubscriptionModel.findById(req.params.subscriptionId);
    if (!subscription) throw new ApiError(404, "Subscription not found");

    const oldEndDate = subscription.endDate;
    const newEndDate = new Date(subscription.endDate);
    newEndDate.setDate(newEndDate.getDate() + days);
    subscription.endDate = newEndDate;

    // If it was expired, reactivate
    if (subscription.status === "Expired" && newEndDate > new Date()) {
      subscription.status = "Active";
    }

    await subscription.save();

    return res.status(200).json(
      successResponse(
        {
          subscriptionId: subscription._id,
          oldEndDate,
          newEndDate,
          daysAdded: days,
          reason: reason || "Admin extension",
        },
        "Subscription extended"
      )
    );
  }

  // Public wrappers
  static listSubscriptions = AsyncHandler.wrap(AdminSubscriptionManagementController._listSubscriptions);
  static getStats = AsyncHandler.wrap(AdminSubscriptionManagementController._getStats);
  static getDetail = AsyncHandler.wrap(AdminSubscriptionManagementController._getDetail);
  static getUserSubscriptions = AsyncHandler.wrap(AdminSubscriptionManagementController._getUserSubscriptions);
  static extendSubscription = AsyncHandler.wrap(AdminSubscriptionManagementController._extendSubscription);
}

export default AdminSubscriptionManagementController;
