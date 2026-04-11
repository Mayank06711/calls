import { Document, Types } from "mongoose";

export interface IAdminAction {
  adminId: Types.ObjectId;
  action: "approved" | "rejected";
  note?: string;
  actionDate: Date;
}

export interface IBlockTranscriptMessage {
  sender: string;
  content: string;
  type: string;
  timestamp: Date;
  mediaUrl?: string;
}

export interface IExpertBlockRequest extends Document {
  expert: Types.ObjectId;
  blockedUser: Types.ObjectId;
  reason: string;
  mediaUrls?: string[];
  transcript: IBlockTranscriptMessage[];
  status: "pending" | "approved" | "rejected";
  adminAction?: IAdminAction;
  chatId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}
