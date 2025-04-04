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
} from "../actions/Settings.actions";
import { showNotification } from "../actions/notification.actions";

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

    const response = await makeRequest(
      HTTP_METHODS.GET,
      ENDPOINTS.SETTINGS.FETCH
    );

    if (response.error) {
      dispatch(fetchSettingsFailure(response.error.message));
      dispatch(showNotification(response.error.message, "error"));
      return;
    }

    if (response.success) {
      dispatch(fetchSettingsSuccess(response.data));
    }
  } catch (error) {
    console.error("Error fetching settings:", error);
    dispatch(fetchSettingsFailure(error.message || "Failed to fetch settings"));
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

      if (response.success) {
        dispatch(
          updateSettingsSuccess({ type: settingType, data: response.data })
        );
        dispatch(showNotification(successMessage, "success"));
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
export const updateThemeSettings = (themeData) =>
  updateSpecificSettings(
    "theme",
    { theme: themeData },
    ENDPOINTS.SETTINGS.THEME,
    "Theme settings updated successfully"
  );

export const updateNotificationSettings = (notificationData) =>
  updateSpecificSettings(
    "notifications",
    { notifications: notificationData },
    ENDPOINTS.SETTINGS.NOTIFICATIONS,
    "Notification settings updated successfully"
  );

export const updatePrivacySettings = (privacyData) =>
  updateSpecificSettings(
    "privacy",
    { privacy: privacyData },
    ENDPOINTS.SETTINGS.PRIVACY,
    "Privacy settings updated successfully"
  );

export const updatePreferenceSettings = (preferenceData) =>
  updateSpecificSettings(
    "preferences",
    { preferences: preferenceData },
    ENDPOINTS.SETTINGS.PREFERENCES,
    "Preference settings updated successfully"
  );

export const updateLayoutSettings = (layoutData) =>
  updateSpecificSettings(
    "layout",
    { layout: layoutData },
    ENDPOINTS.SETTINGS.LAYOUT,
    "Layout settings updated successfully"
  );

export const updateAccessibilitySettings = (accessibilityData) =>
  updateSpecificSettings(
    "accessibility",
    { accessibility: accessibilityData },
    ENDPOINTS.SETTINGS.ACCESSIBILITY,
    "Accessibility settings updated successfully"
  );
