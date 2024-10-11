import express, { Request, Response } from "express";
import JWT from "jsonwebtoken";
import bcrypt from "bcrypt";
import { ApiError } from "../utils/apiError";
import AsyncHandler from "../utils/AsyncHandler";
import { UserModel } from "../models/userModel";
import { ObjectId } from "mongoose";

class AuthServices {
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

  // static genJWT_Token = AuthServices.generate_JWT_Token;
  static getAccAndRefToken = AuthServices.createAccessAndRefreshToken;
}

export { AuthServices };
