import { Request, Response } from "express";
import { ChatRequestModel } from "../models/chatRequestModel";
import { MsgModel } from "../models/messageModel";
import { RedisManager } from "../utils/redisClient";
import { AsyncHandler } from "../utils/AsyncHandler";
import { successResponse } from "../utils/apiResponse";
import { ApiError } from "../utils/apiError";
import { UserModel } from "../models/userModel";

class ChatHTTP {
  /**
   * HTTP fallback for chat-request:status — used when socket is unavailable.
   * Mirrors the same logic as the socket handler in chatController.ts.
   */
  private static async _getRequestStatus(req: Request, res: Response) {
    const userId = req.user?._id?.toString();
    const otherUserId = req.params.otherUserId;

    if (!userId || !otherUserId) {
      throw new ApiError(400, "Missing userId or otherUserId");
    }

    // Admin bypass
    if (req.user?.isAdmin) {
      return res.json(successResponse({ requestStatus: "accepted" }, "Status fetched"));
    }

    // Expert bypass: anyone can message experts without a chat request
    const otherUser = await UserModel.findById(otherUserId).select("isExpert").lean();
    if ((otherUser as any)?.isExpert) {
      return res.json(successResponse({ requestStatus: "accepted" }, "Status fetched"));
    }

    // Check if already accepted (Redis → DB → legacy)
    const senderId = userId;
    const receiverId = otherUserId;
    const sortedPair = [senderId, receiverId].sort().join(":");

    // 1. Redis cache
    const cached = await RedisManager.getDataFromGroup<string>("chat_req_accepted", sortedPair);
    if (cached === "accepted") {
      return res.json(successResponse({ requestStatus: "accepted" }, "Status fetched"));
    }

    // 2. ChatRequestModel
    const acceptedReq = await ChatRequestModel.findOne({
      $or: [
        { sender: senderId, receiver: receiverId, status: "accepted" },
        { sender: receiverId, receiver: senderId, status: "accepted" },
      ],
    });
    if (acceptedReq) {
      await RedisManager.cacheDataInGroup("chat_req_accepted", sortedPair, "accepted", 86400);
      return res.json(successResponse({ requestStatus: "accepted" }, "Status fetched"));
    }

    // 3. Legacy fallback — existing chat with messages
    const existingChat = await MsgModel.findOne({
      $or: [
        { sender: senderId, receiver: receiverId },
        { sender: receiverId, receiver: senderId },
      ],
      "messages.0": { $exists: true },
    }).lean();
    if (existingChat) {
      await ChatRequestModel.findOneAndUpdate(
        {
          $or: [
            { sender: senderId, receiver: receiverId },
            { sender: receiverId, receiver: senderId },
          ],
        },
        { sender: existingChat.sender, receiver: existingChat.receiver, status: "accepted", respondedAt: new Date() },
        { upsert: true, new: true }
      );
      await RedisManager.cacheDataInGroup("chat_req_accepted", sortedPair, "accepted", 86400);
      return res.json(successResponse({ requestStatus: "accepted" }, "Status fetched"));
    }

    // Check pending sent
    const sentRequest = await ChatRequestModel.findOne({ sender: senderId, receiver: receiverId, status: "pending" });
    if (sentRequest) {
      return res.json(successResponse({ requestStatus: "pending_sent", requestId: sentRequest._id }, "Status fetched"));
    }

    // Check pending received
    const receivedRequest = await ChatRequestModel.findOne({ sender: receiverId, receiver: senderId, status: "pending" });
    if (receivedRequest) {
      return res.json(successResponse({ requestStatus: "pending_received", requestId: receivedRequest._id }, "Status fetched"));
    }

    // Check cooldown
    const cooldownTTL = await RedisManager.getTTL("chat_req_cooldown", `${senderId}:${receiverId}`);
    if (cooldownTTL > 0) {
      return res.json(successResponse({ requestStatus: "cooldown", cooldownRemaining: cooldownTTL }, "Status fetched"));
    }

    // DB fallback for cooldown
    const recentDecline = await ChatRequestModel.findOne({
      sender: senderId, receiver: receiverId, status: "declined",
      declinedAt: { $gte: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) },
    });
    if (recentDecline) {
      const remainingMs = 3 * 24 * 60 * 60 * 1000 - (Date.now() - recentDecline.declinedAt!.getTime());
      return res.json(successResponse({ requestStatus: "cooldown", cooldownRemaining: Math.ceil(remainingMs / 1000) }, "Status fetched"));
    }

    return res.json(successResponse({ requestStatus: "none" }, "Status fetched"));
  }

  public static getRequestStatus = AsyncHandler.wrap(ChatHTTP._getRequestStatus);
}

export { ChatHTTP as ChatHTTPController };
