import { Types, Document } from "mongoose";

export interface IUserSettings extends Document {
  userId: Types.ObjectId | string;

  // Theme and visual preferences
  theme: {
    mode: "light" | "dark" | "system";
    primaryColor?: string; // Optional custom color
    fontSize: "small" | "medium" | "large";
    customFonts?: string[]; // Optional array of custom fonts
  };

  // Notification preferences
  notifications: {
    email: boolean;
    push: boolean;
    sms?: boolean; // Optional SMS notifications
    marketing?: boolean; // Optional marketing notifications
    sound: boolean;
    customSoundUrl?: string; // Optional custom notification sound
    quietHours?: {
      enabled: boolean;
      start?: string; // Time format "HH:mm"
      end?: string; // Time format "HH:mm"
      timezone?: string;
    };
  };

  // Privacy settings
  privacy: {
    profileVisibility: "public" | "private" | "friends";
    showOnlineStatus: boolean;
    showLastSeen: boolean;
    showProfilePhoto?: "everyone" | "friends" | "none";
    allowTagging?: boolean;
    allowMessages?: "everyone" | "friends" | "none";
  };

  // User preferences
  preferences: {
    language: string; // ISO language code
    timezone: string; // IANA timezone
    dateFormat: string; // e.g., "YYYY-MM-DD"
    timeFormat: "12h" | "24h";
    currency: string; // ISO currency code
    weekStartDay?: "sunday" | "monday"; // Optional week start preference
    measurements?: "metric" | "imperial";
  };

  // Layout and UI preferences
  layout: {
    sidebarCollapsed: boolean;
    compactView: boolean;
    showTutorials: boolean;
    defaultView?: "grid" | "list";
    customLayout?: {
      widgets?: string[];
      order?: string[];
    };
  };

  // Accessibility options
  accessibility: {
    highContrast: boolean;
    reducedMotion: boolean;
    screenReader: boolean;
    fontSize?: number; // Custom font size multiplier
    textSpacing?: number; // Custom text spacing
    cursorSize?: "default" | "large";
  };

  // Device and session information
  lastLoginInfo: {
    device?: string;
    browser?: string;
    location?: string;
    timestamp: Date;
    ip?: string;
    userAgent?: string;
  };

  // Feature usage tracking
  featureUsage: {
    ai: {
      isOpened: boolean;
      lastOpened?: Date;
      usageCount?: number;
      favoriteFeatures?: string[];
    };
    reels: {
      isOpened: boolean;
      lastOpened?: Date;
      viewCount?: number;
      preferences?: {
        autoPlay: boolean;
        defaultVolume?: number;
      };
    };
  };

  // Optional fields for analytics and personalization
  analytics?: {
    timeSpent?: number; // Total time spent on platform
    lastActive?: Date;
    favoriteFeatures?: string[];
    engagementScore?: number;
  };
}
