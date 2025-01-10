import express, { Request, Response } from "express";
import { CookieOptions } from "express";
import JWT, { JwtPayload } from "jsonwebtoken";
import bcrypt from "bcrypt";
import { RedisManager } from "../utils/redisClient";
import { ApiError } from "../utils/apiError";
import { UserModel } from "../models/userModel";
import { ObjectId } from "mongoose";
import { successResponse, errorResponse } from "../utils/apiResponse";

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
  static refreshAccessToken = async (req: Request, res: Response) => {
    let incomingRefreshToken = req.cookies?.refreshToken;

    // If src is "div", try to get refreshToken from Authorization header
    if (req.body.src === "div") {
      const authHeader = req.header("Authorization");

      // Check if the Authorization header is in the expected format
      if (authHeader && authHeader.startsWith("Bearer ")) {
        incomingRefreshToken = authHeader.split(" ")[1];
      }
    } else {
      incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;
    }

    console.log(
      incomingRefreshToken,
      "incomingRefreshToken in refreshAccessToken"
    );

    if (!incomingRefreshToken) {
      throw new ApiError(401, "Unauthorized Access");
    }

    try {
      // Verify the incoming refresh token with the secret
      const decodedToken = JWT.verify(
        incomingRefreshToken,
        process.env.REFRESH_TOKEN_SECRET!
      ) as JwtPayload;
      console.log(decodedToken, "decodedToken in refreshAccessToken");

      // Fetch user by the decoded token ID
      const user = await UserModel.findById(decodedToken._id);
      console.log(user, "user in refreshAccessToken");

      if (!user) {
        throw new ApiError(401, "Invalid refresh token");
      }

      // Ensure the incoming refresh token matches the one stored in the user's document
      if (incomingRefreshToken !== user.refreshToken) {
        throw new ApiError(401, "Refresh token is expired login again");
      }

      // Generate new access and refresh tokens
      const tokens = await this.createAccessAndRefreshToken(
        user._id as ObjectId
      );
      if (!tokens) {
        throw new ApiError(500, "Failed to generate tokens");
      }

      user.refreshToken = tokens.refreshToken;
      await user.save();

      await RedisManager.publishMessage(process.env.REDIS_CHANNEL!, {
        userId: user._id,
        status: "refreshed",
        mobNum: user.phoneNumber,
      });

      if (req.body.src === "div") {
        return res
          .status(200)
          .setHeader("x-access-token", tokens.accessToken)
          .setHeader("x-refresh-token", tokens.refreshToken)
          .json(successResponse({}, "Successfully Refreshed Access Token"));
      }

      return res
        .status(200)
        .cookie("accessToken", tokens.accessToken, this.options)
        .cookie("refreshToken", tokens.refreshToken, this.refreshOptions)
        .json(successResponse({}, "OTP Verified Successfully"));
    } catch (error: any) {
      throw new ApiError(401, error?.message || "Invalid refresh token");
    }
  };

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

  private static createAccessAndRefreshToken = async (userId: any) => {
    try {
      // Find the user by ID
      const user = await UserModel.findById(userId);
      if (!user) {
        throw new ApiError(404, "User not found");
      }
      // If user is found, generate access and refresh tokens
      const accessToken = user.generateAccessToken();
      const refreshToken = user.generateRefreshToken();

      // Assign refresh token to user and save
      user.refreshToken = refreshToken;
      await user.save({ validateBeforeSave: false });

      // Return the generated tokens
      return { accessToken, refreshToken };
    } catch (error) {
      console.error("Token generation error:", error);
      // Throw an error if there's an issue generating tokens
      throw new ApiError(
        500,
        error instanceof Error
          ? `Error creating tokens: ${error.message}`
          : "Something went wrong while creating tokens"
      );
    }
  };

  static genJWT_Token = AuthServices.generate_JWT_Token;
  static getAccAndRefToken = AuthServices.createAccessAndRefreshToken;
}

export { AuthServices };
