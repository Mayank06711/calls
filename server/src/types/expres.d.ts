import express from "express";
import { Request } from "express";
import { ObjectId } from "mongoose";
declare global {
  namespace Express {
    interface Request {
      admin?: {
        _id: ObjectId;
        position: string;
        isActive: boolean;
      };
      user?: {
        _id: ObjectId;
        isAdmin: boolean;
        isExpert: boolean;
        isMFAEnabled: boolean;
        isActive: boolean;
        isBlockedByAdmin: boolean;
        sessionId?: string;
        subscriptionId?: string;
        subscriptionType?: string;
      };
      isMobileApp: boolean;
      aiAgent:string;
    }
  }
}
export { newRequest };
