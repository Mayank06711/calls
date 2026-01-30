import { Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { generateTimestamps } from "../utils/generateTimeStamps";
import { dbQuery } from "../db/index";
import { sqlGenerateInsertQuery } from "../utils/sql_query";
import SmsService from "../thirdparty/twilio_sms";
import { RedisManager } from "../utils/redisClient";
import { toE164Format } from "../utils/formatNum";
import { successResponse, errorResponse } from "../utils/apiResponse";
import { CookieOptions } from "express";
import { ApiError } from "../utils/apiError";
import { AsyncHandler } from "../utils/AsyncHandler";
import { UserModel } from "../models/userModel";
import { SessionController } from "./sessionController";
import {
  generateSessionId,
  getMaxSessionsForSubscription,
} from "../helper/sessionLimits";
import { AuthServices } from "../helper/auth";
const otpLogPossibleKeys = [
  "mob_num",
  "reference_id",
  "unique_id",
  "src",
  "otp",
  "message_template_id",
  "message_uuid",
  "message_status_code",
  "status",
  "actual_message",
  "expiry_at",
  "ip_address",
  "app_version",
  "device_id",
];

interface OtpLog {
  mob_num: string;
  reference_id: string;
  unique_id: string;
  src?: string;
  message_template_id?: string;
  message_uuid?: string;
  message_status_code?: string;
  status?: string;
  actual_message?: string;
  expiry_at?: string | null;
  ip_address?: string;
  app_version?: string;
  device_id?: string;
}

class Authentication {
  private static getHeaderAsString(
    header: string | string[] | undefined
  ): string | undefined {
    if (Array.isArray(header)) {
      return header[0]; // Use the first value in the array
    }
    return header || undefined;
  }
  private static REDIS_TTL = {
    OTP_DATA: 600, // 10 minutes
    OTP_REQUESTS: 660, // 11 minutes
    OTP_MAX_ATTEMPTS: 5,
    OTP_WINDOW_MINUTES: 10,
  };

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

  // async encryptKeys(accessToken: string, refreshToken: string) {
  //   const params = {
  //     Names: [
  //       `authorization_token_decryption_key_${this.NODE_ENV}`,
  //       `body_decryption_key_${this.NODE_ENV}`,
  //       `verify_otp_encryption_key_${this.NODE_ENV}`,
  //     ],
  //   };

  //   const { Parameters } = await this.ssm.getParameters(params).promise();

  //   const keys = {
  //     header_secret_key: Parameters[0].Value,
  //     body_secret_key: Parameters[1].Value,
  //     access_token: accessToken,
  //     refresh_token: refreshToken,
  //   };

  //   const iv = crypto.randomBytes(16);
  //   const cipher = crypto.createCipheriv(
  //     "aes-256-cbc",
  //     Buffer.from(Parameters[2].Value),
  //     iv
  //   );

  //   let encrypted = cipher.update(JSON.stringify(keys), "utf8", "base64");
  //   encrypted += cipher.final("base64");

  //   return Buffer.concat([iv, Buffer.from(encrypted, "base64")]).toString(
  //     "base64"
  //   );
  // }

  private static generateOtpAndReferenceId() {
    const otp = Array(6)
      .fill(0)
      .map(() => Math.floor(Math.random() * 10))
      .join("");
    const referenceId = uuidv4().replace(/-/g, "").substring(0, 8);
    return { otp, referenceId };
  }

  private static async logOtpGeneration(otpLog: OtpLog) {
    // Ensure required fields are present
    if (!otpLog.mob_num || !otpLog.unique_id) {
      throw new ApiError(
        500,
        "Missing required fields: mob_num, otp, or unique_id."
      );
    }

    const data = {
      mob_num: otpLog.mob_num,
      reference_id: otpLog.reference_id || null,
      unique_id: otpLog.unique_id,
      src: otpLog.src || "dev",
      message_template_id: otpLog.message_template_id || null,
      message_uuid: otpLog.message_uuid || null,
      message_status_code: otpLog.message_status_code || null,
      status: otpLog.status || null,
      actual_message: otpLog.actual_message || null,
      expiry_at: otpLog.expiry_at || null,
      ip_address: otpLog.ip_address || null,
      app_version: otpLog.app_version || null,
      device_id: otpLog.device_id || null,
    };

    // Generating insert query and values
    const query = sqlGenerateInsertQuery(otpLogPossibleKeys, data);

    const insertQuery = `INSERT INTO otp_storage_${process.env.NODE_ENV} ${query.keys} VALUES ${query.val}`;

    // Log the generated query (for debugging purposes)
    console.log("Generated Insert Query:", insertQuery);
    console.log("Data:", query.data);

    try {
      await dbQuery({
        text: insertQuery,
        values: query.data,
      });
      console.log("OTP generation logged successfully");
    } catch (error) {
      console.error("Error logging OTP generation:", error);
      throw new ApiError(500, "Something went wrong");
    }
  }

  private static async checkOtpRequestCount(mobNum: string) {
    const query = {
      text: `
            SELECT COUNT(*) AS otp_request_count 
            FROM otp_storage_${process.env.NODE_ENV} 
            WHERE mob_num = $1 
            AND created_at >= NOW() - INTERVAL '10 MINUTE'
            AND message_status_code = '202'
        `,
      values: [mobNum],
    };

    try {
      const result = await dbQuery(query);
      return result.rows[0].otp_request_count;
    } catch (error) {
      console.error("Error checking OTP request count:", error);
      throw new ApiError(500, "Something went wrong");
    }
  }

  private static async _generateOtp(req: Request, res: Response) {
    const { mobNum, isTesting } = req.body;

    if (typeof isTesting !== "boolean") {
      throw new ApiError(400, "isTesting must be a boolean");
    }
    if (!mobNum) {
      throw new ApiError(400, "mobile number is required.");
    }
    const formattedRecipientNumber = toE164Format(mobNum, "+91");
    if (!formattedRecipientNumber) {
      return res.status(404).json(errorResponse(404, "Invalid Phone Number"));
    }
    try {
      // Check OTP request count
      const otpRequestCountKey = `otp_count:${formattedRecipientNumber}`;
      let requestData;
      try {
        requestData = await RedisManager.getDataFromGroup<{
          count: number;
          expiry_at: number;
        }>("otp_requests", otpRequestCountKey);
      } catch (redisError) {
        console.error("Redis error:", redisError);
        throw new ApiError(500, "Error checking OTP requests");
      }

      // Check if the request count has expired
      if (requestData) {
        const { count, expiry_at } = requestData;
        // If the current time is past the expiry time, reset the request count
        if (Date.now() > expiry_at) {
          // Reset the count since the TTL has expired
          await RedisManager.cacheDataInGroup(
            "otp_requests",
            otpRequestCountKey,
            {
              count: 1, // Start from 1 after TTL expires
              expiry_at:
                Date.now() +
                Authentication.REDIS_TTL.OTP_WINDOW_MINUTES * 60 * 1000, // Set the TTL for the next 10 minutes
            },
            Authentication.REDIS_TTL.OTP_REQUESTS
          );
        } else if (count >= Authentication.REDIS_TTL.OTP_MAX_ATTEMPTS) {
          // Too many OTP requests, reject the request
          return res
            .status(429)
            .json(
              errorResponse(
                429,
                "Too many OTP requests. Please try after 10 minutes."
              )
            );
        }
      } else {
        // No data exists for the request, initialize the request count
        await RedisManager.cacheDataInGroup(
          "otp_requests",
          otpRequestCountKey,
          {
            count: 1,
            expiry_at:
              Date.now() +
              Authentication.REDIS_TTL.OTP_WINDOW_MINUTES * 60 * 1000, // Set TTL of 10 minutes
          },
          Authentication.REDIS_TTL.OTP_REQUESTS
        );
      }

      // const requestCount = await Authentication.checkOtpRequestCount(mobNum);
      // if (requestCount >= 5) {
      //   return res
      //     .status(429)
      //     .json(
      //       errorResponse(
      //         429,
      //         "Too many OTP requests. Please try after 10 min."
      //       )
      //     );
      // }

      // Generate OTP and reference ID
      const { otp, referenceId } = Authentication.generateOtpAndReferenceId();
      // Send OTP message via Twilio
      let smsRes;
      if (!isTesting) {
        console.log(otp);
        smsRes = await SmsService.sendSMS(
          formattedRecipientNumber,
          "PHONE_VERIFICATION",
          {
            otp_code: otp,
            expiryAt: "10",
          }
        );
      } else {
        smsRes = { uuid: "1234", status: "success", message: "nothing" };
      }
      if (smsRes.uuid) {
        const otpKey = `otp:${formattedRecipientNumber}`;
        await RedisManager.cacheDataInGroup(
          "otp_data",
          otpKey,
          {
            otp,
            reference_id: referenceId,
            expiry_at:
              Date.now() +
              Authentication.REDIS_TTL.OTP_WINDOW_MINUTES * 60 * 1000, // 10 minutes in milliseconds,
          },
          Authentication.REDIS_TTL.OTP_DATA
        );

        // Increment OTP request count in Redis
        const updatedRequestCount = (requestData?.count || 0) + 1;
        await RedisManager.cacheDataInGroup(
          "otp_requests",
          otpRequestCountKey,
          {
            count: updatedRequestCount,
            expiry_at:
              Date.now() +
              Authentication.REDIS_TTL.OTP_WINDOW_MINUTES * 60 * 1000, // Store TTL for the next 10 minutes
          },
          Authentication.REDIS_TTL.OTP_REQUESTS // 11 minutes
        );

        // Successfully sent OTP, log OTP generation
        if (process.env.NODE_ENV === "prod") {
          const timestamps = generateTimestamps(false, false, true);
          await Authentication.logOtpGeneration({
            reference_id: referenceId,
            unique_id: uuidv4(),
            mob_num: formattedRecipientNumber,
            message_uuid: smsRes.uuid, // Plivo's response contains message UUID
            message_status_code: "202", // Assuming status exists in the SMS response
            status: smsRes.status,
            actual_message: smsRes.message || "OTP sent successfully",
            expiry_at: timestamps.expiry_at, // Calculate expiry date, 10 minutes from now
            ip_address: req.ip, // Assuming you want to store IP address
            app_version: Authentication.getHeaderAsString(
              req.headers["x-app-version"]
            ),
            device_id: Authentication.getHeaderAsString(
              req.headers["x-device-id"]
            ),
          });
        }

        // Use the utility function to send success response
        return res.status(200).json(
          successResponse(
            {
              sms_id: smsRes.uuid, // Return SMS UUID if message was sent
              reference_id: referenceId,
              mobNum: formattedRecipientNumber,
            },
            `OTP has been sent to ${formattedRecipientNumber} phone number`
          )
        );
      } else {
        // Error: smsResponse is of type SendOtpMessageError
        // Log OTP generation with error details
        if (process.env.NODE_ENV === "prod") {
          await Authentication.logOtpGeneration({
            reference_id: referenceId,
            unique_id: uuidv4(),
            mob_num: formattedRecipientNumber,
            message_status_code: "500", // Assuming status exists in the SMS response
            status: smsRes.status,
            actual_message: smsRes.message || "Failed To Send OTP",
            expiry_at: null, // Calculate expiry date, 10 minutes from now
            ip_address: req.ip, // Assuming you want to store IP address
            app_version: Authentication.getHeaderAsString(
              req.headers["x-app-version"]
            ),
            device_id: Authentication.getHeaderAsString(
              req.headers["x-device-id"]
            ),
          });
        }
        return res
          .status(500)
          .json(errorResponse(500, "Internal Server Error"));
      }
    } catch (error) {
      console.log("error in generate otp", error);
      if (error instanceof ApiError) throw error;
      throw new ApiError(500, "Something went wrong");
    }
  }

  private static async _verifyOtp(req: Request, res: Response) {
    const { referenceId, mobNum, otp } = req.body;

    // Validate required parameters
    if (!referenceId || !mobNum || !otp) {
      return res
        .status(400)
        .json(
          errorResponse(400, "Missing required parameters for verification")
        );
    }

    // Format the mobile number to E164 format
    const formattedRecipientNumber = toE164Format(mobNum);
    if (!formattedRecipientNumber) {
      return res.status(200).json(errorResponse(404, "Invalid Phone Number"));
    }

    // Query to check OTP details
    const query = {
      text: `
        SELECT otp, expiry_at, is_verified 
        FROM otp_storage_${process.env.NODE_ENV} 
        WHERE mob_num = $1
        AND otp = $2
        AND reference_id = $3
        AND message_status_code = '202'
        AND created_at >= NOW() - INTERVAL '${Authentication.REDIS_TTL.OTP_WINDOW_MINUTES} MINUTE'
      `,
      values: [formattedRecipientNumber, otp, referenceId],
    };

    // Check if OTP exists and is valid
    let otpRecord: {
      otp: string;
      expiry_at: string;
      is_verified: boolean;
    } | null = null;

    try {
      const otpKey = `otp:${formattedRecipientNumber}`;
      const otpRequestCountKey = `otp_count:${formattedRecipientNumber}`;
      const otpData = await RedisManager.getDataFromGroup<{
        otp: string;
        reference_id: string;
        expiry_at: number;
      }>("otp_data", otpKey); // Using phone number as key

      if (!otpData) {
        return res
          .status(401)
          .json(errorResponse(401, "OTP verification failed. Invalid OTP"));
      }
      // Check OTP expiry
      if (Date.now() > otpData.expiry_at) {
        await RedisManager.removeDataFromGroup("otp_data", otpKey);
        return res
          .status(401)
          .json(
            errorResponse(401, "OTP verification failed. OTP has expired.")
          );
      }

      // Validate OTP and reference ID
      if (otpData.otp !== otp || otpData.reference_id !== referenceId) {
        return res
          .status(401)
          .json(errorResponse(401, "OTP verification failed. Invalid OTP."));
      }

      // NOTE: OTP is NOT deleted here. It is consumed only after session limit
      // check passes (or for new users, after user creation). This keeps the
      // OTP valid if SESSION_LIMIT_REACHED is returned, so the client can
      // retry after revoking a session with the original TTL intact.

      // Update OTP status in the database
      if (process.env.NODE_ENV === "prod") {
        const updateQuery = {
          text: `
          UPDATE otp_storage_${process.env.NODE_ENV}
          SET is_verified = TRUE, updated_at = NOW()
          WHERE mob_num = $1 AND otp = $2 AND reference_id = $3
        `,
          values: [formattedRecipientNumber, otp, referenceId],
        };
        await dbQuery(updateQuery);
      }
      let user = await UserModel.findOne({
        phoneNumber: formattedRecipientNumber,
      }).populate("currentSubscriptionId");

      if (user && user.isPhoneVerified && user.isActive) {
        // Get subscription info for session limit check
        const subscriptionType = (user.currentSubscriptionId as any)?.type || "free";
        const subscriptionId = (user.currentSubscriptionId as any)?._id?.toString();
        const userId = (user._id as any).toString();

        // Acquire distributed lock to prevent race condition on session creation
        const lockKey = `session:create:${userId}`;
        const lockId = await RedisManager.acquireLock(lockKey, 10000); // 10 second timeout

        if (!lockId) {
          // Another login is in progress for this user
          return res.status(429).json({
            success: false,
            message: "Another login is in progress. Please try again.",
            error: "LOGIN_IN_PROGRESS",
          });
        }

        try {
          // Check session limit (within lock)
          const maxSessions = getMaxSessionsForSubscription(subscriptionType);
          const activeSessionCount = await RedisManager.getActiveSessionCount(userId);

          if (activeSessionCount >= maxSessions) {
            // Release lock before returning
            await RedisManager.releaseLock(lockKey, lockId);

            // OTP is intentionally NOT consumed here — it stays in Redis with
            // its original TTL so the client can call verifyOtp again after
            // revoking a session from the SessionLimitModal.

            // Session limit reached - return 403 with active sessions info and partial token
            const activeSessions = await RedisManager.getAllSessionsData(userId);

            // Generate partial token for session management
            // Include standard claims for middleware validation
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

            return res.status(403).json({
              success: false,
              message: "Session limit reached",
              error: "SESSION_LIMIT_REACHED",
              data: {
                maxAllowed: maxSessions,
                currentCount: activeSessionCount,
                subscriptionType,
                partialToken, // Token for revocation
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
          }

        // Session limit passed — consume the OTP now
        await RedisManager.removeDataFromGroup("otp_data", otpKey);
        await RedisManager.removeDataFromGroup("otp_requests", otpRequestCountKey);

        // Generate new sessionId for this login
        const sessionId = generateSessionId();

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
        if (!accessToken && !refreshToken) {
          throw new ApiError(500, "Failed to generate both access and refresh tokens.");
        } else if (!accessToken) {
          throw new ApiError(500, "Failed to generate access token.");
        } else if (!refreshToken) {
          throw new ApiError(500, "Failed to generate refresh token.");
        }


        // Extract device info from request
        const userAgent = req.headers["user-agent"] || "";
        const ip =
          (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
          req.socket?.remoteAddress ||
          "unknown";

        // Add session to Redis
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

        // Create session record for this login (MongoDB) — stores refresh token per-session
        await SessionController.createSession(
          userId,
          {
            userAgent: userAgent || "unknown",
            ip,
            customHeaders: {
              platform: req.headers["x-platform"] as string,
              deviceModel: req.headers["x-device-model"] as string,
              deviceBrand: req.headers["x-device-brand"] as string,
              appVersion: req.headers["x-app-version"] as string,
            },
          },
          sessionId,
          refreshToken,
          "otp"
        );

        // Release the lock after session is created
        await RedisManager.releaseLock(lockKey, lockId);

        const response = {
          referenceId: referenceId,
          mobNum: formattedRecipientNumber,
          userId: user._id,
          isAlreadyVerified: true,
          token: accessToken,
          fullName: user.fullName,
        };

        // Handle successful verification (skip OTP validation as user is already verified)
        if (req.isMobileApp) {
          return res
            .status(200)
            .setHeader("x-access-token", accessToken)
            .setHeader("x-refresh-token", refreshToken)
            .json(successResponse(response, "OTP Verified Successfully"));
        }

        return res
          .status(200)
          .cookie("accessToken", accessToken, Authentication.options)
          .cookie("refreshToken", refreshToken, Authentication.refreshOptions)
          .json(successResponse(response, "OTP Verified Successfully"));
        } catch (error) {
          // Release lock on error
          await RedisManager.releaseLock(lockKey, lockId);
          throw error;
        }
      }

      // If the user doesn't exist or is not verified, proceed with OTP verification process
      if (!user) {
        user = await UserModel.create({
          phoneNumber: formattedRecipientNumber,
          username: `user_${uuidv4().split("-")[0]}`,
          password: formattedRecipientNumber,
          isPhoneVerified: true,
          refreshToken: "",
          isActive: true,
          fullName: `User_${formattedRecipientNumber.slice(-4)}`,
        });

        if (!user) {
          throw new ApiError(500, "Something went wrong during user creation.");
        }
      } else {
        // Update user phone verification if user already exists
        user.isPhoneVerified = true;
        user.isActive = true;
      }

      // New/unverified user — consume the OTP now
      await RedisManager.removeDataFromGroup("otp_data", otpKey);
      await RedisManager.removeDataFromGroup("otp_requests", otpRequestCountKey);

      // New users default to "free" subscription
      const newUserSessionId = generateSessionId();
      const newUserId = (user._id as any).toString();

      const accessToken = user.generateAccessToken(
        newUserSessionId,
        undefined,
        "free"
      );
      const refreshToken = user.generateRefreshToken(
        newUserSessionId,
        undefined,
        "free"
      );
      if (!refreshToken || !accessToken) {
        throw new ApiError(500, "Failed to generate access or refresh token.");
      }

      // Extract device info from request
      const newUserAgent = req.headers["user-agent"] || "";
      const newIp =
        (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
        req.socket?.remoteAddress ||
        "unknown";

      // Add session to Redis for new user
      await RedisManager.addActiveSession(newUserId, newUserSessionId, {
        device: newUserAgent.substring(0, 100),
        deviceType: req.isMobileApp ? "mobile" : "desktop",
        platform: newUserAgent.includes("Windows")
          ? "windows"
          : newUserAgent.includes("Mac")
          ? "macos"
          : newUserAgent.includes("Linux")
          ? "linux"
          : newUserAgent.includes("Android")
          ? "android"
          : newUserAgent.includes("iPhone")
          ? "ios"
          : "unknown",
        browser: newUserAgent.includes("Chrome")
          ? "chrome"
          : newUserAgent.includes("Firefox")
          ? "firefox"
          : newUserAgent.includes("Safari")
          ? "safari"
          : newUserAgent.includes("Edge")
          ? "edge"
          : "unknown",
        ip: newIp,
      });

      // Create session record for this login (MongoDB) — stores refresh token per-session
      await SessionController.createSession(
        newUserId,
        {
          userAgent: newUserAgent || "unknown",
          ip: newIp,
          customHeaders: {
            platform: req.headers["x-platform"] as string,
            deviceModel: req.headers["x-device-model"] as string,
            deviceBrand: req.headers["x-device-brand"] as string,
            appVersion: req.headers["x-app-version"] as string,
          },
        },
        newUserSessionId,
        refreshToken,
        "otp"
      );

      const response = {
        referenceId: referenceId,
        mobNum: formattedRecipientNumber,
        userId: user._id,
        isAlreadyVerified: false,
        token: accessToken,
        fullName: user.fullName,
      };

      // Handle successful verification
      if (req.isMobileApp) {
        return res
          .status(200)
          .setHeader("x-access-token", accessToken)
          .setHeader("x-refresh-token", refreshToken)
          .json(
            successResponse(
              response,
              "OTP Verified Successfully, User Registered"
            )
          );
      }
      return res
        .status(200)
        .cookie("accessToken", accessToken, Authentication.options)
        .cookie("refreshToken", refreshToken, Authentication.refreshOptions)
        .json(
          successResponse(
            response,
            "OTP Verified Successfully, User Registered"
          )
        );
    } catch (error) {
      console.error("Error updating OTP status:", error);
      if (error instanceof ApiError) throw error;
      throw new ApiError(500, "Something went wrong");
    }
  }
  // Create public wrapped versions
  public static generateOtp = AsyncHandler.wrap(Authentication._generateOtp);
  public static verifyOtp = AsyncHandler.wrap(Authentication._verifyOtp);
}

export default Authentication;
