import mongoose, { Document } from "mongoose";

export interface IBugFeedback extends Document {
  user?: mongoose.Types.ObjectId;
  email?: string;
  message: string;
  bugType: string;
  customBugType?: string;
  severity: string;
  browserInfo?: string;
  osInfo?: string;
  screenResolution?: string;
  appVersion?: string;
  location?: {
    city?: string;
    country?: string;
    region?: string;
  };
  attachmentUrls?: string[];
  stepsToReproduce?: string;
  assignedTo?: mongoose.Types.ObjectId;
  status: string;
  response?: string;
  reviewDate?: Date;
  createdAt: Date;
  updatedAt: Date;
  responseTime?: number; // virtual
}

export interface IBugFeedbackModel extends mongoose.Model<IBugFeedback> {
  findPendingBugs(): Promise<IBugFeedback[]>;
  findBugsByDeveloper(developerId: mongoose.Types.ObjectId): Promise<IBugFeedback[]>;
  findUrgentBugs(): Promise<IBugFeedback[]>;
  getBugStats(): Promise<any[]>;
}

export interface IExpertFeedback extends Document {
  user: mongoose.Types.ObjectId;
  expert: mongoose.Types.ObjectId;
  message: string;
  stars: number;
  aspects?: string[];
  sessionId?: mongoose.Types.ObjectId;
  sessionDuration?: number;
  expertResponse?: string;
  responseDate?: Date;
  verified: boolean;
  attachmentUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IExpertFeedbackModel extends mongoose.Model<IExpertFeedback> {
  findByExpert(expertId: mongoose.Types.ObjectId): Promise<IExpertFeedback[]>;
  getExpertRating(expertId: mongoose.Types.ObjectId): Promise<{
    averageRating: number;
    totalRatings: number;
    fiveStarCount: number;
    fourStarCount: number;
    threeStarCount: number;
    twoStarCount: number;
    oneStarCount: number;
  }>;
  getTopRatedExperts(limit?: number): Promise<any[]>;
}