export interface EventData {
  email?: string;
  subject?: string;
  req?: any; // Optional request object
  data?: Record<string, any>; // Optional additional data
  message: string; // Message related to the event
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
  userId: string;
  mobNum: string;
  socketId: string;
  connectedAt: number;
  lastRefreshedAt: number;
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
  file: string; // base64 string
  fileName: string;
  fileType: string;
  size: number;
  metadata?: {
    width?: number;
    height?: number;
    duration?: number;
    chatId?: string;
    messageId?: string;
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
    size?: number;     // Made optional
    type?: string;     // Made optional
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
