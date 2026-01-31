import { Schema, model } from "mongoose";
import { IChatRequest } from "../interface/IChatRequest";

const ChatRequestSchema = new Schema<IChatRequest>(
  {
    sender: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    receiver: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "declined"],
      default: "pending",
      index: true,
    },
    declinedAt: { type: Date },
    respondedAt: { type: Date },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for fast lookups
ChatRequestSchema.index({ sender: 1, receiver: 1, status: 1 });
ChatRequestSchema.index({ receiver: 1, status: 1 });

const ChatRequestModel = model<IChatRequest>("ChatRequest", ChatRequestSchema);

export { ChatRequestModel };
