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
import { sendEmails } from "../utils/email";
import {
  handleExistingUserAuth,
  handleNewUserAuth,
} from "../helper/postAuthFlow";
import { OAuth2Client } from "google-auth-library";
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
    const { referenceId, mobNum, otp, verifyOnly } = req.body;

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
      // OTP consume callback — called by shared helper after session limit check passes
      const otpConsumeFn = async () => {
        await RedisManager.removeDataFromGroup("otp_data", otpKey);
        await RedisManager.removeDataFromGroup("otp_requests", otpRequestCountKey);
      };

      // ─── verifyOnly: link phone to authenticated user, no login flow ───
      if (verifyOnly) {
        // Extract JWT from cookies/headers to identify the authenticated user
        const authHeader = req.header("Authorization");
        const accessToken = authHeader?.replace("Bearer ", "") || req.cookies?.accessToken;
        if (!accessToken) {
          return res.status(401).json(errorResponse(401, "Authentication required for phone verification"));
        }
        const tokenResult = await AuthServices.verifyJWT_Token(accessToken, "access");
        if (!tokenResult.data?.userId) {
          return res.status(401).json(errorResponse(401, "Invalid or expired session. Please login again."));
        }

        // Check if another user already owns this phone number
        const existingOwner = await UserModel.findOne({ phoneNumber: formattedRecipientNumber, _id: { $ne: tokenResult.data.userId } });
        if (existingOwner) {
          return res.status(409).json(errorResponse(409, "This phone number is already linked to another account."));
        }

        // Update the authenticated user's phone
        await UserModel.findByIdAndUpdate(tokenResult.data.userId, {
          phoneNumber: formattedRecipientNumber,
          isPhoneVerified: true,
        });
        await otpConsumeFn();
        return res.status(200).json(successResponse({ verified: true }, "Phone number verified successfully"));
      }

      let user = await UserModel.findOne({
        phoneNumber: formattedRecipientNumber,
      }).populate("currentSubscriptionId");
      if(user?.isBlockedByAdmin){
        // Don't consume OTP — let it expire via TTL so retries
        // still show "blocked" instead of confusing "Invalid OTP"
        return res
          .status(403)
          .json(errorResponse(403, "Your account has been blocked by admin. Contact support for help."));
      }
      if (user && user.isPhoneVerified && user.isActive) {
        // Existing verified user — shared post-auth flow handles session limits, tokens, sessions
        await handleExistingUserAuth({
          user,
          req,
          res,
          loginMethod: "otp",
          isNewUser: false,
          responseExtras: { referenceId, mobNum: formattedRecipientNumber },
          onOtpConsume: otpConsumeFn,
        });
        return;
      }

      // New user or unverified user — create account
      if (!user) {
        user = await UserModel.create({
          phoneNumber: formattedRecipientNumber,
          username: `user_${uuidv4().split("-")[0]}`,
          password: formattedRecipientNumber,
          isPhoneVerified: true,
          refreshToken: "",
          isActive: true,
          fullName: `User_${formattedRecipientNumber.slice(-4)}`,
          authProvider: "phone",
        });

        if (!user) {
          throw new ApiError(500, "Something went wrong during user creation.");
        }
      } else {
        user.isPhoneVerified = true;
        user.isActive = true;
        await user.save();
      }

      // Consume OTP for new/unverified user
      await otpConsumeFn();

      // New user — shared post-auth flow (no session limit check needed)
      await handleNewUserAuth({
        user,
        req,
        res,
        loginMethod: "otp",
        isNewUser: true,
        responseExtras: { referenceId, mobNum: formattedRecipientNumber },
      });
    } catch (error) {
      console.error("Error updating OTP status:", error);
      if (error instanceof ApiError) throw error;
      throw new ApiError(500, "Something went wrong");
    }
  }
  // ─── Email OTP: Generate ──────────────────────────────────────────────────

  private static async _generateEmailOtp(req: Request, res: Response) {
    const { email, isTesting } = req.body;

    if (typeof isTesting !== "boolean") {
      throw new ApiError(400, "isTesting must be a boolean");
    }
    if (!email) {
      throw new ApiError(400, "Email is required.");
    }

    const normalizedEmail = email.trim().toLowerCase();

    try {
      // Rate limit check (same Redis pattern as phone OTP, keyed by email)
      const otpRequestCountKey = `otp_count:${normalizedEmail}`;
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

      if (requestData) {
        const { count, expiry_at } = requestData;
        if (Date.now() > expiry_at) {
          await RedisManager.cacheDataInGroup(
            "otp_requests",
            otpRequestCountKey,
            {
              count: 1,
              expiry_at:
                Date.now() +
                Authentication.REDIS_TTL.OTP_WINDOW_MINUTES * 60 * 1000,
            },
            Authentication.REDIS_TTL.OTP_REQUESTS
          );
        } else if (count >= Authentication.REDIS_TTL.OTP_MAX_ATTEMPTS) {
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
        await RedisManager.cacheDataInGroup(
          "otp_requests",
          otpRequestCountKey,
          {
            count: 1,
            expiry_at:
              Date.now() +
              Authentication.REDIS_TTL.OTP_WINDOW_MINUTES * 60 * 1000,
          },
          Authentication.REDIS_TTL.OTP_REQUESTS
        );
      }

      // Generate OTP and reference ID
      const { otp, referenceId } = Authentication.generateOtpAndReferenceId();

      // Send OTP via email (not SMS)
      if (!isTesting) {
        await sendEmails({
          email: normalizedEmail,
          templateCode: "EMAIL_OTP",
          subject: "Your KYF Login Code",
          data: { otp_code: otp, expiryAt: "10" },
        });
      }

      // Store OTP in Redis (keyed by email)
      const otpKey = `otp:${normalizedEmail}`;
      await RedisManager.cacheDataInGroup(
        "otp_data",
        otpKey,
        {
          otp,
          reference_id: referenceId,
          expiry_at:
            Date.now() +
            Authentication.REDIS_TTL.OTP_WINDOW_MINUTES * 60 * 1000,
        },
        Authentication.REDIS_TTL.OTP_DATA
      );

      // Increment OTP request count
      const updatedRequestCount = (requestData?.count || 0) + 1;
      await RedisManager.cacheDataInGroup(
        "otp_requests",
        otpRequestCountKey,
        {
          count: updatedRequestCount,
          expiry_at:
            Date.now() +
            Authentication.REDIS_TTL.OTP_WINDOW_MINUTES * 60 * 1000,
        },
        Authentication.REDIS_TTL.OTP_REQUESTS
      );

      return res.status(200).json(
        successResponse(
          {
            reference_id: referenceId,
            email: normalizedEmail,
          },
          `OTP has been sent to ${normalizedEmail}`
        )
      );
    } catch (error) {
      console.log("error in generate email otp", error);
      if (error instanceof ApiError) throw error;
      throw new ApiError(500, "Something went wrong");
    }
  }

  // ─── Email OTP: Verify ──────────────────────────────────────────────────

  private static async _verifyEmailOtp(req: Request, res: Response) {
    const { referenceId, email, otp, verifyOnly } = req.body;

    if (!referenceId || !email || !otp) {
      return res
        .status(400)
        .json(
          errorResponse(400, "Missing required parameters for verification")
        );
    }

    const normalizedEmail = email.trim().toLowerCase();

    try {
      const otpKey = `otp:${normalizedEmail}`;
      const otpRequestCountKey = `otp_count:${normalizedEmail}`;
      const otpData = await RedisManager.getDataFromGroup<{
        otp: string;
        reference_id: string;
        expiry_at: number;
      }>("otp_data", otpKey);

      if (!otpData) {
        return res
          .status(401)
          .json(errorResponse(401, "OTP verification failed. Invalid OTP"));
      }

      if (Date.now() > otpData.expiry_at) {
        await RedisManager.removeDataFromGroup("otp_data", otpKey);
        return res
          .status(401)
          .json(
            errorResponse(401, "OTP verification failed. OTP has expired.")
          );
      }

      if (otpData.otp !== otp || otpData.reference_id !== referenceId) {
        return res
          .status(401)
          .json(errorResponse(401, "OTP verification failed. Invalid OTP."));
      }

      // OTP consume callback
      const otpConsumeFn = async () => {
        await RedisManager.removeDataFromGroup("otp_data", otpKey);
        await RedisManager.removeDataFromGroup("otp_requests", otpRequestCountKey);
      };

      // ─── verifyOnly: link email to authenticated user, no login flow ───
      if (verifyOnly) {
        const authHeader = req.header("Authorization");
        const accessToken = authHeader?.replace("Bearer ", "") || req.cookies?.accessToken;
        if (!accessToken) {
          return res.status(401).json(errorResponse(401, "Authentication required for email verification"));
        }
        const tokenResult = await AuthServices.verifyJWT_Token(accessToken, "access");
        if (!tokenResult.data?.userId) {
          return res.status(401).json(errorResponse(401, "Invalid or expired session. Please login again."));
        }

        // Check if another user already owns this email
        const existingOwner = await UserModel.findOne({ email: normalizedEmail, _id: { $ne: tokenResult.data.userId } });
        if (existingOwner) {
          return res.status(409).json(errorResponse(409, "This email is already linked to another account."));
        }

        // Update the authenticated user's email
        await UserModel.findByIdAndUpdate(tokenResult.data.userId, {
          email: normalizedEmail,
          isEmailVerified: true,
        });
        await otpConsumeFn();
        return res.status(200).json(successResponse({ verified: true }, "Email verified successfully"));
      }

      // Look up user by email
      let user = await UserModel.findOne({
        email: normalizedEmail,
      }).populate("currentSubscriptionId");

      if (user && user.isEmailVerified && user.isActive) {
        // Existing verified user
        await handleExistingUserAuth({
          user,
          req,
          res,
          loginMethod: "email_otp",
          isNewUser: false,
          responseExtras: { email: normalizedEmail, referenceId },
          onOtpConsume: otpConsumeFn,
        });
        return;
      }

      if (!user) {
        // Create new user with email (no phone number)
        user = await UserModel.create({
          email: normalizedEmail,
          username: `user_${uuidv4().split("-")[0]}`,
          password: uuidv4(), // Random password, auto-hashed by pre-save hook
          isEmailVerified: true,
          isActive: true,
          fullName: `User_${normalizedEmail.split("@")[0]}`,
          authProvider: "email",
        });

        if (!user) {
          throw new ApiError(500, "Something went wrong during user creation.");
        }
      } else {
        // User exists but email not verified — verify now
        user.isEmailVerified = true;
        user.isActive = true;
        await user.save();
      }

      // Consume OTP for new/unverified user
      await otpConsumeFn();

      await handleNewUserAuth({
        user,
        req,
        res,
        loginMethod: "email_otp",
        isNewUser: true,
        responseExtras: { email: normalizedEmail, referenceId },
      });
    } catch (error) {
      console.error("Error verifying email OTP:", error);
      if (error instanceof ApiError) throw error;
      throw new ApiError(500, "Something went wrong");
    }
  }

  // ─── Google OAuth ───────────────────────────────────────────────────────

  private static googleClient: OAuth2Client | null = null;

  private static getGoogleClient(): OAuth2Client {
    if (!Authentication.googleClient) {
      Authentication.googleClient = new OAuth2Client(
        process.env.GOOGLE_CLIENT_ID
      );
    }
    return Authentication.googleClient;
  }

  private static async _googleAuth(req: Request, res: Response) {
    const { idToken } = req.body;

    if (!idToken) {
      throw new ApiError(400, "Google ID token is required");
    }

    // Verify the Google ID token
    const client = Authentication.getGoogleClient();
    let ticket;
    try {
      ticket = await client.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
    } catch (error) {
      console.error("Google token verification failed:", error);
      throw new ApiError(401, "Invalid Google token");
    }

    const payload = ticket.getPayload();
    if (!payload || !payload.sub || !payload.email) {
      throw new ApiError(401, "Invalid Google token payload");
    }

    const {
      sub: googleId,
      email,
      name,
      email_verified,
    } = payload;
    const normalizedEmail = email.toLowerCase();

    try {
      // Account linking logic:
      // 1. Find by googleId first (returning Google user)
      let user = await UserModel.findOne({ googleId }).populate(
        "currentSubscriptionId"
      );

      if (!user) {
        // 2. Find by verified email (link Google to existing account)
        user = await UserModel.findOne({
          email: normalizedEmail,
          isActive: true,
        }).populate("currentSubscriptionId");

        if (user) {
          // Link Google account to existing user
          user.googleId = googleId;
          if (!user.isEmailVerified && email_verified) {
            user.isEmailVerified = true;
          }
          if (user.authProvider && user.authProvider !== "google") {
            user.authProvider = "multiple";
          }
          await user.save();
        }
      }

      if (user?.isBlockedByAdmin) {
        return res
          .status(403)
          .json(errorResponse(403, "Your account has been blocked by admin. Contact support for help."));
      }

      if (user && user.isActive) {
        // Existing user — shared post-auth flow
        await handleExistingUserAuth({
          user,
          req,
          res,
          loginMethod: "social",
          isNewUser: false,
          responseExtras: { email: normalizedEmail, googleId },
        });
        return;
      }

      // 3. No existing user — create new one
      user = await UserModel.create({
        googleId,
        email: normalizedEmail,
        isEmailVerified: email_verified || false,
        username: `user_${uuidv4().split("-")[0]}`,
        password: uuidv4(), // Random password, auto-hashed
        fullName: name || `User_${normalizedEmail.split("@")[0]}`,
        isActive: true,
        authProvider: "google",
      });

      if (!user) {
        throw new ApiError(500, "Something went wrong during user creation.");
      }

      await handleNewUserAuth({
        user,
        req,
        res,
        loginMethod: "social",
        isNewUser: true,
        responseExtras: { email: normalizedEmail, googleId },
      });
    } catch (error) {
      console.error("Error in Google auth:", error);
      if (error instanceof ApiError) throw error;
      throw new ApiError(500, "Something went wrong");
    }
  }

  // ─── Public wrapped versions ────────────────────────────────────────────
  public static generateOtp = AsyncHandler.wrap(Authentication._generateOtp);
  public static verifyOtp = AsyncHandler.wrap(Authentication._verifyOtp);
  public static generateEmailOtp = AsyncHandler.wrap(Authentication._generateEmailOtp);
  public static verifyEmailOtp = AsyncHandler.wrap(Authentication._verifyEmailOtp);
  public static googleAuth = AsyncHandler.wrap(Authentication._googleAuth);
}

export default Authentication;
