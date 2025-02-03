import mongoose, { Document, Schema, Model, Types } from "mongoose";
import {
  SubscriptionStatus,
  SubscriptionType,
  PaymentStatus,
} from "../types/typesGeneral";

export interface IConsultationInHistory {
  date: Date;
  status: "Completed" | "Cancelled" | "NoShow";
  stylistId: mongoose.Types.ObjectId | Schema.Types.ObjectId | string;
  rating?: number;
  feedback?: mongoose.Types.ObjectId | Schema.Types.ObjectId | string;
  duration?: number;
  notes?: string;
  sessionType?: "video" | "chat" | "emergency";
}

export interface IFeatureUsage {
  videoConsultationsUsed: number;
  aiCreditsUsed: number;
  styleReportsGenerated: number;
  aiRecommendationsUsed: number;
  outfitAnalysisUsed: number;
  wardrobeOrganizationUsed: number;
}

export interface ISubscriptionHistoryEntry {
  subscriptionId: mongoose.Types.ObjectId | string;
  type: SubscriptionType;
  status: SubscriptionStatus;
  startDate: Date;
  endDate: Date;
  amount: number;
  paymentStatus: PaymentStatus;
  paymentId?: string;
  transactionId?: string;
  paymentMethod?: string;
  features: IFeatureUsage;
  consultations: IConsultationInHistory[];
  renewalAttempted: boolean;
  renewalStatus?: "Success" | "Failed" | "Pending";
  cancelledAt?: Date;
  cancellationReason?: string;
}

export interface ISubscriptionStatistics {
  // Base statistics
  totalSpent: number;
  consultationsAttended: number;
  averageRating: number;

  // Consultation details
  totalConsultations: {
    completed: number;
    cancelled: number;
    noShow: number;
  };

  // Stylist information
  preferredStylists: Array<{
    stylistId: mongoose.Types.ObjectId | Schema.Types.ObjectId | string;
    consultationCount: number;
    averageRating: number;
  }>;

  // Feature usage metrics
  featureUsage: {
    totalVideoConsultations: number;
    totalAiCredits: number;
    totalStyleReports: number;
    mostUsedFeatures: string[];
  };

  // Subscription metrics
  subscriptionMetrics: {
    totalSubscriptions: number;
    averageSubscriptionDuration: number;
    mostCommonPlan: string;
    renewalRate: number;
  };

  // Time-based metrics
  lifetime: {
    totalSpent: number;
    subscriptionCount: number;
    averageSubscriptionDuration: number;
    mostUsedPlan: string;
    renewalRate: number;
    averageRating: number;
  };

  lastYear: {
    totalSpent: number;
    subscriptionCount: number;
    consultationsUsed: number;
    aiFeatureUsage: number;
    mostUsedFeatures: string[];
  };

  currentPlan: {
    type: string;
    startDate: Date;
    endDate: Date;
    daysRemaining: number;
    status: SubscriptionStatus;
  } | null;

  trends: {
    spendingTrend: Array<{ month: string; amount: number }>;
    usageTrend: Array<{
      month: string;
      consultations: number;
      aiUsage: number;
    }>;
  };
}

// Base interface
export interface ISubscriptionHistory {
  userId: Schema.Types.ObjectId | string | Types.ObjectId;
  subscriptions: ISubscriptionHistoryEntry[];
  lastUpdated: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Methods interface
export interface ISubscriptionHistoryMethods {
  addSubscriptionEntry(
    entry: Partial<ISubscriptionHistoryEntry> & {
      type: SubscriptionType;
      startDate: Date;
      endDate: Date;
      amount: number;
      status: SubscriptionStatus;
      paymentStatus: PaymentStatus;
    }
  ): Promise<ISubscriptionHistory>;
  updateStatistics(): Promise<void>;
  getActiveConsultations(): Promise<IConsultationInHistory[]>;
}

// Helper interfaces for return types
export interface SubscriptionHistoryItem {
  _id: string;
  type: SubscriptionType;
  status: string;
  startDate: Date;
  endDate: Date;
  amount: number;
  paymentStatus: string;
  durationInDays: number;
  features: {
    videoConsultationsUsed?: number;
    aiCreditsUsed?: number;
    styleReportsGenerated?: number;
    aiRecommendationsUsed?: number;
    outfitAnalysisUsed?: number;
    wardrobeOrganizationUsed?: number;
    [key: string]: number | undefined;
  };
  consultations: number;
  metadata: {
    renewalAttempted?: boolean;
    renewalStatus?: string;
    cancelledAt?: Date;
    cancellationReason?: string;
  };
}

export interface ISubscriptionAnalytics {
  period: {
    start: Date;
    end: Date;
  };
  metrics: {
    totalRevenue: number;
    activeSubscriptions: number;
    churnRate: number;
    averageLifetimeValue: number;
  };
  planDistribution: Record<string, number>;
  featureUsage: Record<string, number>;
  consultationMetrics: {
    totalSessions: number;
    completionRate: number;
    averageRating: number;
  };
}

export interface SubscriptionPeriod {
  year: number;
  subscriptions: SubscriptionHistoryItem[];
  totalSpent: number;
  failedAttempts: number;
  pendingAttempts: number;
}

export interface IStylePreferences {
  level: "advanced" | "intermediate" | "basic" | "essential";
  occasions: string[];
  colors: string[];
  brands: string[];
  priceRange: {
    min: number;
    max: number;
  };
}

export interface ISubscriptionFeatures {
  videoConsultationsUsed: number;
  aiCreditsUsed: number;
  styleReportsGenerated: number;
  aiRecommendationsUsed: number;
  outfitAnalysisUsed: number;
  wardrobeOrganizationUsed: number;
  [key: string]: number;
}

// Main subscription history interface
export interface ISubscriptionHistory extends Document {
  userId: mongoose.Types.ObjectId | Schema.Types.ObjectId | string;
  subscriptions: ISubscriptionHistoryEntry[];
  statistics: ISubscriptionStatistics;
  lastUpdated: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Document interface
export interface ISubscriptionHistoryDocument
  extends Document,
    ISubscriptionHistory {}

export type ISubscriptionHistoryModel = Model<ISubscriptionHistoryDocument>;
