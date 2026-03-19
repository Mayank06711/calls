import mongoose, { Schema, Document, Types } from "mongoose";

export type CreditTransactionType =
  | "subscription_grant"
  | "pack_purchase"
  | "booking_deduction"
  | "booking_refund"
  | "admin_adjustment";

export interface ICreditTransaction extends Document {
  user: Types.ObjectId;
  type: CreditTransactionType;
  amount: number; // positive = credit, negative = debit
  balanceAfter: number; // snapshot after this tx
  description: string;
  reference?: {
    model: string;
    id: Types.ObjectId;
  };
  createdAt: Date;
  updatedAt: Date;
}

const CreditTransactionSchema = new Schema<ICreditTransaction>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: [
        "subscription_grant",
        "pack_purchase",
        "booking_deduction",
        "booking_refund",
        "admin_adjustment",
      ],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    balanceAfter: {
      type: Number,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    reference: {
      model: { type: String },
      id: { type: Schema.Types.ObjectId },
    },
  },
  { timestamps: true }
);

CreditTransactionSchema.index({ user: 1, createdAt: -1 });
CreditTransactionSchema.index({ type: 1 });

export const CreditTransactionModel = mongoose.model<ICreditTransaction>(
  "CreditTransaction",
  CreditTransactionSchema
);
