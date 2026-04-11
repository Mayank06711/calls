import { Document, Types } from "mongoose";

export interface ITranscriptMessage {
  sender: string;
  content: string;
  type: string;
  timestamp: Date;
  mediaUrl?: string;
}

export interface IExpertComplaint extends Document {
  complainant: Types.ObjectId;
  expert: Types.ObjectId;
  chatId?: Types.ObjectId;
  reason: string;
  category: "harassment" | "fraud" | "inappropriate" | "spam" | "other";
  transcript: ITranscriptMessage[];
  mediaUrls?: string[];
  status: "new" | "reviewing" | "resolved" | "dismissed";
  adminNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}
