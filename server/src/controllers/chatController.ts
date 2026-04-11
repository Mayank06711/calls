import { MsgModel } from "../models/messageModel";
import { ChatRequestModel } from "../models/chatRequestModel";
import { UserSettingsModel } from "../models/userSettingsModel";
import { SocketManager } from "../socket";
import { RedisManager } from "../utils/redisClient";
import { Types } from "mongoose";
import { INewMsg, MessageType, ChatType, IReadReceipt } from "../interface/IMessage";
import { Socket } from "socket.io";
import NotificationService from "../services/notifications";
import { BookingModel } from "../models/bookingModel";
import moment from "moment-timezone";

class ChatController {
  private static instance: ChatController | null = null;
  private readonly socketManager: SocketManager;
  private readonly READ_RECEIPT_TTL = 7 * 24 * 60 * 60; // 7 days in seconds

  // Session validation cache - avoid excessive Redis calls
  private sessionValidationCache: Map<string, { valid: boolean; timestamp: number }> = new Map();
  private readonly SESSION_CACHE_TTL = 30000; // 30 seconds cache

  // Per-socket rate limiter for delete operations (prevents DB spam)
  // Key: `${socketId}:${event}`, Value: array of timestamps
  private deleteRateLimits: Map<string, number[]> = new Map();
  private readonly DELETE_RATE_LIMIT = 10; // max requests
  private readonly DELETE_RATE_WINDOW = 10000; // per 10 seconds

  private isRateLimited(socketId: string, event: string): boolean {
    const key = `${socketId}:${event}`;
    const now = Date.now();
    const timestamps = this.deleteRateLimits.get(key) || [];

    // Remove timestamps outside the window
    const recent = timestamps.filter((t) => now - t < this.DELETE_RATE_WINDOW);

    if (recent.length >= this.DELETE_RATE_LIMIT) {
      this.deleteRateLimits.set(key, recent);
      return true;
    }

    recent.push(now);
    this.deleteRateLimits.set(key, recent);
    return false;
  }

  private readonly CHAT_EVENTS = {
    // Client 1 sends message to server
    MESSAGE: "message", // c1-server

    // Server acknowledges to client 1 that message was received
    SENT_ACK: "sent-ack", // server-c1

    // Client 2 tells server they received the message
    DELIVERED_ACK: "delivered-ack", // c2-server

    // Server tells client 1 that client 2 received the message
    DELIVERED: "delivered", // server-c1

    // Client 2 tells server they opened/saw the message
    SEEN_ACK: "seen-ack", // c2-server

    // Server tells client 1 that client 2 saw the message
    SEEN: "seen", // server-c1

    // Error events for any failures
    MESSAGE_ERROR: "message:error", // server-any_client

    // to find existing chat and populate it if its present
    CHAT_CHECK: "chat:check",
    // for typing status of sender to reciver only if both are on same chatbox (i will make one more event names as message:samechatbox)
    TYPING_STATUS: "typing:status",
    // when server need to broadcast some information.
    SYSTEM_MESSAGE: "system:message",

    // Message deletion
    MESSAGE_DELETE: "message:delete",         // delete for me (soft-delete)
    MESSAGE_DELETE_ALL: "message:delete-all", // delete for everyone (sender only)
    MESSAGE_DELETED: "message:deleted",       // notify other user about delete-for-everyone

    // Chat request system
    CHAT_REQUEST_SEND: "chat-request:send",           // c -> server (send request)
    CHAT_REQUEST_RECEIVED: "chat-request:received",   // server -> c (notify receiver)
    CHAT_REQUEST_RESPOND: "chat-request:respond",     // c -> server (accept/decline)
    CHAT_REQUEST_RESPONSE: "chat-request:response",   // server -> c (notify sender of response)
    CHAT_REQUEST_LIST: "chat-request:list",           // c -> server (get pending requests)
    CHAT_REQUEST_STATUS: "chat-request:status",       // c -> server (check status between two users)
  } as const;

  constructor() {
    console.log("[ChatController]: Initialized");
    this.socketManager = SocketManager.getInstance();
    // Set up notification listener
    this.setupNotificationListener();
  }

  public static getInstance(): ChatController {
    if (!ChatController.instance) {
      ChatController.instance = new ChatController();
    }
    return ChatController.instance;
  }

  private setupNotificationListener(): void {
    const notificationService = NotificationService.getInstance();
    console.log("[ChatController]: Setting up notification listener");
    notificationService.onNotification(async (notificationData) => {
      try {
        console.log("[ChatController]: Admin notification received, broadcasting");

        // Broadcast notification to all connected sockets
        await this.socketManager.emitEvent({
          event: this.CHAT_EVENTS.SYSTEM_MESSAGE,
          data: {
            ...notificationData,
            id: Date.now(), // Generate unique ID for the notification
          },
        });
      } catch (error) {
        console.error("[ChatController]: Error broadcasting notification:", error);
      }
    });
  }

  /**
   * Validate session is still active before processing critical events
   * Uses caching to avoid excessive Redis calls
   */
  private async validateSession(socket: Socket): Promise<boolean> {
    const userId = socket.data.userId;
    const sessionId = socket.data.sessionId;

    if (!userId || !sessionId) {
      console.warn(`[validateSession] FAILED: userId=${userId}, sessionId=${sessionId}, socketId=${socket.id}`);
      return false;
    }

    const cacheKey = `${userId}:${sessionId}`;
    const cached = this.sessionValidationCache.get(cacheKey);

    // Return cached result if still valid
    if (cached && Date.now() - cached.timestamp < this.SESSION_CACHE_TTL) {
      return cached.valid;
    }

    // Check Redis for session validity
    try {
      const isActive = await RedisManager.isSessionActive(userId, sessionId);

      // Cache the result
      this.sessionValidationCache.set(cacheKey, {
        valid: isActive,
        timestamp: Date.now(),
      });

      // If session is invalid, emit error and disconnect
      if (!isActive) {
        socket.emit("session_revoked", "Your session has been revoked. Please login again.");
        socket.disconnect(true);
        return false;
      }

      return true;
    } catch (error) {
      console.error("[ChatController] Session validation error:", error);
      // On error, allow the operation to proceed (fail-open for availability)
      return true;
    }
  }

  /**
   * Invalidate session cache when session is revoked
   */
  public invalidateSessionCache(userId: string, sessionId: string): void {
    const cacheKey = `${userId}:${sessionId}`;
    this.sessionValidationCache.delete(cacheKey);
  }

