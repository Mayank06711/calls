import mongoose, { Schema } from "mongoose";
import { IUserSettings } from "../interface/IUserSettings";

const UserSettingsSchema = new Schema<IUserSettings>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    theme: {
      mode: {
        type: String,
        enum: ["light", "dark", "system"],
        default: "system",
      },
      primaryColor: String,
      fontSize: {
        type: String,
        enum: ["small", "medium", "large"],
        default: "medium",
      },
      customFonts: [String],
    },

    notifications: {
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: true },
      sms: { type: Boolean, default: false },
      marketing: { type: Boolean, default: false },
      sound: { type: Boolean, default: true },
      customSoundUrl: String,
      quietHours: {
        enabled: { type: Boolean, default: false },
        start: String,
        end: String,
        timezone: String,
      },
    },

    privacy: {
      profileVisibility: {
        type: String,
        enum: ["public", "private", "friends"],
        default: "public",
      },
      showOnlineStatus: { type: Boolean, default: true },
      showLastSeen: { type: Boolean, default: true },
      showProfilePhoto: {
        type: String,
        enum: ["everyone", "friends", "none"],
      },
      allowTagging: { type: Boolean, default: true },
      allowMessages: {
        type: String,
        enum: ["everyone", "friends", "none"],
        default: "everyone",
      },
    },

    preferences: {
      language: { type: String, default: "en" },
      timezone: { type: String, default: "UTC" },
      dateFormat: { type: String, default: "YYYY-MM-DD" },
      timeFormat: {
        type: String,
        enum: ["12h", "24h"],
        default: "12h",
      },
      currency: { type: String, default: "USD" },
      weekStartDay: {
        type: String,
        enum: ["sunday", "monday"],
        default:"monday"
      },
      measurements: {
        type: String,
        enum: ["metric", "imperial"],
        default:"metric"
      },
    },

    layout: {
      sidebarCollapsed: { type: Boolean, default: false },
      compactView: { type: Boolean, default: false },
      showTutorials: { type: Boolean, default: true },
      defaultView: {
        type: String,
        enum: ["grid", "list"],
        default:"grid"
      },
      customLayout: {
        widgets: [String],
        order: [String],
      },
    },

    accessibility: {
      highContrast: { type: Boolean, default: false },
      reducedMotion: { type: Boolean, default: false },
      screenReader: { type: Boolean, default: false },
      fontSize: Number,
      textSpacing: Number,
      cursorSize: {
        type: String,
        enum: ["default", "large"],
        default:"default"
      },
    },

    lastLoginInfo: {
      device: String,
      browser: String,
      location: String,
      timestamp: { type: Date, default: Date.now },
      ip: String,
      userAgent: String,
    },

    featureUsage: {
      ai: {
        isOpened: { type: Boolean, default: false },
        lastOpened: Date,
        usageCount: { type: Number, default: 0 },
        favoriteFeatures: [String],
      },
      reels: {
        isOpened: { type: Boolean, default: false },
        lastOpened: Date,
        viewCount: { type: Number, default: 0 },
        preferences: {
          autoPlay: { type: Boolean, default: true },
          defaultVolume: Number,
        },
      },
    },

    analytics: {
      timeSpent: Number,
      lastActive: Date,
      favoriteFeatures: [String],
      engagementScore: Number,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for better query performance
UserSettingsSchema.index({ userId: 1 });
UserSettingsSchema.index({ "featureUsage.ai.isOpened": 1 });
UserSettingsSchema.index({ "featureUsage.reels.isOpened": 1 });
UserSettingsSchema.index({ "lastLoginInfo.timestamp": -1 });

export const UserSettingsModel = mongoose.model<IUserSettings>(
  "UserSettings",
  UserSettingsSchema
);
