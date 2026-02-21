import express, { Request, Response } from "express";
import { CookieOptions } from "express";
import JWT, { JsonWebTokenError, JwtPayload } from "jsonwebtoken";
import crypto from "crypto";
import { RedisManager } from "../utils/redisClient";
import { ApiError } from "../utils/apiError";
import { UserModel } from "../models/userModel";
import { successResponse } from "../utils/apiResponse";
import { AsyncHandler } from "../utils/AsyncHandler";

interface AIRequestPayload {
  question: string;
  context?: string;
  userinfo?: Record<string, any>;
  isSubscription?: string | boolean;
}

class AuthServices {
  private static options: CookieOptions = {
    httpOnly: true, // Prevent JavaScript access to the cookie
    secure: process.env.NODE_ENV === "prod" ? true : true, // Use HTTPS in production
    sameSite: process.env.NODE_ENV === "prod" ? "none" : "none", // Allow cross-site cookies in production with HTTPS
    maxAge: 24 * 60 * 60 * 1000, // Cookie lifespan: 1 day
    domain: process.env.NODE_ENV === "prod" ? "frontend.com" : undefined, // Set domain in production (replace with actual domain)
  };

  private static refreshOptions: CookieOptions = {
    httpOnly: true, // Prevent JavaScript access to the cookie
    secure: process.env.NODE_ENV === "prod" ? true : true, // Use HTTPS in production
    sameSite: process.env.NODE_ENV === "prod" ? "none" : "none", // Allow cross-site cookies in production with HTTPS
    maxAge: 15 * 24 * 60 * 60 * 1000, // 15 days (for refresh token) - 15 days * 24 hours * 60 minutes * 60 seconds * 1000 milliseconds
    domain: process.env.NODE_ENV === "prod" ? "frontend.com" : undefined, // Set domain in production (replace with actual domain)
  };

  private static readonly ENCYRPTION = {
    algorithm: "aes-256-gcm",
    ivLength: 16,
    saltLength: 64,
    tagLength: 16,
    iterations: 100000,
    keyLength: 32,
  } as const;

  private static getKey(salt: Buffer): Buffer {
    return crypto.pbkdf2Sync(
      process.env.ENCRYPTION_SECRET!,
      new Uint8Array(salt),
      AuthServices.ENCYRPTION.iterations, // iterations
      AuthServices.ENCYRPTION.keyLength, // key length
      "sha512"
    );
  }

  static encrypt(text: string): string {
    const salt = crypto.randomBytes(AuthServices.ENCYRPTION.saltLength);
    const iv = crypto.randomBytes(AuthServices.ENCYRPTION.ivLength);
    const key = AuthServices.getKey(salt);

    const cipher = crypto.createCipheriv(
      AuthServices.ENCYRPTION.algorithm,
      new Uint8Array(key),
      new Uint8Array(iv)
    );

    const encrypted = Buffer.concat([
      cipher.update(text, "utf8") as unknown as Uint8Array,
      cipher.final() as unknown as Uint8Array,
    ]);

    const tag = cipher.getAuthTag();

    // Combine all components: salt + iv + tag + encrypted
    const result = Buffer.concat([
      new Uint8Array(salt),
      new Uint8Array(iv),
      new Uint8Array(tag),
      new Uint8Array(encrypted),
    ]);

    return result.toString("base64");
  }

  static decrypt(encryptedText: string): string {
    const buffer = Buffer.from(encryptedText, "base64");

    const salt = buffer.subarray(0, AuthServices.ENCYRPTION.saltLength);
    const iv = buffer.subarray(
      AuthServices.ENCYRPTION.saltLength,
      AuthServices.ENCYRPTION.saltLength + AuthServices.ENCYRPTION.ivLength
    );
    const tag = buffer.subarray(
      AuthServices.ENCYRPTION.saltLength + AuthServices.ENCYRPTION.ivLength,
      AuthServices.ENCYRPTION.saltLength +
        AuthServices.ENCYRPTION.ivLength +
        AuthServices.ENCYRPTION.tagLength
    );
    const encrypted = buffer.subarray(
      AuthServices.ENCYRPTION.saltLength +
        AuthServices.ENCYRPTION.ivLength +
        AuthServices.ENCYRPTION.tagLength
    );

    const key = AuthServices.getKey(salt);

    const decipher = crypto.createDecipheriv(
      AuthServices.ENCYRPTION.algorithm,
      new Uint8Array(key),
      new Uint8Array(iv)
    );
    decipher.setAuthTag(new Uint8Array(tag));

    const decrypted = Buffer.concat([
      decipher.update(new Uint8Array(encrypted)) as unknown as Uint8Array,
      decipher.final() as unknown as Uint8Array,
    ]);
    return decrypted.toString("utf8");
  }