  public setupAuthenticatedSocketListeners(socket: Socket): void {
    if (!socket.data.authenticated || !socket.data.userId) {
      console.log(`[ChatController]: Socket ${socket.id} not authenticated, skipping`);
      return;
    }

    console.log(`[ChatController]: Setting up listeners for socket ${socket.id}`);

    // In setupAuthenticatedSocketListeners
    this.socketManager.listenToEvent({
      event: this.CHAT_EVENTS.CHAT_CHECK,
      socketIds: [socket.id],
      handler: async (data: any, socket: Socket, callback?: Function) => {
        try {
          // Process the chat check
          const result = await this.handleChatCheck(data, socket);
          // Send acknowledgment back to client via callback
          if (callback) {
            callback(result);
          }
        } catch (error) {
          console.error("[Chat:check]: Handler error:", error);
          if (callback) {
            callback({
              status: "error",
              error: "Failed to process chat check",
              message: error instanceof Error ? error.message : " Unknow Error",
            });
          }
        }
      },
    });

    // Message handler
    const events = [
      {
        event: this.CHAT_EVENTS.MESSAGE,
        handler: this.handleMessage.bind(this),
      },
      {
        event: this.CHAT_EVENTS.DELIVERED_ACK,
        handler: this.handleDeliveredAck.bind(this),
      },
      {
        event: this.CHAT_EVENTS.SEEN_ACK,
        handler: this.handleSeenAck.bind(this),
      },
    ];
    events.forEach(({ event, handler }) => {
      socket.on(event, async (data: any, callback?: Function) => {
        try {
          // Validate session before processing critical events
          console.log(`[ChatController] ${event}: validating session for socket ${socket.id}, userId=${socket.data.userId}`);
          const isSessionValid = await this.validateSession(socket);
          if (!isSessionValid) {
            console.warn(`[ChatController] ${event}: session invalid for userId=${socket.data.userId}`);
            if (callback) {
              callback({
                status: "error",
                message: "Session expired or revoked",
                code: "SESSION_REVOKED",
              });
            }
            return;
          }

          await handler(data, socket, callback);
        } catch (error) {
          console.error(`[ChatController]: Error handling ${event}:`, error);
          if (callback)
            callback({
              status: "error",
              message: error instanceof Error ? error.message : "Unknown error",
            });
        }
      });
    });

    // NEW EVENT: chat:list - Get all chats with unread counts
    this.socketManager.listenToEvent({
      event: 'chat:list',
      socketIds: [socket.id],
      handler: async (data: any, socket: Socket, callback?: Function) => {
        try {
          const result = await this.handleChatList(socket);
          if (callback) {
            callback(result);
          }
        } catch (error) {
          console.error("[Chat:list]: Handler error:", error);
          if (callback) {
            callback({
              status: "error",
              message: error instanceof Error ? error.message : "Unknown error",
            });
          }
        }
      },
    });

    // NEW EVENT: chat:open - Mark all messages as read when chat is opened
    this.socketManager.listenToEvent({
      event: 'chat:open',
      socketIds: [socket.id],
      handler: async (data: any, socket: Socket, callback?: Function) => {
        try {
          const result = await this.handleChatOpen(data, socket);
          if (callback) {
            callback(result);
          }
        } catch (error) {
          console.error("[Chat:open]: Handler error:", error);
          if (callback) {
            callback({
              status: "error",
              message: error instanceof Error ? error.message : "Unknown error",
            });
          }
        }
      },
    });

    // NEW EVENT: user:check-online - Check if a specific user is currently online
    this.socketManager.listenToEvent({
      event: 'user:check-online',
      socketIds: [socket.id],
      handler: async (data: { userId: string }, socket: Socket, callback?: Function) => {
        try {
          const socketStatus = await this.socketManager.getSocketStatus();
          const isOnline = socketStatus.some(
            s => s.userId === data.userId && s.isActive
          );
          let statusHidden = false;
          if (isOnline) {
            // Experts cannot appear offline — skip privacy check for experts
            const targetIsExpert = await this.isUserExpert(data.userId);
            if (!targetIsExpert) {
              const settings = await UserSettingsModel.findOne(
                { userId: data.userId },
                { 'privacy.showOnlineStatus': 1 }
              ).lean();
              if (settings?.privacy?.showOnlineStatus === false) {
                statusHidden = true;
              }
            }
          }
          console.log(`[user:check-online] User ${data.userId} is ${isOnline ? (statusHidden ? 'HIDDEN' : 'ONLINE') : 'OFFLINE'}`);
          if (callback) {
            callback({ status: 'success', userId: data.userId, isOnline: statusHidden ? false : isOnline, statusHidden });
          }
        } catch (error) {
          console.error("[Chat:checkOnline]: Handler error:", error);
          if (callback) {
            callback({ status: 'error', isOnline: false, statusHidden: false });
          }
        }
      },
    });

    // NEW EVENT: users:get-online - Get list of all currently online user IDs
    this.socketManager.listenToEvent({
      event: 'users:get-online',
      socketIds: [socket.id],
      handler: async (data: any, socket: Socket, callback?: Function) => {
        try {
          const socketStatus = await this.socketManager.getSocketStatus();
          const allOnlineIds = [...new Set(socketStatus
            .filter(s => s.isActive)
            .map(s => s.userId)
          )];
          // Find users who have showOnlineStatus disabled
          const hiddenSettings = await UserSettingsModel.find(
            { userId: { $in: allOnlineIds }, 'privacy.showOnlineStatus': false },
            { userId: 1 }
          ).lean();
          const hiddenSet = new Set(hiddenSettings.map(s => s.userId.toString()));
          // Experts cannot appear offline — remove experts from hidden set
          const { UserModel } = await import("../models/userModel");
          const expertUsers = await UserModel.find(
            { _id: { $in: [...hiddenSet] }, isExpert: true },
            { _id: 1 }
          ).lean();
          for (const expert of expertUsers) {
            hiddenSet.delete(expert._id.toString());
          }
          const onlineUserIds = allOnlineIds.filter(id => !hiddenSet.has(id));
          const hiddenUserIds = allOnlineIds.filter(id => hiddenSet.has(id));
          console.log(`[users:get-online] Found ${onlineUserIds.length} online, ${hiddenUserIds.length} hidden`);
          if (callback) {
            callback({ status: 'success', onlineUserIds, hiddenUserIds });
          }
        } catch (error) {
          console.error("[Chat:getOnline]: Handler error:", error);
          if (callback) {
            callback({ status: 'error', onlineUserIds: [], hiddenUserIds: [] });
          }
        }
      },
    });

    // EVENT: privacy:status-changed — client notifies server after toggling showOnlineStatus
    // Server broadcasts the appropriate events to all clients
    this.socketManager.listenToEvent({
      event: 'privacy:status-changed',
      socketIds: [socket.id],
      handler: async (data: { showOnlineStatus: boolean }, socket: Socket, callback?: Function) => {
        try {
          const userId = socket.data?.userId?.toString();
          if (!userId) {
            if (callback) callback({ status: 'error', message: 'Not authenticated' });
            return;
          }
          // Experts cannot appear offline
          if (socket.data.isExpert) {
            if (callback) callback({ status: 'error', message: 'Experts cannot appear offline' });
            return;
          }
          if (data.showOnlineStatus === false) {
            // User wants to hide — broadcast offline + hidden
            await this.socketManager.emitEvent({ event: 'user:offline', data: { userId, timestamp: new Date() } });
            await this.socketManager.emitEvent({ event: 'user:hidden', data: { userId, timestamp: new Date() } });
            console.log(`[privacy:status-changed] User ${userId} is now HIDDEN`);
          } else {
            // User wants to show — broadcast unhidden + online
            await this.socketManager.emitEvent({ event: 'user:unhidden', data: { userId, timestamp: new Date() } });
            await this.socketManager.emitEvent({ event: 'user:online', data: { userId, timestamp: new Date() } });
            console.log(`[privacy:status-changed] User ${userId} is now VISIBLE`);
          }
          if (callback) callback({ status: 'success' });
        } catch (error) {
          console.error("[Chat:privacyStatus]: Handler error:", error);
          if (callback) callback({ status: 'error' });
        }
      },
    });

    // MESSAGE DELETE (for me) — soft-delete via deletedFor array
    // Accepts single messageId or array of messageIds
    this.socketManager.listenToEvent({
      event: this.CHAT_EVENTS.MESSAGE_DELETE,
      socketIds: [socket.id],
      handler: async (data: { chatId: string; messageId: number | number[] }, socket: Socket, callback?: Function) => {
        try {
          if (this.isRateLimited(socket.id, "message:delete")) {
            if (callback) callback({ status: "error", message: "Too many delete requests, slow down" });
            return;
          }
          const userId = socket.data.userId;
          const ids = Array.isArray(data.messageId) ? data.messageId : [data.messageId];
          if (ids.length > 50) {
            if (callback) callback({ status: "error", message: "Cannot delete more than 50 messages at once" });
            return;
          }
          await MsgModel.deleteMessagesForMe(
            new Types.ObjectId(data.chatId),
            ids,
            new Types.ObjectId(userId)
          );
          if (callback) callback({ status: "success", messageIds: ids });
        } catch (error) {
          console.error("[Chat:messageDelete]: Handler error:", error);
          if (callback) callback({ status: "error", message: error instanceof Error ? error.message : "Unknown error" });
        }
      },
    });

    // MESSAGE DELETE FOR EVERYONE — removes messages from array (sender only, today only)
    // Accepts single messageId or array of messageIds
    this.socketManager.listenToEvent({
      event: this.CHAT_EVENTS.MESSAGE_DELETE_ALL,
      socketIds: [socket.id],
      handler: async (data: { chatId: string; messageId: number | number[] }, socket: Socket, callback?: Function) => {
        try {
          if (this.isRateLimited(socket.id, "message:delete-all")) {
            if (callback) callback({ status: "error", message: "Too many delete requests, slow down" });
            return;
          }
          const userId = socket.data.userId;
          const ids = Array.isArray(data.messageId) ? data.messageId : [data.messageId];
          if (ids.length > 50) {
            if (callback) callback({ status: "error", message: "Cannot delete more than 50 messages at once" });
            return;
          }

          // Delete-for-everyone is only allowed in user-to-user chats
          const chatDoc = await MsgModel.findById(data.chatId, { chatType: 1 }).lean();
          if (!chatDoc || chatDoc.chatType !== "userToUser") {
            if (callback) callback({ status: "error", message: "Delete for everyone is only available in user-to-user chats", code: "DELETE_ALL_NOT_ALLOWED" });
            return;
          }

          const { deletedIds, skippedIds } = await MsgModel.deleteMessagesForEveryoneAtomic(
            new Types.ObjectId(data.chatId),
            ids,
            new Types.ObjectId(userId)
          );

          if (deletedIds.length === 0) {
            if (callback) callback({ status: "error", message: "No messages could be deleted — only your own messages from today can be deleted for everyone" });
            return;
          }

          if (callback) callback({ status: "success", deletedIds, skippedIds });

          // Notify the other participant
          const chat = await MsgModel.findById(data.chatId, { sender: 1, receiver: 1 }).lean();
          if (!chat) return;
          const otherUserId = chat.sender.toString() === userId
            ? chat.receiver.toString()
            : chat.sender.toString();

          const otherSocket = await this.socketManager.getSocketIdUsingUserId(otherUserId);
          if (otherSocket?.socketId) {
            await this.socketManager.emitEvent({
              event: this.CHAT_EVENTS.MESSAGE_DELETED,
              data: {
                chatId: data.chatId,
                messageIds: deletedIds,
                deletedBy: userId,
                timestamp: new Date(),
              },
              targetSocketIds: [otherSocket.socketId],
            });
          }
        } catch (error) {
          console.error("[Chat:messageDeleteAll]: Handler error:", error);
          if (callback) callback({ status: "error", message: error instanceof Error ? error.message : "Unknown error" });
        }
      },
    });

    // CHAT HIDE — premium only (GOLD/SILVER/PLATINUM), not expert
    this.socketManager.listenToEvent({
      event: "chat:hide",
      socketIds: [socket.id],
      handler: async (data: { chatId: string }, socket: Socket, callback?: Function) => {
        try {
          if (this.isRateLimited(socket.id, "chat:hide")) {
            if (callback) callback({ status: "error", message: "Too many requests, slow down" });
            return;
          }
          const userId = socket.data.userId;
          const subType = (socket.data.subscriptionType || "free").toUpperCase();
          const isExpert = socket.data.isExpert || false;
          const isPremium = ["GOLD", "SILVER", "PLATINUM"].includes(subType);

          if (!isPremium || isExpert) {
            if (callback) callback({ status: "error", message: "Hide is available for premium users only" });
            return;
          }

          await MsgModel.findByIdAndUpdate(data.chatId, {
            $addToSet: { chatHiddenFor: new Types.ObjectId(userId) },
          });
          if (callback) callback({ status: "success" });
        } catch (error) {
          console.error("[Chat:hide]: Handler error:", error);
          if (callback) callback({ status: "error", message: error instanceof Error ? error.message : "Unknown error" });
        }
      },
    });

    // CHAT UNHIDE
    this.socketManager.listenToEvent({
      event: "chat:unhide",
      socketIds: [socket.id],
      handler: async (data: { chatId: string }, socket: Socket, callback?: Function) => {
        try {
          const userId = socket.data.userId;
          await MsgModel.findByIdAndUpdate(data.chatId, {
            $pull: { chatHiddenFor: new Types.ObjectId(userId) },
          });
          if (callback) callback({ status: "success" });
        } catch (error) {
          console.error("[Chat:unhide]: Handler error:", error);
          if (callback) callback({ status: "error", message: error instanceof Error ? error.message : "Unknown error" });
        }
      },
    });

    // CHAT DELETE (for me) — soft-deletes all messages for this user + hides chat
    this.socketManager.listenToEvent({
      event: "chat:delete",
      socketIds: [socket.id],
      handler: async (data: { chatId: string }, socket: Socket, callback?: Function) => {
        try {
          if (this.isRateLimited(socket.id, "chat:delete")) {
            if (callback) callback({ status: "error", message: "Too many requests, slow down" });
            return;
          }
          const userId = socket.data.userId;
          const userObjId = new Types.ObjectId(userId);
          const chat = await MsgModel.findById(data.chatId);
          if (!chat) {
            if (callback) callback({ status: "error", message: "Chat not found" });
            return;
          }

          // Soft-delete every message for this user
          for (const msg of chat.messages) {
            if (!msg.deletedFor) msg.deletedFor = [];
            if (!msg.deletedFor.some((id: Types.ObjectId) => id.toString() === userId)) {
              msg.deletedFor.push(userObjId);
            }
          }

          // Mark chat as deleted for this user
          if (!chat.chatDeletedFor) chat.chatDeletedFor = [];
          if (!chat.chatDeletedFor.some((id: Types.ObjectId) => id.toString() === userId)) {
            chat.chatDeletedFor.push(userObjId);
          }

          await chat.save();
          if (callback) callback({ status: "success" });
        } catch (error) {
          console.error("[Chat:delete]: Handler error:", error);
          if (callback) callback({ status: "error", message: error instanceof Error ? error.message : "Unknown error" });
        }
      },
    });

    // CHAT HIDDEN LIST — returns chats hidden by this user
    this.socketManager.listenToEvent({
      event: "chat:hidden-list",
      socketIds: [socket.id],
      handler: async (_data: any, socket: Socket, callback?: Function) => {
        try {
          const userId = socket.data.userId;
          const hiddenChats = await MsgModel.aggregate([
            {
              $match: {
                chatHiddenFor: new Types.ObjectId(userId),
              },
            },
            {
              $addFields: {
                otherParticipant: {
                  $cond: [
                    { $eq: ["$sender", new Types.ObjectId(userId)] },
                    "$receiver",
                    "$sender",
                  ],
                },
              },
            },
            {
              $lookup: {
                from: "users",
                localField: "otherParticipant",
                foreignField: "_id",
                as: "participantInfo",
              },
            },
            { $unwind: { path: "$participantInfo", preserveNullAndEmptyArrays: true } },
            {
              $lookup: {
                from: "media",
                localField: "participantInfo.mediaId",
                foreignField: "_id",
                as: "_participantMedia",
              },
            },
            { $unwind: { path: "$_participantMedia", preserveNullAndEmptyArrays: true } },
            {
              $project: {
                chatId: "$_id",
                otherUser: {
                  _id: "$participantInfo._id",
                  fullName: "$participantInfo.fullName",
                  username: "$participantInfo.username",
                  profilePhoto: {
                    $let: {
                      vars: {
                        photo: {
                          $arrayElemAt: [
                            {
                              $filter: {
                                input: { $ifNull: ["$_participantMedia.photos", []] },
                                as: "p",
                                cond: { $eq: ["$$p.public_id", "$participantInfo.profilePhotoId"] },
                              },
                            },
                            0,
                          ],
                        },
                      },
                      in: {
                        $cond: [
                          { $ifNull: ["$$photo", false] },
                          { url: "$$photo.url", thumbnail_url: "$$photo.thumbnail_url" },
                          null,
                        ],
                      },
                    },
                  },
                },
                updatedAt: 1,
              },
            },
          ]);

          if (callback) callback({ status: "success", chats: hiddenChats });
        } catch (error) {
          console.error("[Chat:hiddenList]: Handler error:", error);
          if (callback) callback({ status: "error", message: error instanceof Error ? error.message : "Unknown error" });
        }
      },
    });

    // ============ CHAT REQUEST SYSTEM ============

    // CHAT REQUEST: SEND — send a chat request to another user
    this.socketManager.listenToEvent({
      event: this.CHAT_EVENTS.CHAT_REQUEST_SEND,
      socketIds: [socket.id],
      handler: async (data: { receiverId: string }, socket: Socket, callback?: Function) => {
        try {
          if (this.isRateLimited(socket.id, "chat-request:send")) {
            if (callback) callback({ status: "error", message: "Too many requests, slow down" });
            return;
          }

          const senderId = socket.data.userId?.toString();
          if (!senderId || !data.receiverId) {
            if (callback) callback({ status: "error", message: "Invalid request data" });
            return;
          }

          if (senderId === data.receiverId) {
            if (callback) callback({ status: "error", message: "Cannot send request to yourself" });
            return;
          }

          // Admin bypass: admins can always chat, auto-accept
          const isAdmin = await this.checkIsAdmin(socket);
          if (isAdmin) {
            // Auto-create accepted request
            await ChatRequestModel.findOneAndUpdate(
              { sender: senderId, receiver: data.receiverId },
              { status: "accepted", respondedAt: new Date() },
              { upsert: true, new: true }
            );
            const sortedPair = [senderId, data.receiverId].sort().join(":");
            await RedisManager.cacheDataInGroup("chat_req_accepted", sortedPair, "accepted", 86400);
            if (callback) callback({ status: "success", autoAccepted: true });
            return;
          }

          // Expert bypass: regular users can message experts directly, auto-accept
          // BUT if sender IS the expert, they must go through the normal request flow
          const receiverIsExpert = await this.isUserExpert(data.receiverId);
          const senderIsExpert = await this.isUserExpert(senderId);
          if (receiverIsExpert && !senderIsExpert) {
            await ChatRequestModel.findOneAndUpdate(
              { sender: senderId, receiver: data.receiverId },
              { status: "accepted", respondedAt: new Date() },
              { upsert: true, new: true }
            );
            const sortedPair = [senderId, data.receiverId].sort().join(":");
            await RedisManager.cacheDataInGroup("chat_req_accepted", sortedPair, "accepted", 86400);
            if (callback) callback({ status: "success", autoAccepted: true });
            return;
          }

          // Check if already accepted (fast Redis check)
          const isAllowed = await this.isChatAllowed(senderId, data.receiverId);
          if (isAllowed) {
            if (callback) callback({ status: "already_accepted" });
            return;
          }

          // Check Redis cooldown (3-day decline cooldown)
          const cooldownTTL = await RedisManager.getTTL("chat_req_cooldown", `${senderId}:${data.receiverId}`);
          if (cooldownTTL > 0) {
            const daysRemaining = Math.ceil(cooldownTTL / 86400);
            if (callback) callback({
              status: "error",
              message: `Request declined. You can send a new request in ${daysRemaining} day(s)`,
              code: "COOLDOWN",
              cooldownRemaining: cooldownTTL,
            });
            return;
          }

          // Check if pending request already exists (sender → receiver)
          const existingRequest = await ChatRequestModel.findOne({
            sender: senderId,
            receiver: data.receiverId,
            status: "pending",
          });
          if (existingRequest) {
            if (callback) callback({ status: "already_pending", requestId: existingRequest._id });
            return;
          }

          // Check for REVERSE pending request (receiver → sender) → auto-accept
          const reverseRequest = await ChatRequestModel.findOne({
            sender: data.receiverId,
            receiver: senderId,
            status: "pending",
          });
          if (reverseRequest) {
            // Both users want to chat — auto-accept
            reverseRequest.status = "accepted";
            reverseRequest.respondedAt = new Date();
            await reverseRequest.save();

            const sortedPair = [senderId, data.receiverId].sort().join(":");
            await RedisManager.cacheDataInGroup("chat_req_accepted", sortedPair, "accepted", 86400);

            // Notify the original sender of the reverse request
            const otherSocket = await this.socketManager.getSocketIdUsingUserId(data.receiverId);
            if (otherSocket?.socketId) {
              await this.socketManager.emitEvent({
                event: this.CHAT_EVENTS.CHAT_REQUEST_RESPONSE,
                data: { status: "accepted", acceptedBy: senderId, requestId: reverseRequest._id },
                targetSocketIds: [otherSocket.socketId],
              });
            }

            if (callback) callback({ status: "success", autoAccepted: true, requestId: reverseRequest._id });
            return;
          }

          // Check DB cooldown fallback (if Redis key was lost)
          const recentDecline = await ChatRequestModel.findOne({
            sender: senderId,
            receiver: data.receiverId,
            status: "declined",
            declinedAt: { $gte: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) },
          });
          if (recentDecline) {
            const remainingMs = 3 * 24 * 60 * 60 * 1000 - (Date.now() - recentDecline.declinedAt!.getTime());
            const daysRemaining = Math.ceil(remainingMs / (24 * 60 * 60 * 1000));
            if (callback) callback({
              status: "error",
              message: `Request declined. You can send a new request in ${daysRemaining} day(s)`,
              code: "COOLDOWN",
              cooldownRemaining: Math.ceil(remainingMs / 1000),
            });
            return;
          }

          // Create new chat request
          const chatRequest = new ChatRequestModel({
            sender: new Types.ObjectId(senderId),
            receiver: new Types.ObjectId(data.receiverId),
            status: "pending",
          });
          await chatRequest.save();

          // Notify receiver if online
          const receiverSocket = await this.socketManager.getSocketIdUsingUserId(data.receiverId);
          if (receiverSocket?.socketId) {
            // Populate sender info for the notification
            const populatedRequest = await ChatRequestModel.findById(chatRequest._id)
              .populate("sender", "fullName username profilePhoto isExpert")
              .lean();

            // If sender is expert, attach qualification info
            let requestData: any = { request: populatedRequest };
            if (senderIsExpert) {
              try {
                const { ExpertModel } = await import("../models/expertModel");
                const expertDoc = await ExpertModel.findOne({ user: senderId }).select("qualification").lean();
                requestData.request = { ...populatedRequest, senderQualification: (expertDoc as any)?.qualification || "" };
                requestData.fromExpert = true;
              } catch {}
            }

            await this.socketManager.emitEvent({
              event: this.CHAT_EVENTS.CHAT_REQUEST_RECEIVED,
              data: requestData,
              targetSocketIds: [receiverSocket.socketId],
            });
          }

          // Expert chat request: auto-expire after 5 minutes if not responded
          if (senderIsExpert) {
            const requestId = (chatRequest._id as Types.ObjectId).toString();
            const expertRequestReceiverId = data.receiverId;
            setTimeout(async () => {
              try {
                const req = await ChatRequestModel.findById(requestId);
                if (req && req.status === "pending") {
                  req.status = "declined";
                  req.declinedAt = new Date();
                  req.respondedAt = new Date();
                  await req.save();
                  // Set 3-day cooldown in Redis
                  await RedisManager.cacheDataInGroup(
                    "chat_req_cooldown",
                    `${senderId}:${expertRequestReceiverId}`,
                    "auto_expired",
                    259200 // 3 days
                  );
                  // Notify expert that request expired
                  const expertSocket = await this.socketManager.getSocketIdUsingUserId(senderId);
                  if (expertSocket?.socketId) {
                    await this.socketManager.emitEvent({
                      event: this.CHAT_EVENTS.CHAT_REQUEST_RESPONSE,
                      data: { status: "expired", requestId, message: "Chat request expired — user did not respond in time" },
                      targetSocketIds: [expertSocket.socketId],
                    });
                  }
                }
              } catch (err) {
                console.error("[ChatRequest:autoExpire]:", err);
              }
            }, 300000); // 5 minutes
          }

          if (callback) callback({ status: "success", requestId: chatRequest._id });
        } catch (error) {
          console.error("[ChatRequest:send]: Handler error:", error);
          if (callback) callback({ status: "error", message: error instanceof Error ? error.message : "Unknown error" });
        }
      },
    });

