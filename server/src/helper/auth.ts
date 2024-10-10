import express, { Request, Response } from "express";
import JWT from "jsonwebtoken";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { ApiError } from "../utils/apiError";
import AsyncHandler from "../utils/AsyncHandler";

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
        throw new ApiError(500, `Token could not be generated due to an unknown error.`);
      }
    }
  }

  static genJWT_Token = AuthServices.generate_JWT_Token;
}

export { AuthServices };
