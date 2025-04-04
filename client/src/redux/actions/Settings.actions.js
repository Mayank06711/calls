import { ADD_CUSTOM_FONT, FETCH_SETTINGS_FAILURE, FETCH_SETTINGS_REQUEST, FETCH_SETTINGS_SUCCESS, REMOVE_CUSTOM_FONT, SET_FONT_SIZE, SET_PRIMARY_COLOR, SET_THEME_MODE, UPDATE_SETTINGS_FAILURE, UPDATE_SETTINGS_REQUEST, UPDATE_SETTINGS_SUCCESS } from "../action_creators";

// Action Creators
export const fetchSettingsRequest = () => ({
    type: FETCH_SETTINGS_REQUEST
  });
  
  export const fetchSettingsSuccess = (data) => ({
    type: FETCH_SETTINGS_SUCCESS,
    payload: data
  });
  
  export const fetchSettingsFailure = (error) => ({
    type: FETCH_SETTINGS_FAILURE,
    payload: error
  });
  
  export const updateSettingsRequest = () => ({
    type: UPDATE_SETTINGS_REQUEST
  });
  
  export const updateSettingsSuccess = (data) => ({
    type: UPDATE_SETTINGS_SUCCESS,
    payload: data
  });
  
  export const updateSettingsFailure = (error) => ({
    type: UPDATE_SETTINGS_FAILURE,
    payload: error
  });

  
// Theme-specific action creators
export const setThemeMode = (mode) => ({
  type: SET_THEME_MODE,
  payload: mode
});

export const setPrimaryColor = (color) => ({
  type: SET_PRIMARY_COLOR,
  payload: color
});

export const setFontSize = (size) => ({
  type: SET_FONT_SIZE,
  payload: size
});

export const addCustomFont = (font) => ({
  type: ADD_CUSTOM_FONT,
  payload: font
});

export const removeCustomFont = (font) => ({
  type: REMOVE_CUSTOM_FONT,
  payload: font
});