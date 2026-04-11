import { ENDPOINTS, HTTP_METHODS } from "../../constants/apiEndpoints";
import { makeRequest } from "../../utils/apiHandlers";
import { setIsDarkMode } from "../actions";
import {
  fetchSettingsSuccess,
  fetchSettingsFailure,
  updateSettingsRequest,
  updateSettingsSuccess,
  updateSettingsFailure,
  fetchSettingsRequest,
  fetchStyleOptionsRequest,
  fetchStyleOptionsSuccess,
  fetchStyleOptionsFailure,
} from "../actions/Settings.actions";
import { showNotification } from "../actions/notification.actions";
import { applyFontSize, applyFontFamily, fontSizeToDbValue, dbValueToFontSize } from "../../constants/styleOptions";

const getSystemThemePreference = () => {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  };

// Initialize settings after login
export const initializeSettingsThunk = () => async (dispatch) => {
  console.log("11111111111111111111");
  try {
    console.log("222222222222222222222");

    dispatch(fetchSettingsRequest());

    const { data, error, statusCode } = await makeRequest(
      HTTP_METHODS.POST,
      ENDPOINTS.SETTINGS.INITIALIZE
    );

    if (error) {
      console.log("3333333333333333333333");

      dispatch(fetchSettingsFailure(error.message));
      dispatch(showNotification(error.message, error.statusCode));
      return;
    }

    if (data.success) {
      console.log("44444444444444444444");

     const themeMode = data.data.theme.mode;
        console.log("them moooooooooooooode",themeMode);
      if (themeMode === "dark") {
        dispatch(setIsDarkMode(true));
        localStorage.setItem("isDarkMode",true);
      } else if (themeMode === "light") {
        dispatch(setIsDarkMode(false));
        localStorage.setItem("isDarkMode",false);

      } else if (themeMode === "system") {
        // Check system preference
        const isDarkMode = getSystemThemePreference();
        dispatch(setIsDarkMode(isDarkMode));
        localStorage.setItem("isDarkMode",isDarkMode);

        
        // Add listener for system theme changes
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        mediaQuery.addEventListener('change', (e) => {
          dispatch(setIsDarkMode(e.matches));
        });
      }

      // Apply font size if user has customized it (only for premium users)
      const accessibilityFontSize = data.data.accessibility?.fontSize;
      if (accessibilityFontSize && accessibilityFontSize !== 1) {
        // Convert number from DB to string for applyFontSize
        const fontSizeString = dbValueToFontSize(accessibilityFontSize);
        applyFontSize(fontSizeString);
        console.log("Applied custom font size:", fontSizeString, "from DB value:", accessibilityFontSize);
      }

      dispatch(fetchSettingsSuccess(data.data));
      console.log("Settings initialized successfully", data.data);
    }
  } catch (error) {
    console.log("55555555555555555");

    console.error("Error initializing settings:", error);
    dispatch(
      fetchSettingsFailure(
        error.message || "Failed to initialize settings",
        statusCode
      )
    );
  }
};

// Fetch all settings
export const fetchSettingsThunk = () => async (dispatch) => {
  try {
    dispatch(fetchSettingsRequest());

    // Check if settings were recently updated - if so, bypass cache
    const settingsUpdatedAt = localStorage.getItem('settingsUpdatedAt');
    let url = ENDPOINTS.SETTINGS.FETCH;
    
    if (settingsUpdatedAt) {
      // Add cache-buster only when settings were updated
      url += `?_t=${settingsUpdatedAt}`;
      // Clear the flag after using it
      localStorage.removeItem('settingsUpdatedAt');
    }
    
    const response = await makeRequest(
      HTTP_METHODS.GET,
      url
    );

    if (response.error) {
      dispatch(fetchSettingsFailure(response.error.message));
      dispatch(showNotification(response.error.message, "error"));
      return { success: false, error: response.error.message };
    }

    if (response.data?.success) {
      dispatch(fetchSettingsSuccess(response.data.data));
      return { success: true, data: response.data.data };
    }
    
    return { success: false };
  } catch (error) {
    console.error("Error fetching settings:", error);
    dispatch(fetchSettingsFailure(error.message || "Failed to fetch settings"));
    return { success: false, error: error.message };
  }
};

// Generic function for updating specific settings
const updateSpecificSettings =
  (
    settingType,
    data,
    endpoint,
    successMessage = "Settings updated successfully"
  ) =>
  async (dispatch) => {
    try {
      dispatch(updateSettingsRequest());

      const response = await makeRequest(HTTP_METHODS.PATCH, endpoint, data);

      if (response.error) {
        dispatch(updateSettingsFailure(response.error.message));
        dispatch(showNotification(response.error.message, "error"));
        return;
      }

      if (response.data?.success) {
        dispatch(
          updateSettingsSuccess({ type: settingType, data: response.data.data })
        );
        dispatch(showNotification(successMessage, "success"));

        // Set flag to bypass cache on next fetch (after page refresh)
        localStorage.setItem('settingsUpdatedAt', Date.now().toString());
      }
    } catch (error) {
      console.error(`Error updating ${settingType} settings:`, error);
      dispatch(
        updateSettingsFailure(
          error.message || `Failed to update ${settingType} settings`
        )
      );
      dispatch(
        showNotification(`Error updating ${settingType} settings`, "error")
      );
    }
  };

