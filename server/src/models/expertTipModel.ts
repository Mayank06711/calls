import { Schema, model } from "mongoose";
import { IExpertTip } from "../interface/IExpertTip";

const ExpertTipSchema = new Schema<IExpertTip>(
  {
    tipper: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    expert: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 1,
    },
    currency: {
      type: String,
      default: "INR",
      trim: true,
    },
    message: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    status: {
      type: String,
      enum: ["pending", "completed", "failed"],
      default: "pending",
      index: true,
    },
    paymentId: String,
    transactionId: String,
    paymentMethod: String,
  },
  { timestamps: true }
);

ExpertTipSchema.index({ tipper: 1, expert: 1 });

export const ExpertTipModel = model<IExpertTip>("ExpertTip", ExpertTipSchema);
