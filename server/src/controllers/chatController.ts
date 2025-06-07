import { MsgModel } from "../models/messageModel";
import { SocketManager } from "../socket";
import { Types } from "mongoose";
import { INewMsg, MessageType, ChatType } from "../interface/IMessage";
import { Socket } from "socket.io";

class ChatController {
  private readonly socketManager: SocketManager;
  private readonly CHAT_EVENTS = {
    TYPING_START: "typing:start",
    TYPING_END: "typing:end",
    MESSAGE_SEND: "message:send",
    MESSAGE_DELIVERED: "message:delivered",
    MESSAGE_RECEIVED: "message:received",
    MESSAGE_ERROR: "message:error",
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
      event: this.CHAT_EVENTS.MESSAGE_SEND,
      handler: this.handleMessageSend.bind(this),
    });

    this.socketManager.listenToEvent({
      event: this.CHAT_EVENTS.MESSAGE_RECEIVED,
      handler: this.handleMessageReceived.bind(this),
    });
  }

  // Handler for typing start event
  private async handleTypingStart(
    data: { chatId: string; userId: string },
    socket: Socket
  ): Promise<void> {
    await this.socketManager.emitEvent({
      event: this.CHAT_EVENTS.TYPING_START,
      data: {
        chatId: data.chatId,
        userId: data.userId,
      },
      room: `chat:${data.chatId}`,
    });
  }

  // Handler for typing end event
  private async handleTypingEnd(
    data: { chatId: string; userId: string },
    socket: Socket
  ): Promise<void> {
    await this.socketManager.emitEvent({
      event: this.CHAT_EVENTS.TYPING_END,
      data: {
        chatId: data.chatId,
        userId: data.userId,
      },
      room: `chat:${data.chatId}`,
    });
  }

  // Handler for message send event
  private async handleMessageSend(
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
      console.log("Received message send event:", { senderId, ...data });

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

      // Emit message delivered event to receiver
      await this.socketManager.emitEvent({
        event: this.CHAT_EVENTS.MESSAGE_DELIVERED,
        data: {
          chatId: chat._id,
          message: chat.lastMessage,
          sender: {
            id: senderId,
          },
        },
        targetSocketIds: [data.receiverId], // Send to receiver
      });
    } catch (error) {
      // Emit error event to sender
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

  // Handler for message received confirmation
  private async handleMessageReceived(
    data: { chatId: string; messageId: string },
    socket: Socket
  ): Promise<void> {
    const chat = await MsgModel.findById(data.chatId);
    if (!chat) return;

    // Notify original sender that message was received
    await this.socketManager.emitEvent({
      event: this.CHAT_EVENTS.MESSAGE_RECEIVED,
      data: {
        chatId: data.chatId,
        messageId: data.messageId,
        status: "received",
      },
      targetSocketIds: [chat.sender.toString()],
    });
  }

  // Helper methods remain the same
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
}

new ChatController();

export { ChatController };
