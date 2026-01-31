import express from "express";
import { ExpertTipModel } from "../models/expertTipModel";
import { UserModel } from "../models/userModel";
import { ApiError } from "../utils/apiError";
import { AsyncHandler } from "../utils/AsyncHandler";
import { successResponse } from "../utils/apiResponse";
import { Types } from "mongoose";

class ExpertTipController {
  /**
   * Create a tip for an expert. Payment stays "pending" until payment service confirms.
   */
  private static async _createTip(req: express.Request, res: express.Response) {
    const tipperId = req.user?._id;
    if (!tipperId) throw new ApiError(401, "Unauthorized");

    const { expertId, amount, currency, message } = req.body;

    // Validate expert exists and is actually an expert
    const expert = await UserModel.findById(expertId).select("isExpert").lean();
    if (!expert) throw new ApiError(404, "Expert not found");
    if (!(expert as any).isExpert) throw new ApiError(400, "User is not an expert");

    // Validate amount
    if (!amount || typeof amount !== "number" || amount < 1) {
      throw new ApiError(400, "Tip amount must be at least ₹1");
    }
    if (amount > 5000) {
      throw new ApiError(400, "Maximum tip amount is ₹5,000");
    }

    // Cannot tip yourself
    if (tipperId.toString() === expertId) {
      throw new ApiError(400, "You cannot tip yourself");
    }

    // Rate limit: 1 tip per user per expert per day
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const existingTipToday = await ExpertTipModel.findOne({
      tipper: tipperId,
      expert: expertId,
      createdAt: { $gte: todayStart },
    }).lean();
    if (existingTipToday) {
      throw new ApiError(429, "You can only tip this expert once per day");
    }

    const tip = await ExpertTipModel.create({
      tipper: tipperId,
      expert: expertId,
      amount,
      currency: currency || "INR",
      message: message?.trim() || undefined,
    });

    return res.status(201).json(
      successResponse(
        { tipId: tip._id, amount: tip.amount, currency: tip.currency, status: tip.status },
        "Tip recorded. Payment is pending."
      )
    );
  }

  /**
   * Get tips received by an expert (paginated).
   */
  private static async _getTipsByExpert(req: express.Request, res: express.Response) {
    const { expertId } = req.params;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, parseInt(req.query.limit as string) || 20);
    const skip = (page - 1) * limit;

    const [tips, total] = await Promise.all([
      ExpertTipModel.find({ expert: expertId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("tipper", "fullName username profilePhoto")
        .lean(),
      ExpertTipModel.countDocuments({ expert: expertId }),
    ]);

    return res.status(200).json(
      successResponse({ tips, total, page, pages: Math.ceil(total / limit) })
    );
  }

  /**
   * Get tips sent by the current user.
   */
  private static async _getTipsByUser(req: express.Request, res: express.Response) {
    const userId = req.user?._id;
    if (!userId) throw new ApiError(401, "Unauthorized");

    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, parseInt(req.query.limit as string) || 20);
    const skip = (page - 1) * limit;

    const [tips, total] = await Promise.all([
      ExpertTipModel.find({ tipper: userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("expert", "fullName username profilePhoto")
        .lean(),
      ExpertTipModel.countDocuments({ tipper: userId }),
    ]);

    return res.status(200).json(
      successResponse({ tips, total, page, pages: Math.ceil(total / limit) })
    );
  }

  /**
   * Payment service callback to update tip payment status.
   */
  private static async _updateTipPayment(req: express.Request, res: express.Response) {
    const { tipId } = req.params;
    const { paymentStatus, paymentId, transactionId, paymentMethod } = req.body;

    if (!["completed", "failed", "pending"].includes(paymentStatus)) {
      throw new ApiError(400, "Invalid payment status");
    }

    const tip = await ExpertTipModel.findById(tipId);
    if (!tip) throw new ApiError(404, "Tip not found");

    tip.status = paymentStatus;
    if (paymentId) tip.paymentId = paymentId;
    if (transactionId) tip.transactionId = transactionId;
    if (paymentMethod) tip.paymentMethod = paymentMethod;
    await tip.save();

    return res.status(200).json(
      successResponse({ tipId, status: tip.status }, "Tip payment status updated")
    );
  }

  /**
   * Get aggregated tip stats for an expert.
   */
  private static async _getExpertTipStats(req: express.Request, res: express.Response) {
    const { expertId } = req.params;

    const stats = await ExpertTipModel.aggregate([
      { $match: { expert: new Types.ObjectId(expertId), status: "completed" } },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: "$amount" },
          tipCount: { $sum: 1 },
          avgTip: { $avg: "$amount" },
        },
      },
    ]);

    const result = stats[0] || { totalAmount: 0, tipCount: 0, avgTip: 0 };
    return res.status(200).json(successResponse(result));
  }

  // Expose as static methods
  static createTip = AsyncHandler.wrap(ExpertTipController._createTip);
  static getTipsByExpert = AsyncHandler.wrap(ExpertTipController._getTipsByExpert);
  static getTipsByUser = AsyncHandler.wrap(ExpertTipController._getTipsByUser);
  static updateTipPayment = AsyncHandler.wrap(ExpertTipController._updateTipPayment);
  static getExpertTipStats = AsyncHandler.wrap(ExpertTipController._getExpertTipStats);
}

export default ExpertTipController;
