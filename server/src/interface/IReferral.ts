import mongoose, { Document, Model, Types } from "mongoose";
import { ISubscription } from "./ISubscription";
import { IUser } from "./IUser";

// Basic types
export type ReferralStatus = "Pending" | "Completed" | "Expired" | "Rewarded";
export type ReferralType = "Subscription" | "Registration";
export type RewardType =
  | "SubscriptionDiscount"
  | "Cashback"
  | "ExtraValidity"
  | "Coins"
  | "Coupons";

// Basic interfaces
export interface IReferralReward {
  type: RewardType;
  value: number;
  description: string;
  appliedToSubscriptionId?: Types.ObjectId;
  expiryDate?: Date;
}

export interface IReferralTier {
  name: string;
  minReferrals: number;
  rewards: IReferralReward[];
  multiplier: number;
}

// Base interface (without Document extension)
export interface IReferralBase {
  referrerId: Types.ObjectId;
  referredId: Types.ObjectId;
  referralCode: string;
  status: ReferralStatus;
  subscriptionId?: Types.ObjectId;
  rewardsClaimed: boolean;
  rewardsProcessedAt?: Date;
  validTill: Date;
  referralType: ReferralType;
  rewardAmount?: number;
  appliedSubscriptionId?: Types.ObjectId;
  discountAmount?: number;
  extraValidityDays?: number;
  createdAt: Date;
  updatedAt: Date;
}

// Methods interface
export interface IReferralMethods {
  isActive(): boolean;
  calculateRewards(): Promise<IReferralReward[]>;
  markAsProcessed(): Promise<void>;
  notifyReferrer(): Promise<void>;
  validateAndProcess(): Promise<IReferralReward[]>;
  applyToSubscription(subscriptionId: Types.ObjectId): Promise<ISubscription>;
  getReferralBenefits(): Promise<{
    discountPercentage: number;
    extraDays: number;
    coins: number;
  }>;
  getSubscriptionDetails(): Promise<ISubscription | null>;
  getReferrerDetails(): Promise<IUser | null>;
  getReferredUserDetails(): Promise<IUser | null>;
}

// Document interface (combines base interface and methods)
export interface IReferralDocument
  extends Document,
    IReferralBase,
    IReferralMethods {}

// Static methods interface
export interface IReferralModel extends Model<IReferralDocument> {
  getTotalReferralsByUser(userId: Types.ObjectId): Promise<number>;
  getUserTier(userId: Types.ObjectId): Promise<IReferralTier | null>;
  getReferralStats(userId: Types.ObjectId): Promise<{
    total: number;
    pending: number;
    completed: number;
    expired: number;
    conversionRate: number;
  }>;
  generateUniqueCode(prefix?: string): Promise<string>;
  processExpiredReferrals(): Promise<mongoose.UpdateWriteOpResult>;
  getTopReferrers(limit?: number): Promise<any[]>;
  findActiveReferralsForUser(
    userId: Types.ObjectId
  ): Promise<IReferralDocument[]>;
  calculateSubscriptionDiscount(
    userId: Types.ObjectId,
    subscriptionType: "Platinum" | "Gold" | "Silver" | "Free"
  ): Promise<{
    discountPercentage: number;
    finalPrice: number;
  }>;
}
