import mongoose, { Schema } from "mongoose";
import {
  ISubscriptionStatistics,
  IConsultationInHistory,
  ISubscriptionHistoryModel,
  ISubscriptionHistory,
  ISubscriptionHistoryEntry,
  ISubscriptionHistoryDocument,
  ISubscriptionHistoryMethods,
} from "../interface/ISubscriptionHistroy";

const ConsultationHistorySchema = new Schema<IConsultationInHistory>({
  date: {
    type: Date,
    required: true,
  },
  stylistId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  status: {
    type: String,
    enum: ["Completed", "Cancelled", "NoShow"],
    required: true,
  },
  rating: {
    type: Number,
    min: 1,
    max: 5,
  },
  feedback: { type: Schema.Types.ObjectId, ref: "Feedback" },
  duration: Number,
  notes: String,
  sessionType: {
    type: String,
    enum: ["video", "chat", "emergency"],
  },
});

const SubscriptionHistorySchema = new Schema<ISubscriptionHistoryDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    subscriptions: [
      {
        subscriptionId: {
          type: Schema.Types.ObjectId,
          ref: "Subscription",
          required: true,
        },
        type: {
          type: String,
          enum: ["Premium", "Gold", "Silver", "Free"],
          required: true,
        },
        status: {
          type: String,
          enum: [
            "Active",
            "Expired",
            "Cancelled",
            "Pending",
            "Requested",
            "N/A",
          ],
        },
        startDate: {
          type: Date,
          required: true,
        },
        endDate: {
          type: Date,
          required: true,
        },
        amount: {
          type: Number,
          required: true,
        },
        paymentStatus: {
          type: String,
          enum: ["Pending", "Completed", "Failed"],
        },
        paymentId: String,
        transactionId: String,
        paymentMethod: String,
        features: {
          videoConsultationsUsed: { type: Number, default: 0 },
          aiCreditsUsed: { type: Number, default: 0 },
          styleReportsGenerated: { type: Number, default: 0 },
          aiRecommendationsUsed: { type: Number, default: 0 },
          outfitAnalysisUsed: { type: Number, default: 0 },
          wardrobeOrganizationUsed: { type: Number, default: 0 },
        },
        consultations: [ConsultationHistorySchema],
        metadata: Schema.Types.Mixed,
        stylePreferences: {
          level: {
            type: String,
            enum: ["advanced", "intermediate", "basic", "essential"],
          },
          occasions: [String],
          colors: [String],
          brands: [String],
          priceRange: {
            min: Number,
            max: Number,
          },
        },
        cancelledAt: Date,
        cancellationReason: String,
        renewalAttempted: {
          type: Boolean,
          default: false,
        },
        renewalStatus: {
          type: String,
          enum: ["Success", "Failed", "Pending"],
        },
      },
    ],
    statistics: {
      totalSpent: { type: Number, default: 0 },
      consultationsAttended: { type: Number, default: 0 },
      averageRating: { type: Number, default: 0 },
      totalConsultations: {
        completed: { type: Number, default: 0 },
        cancelled: { type: Number, default: 0 },
        noShow: { type: Number, default: 0 },
      },
      preferredStylists: [
        {
          stylistId: {
            type: Schema.Types.ObjectId,
            ref: "User",
          },
          consultationCount: Number,
          averageRating: Number,
        },
      ],
      featureUsage: {
        totalVideoConsultations: { type: Number, default: 0 },
        totalAiCredits: { type: Number, default: 0 },
        totalStyleReports: { type: Number, default: 0 },
        mostUsedFeatures: [String],
      },
      subscriptionMetrics: {
        totalSubscriptions: { type: Number, default: 0 },
        averageSubscriptionDuration: { type: Number, default: 0 },
        mostCommonPlan: {type:String,default:"N/A"},
        renewalRate: { type: Number, default: 0 },
      },
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
SubscriptionHistorySchema.index({ userId: 1 });
SubscriptionHistorySchema.index({ "subscriptions.startDate": -1 });
SubscriptionHistorySchema.index({ "subscriptions.endDate": 1 });
SubscriptionHistorySchema.index({ "subscriptions.status": 1 });

SubscriptionHistorySchema.methods.addSubscriptionEntry = async function (
  this: ISubscriptionHistoryDocument & ISubscriptionHistoryMethods,
  entry: any
): Promise<any> {
  const newEntry: ISubscriptionHistoryEntry = {
    subscriptionId: entry.subscriptionId!,
    features: {
      videoConsultationsUsed: 0,
      aiCreditsUsed: 0,
      styleReportsGenerated: 0,
      aiRecommendationsUsed: 0,
      outfitAnalysisUsed: 0,
      wardrobeOrganizationUsed: 0,
      ...entry.features,
    },
    consultations: entry.consultations || [],
    renewalAttempted: false,
    ...entry, // Move spread to end to avoid overwrites
  };

  this.subscriptions.push(newEntry);
  this.lastUpdated = new Date();
  await this.updateStatistics();
  return this.save();
};

SubscriptionHistorySchema.methods.updateStatistics = async function (
  this: ISubscriptionHistory
): Promise<void> {
  const subscriptions = this.subscriptions;

  // Calculate total spent
  this.statistics.totalSpent = subscriptions.reduce(
    (total, sub) => total + sub.amount,
    0
  );

  // Calculate consultation statistics
  const allConsultations = subscriptions.flatMap((sub) => sub.consultations);
  this.statistics.consultationsAttended = allConsultations.length;

  // Calculate average rating
  const ratings = allConsultations
    .filter((c) => c.rating)
    .map((c) => c.rating!);
  this.statistics.averageRating = ratings.length
    ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length
    : 0;

  // Update total consultations
  this.statistics.totalConsultations = {
    completed: allConsultations.filter((c) => c.status === "Completed").length,
    cancelled: allConsultations.filter((c) => c.status === "Cancelled").length,
    noShow: allConsultations.filter((c) => c.status === "NoShow").length,
  };

  // Update preferred stylists
  const stylistStats = new Map<
    string,
    { count: number; totalRating: number }
  >();
  allConsultations.forEach((consultation) => {
    const stylistId = consultation.stylistId.toString();
    const current = stylistStats.get(stylistId) || { count: 0, totalRating: 0 };
    stylistStats.set(stylistId, {
      count: current.count + 1,
      totalRating: current.totalRating + (consultation.rating || 0),
    });
  });

  this.statistics.preferredStylists = Array.from(stylistStats.entries()).map(
    ([stylistId, stats]) => ({
      stylistId: new mongoose.Types.ObjectId(stylistId),
      consultationCount: stats.count,
      averageRating: stats.count ? stats.totalRating / stats.count : 0,
    })
  );

  await this.save();
};

SubscriptionHistorySchema.methods.getActiveConsultations = async function (
  this: ISubscriptionHistory
): Promise<IConsultationInHistory[]> {
  const activeSubscription = this.subscriptions.find(
    (sub) => sub.status === "Active" && sub.endDate > new Date()
  );

  if (!activeSubscription) return [];

  return activeSubscription.consultations.filter(
    (consultation) =>
      consultation.date > new Date() && consultation.status !== "Cancelled"
  );
};

export const SubscriptionHistoryModel = mongoose.model(
  "SubscriptionHistory",
  SubscriptionHistorySchema
);
