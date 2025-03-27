import mongoose, { Types, Document } from "mongoose";
import { ISubscription } from "./ISubscription";
import { MediaItem } from "./IMedia";
import { Gender } from "../types/typesGeneral";

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
  currentSubscriptionId?:
    | mongoose.Types.ObjectId
    | ISubscription
    | Types.ObjectId;
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
  handleReferral(referrerId: mongoose.Types.ObjectId): Promise<void>;
  updateReferralStats(): Promise<void>;
}
