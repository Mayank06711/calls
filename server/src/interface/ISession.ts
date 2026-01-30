import { Document, Types } from "mongoose";

export type DeviceType = "desktop" | "mobile" | "tablet" | "unknown";
export type Platform = "windows" | "macos" | "linux" | "ios" | "android" | "unknown";
export type BrowserType = "chrome" | "firefox" | "safari" | "edge" | "opera" | "samsung" | "unknown";

export interface IDeviceInfo {
  type: DeviceType;
  platform: Platform;
  browser: BrowserType;
  browserVersion?: string;
  osVersion?: string;
  deviceModel?: string; // e.g., "iPhone 14 Pro", "Samsung Galaxy S23"
  deviceBrand?: string; // e.g., "Apple", "Samsung", "Google"
  screenResolution?: string; // e.g., "1920x1080"
  userAgent: string;
}

export interface ILocationInfo {
  ip: string;
  city?: string;
  region?: string;
  country?: string;
  timezone?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

/** Slim data extracted from express.Request for session creation */
export interface SessionRequestInfo {
  userAgent: string;
  ip: string;
  customHeaders?: {
    platform?: string;
    deviceModel?: string;
    deviceBrand?: string;
    appVersion?: string;
  };
}

export interface ISession extends Document {
  userId: Types.ObjectId;
  
  // Session identification
  refreshTokenId: string; // Session identifier (sess_<uuid>), used in Redis and JWTs
  refreshToken: string; // The actual JWT refresh token for this session
  
  // Device information
  device: IDeviceInfo;
  
  // Location information
  location: ILocationInfo;
  
  // Session status
  isActive: boolean;
  isCurrentSession?: boolean; // Marked true for the session making the request
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  lastActiveAt: Date;
  expiresAt: Date;
  
  // Session metadata
  loginMethod?: "password" | "otp" | "social" | "mfa";
  
  // For security
  revokedAt?: Date;
  revokedReason?: string;
  revokedBy?: Types.ObjectId; // User who revoked (could be admin or self)
}

// Helper to parse user agent
export interface ParsedUserAgent {
  deviceType: DeviceType;
  platform: Platform;
  browser: BrowserType;
  browserVersion?: string;
  osVersion?: string;
  deviceModel?: string;
  deviceBrand?: string;
}
