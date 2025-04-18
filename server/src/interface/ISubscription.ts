import mongoose, { Schema } from "mongoose";
import {
  PaymentStatus,
  SubscriptionStatus,
  SubscriptionType,
} from "../types/typesGeneral";

export interface IUpgradeHistory {
  previousType: SubscriptionType;
  upgradeDate: Date;
  proRatedCredit: number;
}

// Main subscription interface
export interface ISubscription extends Document, ISubscriptionMethods {
  userId: mongoose.Types.ObjectId;
  type: "Platinum" | "Silver" | "Gold" | "Free";
  status: SubscriptionStatus;
  startDate: Date;
  endDate: Date;
  amount: number;
  paymentStatus: PaymentStatus;
  paymentId?: string;
  transactionId?: string;
  paymentMethod?: string;
  referralId?: mongoose.Types.ObjectId | string | Schema.Types.ObjectId; // Only store reference to referral
  historyId?: mongoose.Types.ObjectId | string | Schema.Types.ObjectId;
  upgradedFrom?: IUpgradeHistory;
  referralDiscount?: number;
  extraValidityDays?: number;
  createdAt: Date;
  updatedAt: Date;
  durationInDays: number;
  // Add only essential referral method
  applyReferralCode(referralCode: string): Promise<void>;
}

export interface ISubscriptionMethods {
  isActive(): boolean;
  getDaysRemaining(): number;
  applyReferral(referralId: mongoose.Types.ObjectId | string): Promise<void>;
  getCurrentSubscription(
    userId: mongoose.Types.ObjectId | string
  ): Promise<any>;
}
