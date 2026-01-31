import { Document, Types } from "mongoose";
import { MediaItem } from './IMedia';

// Define the Message Types
export type MessageType = "text" | "image" | "video" | "audio" | "document";
export type ChatType = "userToUser" | "adminToUser" | "adminToExpert" | "userToExpert";

// Define interfaces
export interface IAttachment extends MediaItem {
  type: string;
  name?: string;
  size?: number;
}

export interface IMessageMedia {
  photos?: MediaItem[];
  videos?: MediaItem[];
}

export interface INewMessage {
  messageId: number;
  text: string;
  sender: Types.ObjectId;
  messageType: MessageType;
  media?: IMessageMedia;
  attachments?: IAttachment[];
  status: {
    isRead: boolean;
    readAt?: Date;
    deliveredAt?: Date;
  };
  createdAt: Date;
  replyTo?: {
    messageId: number;
    text: string;
  };
  deletedFor?: Types.ObjectId[];
}

export interface IParticipantInfo {
  isActive: boolean;
  lastSeen: Date;
}

export interface INewMsg extends Document {
  sender: Types.ObjectId;
  receiver: Types.ObjectId;
  messages: INewMessage[];
  chatType: ChatType;
  messageIdCounter: number;
  lastMessage?: INewMessage;
  isActive: boolean;
  participantsInfo: {
    sender: IParticipantInfo;
    receiver: IParticipantInfo;
  };
  chatHiddenFor?: Types.ObjectId[];
  chatDeletedFor?: Types.ObjectId[];

  // Methods
  addMessage(
    text: string,
    sender: Types.ObjectId,
    messageType?: MessageType,
    attachments?: IAttachment[],
    replyTo?: { messageId: number; text: string }
  ): Promise<INewMessage>;
  
  addMessageWithMedia(
    text: string,
    sender: Types.ObjectId,
    messageType: MessageType,
    media?: IMessageMedia,
    attachments?: IAttachment[],
    replyTo?: { messageId: number; text: string }
  ): Promise<INewMessage>;
  
  markMessageAsRead(messageId: number): Promise<void>;
  markMessageAsDelivered(messageId: number): Promise<void>;
  updateParticipantStatus(userId: Types.ObjectId, isActive: boolean): Promise<void>;
}

// Read Receipt Interface for Redis Queue
export interface IReadReceipt {
  messageId: number;
  chatId: string;
  senderId: string;
  readAt: Date;
  readBy: string;
}