  // Method to refresh access token
  private static async _refreshAccessToken(req: Request, res: Response) {
    let incomingRefreshToken: string | undefined;

    // Determine refresh token source based on client type
    if (req.isMobileApp) {
      const authHeader = req.header("Authorization");
      incomingRefreshToken = authHeader?.startsWith("Bearer ")
        ? authHeader.split(" ")[1]
        : undefined;
    } else {
      incomingRefreshToken =
        req.cookies?.refreshToken || req.body?.refreshToken;
    }

    if (!incomingRefreshToken) {
      throw new ApiError(401, "No refresh token provided", [
        "Authentication failed",
      ]);
    }

    try {
      // Verify the incoming refresh token with the secret
      const wrappedToken = JWT.verify(
        incomingRefreshToken,
        process.env.REFRESH_TOKEN_SECRET!,
        {
          algorithms: ["HS512"],
          complete: true,
        }
      ) as JwtPayload;
      // Decrypt the payload
      const decryptedPayloadStr = AuthServices.decrypt(
        wrappedToken.payload.data
      );
      const decodedToken = JSON.parse(decryptedPayloadStr);

      // Verify standard claims
      if (decodedToken.iss !== "KYF") {
        throw new ApiError(401, "Invalid token issuer", [
          "Authentication failed",
        ]);
      }

      if (decodedToken.aud !== "kyf-api") {
        throw new ApiError(401, "Invalid token audience", [
          "Authentication failed",
        ]);
      }

      const now = Math.floor(Date.now() / 1000);
      if (decodedToken.iat && decodedToken.iat > now) {
        throw new ApiError(401, "Refresh token used before issued time", [
          "Authentication failed",
        ]);
      }

      // Fetch user by the decoded token ID
      const user = await UserModel.findById(decodedToken._id);

      if (!user) {
        throw new ApiError(401, "Invalid refresh token no user found", [
          "Authentication failed",
        ]);
      }

      if (!user.isActive) {
        throw new ApiError(
          401,
          "User is not active, request for your account activation",
          ["Authentication failed"]
        );
      }

      // Verify refresh token against the session (per-session token rotation)
      const sessionId = decodedToken.sessionId;
      const subscriptionId = decodedToken.subscriptionId;
      const subscriptionType = decodedToken.subscriptionType;

      if (!sessionId) {
        throw new ApiError(401, "Invalid refresh token: no session ID");
      }
      
      const { SessionModel } = await import("../models/sessionModel");

      const session = await SessionModel.findOne({
        refreshTokenId: sessionId,
        userId: user._id,
      });

      if (!session) {
        throw new ApiError(401, "Session not found");
      }

      if (!session.isActive) {
        throw new ApiError(401, "Session inactive");
      }

      if (session.revokedAt) {
        throw new ApiError(401, "Session revoked");
      }

      if (session.expiresAt <= new Date()) {
        throw new ApiError(401, "Session expired");
      }
      // Check incoming token against current AND previous (grace period for rotation)
      const isCurrentToken = incomingRefreshToken === session.refreshToken;
      const GRACE_PERIOD_MS = 30_000; // 30 seconds
      const isOldTokenInGrace =
        !isCurrentToken &&
        session.previousRefreshToken &&
        incomingRefreshToken === session.previousRefreshToken &&
        session.tokenRotatedAt &&
        (Date.now() - new Date(session.tokenRotatedAt).getTime()) < GRACE_PERIOD_MS;

      if (!isCurrentToken && !isOldTokenInGrace) {
        throw new ApiError(401, "Refresh token is expired or revoked");
      }

      // Always generate a fresh access token
      const accessToken = user.generateAccessToken(
        sessionId,
        subscriptionId,
        subscriptionType
      );

      // Session maintenance on token refresh
      const userId = decodedToken._id.toString();

      // 1. Restore session in Redis if it was lost (e.g. Redis restart/flush)
      const isRedisActive = await RedisManager.isSessionActive(userId, sessionId);
      if (!isRedisActive) {
         // Extract device info from request
        const userAgent = req.headers["user-agent"] || "";

        const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.socket?.remoteAddress || "unknown";

        await RedisManager.addActiveSession(userId, sessionId, {
            device: userAgent.substring(0, 100),
            deviceType: req.isMobileApp ? "mobile" : "desktop",
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
            ip,
          });
        console.log(`[Auth] Session ${sessionId} restored in Redis after refresh`);
      }

      // 2. Extend expiresAt (sliding window) + rotate refresh token
      const newExpiresAt = new Date();
      newExpiresAt.setDate(newExpiresAt.getDate() + 15);

      let refreshToken: string;
      if (isCurrentToken) {
        // Normal rotation — generate new refresh token, keep old as grace fallback
        refreshToken = user.generateRefreshToken(sessionId, subscriptionId, subscriptionType);
        await SessionModel.updateOne(
          { _id: session._id },
          { $set: {
            previousRefreshToken: session.refreshToken,
            tokenRotatedAt: new Date(),
            refreshToken,
            expiresAt: newExpiresAt,
            lastActiveAt: new Date(),
          } }
        );
      } else {
        // Old token within grace period — return current token, don't rotate again
        refreshToken = session.refreshToken;
        await SessionModel.updateOne(
          { _id: session._id },
          { $set: { expiresAt: newExpiresAt, lastActiveAt: new Date() } }
        );
        console.log(`[Auth] Grace period used for session ${sessionId} — skipped rotation`);
      }

      if (req.isMobileApp) {
        return res
          .status(200)
          .setHeader("x-access-token", accessToken)
          .setHeader("x-refresh-token", refreshToken)
          .json(
            successResponse(
              { token: accessToken },
              "Successfully Refreshed Access Token"
            )
          );
      }

      return res
        .status(200)
        .cookie("accessToken", accessToken, AuthServices.options)
        .cookie("refreshToken", refreshToken, AuthServices.refreshOptions)
        .json(
          successResponse(
            { token: accessToken },
            "Successfully Refreshed Access Token"
          )
        );
    } catch (error: any) {
      if (error instanceof ApiError) throw error;

      // Handle JWT-specific errors instead of swallowing them
      if (error.name === "TokenExpiredError") {
        console.error(`[RefreshToken] JWT expired at ${error.expiredAt} — user needs to re-login`);
        throw new ApiError(401, "Refresh token has expired, please login again", [
          `Token expired at: ${error.expiredAt}`,
        ]);
      }

      if (error instanceof JsonWebTokenError) {
        console.error(`[RefreshToken] JWT verification failed: ${error.message}`);
        throw new ApiError(401, "Refresh token signature is invalid — possible secret mismatch or token corruption", [
          error.message,
        ]);
      }

      // Crypto / decryption errors
      if (error.code === "ERR_OSSL_EVP_BAD_DECRYPT" || error.message?.includes("decrypt")) {
        console.error(`[RefreshToken] Decryption failed: ${error.message}`);
        throw new ApiError(401, "Refresh token decryption failed — ENCRYPTION_SECRET may have changed", [
          error.message,
        ]);
      }

      // Unexpected errors (MongoDB, Redis, etc.)
      console.error("[RefreshToken] Unexpected error:", error.name, error.message);
      throw new ApiError(401, "Invalid refresh token", [
        error.message || "Authentication failed",
      ]);
    }
  }

