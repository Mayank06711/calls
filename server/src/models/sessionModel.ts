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
    
    // Token identification
    tokenId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    refreshTokenId: {
      type: String,
      index: true,
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
      enum: ["password", "otp", "social", "mfa"],
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

// Static method to get active sessions for a user
SessionSchema.statics.getActiveSessions = function (userId: string) {
  return this.find({
    userId,
    isActive: true,
    revokedAt: { $exists: false },
    expiresAt: { $gt: new Date() },
  }).sort({ lastActiveAt: -1 });
};

// Static method to revoke all sessions for a user except current
SessionSchema.statics.revokeAllExcept = function (
  userId: string,
  currentTokenId: string,
  reason: string = "User logged out all sessions"
) {
  return this.updateMany(
    {
      userId,
      tokenId: { $ne: currentTokenId },
      isActive: true,
    },
    {
      $set: {
        isActive: false,
        revokedAt: new Date(),
        revokedReason: reason,
        revokedBy: userId,
      },
    }
  );
};

// Static method to revoke a specific session
SessionSchema.statics.revokeSession = function (
  sessionId: string,
  userId: string,
  reason: string = "Session revoked by user"
) {
  return this.findOneAndUpdate(
    {
      _id: sessionId,
      userId,
      isActive: true,
    },
    {
      $set: {
        isActive: false,
        revokedAt: new Date(),
        revokedReason: reason,
        revokedBy: userId,
      },
    },
    { new: true }
  );
};

export const SessionModel = mongoose.model<ISession>("Session", SessionSchema);
