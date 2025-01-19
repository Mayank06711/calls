import express, { Request, Response } from "express";
import { CookieOptions } from "express";
import JWT, { JwtPayload } from "jsonwebtoken";
import bcrypt from "bcrypt";
import { RedisManager } from "../utils/redisClient";
import { ApiError } from "../utils/apiError";
import { UserModel } from "../models/userModel";
import { ObjectId } from "mongoose";
import { successResponse, errorResponse } from "../utils/apiResponse";
import { AsyncHandler } from "../utils/AsyncHandler";

class AuthServices {
  private static options: CookieOptions = {
    httpOnly: true, // Prevents JavaScript access to the cookie
    secure: process.env.NODE_ENV! === "prod", // Ensures the cookie is sent only over HTTPS
    sameSite: "strict", // Prevents the browser from sending this cookie along with cross-site requests
    maxAge: 24 * 60 * 60 * 1000, // 1 day (for access token) - 24 hours * 60 minutes * 60 seconds * 1000 milliseconds
  };

  private static refreshOptions: CookieOptions = {
    httpOnly: true, // Prevents JavaScript access to the cookie
    secure: process.env.NODE_ENV! === "prod", // Ensures the cookie is sent only over HTTPS
    sameSite: "strict", // Prevents the browser from sending this cookie along with cross-site requests
    maxAge: 15 * 24 * 60 * 60 * 1000, // 15 days (for refresh token) - 15 days * 24 hours * 60 minutes * 60 seconds * 1000 milliseconds
  };

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
      const decodedToken = JWT.verify(
        incomingRefreshToken,
        process.env.REFRESH_TOKEN_SECRET!
      ) as JwtPayload;
      console.log(decodedToken, "decodedToken in refreshAccessToken");

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
        throw new ApiError(401, "Refreshe token used before issued time", [
          "Authentication failed",
        ]);
      }

      // Fetch user by the decoded token ID
      const user = await UserModel.findById(decodedToken._id);
      console.log(user, "user in refreshAccessToken");

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
          .json(successResponse({}, "Successfully Refreshed Access Token"));
      }

      return res
        .status(200)
        .cookie("accessToken", accessToken, this.options)
        .cookie("refreshToken", refreshToken, this.refreshOptions)
        .json(successResponse({}, "Successfully Refreshed Access Token"));
    } catch (error) {
      if (error instanceof JWT.TokenExpiredError) {
        throw new ApiError(401, "Refresh token expired, please login again", [
          "Authentication failed",
        ]);
      }
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
      const token = await JWT.sign(payload, secretToken, { expiresIn: expiry });
      return token;
    } catch (e) {
      if (typeof e === "string") {
        throw new ApiError(500, `Token could not be generated: ${e}`);
      } else if (e instanceof Error) {
        throw new ApiError(500, `Token could not be generated: ${e.message}`);
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

      const decoded = JWT.verify(token, secret) as JwtPayload;
      const query =
        type === "refresh"
          ? { _id: decoded._id, refreshToken: token, isActive: true }
          : { _id: decoded._id, isActive: true };

      const user = await UserModel.findOne(query);
      if (!user) return null;
      return {
        userId: user._id,
        phoneNumber: user.phoneNumber,
        username: user.username,
        status: type === "access" ? "authenticated" : "refreshed",
      };
    } catch (error) {
      return null;
    }
  }

  static genJWT_Token = AuthServices.generate_JWT_Token;
  static RefreshAccessToken = AsyncHandler.wrap(
    AuthServices._refreshAccessToken
  );
  static verifyJWT_Token = AuthServices.verifyToken;
}

export { AuthServices };
