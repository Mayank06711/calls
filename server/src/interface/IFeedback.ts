import mongoose from "mongoose";

export interface IFeedback extends Document {
  user: mongoose.Types.ObjectId;
  expert?: mongoose.Types.ObjectId;
  stars: number;
  message: string;
  resolved: boolean;
  type: string;
  response?: string;
  reviewDate?: Date;
  createdAt: Date;
}

export interface IFeedbackModel extends mongoose.Model<IFeedback> {
  countByType(type: string): Promise<number>;
  findPendingFeedback(): Promise<IFeedback[]>;
  findExpertFeedback(expertId: mongoose.Types.ObjectId): Promise<IFeedback[]>;
  getAverageRating(): Promise<number>;
}
