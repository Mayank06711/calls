import { Document, Types } from "mongoose";

export type ChatRequestStatus = "pending" | "accepted" | "declined";

export interface IChatRequest extends Document {
  sender: Types.ObjectId;
  receiver: Types.ObjectId;
  status: ChatRequestStatus;
  declinedAt?: Date;
  respondedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
