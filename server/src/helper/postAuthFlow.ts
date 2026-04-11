import { Request, Response, CookieOptions } from "express";
import { RedisManager } from "../utils/redisClient";
import { SessionController } from "../controllers/sessionController";
import {
  generateSessionId,
  getMaxSessionsForSubscription,
} from "./sessionLimits";
import { AuthServices } from "./auth";
import { ApiError } from "../utils/apiError";
import { successResponse } from "../utils/apiResponse";
import { IUser } from "../interface/IUser";

// ─── Cookie Options (shared across all auth flows) ──────────────────────────

const cookieOptions: CookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: process.env.NODE_ENV === "prod" ? "none" : "none",
  maxAge: 24 * 60 * 60 * 1000, // 1 day
  domain: process.env.NODE_ENV === "prod" ? "frontend.com" : undefined,
};

const refreshCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: process.env.NODE_ENV === "prod" ? "none" : "none",
  maxAge: 15 * 24 * 60 * 60 * 1000, // 15 days
  domain: process.env.NODE_ENV === "prod" ? "frontend.com" : undefined,
};

// ─── Types ──────────────────────────────────────────────────────────────────

type LoginMethod = "otp" | "email_otp" | "social" | "password" | "mfa";

interface PostAuthParams {
  user: IUser;
  req: Request;
  res: Response;
  loginMethod: LoginMethod;
  isNewUser: boolean;
  responseExtras?: Record<string, any>;
  onOtpConsume?: () => Promise<void>;
}

// ─── Device Info Extraction ─────────────────────────────────────────────────

