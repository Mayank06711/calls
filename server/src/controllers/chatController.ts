import { MsgModel } from "../models/messageModel";
import { SocketManager } from "../socket";
import { RedisManager } from "../utils/redisClient";
import { Types } from "mongoose";
import { ApiError } from "../utils/apiError";
import { successResponse } from "../utils/apiResponse";
import {
  INewMessage,
  IParticipantInfo,
  IAttachment,
  IMessageMedia,
  INewMsg,
  MessageType,
  ChatType,
} from "../interface/IMessage";
import { Request, Response } from "express";
import { Socket } from "socket.io";

class ChatController {
  private readonly socketManager: SocketManager;
  private readonly CHAT_EVENTS = {
    MESSAGE_SENT: "chat:message:sent",
    MESSAGE_RECEIVED: "chat:message:received",
    MESSAGE_READ: "chat:message:read",
    MESSAGE_DELIVERED: "chat:message:delivered",
    TYPING_START: "chat:typing:start",
    TYPING_END: "chat:typing:end",
    USER_ONLINE: "chat:user:online",
    USER_OFFLINE: "chat:user:offline",
    SEND_MESSAGE: "chat:send:message",
    NEW_MESSAGE: "chat:new:message",
    MESSAGE_ERROR: "chat:message:error",
  } as const;

  constructor() {
    this.socketManager = SocketManager.getInstance();
    this.initializeSocketListeners();
  }

  private initializeSocketListeners(): void {
    // Initialize all event listeners
    this.socketManager.listenToEvent({
      event: this.CHAT_EVENTS.TYPING_START,
      handler: this.handleTypingStart.bind(this),
    });

    this.socketManager.listenToEvent({
      event: this.CHAT_EVENTS.TYPING_END,
      handler: this.handleTypingEnd.bind(this),
    });

    this.socketManager.listenToEvent({
      event: this.CHAT_EVENTS.SEND_MESSAGE,
      handler: this.handleSendMessage.bind(this),
    });
  }

  // Handler for typing start event
  private async handleTypingStart(
    data: { chatId: string; userId: string },
    socket: Socket
  ): Promise<void> {
    socket.to(`chat:${data.chatId}`).emit(this.CHAT_EVENTS.TYPING_START, {
      chatId: data.chatId,
      userId: data.userId,
    });
  }

  // Handler for typing end event
  private async handleTypingEnd(
    data: { chatId: string; userId: string },
    socket: Socket
  ): Promise<void> {
    socket.to(`chat:${data.chatId}`).emit(this.CHAT_EVENTS.TYPING_END, {
      chatId: data.chatId,
      userId: data.userId,
    });
  }

  // Handler for send message event
  private async handleSendMessage(
    data: {
      receiverId: string;
      text: string;
      messageType?: MessageType;
      chatType?: ChatType;
    },
    socket: Socket
  ): Promise<void> {
    try {
      const senderId = socket.data.userId;
      console.log("Received message event:", { senderId, ...data });

      // Validate message data
      if (!this.validateMessageData(senderId, data)) {
        throw new Error("Invalid message data");
      }

      // Get or create chat
      const chat = await this.findOrCreateChat(
        senderId,
        data.receiverId,
        data.chatType
      );

      // Add message to chat
      await chat.addMessage(
        data.text,
        new Types.ObjectId(senderId),
        data.messageType || "text"
      );

      // Send message to receiver
      await this.sendMessageToReceiver(chat, senderId, data.receiverId);

      // Send confirmation to sender
      this.sendConfirmationToSender(socket, chat);

      console.log("Message processed successfully");
    } catch (error) {
      this.handleMessageError(socket, error);
    }
  }

  // Helper methods
  private validateMessageData(
    senderId: string | undefined,
    data: { receiverId: string; text: string }
  ): boolean {
    return Boolean(senderId && data.receiverId && data.text.trim());
  }

  private async findOrCreateChat(
    senderId: string,
    receiverId: string,
    chatType?: String | undefined
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
        chatType: chatType ? chatType : "userToUser",
        messageIdCounter: 0,
      });
    }

    return chat;
  }

  private async sendMessageToReceiver(
    chat: INewMsg,
    senderId: string,
    receiverId: string
  ): Promise<void> {
    const socketStatus = await this.socketManager.getSocketStatus();
    const receiverSockets = socketStatus
      .filter((socket) => socket.userId === receiverId && socket.isActive)
      .map((socket) => socket.socketId);

    if (receiverSockets.length > 0) {
      await this.socketManager.emitEvent({
        event: this.CHAT_EVENTS.NEW_MESSAGE,
        data: {
          chatId: chat._id,
          message: chat.lastMessage,
          sender: {
            id: senderId,
          },
        },
        targetSocketIds: receiverSockets,
      });
    }
  }

  private sendConfirmationToSender(socket: Socket, chat: INewMsg): void {
    socket.emit(this.CHAT_EVENTS.MESSAGE_SENT, {
      chatId: chat._id,
      message: chat.lastMessage,
      status: "sent",
    });
  }

  private handleMessageError(socket: Socket, error: unknown): void {
    console.error("Message error:", error);
    socket.emit(this.CHAT_EVENTS.MESSAGE_ERROR, {
      message: "Failed to send message",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

new ChatController()

export { ChatController };
