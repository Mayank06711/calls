import express, { Request, Response } from "express";
import JWT, { JwtPayload } from "jsonwebtoken";
import bcrypt from "bcrypt";
import { ApiError } from "../utils/apiError";
import AsyncHandler from "../utils/AsyncHandler";
import { UserModel } from "../models/userModel";
import { ObjectId } from "mongoose";

class AuthServices {
  static options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production", // Secure cookies in production
  };

  // Method to refresh access token
  static refreshAccessToken = async (req: Request, res: Response) => {
    const incomingRefreshToken =
      req.cookies.refreshToken || req.body.refreshToken;

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
        throw new ApiError(401, "Refresh token is expired or used login again");
      }

      // Generate new access and refresh tokens
      const tokens = await this.createAccessAndRefreshToken(
        user._id as ObjectId
      );
      if (!tokens) {
        throw new ApiError(500, "Failed to generate tokens");
      }

      return res
        .status(200)
        .cookie("accessToken", tokens.accessToken, this.options)
        .cookie("refreshToken", tokens.refreshToken, this.options)
        .json({
          localToken: user.username,
          userID: user._id,
        });
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

  private static createAccessAndRefreshToken = async (userId: ObjectId) => {
    try {
      // Find the user by ID
      const user = await UserModel.findById(userId);

      // If user is found, generate access and refresh tokens
      if (user) {
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        // Assign refresh token to user and save
        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });

        // Return the generated tokens
        return { accessToken, refreshToken };
      } else {
        // If no user found, return null (or handle the case accordingly)
        return null;
      }
    } catch (error) {
      // Throw an error if there's an issue generating tokens
      throw new ApiError(
        500,
        "Something went wrong, Error creating access and refresh token"
      );
    }
  };

  static genJWT_Token = AuthServices.generate_JWT_Token;
  static getAccAndRefToken = AuthServices.createAccessAndRefreshToken;
}

export { AuthServices };
