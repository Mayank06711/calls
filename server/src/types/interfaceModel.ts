import mongoose, {
  AggregateOptions,
  Document,
  Model,
  PipelineStage,
  Types,
  Schema,
} from "mongoose";
import { SubscriptionType } from "../models/subscriptionModel";

// ----------------
// Common Types
// ----------------
export type Gender = "Male" | "Female" | "Not to say";
export type SubscriptionStatus =
  | "Active"
  | "Expired"
  | "Cancelled"
  | "Pending"
  | "Requested"
  | "N/A";
export type PaymentStatus = "Pending" | "Completed" | "Failed";
export type ReferralStatus = "Pending" | "Completed" | "Expired" | "Rewarded";
export type ReferralType = "Subscription" | "Registration";
export type RewardType =
  | "SubscriptionDiscount"
  | "Cashback"
  | "ExtraValidity"
  | "Coins"
  | "Coupons";

// ----------------
// User Interfaces
// ----------------
export interface IUser extends Document {
  fullName: string;
  username: string;
  email: string;
  phoneNumber: string;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  password: string;
  gender: Gender; // Enum for gender
  age: number;
  dob: string;
  city: string;
  country?: string; // Default is 'India', but not required
  refreshToken: string;
  mediaId: mongoose.Types.ObjectId; // Reference to the user's media collection
  profilePhotoId?: string; // Store the public_id of the current profile photo
  profileVideoId?: string; // Store the public_id of the current profile video
  currentSubscriptionId?: mongoose.Types.ObjectId | ISubscription;
  isSubscribed: boolean;
  referral?: mongoose.Types.ObjectId;
  isMFAEnabled: boolean;
  MFASecretKey?: string; // Optional MFA key
  isActive: boolean;
  isAdmin: boolean; // Whether or not
  isExpert: boolean; // Whether or not the user is an expert

  // Add timestamp fields
  createdAt: Date;
  updatedAt: Date;

  // defining methods here so that typescript can
  // Define the methods you plan to add to the schem TypeScript knows about the instance methods you're adding.
  generateAccessToken(): string;
  generateRefreshToken(): string;
  isPasswordCorrect(password: string): Promise<boolean>;
  getProfileMedia(): Promise<{ photo?: MediaItem; video?: MediaItem }>;
  getAllMedia(): Promise<{
    photos: { url: string; thumbnail_url?: string }[];
    videos: { url: string; thumbnail_url?: string }[];
  }>;
  addProfilePhoto(photoData: Partial<MediaItem>): Promise<MediaItem>;
  addProfileVideo(videoData: Partial<MediaItem>): Promise<MediaItem>;
  removeProfilePhoto(publicId: string): Promise<void>;
  removeProfileVideo(publicId: string): Promise<void>;
  getSubscriptionDetails(): Promise<{
    isActive: boolean;
    type?: string;
    status?: string;
    startDate?: Date;
    endDate?: Date;
    daysRemaining?: number;
    paymentStatus?: string;
  }>;
  //referral related methods
  generateReferralCode(): Promise<string>;
  getReferralDetails(): Promise<IReferralStats>; // This will use ReferralModel internally
  handleReferral(referrerId: mongoose.Types.ObjectId): Promise<void>;
  updateReferralStats(): Promise<void>;
}

export interface SubscriptionHistoryItem {
  _id: string;
  type: string;
  status: string;
  startDate: Date;
  endDate: Date;
  amount: number;
  paymentStatus: string;
  durationInDays: number;
}

export interface SubscriptionPeriod {
  year: number;
  subscriptions: SubscriptionHistoryItem[];
  totalSpent: number;
  failedAttempts: number;
  pendingAttempts: number;
}

// Interface for static methods
export interface ISubscriptionModel
  extends Model<ISubscription, {}, ISubscriptionMethods> {
  getCurrentSubscription(
    userId: mongoose.Types.ObjectId | Schema.Types.ObjectId | string
  ): Promise<ISubscription | null>;
  getSubscriptionHistory(
    userId: mongoose.Types.ObjectId | Schema.Types.ObjectId | string
  ): Promise<SubscriptionPeriod[]>;
}

export interface ISubscriptionMethods {
  isActive(): boolean;
  getDaysRemaining(): number;
  applyReferral(referralId: mongoose.Types.ObjectId | string): Promise<void>;
}

// Main subscription interface
export interface ISubscription extends Document, ISubscriptionMethods {
  userId: mongoose.Types.ObjectId;
  type: "Premium" | "Silver" | "Gold" | "Casual";
  status: SubscriptionStatus;
  startDate: Date;
  endDate: Date;
  amount: number;
  paymentStatus: PaymentStatus;
  paymentId?: string;
  transactionId?: string;
  paymentMethod?: string;
  referralId?: mongoose.Types.ObjectId; // Only store reference to referral
  referralDiscount?: number;
  extraValidityDays?: number;
  createdAt: Date;
  updatedAt: Date;
  // Add only essential referral method
  applyReferralCode(referralCode: string): Promise<void>;
}

