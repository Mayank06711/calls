import { Request, Response } from "express";
import { UserSettingsModel } from "../models/userSettingsModel";
import { AsyncHandler } from "../utils/AsyncHandler";
import { ApiError } from "../utils/apiError";
import { executeModelOperation } from "../utils/mongoUtils";
import { sanitizeData } from "../helper/sanitizeData";
import { sendCachedResponse, successResponse } from "../utils/apiResponse";
import { IUserSettings } from "../interface/IUserSettings";
import { UserModel } from "../models/userModel";
import { 
  getAllStyleOptions, 
  hasStyleAccess, 
  STYLE_ALLOWED_SUBSCRIPTIONS,
  getFontSizeCssValue 
} from "../helper/styleConstants";
import { ISubscription } from "../interface/ISubscription";

// Helper to check if subscription is populated
const isSubscriptionPopulated = (sub: any): sub is ISubscription => {
  return sub && typeof sub === 'object' && 'type' in sub;
};

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
        ).then(doc=>doc.toObject());
      }

      // Sanitize the response
      const sanitizedSettings = sanitizeData(settings, {
        exclude: ["__v","$__", "_doc","$isNew"],
        deep: {
          lastLoginInfo: {
            mask: {
              ip: { type: "custom", customMask: (ip) => "***.***.***.**" },
            },
          },
        },
      });

      res
        .status(200)
        .json(
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

      // Debug logging for fetch
      console.log('\\n========== SETTINGS FETCH ==========');
      console.log('User ID:', userId);
      console.log('Accessibility Settings from DB:', JSON.stringify(settings?.accessibility, null, 2));
      console.log('==========================================\\n');

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

      // Debug logging
      console.log('\n========== SETTINGS UPDATE ==========');
      console.log('Setting Type:', settingType);
      console.log('User ID:', userId);
      console.log('Request Body:', JSON.stringify(req.body, null, 2));

      const updateData = { [settingType]: req.body };
      console.log('Update Data:', JSON.stringify(updateData, null, 2));

      const settings = await executeModelOperation(
        UserSettingsModel,
        "findOneAndUpdate",
        { queryOptions: { lean: true } },
        updateData,
        { userId }
      );

      console.log('Updated Settings (accessibility):', JSON.stringify(settings?.accessibility, null, 2));
      console.log('==========================================\n');

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

      // Invalidate cache after update so next fetch gets fresh data
      res
        .status(200)
        .set({
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        })
        .json(
          successResponse(
            sanitizedSettings,
            `${settingType} settings updated successfully`
          )
        );
    } catch (error: any) {
      console.error(`Error updating ${settingType} settings:`, error);
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
    // Check if user is trying to update premium style features (fontSize, customFonts)
    const { fontSize, customFonts } = req.body;
    if (fontSize || customFonts) {
      const hasAccess = await UserSettings._checkStyleAccess(req);
      if (!hasAccess) {
        throw new ApiError(403, "Style customization requires Gold or Platinum subscription");
      }
    }
    return UserSettings._updateSpecificSettings(req, res, "theme");
  }

  private static async _updateNotificationSettings(
    req: Request,
    res: Response
  ) {
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

  private static async _updateAccessibilitySettings(
    req: Request,
    res: Response
  ) {
    // Check if user is trying to update premium style features (fontSize, fontFamily, textSpacing)
    const { fontSize, fontFamily, textSpacing } = req.body;
    if (fontSize !== undefined || fontFamily !== undefined || textSpacing !== undefined) {
      const hasAccess = await UserSettings._checkStyleAccess(req);
      if (!hasAccess) {
        throw new ApiError(403, "Style customization requires Gold or Platinum subscription");
      }
    }
    return UserSettings._updateSpecificSettings(req, res, "accessibility");
  }

  // Helper method to check if user has style customization access
  private static async _checkStyleAccess(req: Request): Promise<boolean> {
    const userId = req.user?._id;
    if (!userId) return false;

    const user = await UserModel.findById(userId)
      .populate('currentSubscriptionId')
      .select('currentSubscriptionId isSubscribed');

    if (!user || !user.isSubscribed) return false;

    const subscriptionType = isSubscriptionPopulated(user.currentSubscriptionId)
      ? user.currentSubscriptionId.type
      : null;

    return hasStyleAccess(subscriptionType || undefined);
  }

  // Get available style options based on subscription
  private static async _getStyleOptions(req: Request, res: Response) {
    try {
      const userId = req.user?._id;
      if (!userId) {
        throw new ApiError(401, "Unauthorized access");
      }

      // Check user's subscription
      const user = await UserModel.findById(userId)
        .populate('currentSubscriptionId')
        .select('currentSubscriptionId isSubscribed');

      const subscriptionType = isSubscriptionPopulated(user?.currentSubscriptionId)
        ? user.currentSubscriptionId.type
        : 'Free';

      const hasAccess = hasStyleAccess(subscriptionType);

      // Return style options with access status
      const response = {
        hasAccess,
        subscriptionType,
        requiredSubscriptions: STYLE_ALLOWED_SUBSCRIPTIONS,
        options: hasAccess ? getAllStyleOptions() : null,
        message: hasAccess 
          ? "Style customization available" 
          : "Upgrade to Gold or Platinum to unlock style customization"
      };

      res.status(200).json(successResponse(response, "Style options fetched successfully"));
    } catch (error: any) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, "Internal Server Error: Unable to fetch style options");
    }
  }

  // Public methods wrapped with AsyncHandler
  public static initializeSettings = AsyncHandler.wrap(
    UserSettings._initializeSettings
  );
  public static getSettings = AsyncHandler.wrap(UserSettings._getSettings);
  public static getStyleOptions = AsyncHandler.wrap(UserSettings._getStyleOptions);
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
}

export { UserSettings };
