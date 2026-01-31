import { Document, Types } from "mongoose";

export interface IExpertTip extends Document {
  tipper: Types.ObjectId;
  expert: Types.ObjectId;
  amount: number;
  currency: string;
  message?: string;
  status: "pending" | "completed" | "failed";
  paymentId?: string;
  transactionId?: string;
  paymentMethod?: string;
  createdAt: Date;
  updatedAt: Date;
}
