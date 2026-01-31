import { Schema, model } from "mongoose";
import { IExpertBlockRequest } from "../interface/IExpertBlockRequest";

const BlockTranscriptMessageSchema = new Schema(
  {
    sender: { type: String, required: true },
    content: { type: String, required: true },
    type: { type: String, default: "text" },
    timestamp: { type: Date, required: true },
    mediaUrl: String,
  },
  { _id: false }
);

const ExpertBlockRequestSchema = new Schema<IExpertBlockRequest>(
  {
    expert: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    blockedUser: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    reason: {
      type: String,
      required: true,
      minlength: 10,
      trim: true,
    },
    mediaUrls: [{ type: String, trim: true }],
    transcript: [BlockTranscriptMessageSchema],
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true,
    },
    adminAction: {
      adminId: { type: Schema.Types.ObjectId, ref: "User" },
      action: { type: String, enum: ["approved", "rejected"] },
      note: String,
      actionDate: Date,
    },
    chatId: { type: Schema.Types.ObjectId, ref: "NewMsg" },
  },
  { timestamps: true }
);

ExpertBlockRequestSchema.index({ expert: 1, blockedUser: 1 });

export const ExpertBlockRequestModel = model<IExpertBlockRequest>(
  "ExpertBlockRequest",
  ExpertBlockRequestSchema
);