  private static async generate_JWT_Token<T extends string | object>(
    payload: T,
    secretToken: string,
    expiry: string
  ): Promise<string> {
    try {
      // Encrypt the payload
      const encryptedPayload = AuthServices.encrypt(JSON.stringify(payload));
      // Create wrapper token with minimal unencrypted claims
      const token = await JWT.sign(
        {
          data: encryptedPayload,
          iss: "KYF",
          aud: "kyf-api",
        },
        secretToken,
        {
          expiresIn: expiry,
          algorithm: "HS512",
        }
      );
      return token;
    } catch (e) {
      if (typeof e === "string") {
        throw new ApiError(500, `Token could not be generated: ${e}`);
      } else if (e instanceof Error) {
        throw e;
      } else {
        throw new ApiError(
          500,
          `Token could not be generated due to an unknown error.`
        );
      }
    }
  }

  private static async verifyToken(token: string, type: "access" | "refresh") {
    try {
      const secret =
        type === "access"
          ? process.env.ACCESS_TOKEN_SECRET!
          : process.env.REFRESH_TOKEN_SECRET!;

      // First verify JWT signature
      const wrappedToken = JWT.verify(token, secret, {
        algorithms: ["HS512"],
        complete: true,
      }) as JwtPayload;

      // Decrypt the payload
      const decryptedPayloadStr = AuthServices.decrypt(
        wrappedToken.payload.data
      );
      const decodedToken = JSON.parse(decryptedPayloadStr);

      // Verify token expiration
      const now = Math.floor(Date.now() / 1000);
      if (decodedToken.exp && decodedToken.exp < now) {
        return {
          isExpire: true,
          stdClaimsNotValid: false,
          unExpectedError: false,
          data: null,
        };
      }

      // Verify standard claims
      if (
        decodedToken.iss !== "KYF" ||
        decodedToken.aud !== "kyf-api" ||
        (decodedToken.iat && decodedToken.iat > now)
      ) {
        return {
          isExpire: false,
          stdClaimsNotValid: true,
          unExpectedError: false,
          data: null,
        };
      }

      // For refresh tokens, session-level verification happens in _refreshAccessToken,
      // so we only need to verify the user exists and is active here
      const query = { _id: decodedToken._id, isActive: true };

      const user = await UserModel.findOne(query);
      if (!user)
        return {
          isExpire: false,
          stdClaimsNotValid: false,
          unExpectedError: false,
          data: null, //  no user found
        };
      return {
        isExpire: false,
        stdClaimsNotValid: false,
        unExpectedError: false,
        data: {
          userId: user._id,
          username: user.username,
          sessionId: decodedToken.sessionId,
          subscriptionType: decodedToken.subscriptionType || "free",
          isExpert: user.isExpert || false,
          status: type === "access" ? "authenticated" : "refreshed",
          tokenExpiry: decodedToken.exp,
        },
      };
    } catch (error: any) {
      // Handle JWT errors specifically
      if (error.name === "TokenExpiredError") {
        return {
          isExpire: true,
          stdClaimsNotValid: false,
          unExpectedError: false,
          data: null, // token expired
        };
      } else if (error.name === "JsonWebTokenError") {
        return {
          isExpire: false,
          stdClaimsNotValid: false,
          unExpectedError: true,
          data: null, // invalid token
        };
      }
      // Other unexpected errors
      return {
        isExpire: false,
        stdClaimsNotValid: false,
        unExpectedError: true,
        data: null, //  no user found
      };
    }
  }

