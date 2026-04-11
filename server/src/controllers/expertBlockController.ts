import express from "express";
import { Types } from "mongoose";
import { ExpertBlockRequestModel } from "../models/expertBlockRequestModel";
import { UserModel } from "../models/userModel";
import Admin from "../models/adminModel";
import { ApiError } from "../utils/apiError";
import { AsyncHandler } from "../utils/AsyncHandler";
import { successResponse } from "../utils/apiResponse";

class ExpertBlockController {
  /**
   * Expert submits a block request for a user.
   * Block is "pending" until admin reviews and approves/rejects.
   */
  private static async _submitBlockRequest(req: express.Request, res: express.Response) {
    const expertUserId = req.user?._id;
    if (!expertUserId) throw new ApiError(401, "Unauthorized");

    // Verify sender is an expert
    const expertUser = await UserModel.findById(expertUserId).select("isExpert").lean();
    if (!(expertUser as any)?.isExpert) {
      throw new ApiError(403, "Only experts can submit block requests");
    }

    const { blockedUserId, reason, mediaUrls, chatId, transcript } = req.body;

    // Validate reason has at least 10 non-space characters
    if (!reason || reason.replace(/\s/g, "").length < 10) {
      throw new ApiError(400, "Reason must contain at least 10 non-space characters");
    }

    // Verify blocked user exists
    const blockedUser = await UserModel.findById(blockedUserId).select("_id").lean();
    if (!blockedUser) throw new ApiError(404, "User not found");

    // Check for existing pending request
    const existing = await ExpertBlockRequestModel.findOne({
      expert: expertUserId,
      blockedUser: blockedUserId,
      status: "pending",
    });
    if (existing) {
      throw new ApiError(429, "You already have a pending block request for this user");
    }

    // Cooldown: 7-day wait after a rejected block request for the same user
    const recentRejected = await ExpertBlockRequestModel.findOne({
      expert: expertUserId,
      blockedUser: blockedUserId,
      status: "rejected",
      updatedAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
    }).lean();
    if (recentRejected) {
      const daysRemaining = Math.ceil((7 * 24 * 60 * 60 * 1000 - (Date.now() - new Date(recentRejected.updatedAt).getTime())) / (24 * 60 * 60 * 1000));
      throw new ApiError(429, `Previous block request was rejected. You can submit a new one in ${daysRemaining} day(s)`);
    }

    // Validate transcript if provided
    if (transcript && Array.isArray(transcript) && transcript.length > 500) {
      throw new ApiError(400, "Transcript too long (max 500 messages)");
    }

    const blockRequest = await ExpertBlockRequestModel.create({
      expert: expertUserId,
      blockedUser: blockedUserId,
      reason: reason.trim(),
      mediaUrls: mediaUrls || [],
      transcript: transcript || [],
      chatId: chatId || undefined,
    });

    return res.status(201).json(
      successResponse(
        { requestId: blockRequest._id, status: blockRequest.status },
        "Block request submitted. An admin will review it."
      )
    );
  }

  /**
   * Expert views their own block requests.
   */
  private static async _getMyBlockRequests(req: express.Request, res: express.Response) {
    const expertUserId = req.user?._id;
    if (!expertUserId) throw new ApiError(401, "Unauthorized");

    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, parseInt(req.query.limit as string) || 20);
    const skip = (page - 1) * limit;

    const [requests, total] = await Promise.all([
      ExpertBlockRequestModel.find({ expert: expertUserId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("blockedUser", "fullName username profilePhoto")
        .lean(),
      ExpertBlockRequestModel.countDocuments({ expert: expertUserId }),
    ]);

    return res.status(200).json(
      successResponse({ requests, total, page, pages: Math.ceil(total / limit) })
    );
  }

  /**
   * Admin views pending (or all) block requests.
   */
  private static async _getBlockRequests(req: express.Request, res: express.Response) {
    const status = req.query.status as string;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, parseInt(req.query.limit as string) || 20);
    const skip = (page - 1) * limit;

    const filter: any = {};
    if (status && ["pending", "approved", "rejected"].includes(status)) {
      filter.status = status;
    }

    const [requests, total] = await Promise.all([
      ExpertBlockRequestModel.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("expert", "fullName username profilePhoto")
        .populate("blockedUser", "fullName username profilePhoto")
        .lean(),
      ExpertBlockRequestModel.countDocuments(filter),
    ]);

    return res.status(200).json(
      successResponse({ requests, total, page, pages: Math.ceil(total / limit) })
    );
  }

  /**
   * Admin reviews a block request — approve or reject.
   * On approve: sets user.isBlockedByAdmin = true.
   */
  private static async _reviewBlockRequest(req: express.Request, res: express.Response) {
    const adminId = req.user?._id;
    if (!adminId) throw new ApiError(401, "Unauthorized");

    const { requestId } = req.params;
    const { action, note } = req.body;

    if (!["approved", "rejected"].includes(action)) {
      throw new ApiError(400, "Action must be 'approved' or 'rejected'");
    }

    const blockRequest = await ExpertBlockRequestModel.findById(requestId);
    if (!blockRequest) throw new ApiError(404, "Block request not found");

    if (blockRequest.status !== "pending") {
      throw new ApiError(400, `Request already ${blockRequest.status}`);
    }

    blockRequest.status = action;
    blockRequest.adminAction = {
      adminId: new Types.ObjectId(adminId.toString()),
      action,
      note: note || undefined,
      actionDate: new Date(),
    };
    await blockRequest.save();

    // If approved, block the user
    if (action === "approved") {
      const user = await UserModel.findById(blockRequest.blockedUser);
      if (user) {
        user.isBlockedByAdmin = true;
        await user.save();
      }

      // Also add to admin's blockedUsers if admin model supports it
      const admin = await Admin.findById(adminId);
      if (admin && typeof admin.blockUser === "function") {
        await admin.blockUser(blockRequest.blockedUser.toString());
      }
    }

    return res.status(200).json(
      successResponse(
        { requestId, status: action },
        `Block request ${action}`
      )
    );
  }

  // Expose as static methods
  static submitBlockRequest = AsyncHandler.wrap(ExpertBlockController._submitBlockRequest);
  static getMyBlockRequests = AsyncHandler.wrap(ExpertBlockController._getMyBlockRequests);
  static getBlockRequests = AsyncHandler.wrap(ExpertBlockController._getBlockRequests);
  static reviewBlockRequest = AsyncHandler.wrap(ExpertBlockController._reviewBlockRequest);
}

export default ExpertBlockController;