// ----------------
// Referral Interfaces
// ----------------
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

export interface IReferralStats {
  total: number;
  pending: number;
  completed: number;
  expired: number;
  conversionRate: number;
}

// Interface for referral rewards
export interface IReferralReward {
  type:
    | "SubscriptionDiscount"
    | "Cashback"
    | "ExtraValidity"
    | "Coins"
    | "Coupons";
  value: number;
  description: string;
  appliedToSubscriptionId?: mongoose.Types.ObjectId;
  expiryDate?: Date;
}

// Interface for referral tiers
export interface IReferralTier {
  name: string;
  minReferrals: number;
  rewards: IReferralReward[];
  multiplier: number;
}

// Interface for instance methods
export interface IReferralMethods {
  isActive(): boolean;
  calculateRewards(): Promise<IReferralReward[]>;
  markAsProcessed(): Promise<void>;
  notifyReferrer(): Promise<void>;
  validateAndProcess(): Promise<IReferralReward[]>;
}

export interface IReferralModel extends Model<IReferral> {
  getTotalReferralsByUser(userId: mongoose.Types.ObjectId): Promise<number>;
  getUserTier(userId: mongoose.Types.ObjectId): Promise<IReferralTier | null>;
  getReferralStats(userId: mongoose.Types.ObjectId): Promise<{
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
    userId: mongoose.Types.ObjectId
  ): Promise<IReferral[]>;
  calculateSubscriptionDiscount(
    userId: mongoose.Types.ObjectId,
    subscriptionType: SubscriptionType
  ): Promise<{
    discountPercentage: number;
    finalPrice: number;
  }>;
}

// Main referral interface
export interface IReferral extends Document {
  referrerId: mongoose.Types.ObjectId;
  referredId: mongoose.Types.ObjectId;
  referralCode: string;
  status: ReferralStatus;
  subscriptionId?: mongoose.Types.ObjectId;
  rewardsClaimed: boolean;
  rewardsProcessedAt?: Date;
  validTill: Date;
  referralType: ReferralType;
  rewardAmount?: number;
  appliedSubscriptionId?: mongoose.Types.ObjectId | string;
  discountAmount?: number;
  extraValidityDays?: number;
  createdAt: Date;
  updatedAt: Date;
  // Instance methods
  isActive(): boolean;
  calculateRewards(): Promise<IReferralReward[]>;
  markAsProcessed(): Promise<void>;
  notifyReferrer(): Promise<void>;
  validateAndProcess(): Promise<IReferralReward[]>;
  // subscrition related methods
  applyToSubscription(
    subscriptionId: mongoose.Types.ObjectId
  ): Promise<ISubscription>;
  getReferralBenefits(): Promise<{
    discountPercentage: number;
    extraDays: number;
    coins: number;
  }>;
  getSubscriptionDetails(): Promise<ISubscription | null>;
  getReferrerDetails(): Promise<IUser | null>;
  getReferredUserDetails(): Promise<IUser | null>;
}

// ----------------
// Media Interfaces
// ----------------
export interface MediaItem {
  public_id: string;
  url: string;
  thumbnail_url?: string;
  title?: string;
  description?: string;
  tags?: string[];
  createdAt: Date;
}

export interface IMedia extends Document {
  userId: mongoose.Types.ObjectId;
  chatId?: mongoose.Types.ObjectId;
  photos: MediaItem[];
  videos: MediaItem[];
  createdAt: Date;
  updatedAt: Date;

  // Add these method signatures
  getPhotoById(publicId: string): MediaItem | null;
  getVideoById(publicId: string): MediaItem | null;
  getLatestPhoto(): MediaItem | null;
  getLatestVideo(): MediaItem | null;
  addPhoto(photoData: Partial<MediaItem>): Promise<MediaItem>;
  addVideo(videoData: Partial<MediaItem>): Promise<MediaItem>;
  getAllPhotos(): MediaItem[];
  getAllVideos(): MediaItem[];
  getAllPhotoUrls(): { url: string; thumbnail_url?: string }[];
  getAllVideoUrls(): { url: string; thumbnail_url?: string }[];
  removePhoto(publicId: string): Promise<void>;
  removeVideo(publicId: string): Promise<void>;
}

export interface AggregationConfig {
  pipeline: PipelineStage[];
  options?: AggregateOptions;
}

interface QueryOptions<T> {
  pagination?: {
    page: number;
    limit: number;
  };
  sort?: Record<string, 1 | -1>;
  select?: Record<keyof T, number | boolean | object> | string | string[];
  populate?: string | string[];
  lean?: boolean;
}

export interface ModelOperationConfig<T> {
  aggregation?: boolean;
  aggregationConfig?: AggregationConfig;
  queryOptions?: QueryOptions<T>;
}
