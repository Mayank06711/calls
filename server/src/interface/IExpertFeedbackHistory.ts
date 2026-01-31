import { Document, Types } from "mongoose";

export interface IExpertFeedbackHistory extends Document {
  user: Types.ObjectId;
  expert: Types.ObjectId;
  stars: number;
  aspects: string[];
  message: string;
  feedbackId: Types.ObjectId; // reference to the main ExpertFeedback doc
  action: "created" | "updated";
  createdAt: Date;
}
