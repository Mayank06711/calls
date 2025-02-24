import express, { Request, Response } from "express";
import { CookieOptions } from "express";
import JWT, { JwtPayload } from "jsonwebtoken";
import crypto from "crypto";
import { RedisManager } from "../utils/redisClient";
import { ApiError } from "../utils/apiError";
import { UserModel } from "../models/userModel";
import { successResponse } from "../utils/apiResponse";
import { AsyncHandler } from "../utils/AsyncHandler";

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
      salt,
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
      key,
      iv
    );

    const encrypted = Buffer.concat([
      cipher.update(text, "utf8"),
      cipher.final(),
    ]);

    const tag = cipher.getAuthTag();

    // Combine all components: salt + iv + tag + encrypted
    const result = Buffer.concat([salt, iv, tag, encrypted]);

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
      key,
      iv
    );
    decipher.setAuthTag(tag);

    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
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

      // Ensure the incoming refresh token matches the one stored in the user's document
      if (incomingRefreshToken !== user.refreshToken) {
        throw new ApiError(401, "Refresh token is expired login again");
      }

      // Generate new access and refresh tokens
      const accessToken = user.generateAccessToken();
      const refreshToken = user.generateRefreshToken();
      user.refreshToken = refreshToken;
      await user.save({ validateBeforeSave: false });

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
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(401, "Invalid refresh token", [
        "Authentication failed",
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
        return null;
      }

      // Verify standard claims
      if (
        decodedToken.iss !== "KYF" ||
        decodedToken.aud !== "kyf-api" ||
        (decodedToken.iat && decodedToken.iat > now)
      ) {
        return null;
      }

      const query =
        type === "refresh"
          ? { _id: decodedToken._id, refreshToken: token, isActive: true }
          : { _id: decodedToken._id, isActive: true };

      const user = await UserModel.findOne(query);
      if (!user) return null;
      return {
        userId: user._id,
        phoneNumber: user.phoneNumber,
        username: user.username,
        status: type === "access" ? "authenticated" : "refreshed",
        tokenExpiry: decodedToken.exp,
      };
    } catch (error) {
      return null;
    }
  }

  public static async verifyAndForwardToAI(req: Request, res: Response) {
    try {
      const userId = req.user?._id;
      if (!userId) {
        throw new ApiError(401, "No user Id found, try login again");
      }

      // Generate a timestamp in milliseconds
      const timestamp = Date.now().toString();

      // Create signature with consistent encoding
      const signaturePayload = `${userId}-${timestamp}`;
      const signature = crypto
        .createHmac("sha256", process.env.AI_SERVICE_SECRET!)
        .update(signaturePayload)
        .digest("hex");

      // Add timeout and error handling for fetch
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 60000); // 60 second timeout

      try {
        const aiServiceResponse = await fetch(
          `${process.env.AI_SERVICE_URL}/process`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-KYF-Timestamp": timestamp,
              "X-KYF-Signature": signature,
              "X-KYF-User-ID": userId.toString(),
            },
            body: JSON.stringify({
              payload: req.body,
            }),
            signal: controller.signal,
          }
        );

        if (!aiServiceResponse.ok) {
          const errorData = await aiServiceResponse.json().catch(() => ({}));
          throw new ApiError(
            aiServiceResponse.status,
            errorData.message || "AI Service Processing Failed",
            errorData.errors
          );
        }

        const aiData = await aiServiceResponse.json();
        return res
          .status(200)
          .json(successResponse(aiData, "AI Processing Complete"));
      } finally {
        clearTimeout(timeout);
      }
    } catch (error: any) {
      if (error instanceof ApiError) throw error;
      if (error.name === "AbortError") {
        throw new ApiError(504, "AI Service Timeout");
      }
      throw new ApiError(500, "AI Service Processing Failed");
    }
  }

  static genJWT_Token = AuthServices.generate_JWT_Token;
  static RefreshAccessToken = AsyncHandler.wrap(
    AuthServices._refreshAccessToken
  );
  static verifyJWT_Token = AuthServices.verifyToken;
}

export { AuthServices };
