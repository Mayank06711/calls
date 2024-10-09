import express from "express";
import { Request } from "express";
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        username: string;
        email: string;
        isMFAEnabled: boolean;
        isActive: boolean;
      };
      admin?: {
        id: string;
        username: string;
        isActive: boolean;
      };
    }
  }
}
export {newRequest}
