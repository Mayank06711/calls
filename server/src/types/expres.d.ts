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
      };
      isMobileApp: boolean;
    }
  }
}
export { newRequest };
