import { Request, Response } from "express";
import { UserSettingsModel } from "../models/userSettingsModel";
import { AsyncHandler } from "../utils/AsyncHandler";
import { ApiError } from "../utils/apiError";
import { executeModelOperation } from "../utils/mongoUtils";
import { sanitizeData } from "../helper/sanitizeData";
import mongoose from "mongoose";
import { sendCachedResponse, successResponse } from "../utils/apiResponse";

class UserSettings {
  private static async _createSettings(req: Request, res: Response) {
    try {
      const userId = req.user?._id;

      if (!userId) {
        throw new ApiError(401, "Unauthorized access");
      }

      // Check if settings already exist
      const existingSettings = await executeModelOperation(
        UserSettingsModel,
        "findOne",
        { queryOptions: { lean: true } },
        null,
        { userId }
      );

      if (existingSettings) {
        throw new ApiError(400, "Settings already exist for this user");
      }

      // Create new settings
      const settings = await executeModelOperation(
        UserSettingsModel,
        "create",
        {},
        { userId, ...req.body }
      );

      // Sanitize the response
      const sanitizedSettings = sanitizeData(settings.toObject(), {
        exclude: ["__v"],
        deep: {
          lastLoginInfo: {
            mask: {
              ip: { type: "custom", customMask: (ip) => "***.***.***.**" },
            },
          },
        },
      });

      res.status(201).json({
        success: true,
        message: "User settings created successfully",
        data: sanitizedSettings,
      });
    } catch (error: any) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        500,
        "Internal Server Error: Unable to save user settings"
      );
    }
  }

  private static async _getSettings(req: Request, res: Response) {
    try {
      //   let userId = req.user?._id;
      let userId = new mongoose.Types.ObjectId("67a13aaf1671cc9fde7fce16");
      if (!userId) {
        throw new ApiError(401, "Unauthorized access");
      }

      const settings = await executeModelOperation(
        UserSettingsModel,
        "findOne",
        { queryOptions: { lean: true } },
        null,
        { userId }
      );

      if (!settings) {
        throw new ApiError(404, "Settings not found");
      }

      // Sanitize the response
      const sanitizedSettings = sanitizeData(settings, {
        exclude: ["__v"],
        deep: {
          lastLoginInfo: {
            mask: {
              ip: { type: "custom", customMask: (ip) => "***.***.***.**" },
            },
          },
        },
      });
      return sendCachedResponse(
        req,
        res,
        sanitizedSettings,
        "Fetched settings successfully",
        200,
        {
          isPublic: true,
          maxAge: 7200, // 2 hours
        }
      );
    } catch (error: any) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        500,
        "Internal Server Error: Unable to retrieve user settings"
      );
    }
  }

  private static async _updateSettings(req: Request, res: Response) {
    try {
      const userId = req.user?._id;
      if (!userId) {
        throw new ApiError(401, "Unauthorized access");
      }

      const settings = await executeModelOperation(
        UserSettingsModel,
        "findOneAndUpdate",
        { queryOptions: { lean: true } },
        req.body,
        { userId }
      );

      if (!settings) {
        throw new ApiError(404, "Settings not found");
      }

      // Sanitize the response
      const sanitizedSettings = sanitizeData(settings, {
        exclude: ["__v"],
        deep: {
          lastLoginInfo: {
            mask: {
              ip: { type: "custom", customMask: (ip) => "***.***.***.**" },
            },
          },
        },
      });

      res.status(200).json({
        success: true,
        message: "Settings updated successfully",
        data: sanitizedSettings,
      });
    } catch (error: any) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        500,
        "Internal Server Error: Unable to update user settings"
      );
    }
  }

  public static createSettings = AsyncHandler.wrap(
    UserSettings._createSettings
  );
  public static getSettings = AsyncHandler.wrap(UserSettings._getSettings);
  public static updateSettings = AsyncHandler.wrap(
    UserSettings._updateSettings
  );
}

export { UserSettings };