    // CHAT REQUEST: RESPOND — accept or decline a chat request
    this.socketManager.listenToEvent({
      event: this.CHAT_EVENTS.CHAT_REQUEST_RESPOND,
      socketIds: [socket.id],
      handler: async (data: { requestId: string; action: "accept" | "decline" }, socket: Socket, callback?: Function) => {
        try {
          console.log(`[ChatRequest:respond]: requestId=${data?.requestId}, action=${data?.action}, user=${socket.data.userId}`);

          if (this.isRateLimited(socket.id, "chat-request:respond")) {
            console.log("[ChatRequest:respond]: Rate limited");
            if (callback) callback({ status: "error", message: "Too many requests, slow down" });
            return;
          }

          const userId = socket.data.userId?.toString();
          if (!data.requestId || !data.action) {
            console.log("[ChatRequest:respond]: Invalid data");
            if (callback) callback({ status: "error", message: "Invalid request data" });
            return;
          }

          const request = await ChatRequestModel.findById(data.requestId);
          if (!request) {
            console.log(`[ChatRequest:respond]: Request not found: ${data.requestId}`);
            if (callback) callback({ status: "error", message: "Request not found" });
            return;
          }

          // Only the receiver can respond
          if (request.receiver.toString() !== userId) {
            console.log(`[ChatRequest:respond]: Not authorized for request ${data.requestId}`);
            if (callback) callback({ status: "error", message: "Not authorized to respond to this request" });
            return;
          }

          if (request.status !== "pending") {
            console.log(`[ChatRequest:respond]: Already ${request.status}`);
            if (callback) callback({ status: "error", message: "Request already responded to" });
            return;
          }

          const senderId = request.sender.toString();

          if (data.action === "accept") {
            request.status = "accepted";
            request.respondedAt = new Date();
            await request.save();

            // Cache accepted status in Redis
            const sortedPair = [senderId, userId].sort().join(":");
            await RedisManager.cacheDataInGroup("chat_req_accepted", sortedPair, "accepted", 86400);

            // Pre-create the chat document
            await this.findOrCreateChat(senderId, userId);

            // Notify sender if online
            const senderSocket = await this.socketManager.getSocketIdUsingUserId(senderId);
            if (senderSocket?.socketId) {
              await this.socketManager.emitEvent({
                event: this.CHAT_EVENTS.CHAT_REQUEST_RESPONSE,
                data: { status: "accepted", acceptedBy: userId, requestId: request._id },
                targetSocketIds: [senderSocket.socketId],
              });
            }

            console.log(`[ChatRequest:respond]: Accepted ${data.requestId}`);
            if (callback) callback({ status: "success", action: "accepted" });
          } else if (data.action === "decline") {
            request.status = "declined";
            request.declinedAt = new Date();
            request.respondedAt = new Date();
            await request.save();

            // Set cooldown in Redis (60s for testing — change back to 259200 for production)
            await RedisManager.cacheDataInGroup(
              "chat_req_cooldown",
              `${senderId}:${userId}`,
              "declined",
              60 // 60 seconds for testing (production: 259200 = 3 days)
            );

            // Notify sender if online
            const senderSocket = await this.socketManager.getSocketIdUsingUserId(senderId);
            if (senderSocket?.socketId) {
              await this.socketManager.emitEvent({
                event: this.CHAT_EVENTS.CHAT_REQUEST_RESPONSE,
                data: { status: "declined", declinedBy: userId, requestId: request._id },
                targetSocketIds: [senderSocket.socketId],
              });
            }

            console.log(`[ChatRequest:respond]: Declined ${data.requestId}`);
            if (callback) callback({ status: "success", action: "declined" });
          } else {
            if (callback) callback({ status: "error", message: "Invalid action. Use 'accept' or 'decline'" });
          }
        } catch (error) {
          console.error("[ChatRequest:respond]: Handler error:", error);
          if (callback) callback({ status: "error", message: error instanceof Error ? error.message : "Unknown error" });
        }
      },
    });

