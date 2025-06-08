import { MsgModel } from "../models/messageModel";
import { SocketManager } from "../socket";
import { RedisManager } from "../utils/redisClient";
import { Types } from "mongoose";
import { INewMsg, MessageType, ChatType } from "../interface/IMessage";

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
  } as const;

  constructor() {
    console.log("i have been called by chatcontroller.");
    this.socketManager = SocketManager.getInstance();
    this.initializeSocketListeners();
  }

  public static getInstance(): ChatController {
    if (!ChatController.instance) {
      ChatController.instance = new ChatController();
    }
    return ChatController.instance;
  }

  private initializeSocketListeners(): void {
    // We only need to listen to the main message event
    // Other events will be handled based on the socket data from Redis
    this.socketManager.listenToEvent({
      event: this.CHAT_EVENTS.MESSAGE,
      handler: this.handleMessage.bind(this),
    });

    // Listen for delivery confirmations from receiving clients
    this.socketManager.listenToEvent({
      event: this.CHAT_EVENTS.DELIVERED_ACK,
      handler: this.handleDeliveredAck.bind(this),
    });

    // Listen for seen confirmations from receiving clients
    this.socketManager.listenToEvent({
      event: this.CHAT_EVENTS.SEEN_ACK,
      handler: this.handleSeenAck.bind(this),
    });
  }

  // Handler for incoming messages (c-1 → Server)
  private async handleMessage(
    data: {
      receiverId: string;
      text: string;
      messageType?: MessageType;
      chatType?: ChatType;
    },
    socket: any
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
