import mongoose, { Schema } from "mongoose";
import { ISubscription } from "../interface/ISubscription";

const SubscriptionSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["Platinum", "Silver", "Gold", "Free"],
      required: true,
      default: "Free",
    },
    status: {
      type: String,
      enum: ["Active", "Expired", "Cancelled", "Pending", "Requested", "N/A"],
      required: true,
      default: "N/A",
    }, //Pending: Initial state when subscription is created but payment hasn't been initiated  Requested: Payment has been initiated but not yet completed Active: Payment completed and subscription is currently valid
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    durationInDays: {type: Number, default: 7},
    amount: {
      type: Number,
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ["Pending", "Completed", "Failed"],
      default: "Pending",
    },
    paymentId: {
      type: String,
    },
    transactionId: {
      type: String,
    },
    paymentMethod: {
      type: String,
    },
    referralId: {
      type: Schema.Types.ObjectId,
      ref: "Referral",
    },
    historyId: {
      type: Schema.Types.ObjectId,
      ref: "SubscriptionHistory",
      required: true,
    },
    upgradedFrom: Schema.Types.Mixed,
    referralDiscount: {
      type: Number,
      min: 0,
      max: 100,
      validate: {
        validator: Number.isInteger,
        message: "Discount must be an integer",
      },
    },
    extraValidityDays: {
      type: Number,
      min: 0,
      max: 365,
      validate: {
        validator: Number.isInteger,
        message: "Extra validity days must be an integer",
      },
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for better query performance
SubscriptionSchema.index({ userId: 1, status: 1 });
SubscriptionSchema.index({ endDate: 1 }, { expireAfterSeconds: 0 }); // For TTL index

// Instance methods
SubscriptionSchema.methods.isActive = function () {
  return (
    this.status === "Active" &&
    this.paymentStatus === "Completed" &&
    new Date() < this.endDate
  );
};

SubscriptionSchema.methods.getDaysRemaining = function () {
  if (!this.isActive()) return 0;
  const now = new Date();
  const end = new Date(this.endDate);
  const diff = end.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

SubscriptionSchema.methods.applyReferral = async function (
  referralId: string | Schema.Types.ObjectId
) {
  if (this.referralId) {
    throw new Error("Referral already applied");
  }
  this.referralId = referralId;
  await this.save();
};

const SubscriptionModel = mongoose.model<ISubscription>(
  "Subscription",
  SubscriptionSchema
);

export { SubscriptionModel };
