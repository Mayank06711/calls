import { Request, Response } from "express";
import { UserSettingsModel } from "../models/userSettingsModel";
import { AsyncHandler } from "../utils/AsyncHandler";
import { ApiError } from "../utils/apiError";
import { executeModelOperation } from "../utils/mongoUtils";
import { sanitizeData } from "../helper/sanitizeData";
import { sendCachedResponse, successResponse } from "../utils/apiResponse";
import { IUserSettings } from "../interface/IUserSettings";

class UserSettings {
  private static async _initializeSettings(req: Request, res: Response) {
    try {
      const userId = req.user?._id;
      if (!userId) {
        throw new ApiError(401, "Unauthorized access");
      }

      // Check if settings already exist
      let settings = await executeModelOperation(
        UserSettingsModel,
        "findOne",
        { queryOptions: { lean: true } },
        null,
        { userId }
      );

      if (!settings) {
        // Create default settings without any request body data
        settings = await executeModelOperation(
          UserSettingsModel,
          "create",
          {},
          { userId }
        );
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

      res.status(200).json(
        successResponse(
          sanitizedSettings,
          "User settings initialized successfully"
        )
      );
    } catch (error: any) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        500,
        "Internal Server Error: Unable to initialize user settings"
      );
    }
  }

  private static async _getSettings(req: Request, res: Response) {
    try {
      let userId = req.user?._id;
      // let userId = new mongoose.Types.ObjectId("67a13aaf1671cc9fde7fce16");
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
          maxAge: 4 * 3600, // 4 hours
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

  private static async _updateSpecificSettings(
    req: Request,
    res: Response,
    settingType: keyof IUserSettings
  ) {
    try {
      const userId = req.user?._id;
      if (!userId) {
        throw new ApiError(401, "Unauthorized access");
      }

      const updateData = { [settingType]: req.body };
      const settings = await executeModelOperation(
        UserSettingsModel,
        "findOneAndUpdate",
        { queryOptions: { lean: true } },
        updateData,
        { userId }
      );

      if (!settings) {
        throw new ApiError(404, "Settings not found");
      }

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

      res.status(200).json(
        successResponse(
          sanitizedSettings,
          `${settingType} settings updated successfully`
        )
      );
    } catch (error: any) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        500,
        `Internal Server Error: Unable to update ${settingType} settings`
      );
    }
  }

  // Specific settings update handlers
  private static async _updateThemeSettings(req: Request, res: Response) {
    return UserSettings._updateSpecificSettings(req, res, "theme");
  }

  private static async _updateNotificationSettings(req: Request, res: Response) {
    return UserSettings._updateSpecificSettings(req, res, "notifications");
  }

  private static async _updatePrivacySettings(req: Request, res: Response) {
    return UserSettings._updateSpecificSettings(req, res, "privacy");
  }

  private static async _updatePreferenceSettings(req: Request, res: Response) {
    return UserSettings._updateSpecificSettings(req, res, "preferences");
  }

  private static async _updateLayoutSettings(req: Request, res: Response) {
    return UserSettings._updateSpecificSettings(req, res, "layout");
  }

  private static async _updateAccessibilitySettings(req: Request, res: Response) {
    return UserSettings._updateSpecificSettings(req, res, "accessibility");
  }

  // Public methods wrapped with AsyncHandler
  public static initializeSettings = AsyncHandler.wrap(
    UserSettings._initializeSettings
  );
  public static getSettings = AsyncHandler.wrap(UserSettings._getSettings);
  public static updateThemeSettings = AsyncHandler.wrap(
    UserSettings._updateThemeSettings
  );
  public static updateNotificationSettings = AsyncHandler.wrap(
    UserSettings._updateNotificationSettings
  );
  public static updatePrivacySettings = AsyncHandler.wrap(
    UserSettings._updatePrivacySettings
  );
  public static updatePreferenceSettings = AsyncHandler.wrap(
    UserSettings._updatePreferenceSettings
  );
  public static updateLayoutSettings = AsyncHandler.wrap(
    UserSettings._updateLayoutSettings
  );
  public static updateAccessibilitySettings = AsyncHandler.wrap(
    UserSettings._updateAccessibilitySettings
  );
  
  public static updateSettings = AsyncHandler.wrap(
    UserSettings._updateSettings
  );
}

export { UserSettings };
