import { Schema, model } from "mongoose";
import { IExpertFeedbackHistory } from "../interface/IExpertFeedbackHistory";

const ExpertFeedbackHistorySchema = new Schema<IExpertFeedbackHistory>(
  {
    user: {
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
    stars: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    aspects: [
      {
        type: String,
        enum: ["Knowledge", "Communication", "Helpfulness", "Promptness", "Overall"],
      },
    ],
    message: {
      type: String,
      required: true,
      trim: true,
    },
    feedbackId: {
      type: Schema.Types.ObjectId,
      ref: "ExpertFeedback",
      required: true,
      index: true,
    },
    action: {
      type: String,
      enum: ["created", "updated"],
      required: true,
    },
  },
  { timestamps: true }
);

ExpertFeedbackHistorySchema.index({ user: 1, expert: 1 });
ExpertFeedbackHistorySchema.index({ expert: 1, createdAt: -1 });

export const ExpertFeedbackHistoryModel = model<IExpertFeedbackHistory>(
  "ExpertFeedbackHistory",
  ExpertFeedbackHistorySchema
);
