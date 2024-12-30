import { NewMsgModel, INewMsg, INewMessage, IAttachment } from "../models/newMsgModel";
import { OldMsgModel, IOldMessage } from "../models/oldMsgModel";
import { SocketManager } from "../socket";
import { RedisManager } from "../utils/redisClient";
import mongoose, { Types } from "mongoose";
import { ApiError } from "../utils/apiError";

class ChatController {
  // Create a new chat
  static async createChat(
    sender: Types.ObjectId,
    receiver: Types.ObjectId,
    chatType: "userToUser" | "adminToUser" | "adminToExpert" | "userToExpert"
  ): Promise<INewMsg> {
    try {
      const existingChat = await NewMsgModel.findOne({
        sender,
        receiver,
        chatType,
      });

      if (existingChat) {
        return existingChat;
      }

      const newChat = await NewMsgModel.create({
        sender,
        receiver,
        chatType,
        messages: [],
        participantsInfo: {
          sender: { isActive: true, lastSeen: new Date() },
          receiver: { isActive: true, lastSeen: new Date() },
        },
      });

      return newChat;
    } catch (error) {
      throw new ApiError(500, "Error creating chat");
    }
  }

  // Send a message
  static async sendMessage(
    chatId: Types.ObjectId,
    senderId: Types.ObjectId,
    text: string,
    attachments?: IAttachment[]
  ): Promise<INewMessage> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const chat = await NewMsgModel.findById(chatId);
      if (!chat) {
        throw new ApiError(404, "Chat not found");
      }

      // Add message to NewMsgModel
      await chat.addMessage(text, senderId, attachments);

      // Create message in OldMsgModel for archival
      const oldMessage = await OldMsgModel.create({
        chatId,
        text,
        sender: senderId,
        receiver: chat.receiver,
        attachments,
        messageId: chat.messageIdCounter,
      });

      await session.commitTransaction();

      // Emit socket event to receiver
      const socketManager = SocketManager.getInstance();
      await socketManager.emitEvent({
        event: "new_message",
        data: {
          chatId,
          message: oldMessage,
        },
        targetSocketIds: await this.getReceiverSocketIds(chat.receiver),
      });

      return chat.messages[chat.messages.length - 1];
    } catch (error) {
      await session.abortTransaction();
      throw new ApiError(500, "Error sending message");
    } finally {
      session.endSession();
    }
  }

  // Get chat history
  static async getChatHistory(
    chatId: Types.ObjectId,
    userId: Types.ObjectId,
    page: number = 1,
    limit: number = 50
  ): Promise<IOldMessage[]> {
    try {
      const messages = await OldMsgModel.find({ chatId })
        .visibleTo(userId)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean();

      return messages;
    } catch (error) {
      throw new ApiError(500, "Error fetching chat history");
    }
  }

  // Mark messages as read
  static async markMessagesAsRead(
    chatId: Types.ObjectId,
    userId: Types.ObjectId,
    messageIds: number[]
  ): Promise<void> {
    try {
      const chat = await NewMsgModel.findById(chatId);
      if (!chat) {
        throw new ApiError(404, "Chat not found");
      }

      for (const messageId of messageIds) {
        await chat.markMessageAsRead(messageId);
      }

      // Emit read receipt to sender
      const socketManager = SocketManager.getInstance();
      await socketManager.emitEvent({
        event: "messages_read",
        data: {
          chatId,
          messageIds,
          readBy: userId,
        },
        targetSocketIds: await this.getReceiverSocketIds(chat.sender),
      });
    } catch (error) {
      throw new ApiError(500, "Error marking messages as read");
    }
  }

  // Delete message (soft delete)
  static async deleteMessage(
    chatId: Types.ObjectId,
    messageId: number,
    userId: Types.ObjectId
  ): Promise<void> {
    try {
      const message = await OldMsgModel.findOne({ chatId, messageId });
      if (!message) {
        throw new ApiError(404, "Message not found");
      }

      await message.softDelete(userId);

      // Emit delete event to other participant
      const socketManager = SocketManager.getInstance();
      await socketManager.emitEvent({
        event: "message_deleted",
        data: {
          chatId,
          messageId,
          deletedBy: userId,
        },
        targetSocketIds: await this.getReceiverSocketIds(
          userId.equals(message.sender) ? message.receiver : message.sender
        ),
      });
    } catch (error) {
      throw new ApiError(500, "Error deleting message");
    }
  }

  // Get user's active chats
  static async getUserChats(userId: Types.ObjectId): Promise<INewMsg[]> {
    try {
      const chats = await NewMsgModel.find({
        $or: [{ sender: userId }, { receiver: userId }],
        isActive: true,
      })
        .sort({ "lastMessage.createdAt": -1 })
        .lean();

      return chats;
    } catch (error) {
      throw new ApiError(500, "Error fetching user chats");
    }
  }

  // Helper method to get socket IDs for a user
  private static async getReceiverSocketIds(
    userId: Types.ObjectId
  ): Promise<string[]> {
    const sockets = await RedisManager.getAllFromGroup("socketAuthenticatedUsers");
    return sockets
      .filter((socket) => socket.userId === userId.toString())
      .map((socket) => socket.socketId);
  }

  // Update participant status
  static async updateParticipantStatus(
    chatId: Types.ObjectId,
    userId: Types.ObjectId,
    isActive: boolean
  ): Promise<void> {
    try {
      const chat = await NewMsgModel.findById(chatId);
      if (!chat) {
        throw new ApiError(404, "Chat not found");
      }

      await chat.updateParticipantStatus(userId, isActive);

      // Emit status update to other participant
      const socketManager = SocketManager.getInstance();
      const otherParticipantId = userId.equals(chat.sender)
        ? chat.receiver
        : chat.sender;

      await socketManager.emitEvent({
        event: "participant_status_changed",
        data: {
          chatId,
          userId,
          isActive,
        },
        targetSocketIds: await this.getReceiverSocketIds(otherParticipantId),
      });
    } catch (error) {
      throw new ApiError(500, "Error updating participant status");
    }
  }
}

export { ChatController };