  public static async verifyAndForwardToAI(req: Request, res: Response) {
    try {
      const userId = req.user?._id;
      if (!userId) {
        throw new ApiError(401, "No user Id found, try login again", [
          "Authentication failed",
        ]);
      }
      // Validate required fields
      const { question, context, userinfo, isSubscription } = req.body;

      if (!question || typeof question !== "string") {
        return res.status(400).json({
          success: false,
          message: "Invalid request format",
          errors: ["Question is required and must be a string"],
        });
      }

      // Prepare payload with optional fields
      const aiPayload: AIRequestPayload = {
        question,
        ...(context && { context }),
        ...(userinfo && { userinfo }),
        ...(isSubscription !== undefined && { isSubscription }),
      };

      // Add timeout and error handling for fetch
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);

      try {
        const aiServiceResponse = await fetch(
          `${process.env.AI_SERVICE_URL}/process`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${process.env.AI_SERVICE_SECRET}`,
            },
            body: JSON.stringify({
              userId: userId.toString(),
              payload: aiPayload,
            }),
            signal: controller.signal,
          }
        );

        // Get error response as JSON if possible
        if (!aiServiceResponse.ok) {
          const errorData = await aiServiceResponse.json().catch(() => ({
            error: "Unknown error",
            detail: "Could not parse error response",
          }));

          throw new ApiError(
            aiServiceResponse.status,
            errorData.error || "AI Service Processing Failed",
            [errorData.detail || "Unknown error occurred"]
          );
        }

        const aiData = await aiServiceResponse.json();

        if (!aiData?.data?.result) {
          throw new ApiError(500, "Invalid AI service response format", [
            "Response format error",
          ]);
        }

        return res
          .status(200)
          .json(successResponse(aiData.data.result, "AI Processing Complete"));
      } finally {
        clearTimeout(timeout);
      }
    } catch (error: any) {
      // Don't throw errors, handle them here
      const statusCode = error instanceof ApiError ? error.statusCode : 500;
      const message =
        error instanceof ApiError
          ? error.message
          : "AI Service Processing Failed";
      const errors =
        error instanceof ApiError
          ? error.errors
          : [error.message || "Unknown error"];

      return res.status(statusCode).json({
        success: false,
        message,
        errors,
      });
    }
  }

  static genJWT_Token = AuthServices.generate_JWT_Token;
  static RefreshAccessToken = AsyncHandler.wrap(
    AuthServices._refreshAccessToken
  );
  static verifyJWT_Token = AuthServices.verifyToken;
}

export { AuthServices };