export function extractDeviceInfo(req: Request) {
  const userAgent = req.headers["user-agent"] || "";
  const ip =
    (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
    req.socket?.remoteAddress ||
    "unknown";

  return {
    userAgent,
    ip,
    device: userAgent.substring(0, 100),
    deviceType: (req as any).isMobileApp ? "mobile" : ("desktop" as string),
    platform: userAgent.includes("Windows")
      ? "windows"
      : userAgent.includes("Mac")
      ? "macos"
      : userAgent.includes("Linux")
      ? "linux"
      : userAgent.includes("Android")
      ? "android"
      : userAgent.includes("iPhone")
      ? "ios"
      : "unknown",
    browser: userAgent.includes("Chrome")
      ? "chrome"
      : userAgent.includes("Firefox")
      ? "firefox"
      : userAgent.includes("Safari")
      ? "safari"
      : userAgent.includes("Edge")
      ? "edge"
      : "unknown",
  };
}

// ─── Response Sender ────────────────────────────────────────────────────────

function sendAuthResponse(
  req: Request,
  res: Response,
  accessToken: string,
  refreshToken: string,
  responseData: Record<string, any>,
  message: string
): void {
  if ((req as any).isMobileApp) {
    res
      .status(200)
      .setHeader("x-access-token", accessToken)
      .setHeader("x-refresh-token", refreshToken)
      .json(successResponse(responseData, message));
  } else {
    res
      .status(200)
      .cookie("accessToken", accessToken, cookieOptions)
      .cookie("refreshToken", refreshToken, refreshCookieOptions)
      .json(successResponse(responseData, message));
  }
}

// ─── Session + Token Creation (shared logic) ────────────────────────────────

async function createSessionAndTokens(
  user: IUser,
  req: Request,
  sessionId: string,
  subscriptionId: string | undefined,
  subscriptionType: string,
  loginMethod: LoginMethod
) {
  const accessToken = user.generateAccessToken(
    sessionId,
    subscriptionId,
    subscriptionType
  );
  const refreshToken = user.generateRefreshToken(
    sessionId,
    subscriptionId,
    subscriptionType
  );

  if (!accessToken || !refreshToken) {
    throw new ApiError(500, "Failed to generate tokens.");
  }

  const deviceInfo = extractDeviceInfo(req);

  // Add session to Redis
  await RedisManager.addActiveSession(
    (user._id as any).toString(),
    sessionId,
    {
      device: deviceInfo.device,
      deviceType: deviceInfo.deviceType,
      platform: deviceInfo.platform,
      browser: deviceInfo.browser,
      ip: deviceInfo.ip,
    }
  );

  // Create session record in MongoDB
  await SessionController.createSession(
    (user._id as any).toString(),
    {
      userAgent: deviceInfo.userAgent || "unknown",
      ip: deviceInfo.ip,
      customHeaders: {
        platform: req.headers["x-platform"] as string,
        deviceModel: req.headers["x-device-model"] as string,
        deviceBrand: req.headers["x-device-brand"] as string,
        appVersion: req.headers["x-app-version"] as string,
      },
    },
    sessionId,
    refreshToken,
    loginMethod
  );

  return { accessToken, refreshToken };
}

// ─── Existing User Auth Flow ────────────────────────────────────────────────

/**
 * Handles post-authentication for an EXISTING verified user:
 * 1. Acquires distributed lock
 * 2. Checks session limits (subscription-based)
 * 3. If under limit: consumes OTP, generates tokens, creates sessions, sends response
 * 4. If over limit: returns 403 with partial token + active sessions list
 */
export async function handleExistingUserAuth(
  params: PostAuthParams
): Promise<void> {
  const { user, req, res, loginMethod, responseExtras, onOtpConsume } = params;

  const subscriptionType =
    (user.currentSubscriptionId as any)?.type || "free";
  const subscriptionId = (user.currentSubscriptionId as any)?._id?.toString();
  const userId = (user._id as any).toString();

  // Acquire distributed lock to prevent race condition on session creation
  const lockKey = `session:create:${userId}`;
  const lockId = await RedisManager.acquireLock(lockKey, 10000);

  if (!lockId) {
    res.status(429).json({
      success: false,
      message: "Another login is in progress. Please try again.",
      error: "LOGIN_IN_PROGRESS",
    });
    return;
  }

  try {
    // Check session limit
    const maxSessions = getMaxSessionsForSubscription(subscriptionType);
    const activeSessionCount = await RedisManager.getActiveSessionCount(userId);

    if (activeSessionCount >= maxSessions) {
      // Release lock before returning
      await RedisManager.releaseLock(lockKey, lockId);

      // OTP is intentionally NOT consumed here — it stays in Redis so the
      // client can retry after revoking a session from SessionLimitModal.
      const activeSessions = await RedisManager.getAllSessionsData(userId);

      // Generate partial token for session management
      const partialPayload = {
        _id: user._id,
        email: user.email,
        username: user.username,
        isPartial: true,
        iss: "KYF",
        aud: "kyf-api",
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 60 * 60, // 1 hour
      };
      const partialToken = await AuthServices.genJWT_Token(
        partialPayload,
        process.env.ACCESS_TOKEN_SECRET!,
        "1h"
      );

      res.status(403).json({
        success: false,
        message: "Session limit reached",
        error: "SESSION_LIMIT_REACHED",
        data: {
          maxAllowed: maxSessions,
          currentCount: activeSessionCount,
          subscriptionType,
          partialToken,
          activeSessions: activeSessions.map((s) => ({
            sessionId: s.sessionId,
            device: s.metadata?.device || "Unknown",
            deviceType: s.metadata?.deviceType || "unknown",
            platform: s.metadata?.platform || "unknown",
            browser: s.metadata?.browser || "unknown",
            ip: s.metadata?.ip || "unknown",
            createdAt: s.metadata?.createdAt,
            lastActiveAt: s.activity?.lastActiveAt,
          })),
        },
      });
      return;
    }

    // Session limit passed — consume OTP if applicable
    if (onOtpConsume) {
      await onOtpConsume();
    }

    // Generate tokens and create session
    const sessionId = generateSessionId();
    const { accessToken, refreshToken } = await createSessionAndTokens(
      user,
      req,
      sessionId,
      subscriptionId,
      subscriptionType,
      loginMethod
    );

    // Release the lock after session is created
    await RedisManager.releaseLock(lockKey, lockId);

    const responseData = {
      userId: user._id,
      isAlreadyVerified: true,
      token: accessToken,
      fullName: user.fullName,
      isAdmin: user.isAdmin,
      ...responseExtras,
    };

    sendAuthResponse(
      req,
      res,
      accessToken,
      refreshToken,
      responseData,
      "Login successful"
    );
  } catch (error) {
    // Release lock on error
    await RedisManager.releaseLock(lockKey, lockId);
    throw error;
  }
}

// ─── New User Auth Flow ─────────────────────────────────────────────────────

/**
 * Handles post-authentication for a NEW user (just created):
 * No session limit check needed (first login).
 * Generates tokens, creates sessions, sends response.
 */
export async function handleNewUserAuth(
  params: PostAuthParams
): Promise<void> {
  const { user, req, res, loginMethod, responseExtras } = params;

  const sessionId = generateSessionId();
  const { accessToken, refreshToken } = await createSessionAndTokens(
    user,
    req,
    sessionId,
    undefined,
    "free",
    loginMethod
  );

  const responseData = {
    userId: user._id,
    isAlreadyVerified: false,
    token: accessToken,
    fullName: user.fullName,
    isAdmin: user.isAdmin,
    ...responseExtras,
  };

  sendAuthResponse(
    req,
    res,
    accessToken,
    refreshToken,
    responseData,
    "Login successful, User Registered"
  );
}