    // CHAT REQUEST: LIST — get pending requests (sent or received)
    this.socketManager.listenToEvent({
      event: this.CHAT_EVENTS.CHAT_REQUEST_LIST,
      socketIds: [socket.id],
      handler: async (data: { type?: "received" | "sent" }, socket: Socket, callback?: Function) => {
        try {
          const userId = socket.data.userId;
          const type = data?.type || "received";

          const query: any = { status: "pending" };
          if (type === "received") {
            query.receiver = userId;
          } else {
            query.sender = userId;
          }

          const requests = await ChatRequestModel.find(query)
            .populate("sender", "fullName username profilePhoto")
            .populate("receiver", "fullName username profilePhoto")
            .sort({ createdAt: -1 })
            .lean();

          if (callback) callback({ status: "success", requests });
        } catch (error) {
          console.error("[ChatRequest:list]: Handler error:", error);
          if (callback) callback({ status: "error", message: error instanceof Error ? error.message : "Unknown error" });
        }
      },
    });

    // CHAT REQUEST: STATUS — check request status between current user and another
    this.socketManager.listenToEvent({
      event: this.CHAT_EVENTS.CHAT_REQUEST_STATUS,
      socketIds: [socket.id],
      handler: async (data: { otherUserId: string }, socket: Socket, callback?: Function) => {
        try {
          const userId = socket.data.userId?.toString();
          if (!data.otherUserId) {
            if (callback) callback({ status: "error", message: "Missing otherUserId" });
            return;
          }

          // Admin bypass: admins are always accepted
          const isAdmin = await this.checkIsAdmin(socket);
          if (isAdmin) {
            if (callback) callback({ status: "success", requestStatus: "accepted" });
            return;
          }

          // Expert bypass: regular users can message experts without a chat request
          // But experts checking status with a regular user must go through the normal flow
          const otherUserIsExpert = await this.isUserExpert(data.otherUserId);
          const currentUserIsExpert = await this.isUserExpert(userId);
          if (otherUserIsExpert && !currentUserIsExpert) {
            if (callback) callback({ status: "success", requestStatus: "accepted" });
            return;
          }

          // Check if already accepted (Redis → DB → legacy chat fallback)
          const isAllowed = await this.isChatAllowed(userId, data.otherUserId);
          if (isAllowed) {
            if (callback) callback({ status: "success", requestStatus: "accepted" });
            return;
          }

          // Check for pending request (sent by current user)
          const sentRequest = await ChatRequestModel.findOne({
            sender: userId,
            receiver: data.otherUserId,
            status: "pending",
          });
          if (sentRequest) {
            if (callback) callback({ status: "success", requestStatus: "pending_sent", requestId: sentRequest._id });
            return;
          }

          // Check for pending request (received by current user)
          const receivedRequest = await ChatRequestModel.findOne({
            sender: data.otherUserId,
            receiver: userId,
            status: "pending",
          });
          if (receivedRequest) {
            if (callback) callback({ status: "success", requestStatus: "pending_received", requestId: receivedRequest._id });
            return;
          }

          // Check cooldown (current user was declined by other user)
          const cooldownTTL = await RedisManager.getTTL("chat_req_cooldown", `${userId}:${data.otherUserId}`);
          if (cooldownTTL > 0) {
            if (callback) callback({
              status: "success",
              requestStatus: "cooldown",
              cooldownRemaining: cooldownTTL,
            });
            return;
          }

          // DB fallback for cooldown
          const recentDecline = await ChatRequestModel.findOne({
            sender: userId,
            receiver: data.otherUserId,
            status: "declined",
            declinedAt: { $gte: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) },
          });
          if (recentDecline) {
            const remainingMs = 3 * 24 * 60 * 60 * 1000 - (Date.now() - recentDecline.declinedAt!.getTime());
            if (callback) callback({
              status: "success",
              requestStatus: "cooldown",
              cooldownRemaining: Math.ceil(remainingMs / 1000),
            });
            return;
          }

          // No request exists
          if (callback) callback({ status: "success", requestStatus: "none" });
        } catch (error) {
          console.error("[ChatRequest:status]: Handler error:", error);
          if (callback) callback({ status: "error", message: error instanceof Error ? error.message : "Unknown error" });
        }
      },
    });
  }

  // Handler for incoming messages (c-1 → Server)
  private async handleMessage(
    data: {
      receiverId: string;
      text: string; // file ka case
      messageType?: MessageType;
      chatType?: ChatType;
      bookingId?: string;
    },
    socket: Socket,
    callback?: Function
  ): Promise<void> {
    try {
      const senderId = socket.data.userId?.toString();
      console.log(`[Chat:message]: From ${senderId} to ${data.receiverId}`);

      // Validate message data
      if (!this.validateMessageData(senderId, data)) {
        console.warn(`[Chat:message]: Invalid message data — senderId=${senderId}, receiverId=${data.receiverId}, text=${!!data.text}`);
        await this.socketManager.emitEvent({
          event: this.CHAT_EVENTS.MESSAGE_ERROR,
          data: {
            error: "Invalid message data",
            timestamp: new Date(),
          },
          targetSocketIds: [socket.id],
        });
        if (callback) callback({ status: "error", message: "Invalid message data" });
        return;
      }

      let chat: INewMsg;

      // Booking chat: skip request gate, validate participant + writable
      if (data.bookingId) {
        const booking = await BookingModel.findById(data.bookingId).lean();
        if (!booking) {
          if (callback) callback({ status: "error", message: "Booking not found" });
          return;
        }
        const isParticipant = [booking.user.toString(), (booking as any).expertUser?.toString()].includes(senderId);
        if (!isParticipant) {
          if (callback) callback({ status: "error", message: "Not a participant of this booking" });
          return;
        }
        if (!this.computeBookingChatWritable(booking)) {
          if (callback) callback({ status: "error", message: "Chat is read-only", code: "CHAT_READ_ONLY" });
          return;
        }
        chat = await this.findOrCreateChat(senderId, data.receiverId, "booking", data.bookingId);
      } else {
        // General chat: apply chat request gate
        const chatType = data.chatType || "userToUser";
        const isAdminChat = chatType === "adminToUser" || chatType === "adminToExpert";
        const receiverIsExpert = await this.isUserExpert(data.receiverId);
        if (!isAdminChat && !receiverIsExpert) {
          const isAllowed = await this.isChatAllowed(senderId, data.receiverId);
          if (!isAllowed) {
            await this.socketManager.emitEvent({
              event: this.CHAT_EVENTS.MESSAGE_ERROR,
              data: {
                error: "Chat request not accepted",
                code: "CHAT_REQUEST_REQUIRED",
                timestamp: new Date(),
              },
              targetSocketIds: [socket.id],
            });
            if (callback) callback({ status: "error", message: "Chat request not accepted", code: "CHAT_REQUEST_REQUIRED" });
            return;
          }
        }

        // Expert-to-user gate: experts must have accepted chat request to message regular users
        const senderIsExpert = await this.isUserExpert(senderId);
        if (!isAdminChat && senderIsExpert && !receiverIsExpert) {
          const isAllowed = await this.isChatAllowed(senderId, data.receiverId);
          if (!isAllowed) {
            await this.socketManager.emitEvent({
              event: this.CHAT_EVENTS.MESSAGE_ERROR,
              data: {
                error: "User has not accepted your chat request",
                code: "EXPERT_CHAT_REQUEST_REQUIRED",
                timestamp: new Date(),
              },
              targetSocketIds: [socket.id],
            });
            if (callback) callback({ status: "error", message: "User has not accepted your chat request", code: "EXPERT_CHAT_REQUEST_REQUIRED" });
            return;
          }
        }

        // Get or create general chat
        chat = await this.findOrCreateChat(
          senderId,
          data.receiverId,
          data.chatType
        );
      }

      // Bug 3 fix: if receiver deleted/hidden this chat, soft-delete all existing
      // messages for them (so old messages stay hidden) then remove from chatDeletedFor/chatHiddenFor
      const receiverObjId = new Types.ObjectId(data.receiverId);
      const receiverDeletedChat = chat.chatDeletedFor?.some(
        (id: Types.ObjectId) => id.toString() === data.receiverId
      );
      const receiverHiddenChat = chat.chatHiddenFor?.some(
        (id: Types.ObjectId) => id.toString() === data.receiverId
      );

      if (receiverDeletedChat || receiverHiddenChat) {
        // Mark all existing messages as deleted for the receiver
        for (const msg of chat.messages) {
          if (!msg.deletedFor) msg.deletedFor = [];
          if (!msg.deletedFor.some((id: Types.ObjectId) => id.toString() === data.receiverId)) {
            msg.deletedFor.push(receiverObjId);
          }
        }
        if (receiverDeletedChat && chat.chatDeletedFor) {
          chat.chatDeletedFor = chat.chatDeletedFor.filter(
            (id: Types.ObjectId) => id.toString() !== data.receiverId
          );
        }
        if (receiverHiddenChat && chat.chatHiddenFor) {
          chat.chatHiddenFor = chat.chatHiddenFor.filter(
            (id: Types.ObjectId) => id.toString() !== data.receiverId
          );
        }
        await chat.save();
      }

      // Add message to chat
      const newMessage = await chat.addMessage(
        data.text,
        new Types.ObjectId(senderId),
        data.messageType || "text"
      );

      // ── Instant booking: detect "start" from expert to begin timer ──
      if (data.bookingId && data.text.trim().toLowerCase() === "start") {
        try {
          const startBooking = await BookingModel.findById(data.bookingId);
          if (
            startBooking &&
            startBooking.isInstant &&
            startBooking.status === "confirmed" &&
            !startBooking.startedAt &&
            startBooking.expertUser.toString() === senderId
          ) {
            const tz = startBooking.timezone || "Asia/Kolkata";
            const now = moment();
            const newStartTime = now.tz(tz).format("HH:mm");
            const totalMin = (() => {
              const [h, m] = newStartTime.split(":").map(Number);
              return h * 60 + m + startBooking.duration;
            })();
            const wrapped = ((totalMin % 1440) + 1440) % 1440;
            const newEndTime = `${String(Math.floor(wrapped / 60)).padStart(2, "0")}:${String(wrapped % 60).padStart(2, "0")}`;

            startBooking.startTime = newStartTime;
            startBooking.endTime = newEndTime;
            startBooking.startedAt = new Date();
            await startBooking.save();

            // Emit to both parties
            const eventData = {
              bookingId: data.bookingId,
              startTime: newStartTime,
              endTime: newEndTime,
              startedAt: startBooking.startedAt,
              duration: startBooking.duration,
            };
            for (const uid of [startBooking.user.toString(), startBooking.expertUser.toString()]) {
              const sock = await this.socketManager.getSocketIdUsingUserId(uid);
              if (sock?.socketId) {
                await this.socketManager.emitEvent({
                  event: "booking:instant-started",
                  data: eventData,
                  targetSocketIds: [sock.socketId],
                });
              }
            }
            console.log(`[Chat:message] Instant session started for booking ${data.bookingId}`);
          }
        } catch (err) {
          console.error("[Chat:message] Instant start detection error:", err);
        }
      }

      // Get socket status to find active sockets
      const socketStatus = await this.socketManager.getSocketStatus();

      // Find sender's socket
      const senderSocket = socketStatus.find(
        (s) => s.userId === senderId && s.isActive
      );

      // Find receiver's socket
      const receiverSocket = socketStatus.find(
        (s) => s.userId === data.receiverId && s.isActive
      );

      if (callback) {
        callback({
          status: "success",
          messageId: newMessage.messageId,
          chatId: chat._id,
          timestamp: newMessage.createdAt,
        });
      }

      // 1. Send sent-ack to sender (c-1)
      if (senderSocket) {
        await this.socketManager.emitEvent({
          event: this.CHAT_EVENTS.SENT_ACK,
          data: {
            messageId: newMessage.messageId,
            chatId: chat._id,
            status: "sent",
            timestamp: new Date(),
          },
          targetSocketIds: [senderSocket.socketId],
        });
      }

      // 2. Deliver message to receiver (c-2)
      if (receiverSocket) {
        await this.socketManager.emitEvent({
          event: this.CHAT_EVENTS.MESSAGE,
          data: {
            messageId: newMessage.messageId,
            chatId: chat._id,
            senderId: senderId,
            text: data.text,
            messageType: data.messageType || "text",
            timestamp: new Date(),
          },
          targetSocketIds: [receiverSocket.socketId],
        });
      }
    } catch (error) {
      console.error("[Chat:message]: Error:", error);
      await this.socketManager.emitEvent({
        event: this.CHAT_EVENTS.MESSAGE_ERROR,
        data: {
          message: "Failed to send message",
          error: error instanceof Error ? error.message : "Unknown error",
        },
        targetSocketIds: [socket.id],
      });
      if (callback)
        callback({
          status: "error",
          message: error instanceof Error ? error.message : "Unknown error",
        });
    }
  }

  private async handleChatCheck(
    data: { senderId: string; receiverId: string; bookingId?: string },
    socket: Socket
  ) {
    try {
      console.log(`[Chat:check]: ${data.senderId} → ${data.receiverId}${data.bookingId ? ` (booking: ${data.bookingId})` : ''}`);

      // Get socket status to check if OTHER user is currently online
      const socketStatus = await this.socketManager.getSocketStatus();
      const requestingUser = data.senderId; // The person requesting chat history

      const query: any = {
        $or: [
          { sender: data.senderId, receiver: data.receiverId },
          { sender: data.receiverId, receiver: data.senderId },
        ],
      };

      if (data.bookingId) {
        query.bookingId = new Types.ObjectId(data.bookingId);
      } else {
        query.bookingId = null;
      }

      const chat = await MsgModel.findOne(query)
        .populate("sender", "name avatar")
        .populate("receiver", "name avatar")
        .populate("messages.sender", "name avatar");

      console.log(`[Chat:check]: ${chat ? `Found ${chat.messages.length} messages` : 'No chat exists'}`);

      const result = {
        status: "success",
        exists: !!chat,
        chat: chat
          ? {
              chatId: chat._id,
              participants: {
                sender: chat.sender,
                receiver: chat.receiver,
              },
              messages: chat.messages
              .filter((msg) => {
                // Bug 1 fix: exclude messages soft-deleted by this user
                if (msg.deletedFor && msg.deletedFor.length > 0) {
                  return !msg.deletedFor.some(
                    (id: Types.ObjectId) => id.toString() === requestingUser
                  );
                }
                return true;
              })
              .map((msg) => {
                const messageSenderId = msg.sender?._id?.toString() || msg.sender?.toString();
                
                // ✅ CRITICAL FIX: Only show 'delivered' if:
                // 1. Message has been read (isRead) → show 'seen'
                // 2. Message has deliveredAt AND the receiver is CURRENTLY online → show 'delivered'
                // 3. Otherwise → show 'sent'
                let status = 'sent';
                
                if (msg.status?.isRead) {
                  status = 'seen';
                } else if (msg.status?.deliveredAt) {
                  // ⚠️ CRITICAL: Determine who is the RECEIVER of this message
                  // If message sender is chat.sender, then receiver is chat.receiver (and vice versa)
                  const messageReceiverId = messageSenderId === chat.sender._id.toString() 
                    ? chat.receiver._id.toString() 
                    : chat.sender._id.toString();
                  
                  // ❗ CRITICAL FIX: ONLY mark as 'delivered' if the MESSAGE RECEIVER is online
                  // DO NOT consider the requesting user! They might be the SENDER checking status!
                  const isReceiverOnline = socketStatus.some(
                    s => s.userId === messageReceiverId && s.isActive
                  );
                  
                  console.log(`[Chat:check]: Message ${msg.messageId} → ${isReceiverOnline ? 'delivered' : 'sent'}`);
                  
                  if (isReceiverOnline) {
                    status = 'delivered';
                  }
                  // If receiver is offline, keep status as 'sent' even if deliveredAt exists from old session
                }
                
                return {
                  id: msg.messageId,
                  content: msg.text,
                  senderId: messageSenderId,
                  status,
                  type: msg.messageType,
                  timestamp: msg.createdAt,
                  chatId: chat._id,
                };
              }),
              lastMessage: chat.lastMessage,
              chatType: chat.chatType,
              participantsInfo: chat.participantsInfo,
              bookingId: chat.bookingId || null,
              isReadOnly: false,
            }
          : null,
        timestamp: new Date(),
      };

      // Compute read-only status for booking chats
      if (result.chat && chat?.bookingId) {
        const booking = await BookingModel.findById(chat.bookingId).lean();
        result.chat.isReadOnly = booking ? !this.computeBookingChatWritable(booking) : true;
      }

      return result; // This will be sent as acknowledgment
    } catch (error) {
      console.error("[Chat:check]: Error:", error);
      throw error;
    }
  }
  // Handler for delivery acknowledgment (c-2 → Server → c-1)
  private async handleDeliveredAck(
    data: { messageId: number; chatId: string },
    socket: any
  ): Promise<void> {
    try {
      const chat = await MsgModel.findById(data.chatId);
      if (!chat) return;

      // ⚠️ CRITICAL: Check if message is already delivered to prevent duplicate processing
      const message = chat.messages.find(m => m.messageId === data.messageId);
      if (!message) {
        console.log(`[Chat:deliveredAck]: Message ${data.messageId} not found in chat ${data.chatId}`);
        return;
      }
      
      if (message.status.deliveredAt) {
        console.log(`[Chat:deliveredAck]: Message ${data.messageId} already delivered, skipping`);
        return; // Already delivered, don't process again
      }

      // Get socket status
      const socketStatus = await this.socketManager.getSocketStatus();
      const senderSocket = socketStatus.find(
        (s) => s.userId === chat.sender.toString() && s.isActive
      );

      await chat.markMessageAsDelivered(data.messageId);

      // Notify original sender if they're online
      if (senderSocket) {
        await this.socketManager.emitEvent({
          event: this.CHAT_EVENTS.DELIVERED,
          data: {
            messageId: data.messageId,
            chatId: data.chatId,
            status: "delivered",
            timestamp: new Date(),
          },
          targetSocketIds: [senderSocket.socketId],
        });
      }
    } catch (error) {
      console.error("[Chat:deliveredAck]: Error:", error);
    }
  }

  // Handler for seen acknowledgment (c-2 → Server → c-1)
  private async handleSeenAck(
    data: { messageId: number; chatId: string },
    socket: any,
    callback?: Function
  ): Promise<void> {
    try {
      console.log(`[Chat:seenAck]: User ${socket.data.userId}, message ${data.messageId}`);
      
      const userId = socket.data.userId;
      const chat = await MsgModel.findById(data.chatId);
      if (!chat) {
        console.error(`[Chat:seenAck]: Chat not found: ${data.chatId}`);
        if (callback) callback({ status: 'error', message: 'Chat not found' });
        return;
      }

      // Find the message to get the sender
      const message = chat.messages.find(msg => msg.messageId === data.messageId);
      if (!message) {
        console.error(`[Chat:seenAck]: Message not found: ${data.messageId}`);
        if (callback) callback({ status: 'error', message: 'Message not found' });
        return;
      }

      const senderId = message.sender.toString();
      
      // ❗ CRITICAL VALIDATION: The person sending seen-ack MUST be the RECEIVER, not the SENDER!
      // If sender tries to mark their own message as read, reject it
      if (userId === senderId) {
        console.error(`[Chat:seenAck]: REJECTED - User ${userId} tried to mark own message ${data.messageId} as seen`);
        if (callback) callback({ status: 'error', message: 'Cannot mark own message as seen' });
        return;
      }
      
      console.log(`[Chat:seenAck]: Receiver ${userId} marking message ${data.messageId} as read`);
      
      // Mark as read
      await chat.markMessageAsRead(data.messageId);

      // Queue the read receipt (will deliver immediately if sender is online)
      await this.queueReadReceipt({
        messageId: data.messageId,
        chatId: data.chatId,
        senderId,
        readAt: new Date(),
        readBy: userId,
      });

      console.log(`[Chat:seenAck]: Processed message ${data.messageId}`);
      
      // Send success callback
      if (callback) {
        callback({ 
          status: 'success', 
          messageId: data.messageId,
          chatId: data.chatId 
        });
      }
    } catch (error) {
      console.error("[Chat:seenAck]: Error:", error);
      if (callback) {
        callback({ 
          status: 'error', 
          message: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    }
  }

  /**
   * Check if two users have an accepted chat request (Redis cache → DB → legacy chat fallback).
   */
  private async isChatAllowed(senderId: string, receiverId: string): Promise<boolean> {
    // Ensure both IDs are strings for consistent Redis keys and DB queries
    senderId = senderId?.toString();
    receiverId = receiverId?.toString();
    // 1. Check Redis cache
    const sortedPair = [senderId, receiverId].sort().join(":");
    const cached = await RedisManager.getDataFromGroup<string>("chat_req_accepted", sortedPair);
    if (cached === "accepted") return true;

    // 2. Cache miss → check ChatRequestModel
    const request = await ChatRequestModel.findOne({
      $or: [
        { sender: senderId, receiver: receiverId, status: "accepted" },
        { sender: receiverId, receiver: senderId, status: "accepted" },
      ],
    });
    if (request) {
      await RedisManager.cacheDataInGroup("chat_req_accepted", sortedPair, "accepted", 86400);
      return true;
    }

    // 3. Legacy fallback: existing chat with messages = implicitly accepted
    const existingChat = await MsgModel.findOne({
      $or: [
        { sender: senderId, receiver: receiverId },
        { sender: receiverId, receiver: senderId },
      ],
      "messages.0": { $exists: true },
    }).lean();
    if (existingChat) {
      // Create accepted request for future fast lookups
      await ChatRequestModel.findOneAndUpdate(
        {
          $or: [
            { sender: senderId, receiver: receiverId },
            { sender: receiverId, receiver: senderId },
          ],
        },
        {
          sender: existingChat.sender,
          receiver: existingChat.receiver,
          status: "accepted",
          respondedAt: new Date(),
        },
        { upsert: true, new: true }
      );
      await RedisManager.cacheDataInGroup("chat_req_accepted", sortedPair, "accepted", 86400);
      return true;
    }

    return false;
  }

  /**
   * Check if socket user is admin. Caches result on socket.data.
   */
  private async checkIsAdmin(socket: Socket): Promise<boolean> {
    if (socket.data.isAdmin !== undefined) {
      return socket.data.isAdmin;
    }
    try {
      // Dynamic import to avoid circular dependency
      const { UserModel } = await import("../models/userModel");
      const user = await UserModel.findById(socket.data.userId).select("isAdmin").lean();
      socket.data.isAdmin = !!(user as any)?.isAdmin;
    } catch {
      socket.data.isAdmin = false;
    }
    return socket.data.isAdmin;
  }

  /**
   * Check if a given userId belongs to an expert.
   * Uses Redis cache (1 hour TTL) to avoid repeated DB lookups.
   */
  private async isUserExpert(userId: string): Promise<boolean> {
    try {
      const cached = await RedisManager.getDataFromGroup<string | boolean>("user_is_expert", userId);
      // getDataFromGroup runs JSON.parse, which turns "true"→boolean true,
      // so handle both boolean and string comparisons
      if (cached !== null && cached !== undefined) return cached === true || cached === "true";
      const { UserModel } = await import("../models/userModel");
      const user = await UserModel.findById(userId).select("isExpert").lean();
      const isExpert = !!(user as any)?.isExpert;
      await RedisManager.cacheDataInGroup("user_is_expert", userId, isExpert ? "true" : "false", 3600);
      return isExpert;
    } catch {
      return false;
    }
  }

  private validateMessageData(
    senderId: string | undefined,
    data: { receiverId: string; text: string }
  ): boolean {
    return Boolean(senderId && data.receiverId && data.text.trim());
  }

  private async findOrCreateChat(
    senderId: string,
    receiverId: string,
    chatType: ChatType = "userToUser",
    bookingId?: string
  ): Promise<INewMsg> {
    const query: any = {
      $or: [
        { sender: senderId, receiver: receiverId },
        { sender: receiverId, receiver: senderId },
      ],
    };

    if (bookingId) {
      query.bookingId = new Types.ObjectId(bookingId);
    } else {
      query.bookingId = null;
    }

    let chat = await MsgModel.findOne(query);

    if (!chat) {
      try {
        chat = new MsgModel({
          sender: new Types.ObjectId(senderId),
          receiver: new Types.ObjectId(receiverId),
          messages: [],
          chatType,
          messageIdCounter: 0,
          bookingId: bookingId ? new Types.ObjectId(bookingId) : null,
        });
        await chat.save();
      } catch (err: any) {
        // Race condition: another request created the chat concurrently
        if (err.code === 11000) {
          chat = await MsgModel.findOne(query);
          if (!chat) throw err; // Should not happen, but rethrow if still missing
        } else {
          throw err;
        }
      }
    }

    return chat;
  }

  private computeBookingChatWritable(booking: any): boolean {
    if (booking.status !== "confirmed") return false;
    // Instant bookings before "start": always writable so expert can type "start"
    if (booking.isInstant && !booking.startedAt) return true;
    const tz = booking.timezone || "Asia/Kolkata";
    const dateStr = moment(booking.date).tz(tz).format("YYYY-MM-DD");
    const sessionEnd = moment.tz(`${dateStr} ${booking.endTime}`, "YYYY-MM-DD HH:mm", tz);
    const chatDeadline = moment(sessionEnd).add(2, "minutes");
    return moment().isSameOrBefore(chatDeadline);
  }

  // ============ NEW METHODS FOR UNREAD SYSTEM ============

  /**
   * Get all chats for a user with unread counts
   */
  private async handleChatList(socket: Socket) {
    const userId = socket.data.userId;

    if (!userId) {
      return { status: "error", message: "User not authenticated" };
    }

    try {
      const userObjId = new Types.ObjectId(userId);
      const chats = await MsgModel.aggregate([
        {
          $match: {
            $or: [
              { sender: userObjId },
              { receiver: userObjId },
            ],
            // Exclude chats hidden or deleted by this user
            chatHiddenFor: { $ne: userObjId },
            chatDeletedFor: { $ne: userObjId },
          },
        },
        {
          $addFields: {
            // Determine the other participant
            otherParticipant: {
              $cond: [
                { $eq: ["$sender", userObjId] },
                "$receiver",
                "$sender",
              ],
            },
            unreadCount: {
              $size: {
                $filter: {
                  input: "$messages",
                  as: "msg",
                  cond: {
                    $and: [
                      { $ne: ["$$msg.sender", userObjId] },
                      { $eq: ["$$msg.status.isRead", false] },
                    ],
                  },
                },
              },
            },
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "otherParticipant",
            foreignField: "_id",
            as: "participantInfo",
          },
        },
        {
          $unwind: {
            path: "$participantInfo",
            preserveNullAndEmptyArrays: true,
          },
        },
        // Lookup Media doc to construct profilePhoto (User stores profilePhotoId + mediaId, not profilePhoto)
        {
          $lookup: {
            from: "media",
            localField: "participantInfo.mediaId",
            foreignField: "_id",
            as: "_participantMedia",
          },
        },
        {
          $unwind: {
            path: "$_participantMedia",
            preserveNullAndEmptyArrays: true,
          },
        },
        // Lookup booking info for booking chats
        {
          $lookup: {
            from: "bookings",
            localField: "bookingId",
            foreignField: "_id",
            as: "_bookingInfo",
          },
        },
        {
          $unwind: {
            path: "$_bookingInfo",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $project: {
            chatId: "$_id",
            bookingId: 1,
            chatType: 1,
            bookingInfo: {
              $cond: [
                { $ifNull: ["$_bookingInfo", false] },
                {
                  date: "$_bookingInfo.date",
                  startTime: "$_bookingInfo.startTime",
                  endTime: "$_bookingInfo.endTime",
                  status: "$_bookingInfo.status",
                },
                null,
              ],
            },
            otherUser: {
              _id: "$participantInfo._id",
              fullName: "$participantInfo.fullName",
              username: "$participantInfo.username",
              profilePhoto: {
                $let: {
                  vars: {
                    photo: {
                      $arrayElemAt: [
                        {
                          $filter: {
                            input: { $ifNull: ["$_participantMedia.photos", []] },
                            as: "p",
                            cond: { $eq: ["$$p.public_id", "$participantInfo.profilePhotoId"] },
                          },
                        },
                        0,
                      ],
                    },
                  },
                  in: {
                    $cond: [
                      { $ifNull: ["$$photo", false] },
                      { url: "$$photo.url", thumbnail_url: "$$photo.thumbnail_url" },
                      null,
                    ],
                  },
                },
              },
              isActive: "$participantInfo.isActive",
              isExpert: "$participantInfo.isExpert",
            },
            lastMessage: 1,
            unreadCount: 1,
            updatedAt: 1,
          },
        },
        { $sort: { updatedAt: -1 } },
      ]);

      return {
        status: "success",
        chats,
        totalChats: chats.length,
        totalUnread: chats.reduce((sum, chat) => sum + (chat.unreadCount || 0), 0),
      };
    } catch (error) {
      console.error("[Chat:list]: Error:", error);
      return {
        status: "error",
        message: error instanceof Error ? error.message : "Failed to fetch chats",
      };
    }
  }

  /**
   * Handle chat:open event - Mark all unread messages as read
   */
  private async handleChatOpen(
    data: { chatId: string },
    socket: Socket
  ) {
    const userId = socket.data.userId?.toString();

    if (!userId || !data.chatId) {
      return { status: "error", message: "Invalid request" };
    }

    try {
      const chat = await MsgModel.findById(data.chatId);

      if (!chat) {
        return { status: "error", message: "Chat not found" };
      }

      // Find all unread messages where I'm the RECEIVER (not sender)
      // ⚠️ CRITICAL: Handle both populated and unpopulated sender field
      const unreadMessages = chat.messages.filter((msg) => {
        // Get sender ID - handle both populated object and ObjectId
        const senderId = msg.sender?._id?.toString() || msg.sender?.toString();
        const isMyMessage = senderId === userId;
        const isUnread = !msg.status.isRead;
        
        // Only mark OTHER people's messages as read, not my own!
        return !isMyMessage && isUnread;
      });
      
      console.log(`[Chat:open]: User ${userId} chat ${data.chatId}, ${unreadMessages.length} unread`);

      if (unreadMessages.length === 0) {
        return { status: "success", markedCount: 0 };
      }

      const readAt = new Date();

      // Batch mark as read
      for (const msg of unreadMessages) {
        await chat.markMessageAsRead(msg.messageId);
      }

      // Queue read receipts for each message
      for (const msg of unreadMessages) {
        // ⚠️ Handle both populated and unpopulated sender field
        const senderId = msg.sender?._id?.toString() || msg.sender?.toString();
        await this.queueReadReceipt({
          messageId: msg.messageId,
          chatId: data.chatId,
          senderId,
          readAt,
          readBy: userId,
        });
      }

      console.log(`[Chat:open]: Marked ${unreadMessages.length} messages read in chat ${data.chatId}`);

      return {
        status: "success",
        markedCount: unreadMessages.length,
        messageIds: unreadMessages.map(m => m.messageId),
      };
    } catch (error) {
      console.error("[Chat:open]: Error:", error);
      return {
        status: "error",
        message: error instanceof Error ? error.message : "Failed to mark messages as read",
      };
    }
  }

  /**
   * Queue a read receipt in Redis for later delivery
   */
  private async queueReadReceipt(receipt: IReadReceipt): Promise<void> {
    try {
      const queueKey = `read_receipts:${receipt.senderId}`;
      const receiptData = JSON.stringify(receipt);

      // Add to queue
      await RedisManager.lpush(queueKey, receiptData);

      // Set TTL (7 days)
      await RedisManager.expire(queueKey, this.READ_RECEIPT_TTL);

      // Try immediate delivery if sender is online
      const senderSocket = await this.socketManager.getSocketIdUsingUserId(
        receipt.senderId
      );

      if (senderSocket && senderSocket.socketId) {
        await this.deliverReadReceipt(senderSocket.socketId, receipt);

        // Remove from queue after successful delivery
        await RedisManager.lrem(queueKey, 1, receiptData);
        console.log(`[Chat:receipt]: Delivered immediately for message ${receipt.messageId}`);
      } else {
        console.log(
          `[Chat:receipt]: Queued for offline user ${receipt.senderId}, message ${receipt.messageId}`
        );
      }
    } catch (error) {
      console.error("[Chat:receipt]: Error queuing:", error);
      // Don't throw - we don't want to fail the chat:open operation
    }
  }

  /**
   * Deliver a single read receipt to a socket
   */
  private async deliverReadReceipt(
    socketId: string,
    receipt: IReadReceipt
  ): Promise<void> {
    try {
      await this.socketManager.emitEvent({
        event: this.CHAT_EVENTS.SEEN,
        data: {
          messageId: receipt.messageId,
          chatId: receipt.chatId,
          status: "seen",
          readAt: receipt.readAt,
          timestamp: new Date(),
        },
        targetSocketIds: [socketId],
      });
    } catch (error) {
      console.error("[Chat:receipt]: Error delivering:", error);
      throw error;
    }
  }

  /**
   * Flush pending read receipts for a user (called on authentication)
   * This is called from socket.ts when a user authenticates
   */
  public async flushPendingReadReceipts(
    socketId: string,
    userId: string
  ): Promise<void> {
    try {
      const queueKey = `read_receipts:${userId}`;
      const receipts = await RedisManager.lrange(queueKey, 0, -1);

      if (receipts.length === 0) {
        console.log(`[Chat:receipt]: No pending receipts for user ${userId}`);
        return;
      }

      // Parse receipts
      const parsedReceipts = receipts.map((r) => JSON.parse(r) as IReadReceipt);

      // Batch deliver all receipts
      await this.socketManager.emitEvent({
        event: "receipts:batch",
        data: { receipts: parsedReceipts },
        targetSocketIds: [socketId],
      });

      // Clear delivered receipts
      await RedisManager.del(queueKey);

      console.log(`[Chat:receipt]: Flushed ${receipts.length} pending receipts for user ${userId}`);
    } catch (error) {
      console.error("[Chat:receipt]: Error flushing:", error);
      // Don't throw - we don't want to fail authentication
    }
  }
}

// new ChatController();  // -- floating instantiation

// Remove the floating instantiation
export { ChatController };
