import express from "express";
import { Request } from "express";
import { ObjectId } from "mongoose";
declare global {
  namespace Express {
    interface Request {
      user?: {
        _id: ObjectId;
        isAdmin: boolean;
        isExpert:boolean;
        isMFAEnabled: boolean;
        isActive: boolean;
        isBlockedByAdmin:boolean;
      };
      isMobileApp: boolean;
      aiAgent:string;
    }
  }
}
export { newRequest };