// Specific settings update thunks
// NOTE: Send raw data (NOT wrapped) — the server builds $set dot notation from req.body keys
export const updateThemeSettings = (themeData) =>
  updateSpecificSettings(
    "theme",
    themeData,
    ENDPOINTS.SETTINGS.THEME,
    "Theme settings updated successfully"
  );

export const updateNotificationSettings = (notificationData) =>
  updateSpecificSettings(
    "notifications",
    notificationData,
    ENDPOINTS.SETTINGS.NOTIFICATIONS,
    "Notification settings updated successfully"
  );

export const updatePrivacySettings = (privacyData) =>
  updateSpecificSettings(
    "privacy",
    privacyData,
    ENDPOINTS.SETTINGS.PRIVACY,
    "Privacy settings updated successfully"
  );

export const updatePreferenceSettings = (preferenceData) =>
  updateSpecificSettings(
    "preferences",
    preferenceData,
    ENDPOINTS.SETTINGS.PREFERENCES,
    "Preference settings updated successfully"
  );

export const updateLayoutSettings = (layoutData) =>
  updateSpecificSettings(
    "layout",
    layoutData,
    ENDPOINTS.SETTINGS.LAYOUT,
    "Layout settings updated successfully"
  );

export const updateAccessibilitySettings = (accessibilityData) =>
  updateSpecificSettings(
    "accessibility",
    accessibilityData,
    ENDPOINTS.SETTINGS.ACCESSIBILITY,
    "Accessibility settings updated successfully"
  );

export const updateUsageTrackingSettings = (data) =>
  updateSpecificSettings(
    "usageTracking",
    data,
    ENDPOINTS.SETTINGS.USAGE_TRACKING,
    "Usage tracking settings updated successfully"
  );

export const updateAnalyticsPreferencesSettings = (data) =>
  updateSpecificSettings(
    "analyticsPreferences",
    data,
    ENDPOINTS.SETTINGS.ANALYTICS_PREFERENCES,
    "Analytics preferences updated successfully"
  );

export const updateReelsPreferencesSettings = (data) =>
  updateSpecificSettings(
    "reelsPreferences",
    data,
    ENDPOINTS.SETTINGS.REELS_PREFERENCES,
    "Reels preferences updated successfully"
  );

// Fetch style options (premium feature - Gold/Platinum only)
export const fetchStyleOptionsThunk = () => async (dispatch) => {
  try {
    dispatch(fetchStyleOptionsRequest());

    const { data, error } = await makeRequest(
      HTTP_METHODS.GET,
      ENDPOINTS.SETTINGS.STYLE_OPTIONS
    );

    if (error) {
      dispatch(fetchStyleOptionsFailure(error.message));
      return { success: false, error: error.message };
    }

    if (data.success) {
      dispatch(fetchStyleOptionsSuccess(data.data));
      return { success: true, data: data.data };
    }
  } catch (error) {
    console.error("Error fetching style options:", error);
    dispatch(fetchStyleOptionsFailure(error.message || "Failed to fetch style options"));
    return { success: false, error: error.message };
  }
};

// Update accessibility with font size (premium feature)
export const updateAccessibilityFontSize = (fontSize) => async (dispatch) => {
  try {
    dispatch(updateSettingsRequest());

    // Convert string font size to number for database
    const fontSizeDbValue = fontSizeToDbValue(fontSize);

    const response = await makeRequest(
      HTTP_METHODS.PATCH,
      ENDPOINTS.SETTINGS.ACCESSIBILITY,
      { fontSize: fontSizeDbValue }
    );

    if (response.error) {
      dispatch(updateSettingsFailure(response.error.message));
      dispatch(showNotification(response.error.message, "error"));
      return { success: false, error: response.error.message };
    }

    if (response.data?.success) {
      dispatch(updateSettingsSuccess({ type: "accessibility", data: response.data.data }));
      dispatch(showNotification("Font size updated successfully", "success"));
      
      // Apply the font size to the document
      applyFontSize(fontSize);
      
      // Set flag to bypass cache on next fetch (after page refresh)
      localStorage.setItem('settingsUpdatedAt', Date.now().toString());
      
      return { success: true };
    }
  } catch (error) {
    console.error("Error updating font size:", error);
    dispatch(updateSettingsFailure(error.message || "Failed to update font size"));
    dispatch(showNotification("Error updating font size", "error"));
    return { success: false, error: error.message };
  }
};

// Update accessibility with font family
export const updateAccessibilityFontFamily = (fontFamily) => async (dispatch) => {
  try {
    dispatch(updateSettingsRequest());

    const response = await makeRequest(
      HTTP_METHODS.PATCH,
      ENDPOINTS.SETTINGS.ACCESSIBILITY,
      { fontFamily }
    );

    if (response.error) {
      dispatch(updateSettingsFailure(response.error.message));
      dispatch(showNotification(response.error.message, "error"));
      return { success: false, error: response.error.message };
    }

    if (response.data?.success) {
      dispatch(updateSettingsSuccess({ type: "accessibility", data: response.data.data }));
      dispatch(showNotification("Font family updated successfully", "success"));
      
      // Apply the font family to the document
      applyFontFamily(fontFamily);
      
      // Set flag to bypass cache on next fetch (after page refresh)
      localStorage.setItem('settingsUpdatedAt', Date.now().toString());
      
      return { success: true };
    }
  } catch (error) {
    console.error("Error updating font family:", error);
    dispatch(updateSettingsFailure(error.message || "Failed to update font family"));
    dispatch(showNotification("Error updating font family", "error"));
    return { success: false, error: error.message };
  }
};
