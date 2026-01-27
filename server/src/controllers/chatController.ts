import { MsgModel } from "../models/messageModel";
import { SocketManager } from "../socket";
import { RedisManager } from "../utils/redisClient";
import { Types } from "mongoose";
import { INewMsg, MessageType, ChatType, IReadReceipt } from "../interface/IMessage";
import { Socket } from "socket.io";
import NotificationService from "../services/notifications";

class ChatController {
  private static instance: ChatController | null = null;
  private readonly socketManager: SocketManager;
  private readonly READ_RECEIPT_TTL = 7 * 24 * 60 * 60; // 7 days in seconds

  // Session validation cache - avoid excessive Redis calls
  private sessionValidationCache: Map<string, { valid: boolean; timestamp: number }> = new Map();
  private readonly SESSION_CACHE_TTL = 30000; // 30 seconds cache

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
  } as const;

  constructor() {
    console.log("i have been called by chatcontroller.");
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
    console.log("Setting up notification listener in ChatController");
    notificationService.onNotification(async (notificationData) => {
      try {
        console.log("Received admin notification:", notificationData);

        // Broadcast notification to all connected sockets
        await this.socketManager.emitEvent({
          event: this.CHAT_EVENTS.SYSTEM_MESSAGE,
          data: {
            ...notificationData,
            id: Date.now(), // Generate unique ID for the notification
          },
        });

        console.log("Admin notification broadcasted to all clients");
      } catch (error) {
        console.error("Error broadcasting admin notification:", error);
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
        socket.emit("session:revoked", {
          message: "Your session has been revoked. Please login again.",
        });
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
      console.log(
        `Socket ${socket.id} not authenticated, skipping chat listeners`
      );
      return;
    }

    console.log(
      `Setting up chat listeners for authenticated socket ${socket.id}`
    );

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
          console.error("Error in chat:check handler:", error);
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
      console.log(
        `Setting up listener for event: ${event} on socket ${socket.id}`
      );
      socket.on(event, async (data: any, callback?: Function) => {
        try {
          // Validate session before processing critical events
          const isSessionValid = await this.validateSession(socket);
          if (!isSessionValid) {
            if (callback) {
              callback({
                status: "error",
                message: "Session expired or revoked",
                code: "SESSION_REVOKED",
              });
            }
            return;
          }

          console.log(`Received event ${event} with data:`, data);
          await handler(data, socket, callback);
        } catch (error) {
          console.error(`Error handling ${event}:`, error);
          if (callback)
            callback({
              status: "error",
              message: error instanceof Error ? error.message : "Unknown error",
            });
        }
      });
      console.log(`Event listener '${event}' attached to socket ${socket.id}`);
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
          console.error("Error in chat:list handler:", error);
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
          console.error("Error in chat:open handler:", error);
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
          console.log(`[user:check-online] User ${data.userId} is ${isOnline ? 'ONLINE' : 'OFFLINE'}`);
          if (callback) {
            callback({ status: 'success', userId: data.userId, isOnline });
          }
        } catch (error) {
          console.error("Error in user:check-online handler:", error);
          if (callback) {
            callback({ status: 'error', isOnline: false });
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
          const onlineUserIds = [...new Set(socketStatus
            .filter(s => s.isActive)
            .map(s => s.userId)
          )];
          console.log(`[users:get-online] Found ${onlineUserIds.length} online users`);
          if (callback) {
            callback({ status: 'success', onlineUserIds });
          }
        } catch (error) {
          console.error("Error in users:get-online handler:", error);
          if (callback) {
            callback({ status: 'error', onlineUserIds: [] });
          }
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
    },
    socket: Socket,
    callback?: Function
  ): Promise<void> {
    try {
      const senderId = socket.data.userId;
      console.log("Received message:", { senderId, ...data });

      // Validate message data
      if (!this.validateMessageData(senderId, data)) {
        await this.socketManager.emitEvent({
          event: this.CHAT_EVENTS.MESSAGE_ERROR,
          data: {
            error: "Invalid message data",
            timestamp: new Date(),
          },
          targetSocketIds: [socket.id],
        });
        return;
      }

      // Get or create chat
      const chat = await this.findOrCreateChat(
        senderId,
        data.receiverId,
        data.chatType
      );

      // Add message to chat
      const newMessage = await chat.addMessage(
        data.text,
        new Types.ObjectId(senderId),
        data.messageType || "text"
      );

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
      console.error("Error handling message:", error);
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
    data: { senderId: string; receiverId: string },
    socket: Socket
  ) {
    try {
      console.log("Handling chat check:", data, "\n");
      
      // Get socket status to check if OTHER user is currently online
      const socketStatus = await this.socketManager.getSocketStatus();
      const requestingUser = data.senderId; // The person requesting chat history
      
      const chat = await MsgModel.findOne({
        $or: [
          { sender: data.senderId, receiver: data.receiverId },
          { sender: data.receiverId, receiver: data.senderId },
        ],
      })
        .populate("sender", "name avatar")
        .populate("receiver", "name avatar")
        .populate("messages.sender", "name avatar");

      console.log('Chat history found:', chat ? chat.messages : 'No chat');

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
              messages: chat.messages.map((msg) => {
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
                  
                  console.log(`[handleChatCheck] Message ${msg.messageId} status check:`, {
                    messageSender: messageSenderId,
                    messageReceiver: messageReceiverId,
                    requestingUser,
                    hasDeliveredAt: !!msg.status?.deliveredAt,
                    isReceiverOnline,
                    finalStatus: isReceiverOnline ? 'delivered' : 'sent'
                  });
                  
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
            }
          : null,
        timestamp: new Date(),
      };
      return result; // This will be sent as acknowledgment
    } catch (error) {
      console.error("Error in handleChatCheck:", error);
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
        console.log(`[handleDeliveredAck] Message ${data.messageId} not found in chat ${data.chatId}`);
        return;
      }
      
      if (message.status.deliveredAt) {
        console.log(`[handleDeliveredAck] Message ${data.messageId} already delivered, skipping`);
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
      console.error("Error handling delivery acknowledgment:", error);
    }
  }

  // Handler for seen acknowledgment (c-2 → Server → c-1)
  private async handleSeenAck(
    data: { messageId: number; chatId: string },
    socket: any,
    callback?: Function
  ): Promise<void> {
    try {
      console.log(`[handleSeenAck] Received from user ${socket.data.userId}:`, data);
      
      const userId = socket.data.userId;
      const chat = await MsgModel.findById(data.chatId);
      if (!chat) {
        console.error(`[handleSeenAck] Chat not found: ${data.chatId}`);
        if (callback) callback({ status: 'error', message: 'Chat not found' });
        return;
      }

      // Find the message to get the sender
      const message = chat.messages.find(msg => msg.messageId === data.messageId);
      if (!message) {
        console.error(`[handleSeenAck] Message not found: ${data.messageId}`);
        if (callback) callback({ status: 'error', message: 'Message not found' });
        return;
      }

      const senderId = message.sender.toString();
      
      // ❗ CRITICAL VALIDATION: The person sending seen-ack MUST be the RECEIVER, not the SENDER!
      // If sender tries to mark their own message as read, reject it
      if (userId === senderId) {
        console.error(`[handleSeenAck] REJECTED: User ${userId} tried to mark their OWN message as seen!`, {
          messageId: data.messageId,
          messageSender: senderId,
          requestingUser: userId
        });
        if (callback) callback({ status: 'error', message: 'Cannot mark own message as seen' });
        return;
      }
      
      console.log(`[handleSeenAck] Valid seen-ack: receiver ${userId} marking sender ${senderId}'s message ${data.messageId} as read`);
      
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

      console.log(`[handleSeenAck] Successfully processed seen-ack for message ${data.messageId}`);
      
      // Send success callback
      if (callback) {
        callback({ 
          status: 'success', 
          messageId: data.messageId,
          chatId: data.chatId 
        });
      }
    } catch (error) {
      console.error("[handleSeenAck] Error handling seen acknowledgment:", error);
      if (callback) {
        callback({ 
          status: 'error', 
          message: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
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
    chatType: ChatType = "userToUser"
  ): Promise<INewMsg> {
    let chat = await MsgModel.findOne({
      $or: [
        { sender: senderId, receiver: receiverId },
        { sender: receiverId, receiver: senderId },
      ],
    });

    if (!chat) {
      // if text is present add to msg.
      chat = new MsgModel({
        sender: new Types.ObjectId(senderId),
        receiver: new Types.ObjectId(receiverId),
        messages: [],
        chatType: chatType,
        messageIdCounter: 0,
      });
      await chat.save();
    }

    return chat;
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
      const chats = await MsgModel.aggregate([
        {
          $match: {
            $or: [
              { sender: new Types.ObjectId(userId) },
              { receiver: new Types.ObjectId(userId) },
            ],
          },
        },
        {
          $addFields: {
            // Determine the other participant
            otherParticipant: {
              $cond: [
                { $eq: ["$sender", new Types.ObjectId(userId)] },
                "$receiver",
                "$sender",
              ],
            },
            // Calculate unread count for messages where:
            // 1. I'm the receiver (other person sent it)
            // 2. Message is not read
            unreadCount: {
              $size: {
                $filter: {
                  input: "$messages",
                  as: "msg",
                  cond: {
                    $and: [
                      {
                        $ne: [
                          "$$msg.sender",
                          new Types.ObjectId(userId),
                        ],
                      },
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
        {
          $project: {
            chatId: "$_id",
            otherUser: {
              _id: "$participantInfo._id",
              fullName: "$participantInfo.fullName",
              username: "$participantInfo.username",
              profilePhoto: "$participantInfo.profilePhoto",
              isActive: "$participantInfo.isActive",
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
      console.error("Error in handleChatList:", error);
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
      
      console.log(`[handleChatOpen] User ${userId} opening chat ${data.chatId}:`, {
        totalMessages: chat.messages.length,
        unreadFromOthers: unreadMessages.length,
        myMessages: chat.messages.filter(m => (m.sender?._id?.toString() || m.sender?.toString()) === userId).length
      });

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

      console.log(
        `Marked ${unreadMessages.length} messages as read in chat ${data.chatId}`
      );

      return {
        status: "success",
        markedCount: unreadMessages.length,
        messageIds: unreadMessages.map(m => m.messageId),
      };
    } catch (error) {
      console.error("Error in handleChatOpen:", error);
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
      console.log(`[queueReadReceipt] Looking for sender socket: ${receipt.senderId}`);
      const senderSocket = await this.socketManager.getSocketIdUsingUserId(
        receipt.senderId
      );
      console.log(`[queueReadReceipt] Sender socket result:`, senderSocket);

      if (senderSocket && senderSocket.socketId) {
        console.log(`[queueReadReceipt] Sender IS online, delivering immediately to socket ${senderSocket.socketId}`);
        await this.deliverReadReceipt(senderSocket.socketId, receipt);

        // Remove from queue after successful delivery
        await RedisManager.lrem(queueKey, 1, receiptData);
        console.log(`✅ Delivered receipt immediately for message ${receipt.messageId}`);
      } else {
        console.log(
          `❌ Queued receipt for offline user ${receipt.senderId}, message ${receipt.messageId}`
        );
      }
    } catch (error) {
      console.error("Error queuing read receipt:", error);
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
      console.error("Error delivering read receipt:", error);
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
        console.log(`No pending receipts for user ${userId}`);
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

      console.log(`Flushed ${receipts.length} pending receipts for user ${userId}`);
    } catch (error) {
      console.error("Error flushing pending receipts:", error);
      // Don't throw - we don't want to fail authentication
    }
  }
}

// new ChatController();  // -- floating instantiation

// Remove the floating instantiation
export { ChatController };
