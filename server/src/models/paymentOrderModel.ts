import mongoose, { Schema, Document, Types } from "mongoose";

export interface IPaymentOrder extends Document {
  subscriptionId: Types.ObjectId;
  userId: Types.ObjectId;
  providerOrderId: string;        // Razorpay order_id / Stripe PaymentIntent id
  providerPaymentId?: string;     // Set after payment completes
  provider: "razorpay" | "stripe";
  amount: number;                 // in paise (INR) or cents (USD)
  currency: string;
  status: "created" | "attempted" | "paid" | "failed" | "refunded" | "expired";
  receipt: string;                // subscriptionId used as receipt/idempotency ref
  attempts: number;
  webhookVerified: boolean;
  refundId?: string;
  refundAmount?: number;
  refundReason?: string;
  notes?: Record<string, any>;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentOrderSchema = new Schema<IPaymentOrder>(
  {
    subscriptionId: {
      type: Schema.Types.ObjectId,
      ref: "Subscription",
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    providerOrderId: {
      type: String,
      required: true,
      unique: true,
    },
    providerPaymentId: {
      type: String,
      sparse: true,  // unique index but allows nulls
      index: true,
    },
    provider: {
      type: String,
      enum: ["razorpay", "stripe"],
      required: true,
    },
    amount: {
      type: Number,
      required: true,  // stored in paise/cents — never in rupees/dollars
    },
    currency: {
      type: String,
      required: true,
      default: "INR",
    },
    status: {
      type: String,
      enum: ["created", "attempted", "paid", "failed", "refunded", "expired"],
      default: "created",
    },
    receipt: {
      type: String,
      required: true,
    },
    attempts: {
      type: Number,
      default: 0,
    },
    webhookVerified: {
      type: Boolean,
      default: false,
    },
    refundId: String,
    refundAmount: Number,
    refundReason: String,
    notes: Schema.Types.Mixed,
    metadata: Schema.Types.Mixed,
  },
  { timestamps: true }
);

// Compound indexes for efficient queries
PaymentOrderSchema.index({ userId: 1, createdAt: -1 });
PaymentOrderSchema.index({ subscriptionId: 1 });
PaymentOrderSchema.index({ status: 1, createdAt: 1 }); // for stale order cleanup

export const PaymentOrderModel = mongoose.model<IPaymentOrder>(
  "PaymentOrder",
  PaymentOrderSchema
);
