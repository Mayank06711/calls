import express from "express";
import { Request } from "express";
import { ObjectId } from "mongoose";
declare global {
  namespace Express {
    interface Request {
      user?: {
        _id: ObjectId;
        username: string;
        email: string;
        isMFAEnabled: boolean;
        isActive: boolean;
      };
      admin?: {
        _id: ObjectId;
        adminUsername: string;
        isActive: boolean;
      };
    }
  }
}
export { newRequest };
