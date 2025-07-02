import { MsgModel } from "../models/messageModel";
import { SocketManager } from "../socket";
import { RedisManager } from "../utils/redisClient";
import { Types } from "mongoose";
import { INewMsg, MessageType, ChatType } from "../interface/IMessage";
import { Socket } from "socket.io";
import NotificationService from "../services/notifications";

class ChatController {
  private static instance: ChatController | null = null;
  private readonly socketManager: SocketManager;
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
                let status = 'sent';
                if (msg.status?.isRead) status = 'seen';
                else if (msg.status?.deliveredAt) status = 'delivered';
                return {
                  id: msg.messageId,
                  content: msg.text,
                  senderId: msg.sender?._id?.toString() || msg.sender?.toString(),
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
    socket: any
  ): Promise<void> {
    try {
      const chat = await MsgModel.findById(data.chatId);
      if (!chat) return;

      // Get socket status
      const socketStatus = await this.socketManager.getSocketStatus();
      const senderSocket = socketStatus.find(
        (s) => s.userId === chat.sender.toString() && s.isActive
      );

      await chat.markMessageAsRead(data.messageId);

      // Notify original sender if they're online
      if (senderSocket) {
        await this.socketManager.emitEvent({
          event: this.CHAT_EVENTS.SEEN,
          data: {
            messageId: data.messageId,
            chatId: data.chatId,
            status: "seen",
            timestamp: new Date(),
          },
          targetSocketIds: [senderSocket.socketId],
        });
      }
    } catch (error) {
      console.error("Error handling seen acknowledgment:", error);
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
}

// new ChatController();  // -- floating instantiation

// Remove the floating instantiation
export { ChatController };
