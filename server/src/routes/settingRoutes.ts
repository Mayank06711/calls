import { Router } from "express";
import { Middleware } from "../middlewares/middlewares";
import { UserSettings } from "../controllers/settingController";
const router = Router();

// Settings routes with JWT verification
router.use(Middleware.VerifyJWT);

// Initialize and fetch settings
router.post("/initialize", UserSettings.initializeSettings);
router.get("/fetch", UserSettings.getSettings);

// Style options (returns available options based on subscription)
router.get("/style-options", UserSettings.getStyleOptions);

// Specific settings update routes
router.patch("/theme", UserSettings.updateThemeSettings);
router.patch("/notifications", UserSettings.updateNotificationSettings);
router.patch("/privacy", UserSettings.updatePrivacySettings);
router.patch("/preferences", UserSettings.updatePreferenceSettings);
router.patch("/layout", UserSettings.updateLayoutSettings);
router.patch("/accessibility", UserSettings.updateAccessibilitySettings);
router.patch("/usage-tracking", UserSettings.updateUsageTrackingSettings);
router.patch("/analytics-preferences", UserSettings.updateAnalyticsPreferencesSettings);
router.patch("/reels-preferences", UserSettings.updateReelsPreferencesSettings);

export default router;