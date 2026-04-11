import express from "express";
import { NotificationModel } from "../models/notificationModel";
import Admin from "../models/adminModel";
import { ApiError } from "../utils/apiError";
import { AsyncHandler } from "../utils/AsyncHandler";
import { successResponse } from "../utils/apiResponse";

class AdminNotificationManagementController {
  /**
   * GET / — List sent notifications with filters.
   */
  private static async _listNotifications(
    req: express.Request,
    res: express.Response
  ) {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, parseInt(req.query.limit as string) || 20);
    const skip = (page - 1) * limit;

    const filter: any = {};
    if (req.query.type) filter.type = req.query.type;
    if (req.query.recipientId) filter.recipientId = req.query.recipientId;

    if (req.query.from || req.query.to) {
      filter.createdAt = {};
      if (req.query.from) filter.createdAt.$gte = new Date(req.query.from as string);
      if (req.query.to) filter.createdAt.$lte = new Date(req.query.to as string);
    }

    const [notifications, total] = await Promise.all([
      NotificationModel.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("recipientId", "fullName username")
        .lean(),
      NotificationModel.countDocuments(filter),
    ]);

    return res.status(200).json(
      successResponse({ notifications, total, page, pages: Math.ceil(total / limit) })
    );
  }

  /**
   * GET /stats — Notification analytics.
   */
  private static async _getStats(
    req: express.Request,
    res: express.Response
  ) {
    const admin = await Admin.findById(req.admin?._id);
    if (!admin?.hasPermission("canSendNotifications")) {
      throw new ApiError(403, "Insufficient permissions");
    }

    const [byType, readStats, total] = await Promise.all([
      NotificationModel.aggregate([
        { $group: { _id: "$type", count: { $sum: 1 } } },
        { $project: { type: "$_id", count: 1, _id: 0 } },
      ]),
      NotificationModel.aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            read: { $sum: { $cond: ["$read", 1, 0] } },
          },
        },
      ]),
      NotificationModel.countDocuments(),
    ]);

    const readRate = readStats[0]
      ? Math.round((readStats[0].read / readStats[0].total) * 100)
      : 0;

    return res.status(200).json(
      successResponse({ byType, total, readRate })
    );
  }

  /**
   * GET /:notificationId — Single notification detail.
   */
  private static async _getDetail(
    req: express.Request,
    res: express.Response
  ) {
    const notification = await NotificationModel.findById(req.params.notificationId)
      .populate("recipientId", "fullName username email")
      .lean();

    if (!notification) throw new ApiError(404, "Notification not found");

    return res.status(200).json(successResponse({ notification }));
  }

  // Public wrappers
  static listNotifications = AsyncHandler.wrap(AdminNotificationManagementController._listNotifications);
  static getStats = AsyncHandler.wrap(AdminNotificationManagementController._getStats);
  static getDetail = AsyncHandler.wrap(AdminNotificationManagementController._getDetail);
}

export default AdminNotificationManagementController;
