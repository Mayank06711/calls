import { AggregateOptions, ClientSession, PipelineStage } from "mongoose";
import { ContentType } from "../types/IGeneral";

export interface Template {
  template_id: string;
  type: "email" | "sms" | "both";
  subject?: string;
  content: {
    html?: string;
    text: string;
  };
  contentType?: ContentType;
}

export interface Templates {
  [key: string]: Template;
}

export interface EmailOptions {
  email: string;
  subject?: string;
  message?: string;
  templateCode?: string;
  contentType?: ContentType;
  data?: Record<string, any>;
  req?: any;
}

export interface AggregationConfig {
  pipeline: PipelineStage[];
  options?: AggregateOptions;
}

interface QueryOptions<T> {
  pagination?: {
    page: number;
    limit: number;
  };
  sort?: Record<string, 1 | -1>;
  select?: Record<keyof T, number | boolean | object> | string | string[];
  populate?: string | string[];
  lean?: boolean;
  session?: ClientSession; // Add session to QueryOptions
}

export interface ModelOperationConfig<T> {
  aggregation?: boolean;
  aggregationConfig?: AggregationConfig;
  queryOptions?: QueryOptions<T>;
}

export interface EventData {
  email?: string;
  subject?: string;
  req?: any; // Optional request object
  data?: Record<string, any>; // Optional additional data
  message?: string; // Message related to the event
}

export interface SendOtpMessageResponse {
  message: string;
  messageUuid: string[];
  apiId: string;
}

export interface SendOtpMessageError {
  error: string | Record<string, unknown>;
}

export type Query = {
  text: string;
  values: string[];
};

export type EmitOptions = {
  event: string;
  data: any;
  room?: string;
  auth?: boolean;
  headers?: Record<string, any>;
  targetSocketIds?: string[];
};

export interface SocketUserData {
  userId: string;
  mobNum: string;
  status: "verified" | "refreshed";
}
export interface SocketData {
  key: string;
  userId: string;
  mobNum: string;
  socketId: string;
  connectedAt: number;
  lastRefreshedAt?: number;
  status: "authenticated" | "refreshed";
}

export interface PendingAuthData {
  startTime: number;
  serverId: string;
  status: string;
}

export interface CloudinaryUploadOptions {
  folder: string;
  file: string | Buffer;
  isBuffer?: boolean;
  fileName?: string;
  uploadPreset?: string;
}

export interface FileUploadData {
  file: string | Buffer; // base64 string
  fileName: string;
  fileType: string;
  size: number;
  type: "chat" | "avatar";
  metadata?: {
    width?: number;
    height?: number;
    duration?: number;
    chatId?: string;
    messageId?: string;
    userId?: string; // For avatar uploads
  };
}

export interface FileUploadResponse {
  status: "success" | "error";
  message: string;
  fileUrl?: string;
  publicId?: string;
  thumbnailUrl?: string;
  metadata?: {
    width?: number;
    height?: number;
    duration?: number;
    size?: number; // Made optional
    type?: string; // Made optional
    error?: string;
  };
}

export interface ChatMessage {
  messageId: string;
  senderId: string;
  receiverId: string;
  messageType: "text" | "image" | "file";
  content: string;
  fileMetadata?: {
    fileUrl?: string;
    fileName: string;
    fileType: string;
    size: number;
    width?: number;
    height?: number;
    thumbnailUrl?: string;
  };
  timestamp: number;
  status: "sent" | "delivered" | "read";
}

export interface SocketEventMap {
  "chat:message": {
    content: string;
    timestamp: number;
    userId: string;
  };
  "file:upload": {
    data: FileUploadData;
    callback: (response: FileUploadResponse) => void;
  };
  "chat:file": {
    data: FileUploadData & {
      receiverId: string;
      messageId: string;
    };
    callback: (response: FileUploadResponse) => void;
  };
  "chat:file:received": {
    message: ChatMessage;
  };
  "user:typing": {
    userId: string;
    isTyping: boolean;
  };
}
