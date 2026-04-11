import { Schema, model } from "mongoose";
import { IExpertComplaint } from "../interface/IExpertComplaint";

const TranscriptMessageSchema = new Schema(
  {
    sender: { type: String, required: true },
    content: { type: String, required: true },
    type: { type: String, default: "text" },
    timestamp: { type: Date, required: true },
    mediaUrl: String,
  },
  { _id: false }
);

const ExpertComplaintSchema = new Schema<IExpertComplaint>(
  {
    complainant: {
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
    chatId: { type: Schema.Types.ObjectId, ref: "NewMsg" },
    reason: {
      type: String,
      required: true,
      minlength: 10,
      trim: true,
    },
    category: {
      type: String,
      enum: ["harassment", "fraud", "inappropriate", "spam", "other"],
      required: true,
      index: true,
    },
    transcript: [TranscriptMessageSchema],
    mediaUrls: [{ type: String }],
    status: {
      type: String,
      enum: ["new", "reviewing", "resolved", "dismissed"],
      default: "new",
      index: true,
    },
    adminNotes: String,
  },
  { timestamps: true }
);

export const ExpertComplaintModel = model<IExpertComplaint>(
  "ExpertComplaint",
  ExpertComplaintSchema
);
