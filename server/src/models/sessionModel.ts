import mongoose, { Schema } from "mongoose";
import { ISession, IDeviceInfo, ILocationInfo } from "../interface/ISession";

const DeviceInfoSchema = new Schema<IDeviceInfo>(
  {
    type: {
      type: String,
      enum: ["desktop", "mobile", "tablet", "unknown"],
      default: "unknown",
    },
    platform: {
      type: String,
      enum: ["windows", "macos", "linux", "ios", "android", "unknown"],
      default: "unknown",
    },
    browser: {
      type: String,
      enum: ["chrome", "firefox", "safari", "edge", "opera", "samsung", "unknown"],
      default: "unknown",
    },
    browserVersion: String,
    osVersion: String,
    deviceModel: String,
    deviceBrand: String,
    screenResolution: String,
    userAgent: { type: String, required: true },
  },
  { _id: false }
);

const LocationInfoSchema = new Schema<ILocationInfo>(
  {
    ip: { type: String, required: true },
    city: String,
    region: String,
    country: String,
    timezone: String,
    coordinates: {
      latitude: Number,
      longitude: Number,
    },
  },
  { _id: false }
);

const SessionSchema = new Schema<ISession>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    
    // Session identification
    refreshTokenId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    refreshToken: {
      type: String,
      required: true,
    },
    previousRefreshToken: {
      type: String,
    },
    tokenRotatedAt: {
      type: Date,
    },

    // Device information
    device: {
      type: DeviceInfoSchema,
      required: true,
    },
    
    // Location information
    location: {
      type: LocationInfoSchema,
      required: true,
    },
    
    // Session status
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    
    // Timestamps
    lastActiveAt: {
      type: Date,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    
    // Session metadata
    loginMethod: {
      type: String,
      enum: ["password", "otp", "email_otp", "social", "mfa"],
      default: "password",
    },
    
    // For security - revocation
    revokedAt: Date,
    revokedReason: String,
    revokedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt
  }
);

// Indexes for common queries
SessionSchema.index({ userId: 1, isActive: 1 });
SessionSchema.index({ userId: 1, createdAt: -1 });
SessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index - auto delete expired sessions

// Instance method to check if session is valid
SessionSchema.methods.isValid = function (): boolean {
  return this.isActive && !this.revokedAt && new Date() < this.expiresAt;
};

export const SessionModel = mongoose.model<ISession>("Session", SessionSchema);
