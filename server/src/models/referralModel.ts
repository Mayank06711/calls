import mongoose, { Schema } from "mongoose";
import { IReferralDocument, IReferralModel } from "../interface/IReferral";

// Referral configuration

const ReferralSchema = new Schema<IReferralDocument>(
  {
    referrerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    referredId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    referralCode: {
      type: String,
      required: true,
      unique: true,
    },
    status: {
      type: String,
      enum: ["Pending", "Completed", "Expired", "Rewarded"],
      default: "Pending",
    },
    subscriptionId: {
      type: Schema.Types.ObjectId,
      ref: "Subscription",
    },
    rewardsClaimed: {
      type: Boolean,
      default: false,
    },
    rewardsProcessedAt: Date,
    validTill: Date,
    referralType: {
      type: String,
      enum: ["Subscription", "Registration"],
      required: true,
    },
    rewardAmount: Number,
    appliedSubscriptionId: {
      type: Schema.Types.ObjectId,
      ref: "Subscription",
    },
    discountAmount: Number,
    extraValidityDays: Number,
  },
  { timestamps: true }
);

// Indexes
ReferralSchema.index({ referrerId: 1, status: 1 });
ReferralSchema.index({ referralCode: 1 }, { unique: true });
ReferralSchema.index({ validTill: 1 }, { expireAfterSeconds: 0 });

// Instance methods using methods
ReferralSchema.methods.isActive = function (this: IReferralDocument): boolean {
  return this.status === "Pending" && new Date() < this.validTill;
};

ReferralSchema.methods.getReferralBenefits = async function (): Promise<{
  discountPercentage: number;
  extraDays: number;
  coins: number;
}> {
  if (!this.isActive()) {
    return {
      discountPercentage:  0, // Use stored discount or default
      extraDays: 0, // Use stored days or default
      coins: 0, // Default coins reward
    };
  }

  return {
    discountPercentage: this.discountAmount || 0, // Use stored discount or default
    extraDays: this.extraValidityDays || 0, // Use stored days or default
    coins: 100, // Default coins reward
  };
};

ReferralSchema.methods.calculateRewards = async function (
  this: IReferralDocument
): Promise<any> {
  const userTier = await (this.constructor as IReferralModel).getUserTier(
    this.referrerId
  );
  if (!userTier) return [];

  return userTier.rewards.map((reward) => ({
    ...reward,
    value: reward.value * userTier.multiplier,
  }));
};

ReferralSchema.methods.markAsProcessed = async function (): Promise<any> {
  this.status = "Rewarded";
  this.rewardsClaimed = true;
  this.rewardsProcessedAt = new Date();
  await this.save();
};

ReferralSchema.methods.validateAndProcess =
  async function validateAndProcess() {
    if (!this.isActive()) {
      throw new Error("Referral is not active");
    }
    const rewards = await this.calculateRewards();
    await this.markAsProcessed();
    await this.notifyReferrer();
    return rewards;
  };

ReferralSchema.methods.applyToSubscription = async function (
  subscriptionId: mongoose.Types.ObjectId
) {
  if (this.appliedSubscriptionId) {
    throw new Error("Referral already applied to a subscription");
  }

  this.appliedSubscriptionId = subscriptionId;
  this.status = "Completed";
  await this.save();

  return {
    discountPercentage: 10, // or whatever default values you want to return
    extraDays: 30,
    coins: 100,
  };
};

export const ReferralModel = mongoose.model<IReferralDocument, IReferralModel>(
  "Referral",
  ReferralSchema
);
