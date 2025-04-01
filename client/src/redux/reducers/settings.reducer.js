import {
  ADD_CUSTOM_FONT,
  FETCH_SETTINGS_FAILURE,
  FETCH_SETTINGS_REQUEST,
  FETCH_SETTINGS_SUCCESS,
  REMOVE_CUSTOM_FONT,
  SET_FONT_SIZE,
  SET_PRIMARY_COLOR,
  SET_THEME_MODE,
  UPDATE_SETTINGS_FAILURE,
  UPDATE_SETTINGS_REQUEST,
  UPDATE_SETTINGS_SUCCESS,
} from "../action_creators";

const initialState = {
  loading: false,
  error: null,
  data: {
    theme: {
      mode: "system",
      primaryColor: "#059212",
      fontSize: "medium",
      customFonts: [],
    },
    notifications: {
      email: true,
      push: true,
      sms: false,
      marketing: false,
      sound: true,
      quietHours: {
        enabled: false,
        start: "22:00",
        end: "07:00",
        timezone: "UTC",
      },
    },
    privacy: {
      profileVisibility: "public",
      showOnlineStatus: true,
      showLastSeen: true,
      showProfilePhoto: "everyone",
      allowTagging: true,
      allowMessages: "everyone",
    },
    preferences: {
      language: "en",
      timezone: "UTC",
      dateFormat: "YYYY-MM-DD",
      timeFormat: "24h",
      currency: "USD",
      weekStartDay: "monday",
      measurements: "metric",
    },
    layout: {
      sidebarCollapsed: false,
      compactView: false,
      showTutorials: true,
      defaultView: "grid",
      customLayout: {
        widgets: [],
        order: [],
      },
    },
    accessibility: {
      highContrast: false,
      reducedMotion: false,
      screenReader: false,
      fontSize: 1,
      textSpacing: 1,
      cursorSize: "default",
    },
  },
  // Store unsaved changes separately
  pendingChanges: {
    theme: null,
  },
};

const settingsReducer = (state = initialState, action) => {
  switch (action.type) {
    case FETCH_SETTINGS_REQUEST:
      return {
        ...state,
        loading: true,
        error: null
      };

    case FETCH_SETTINGS_SUCCESS:
      return {
        ...state,
        loading: false,
        data: action.payload,
        pendingChanges: { theme: null },
        dirtyFields: []
      };

    case FETCH_SETTINGS_FAILURE:
      return {
        ...state,
        loading: false,
        error: action.payload
      };

    case SET_THEME_MODE:
      return {
        ...state,
        pendingChanges: {
          ...state.pendingChanges,
          theme: {
            ...(state.pendingChanges.theme || state.data.theme),
            mode: action.payload
          }
        },
        dirtyFields: [...new Set([...state.dirtyFields, 'theme'])]
      };

    case SET_PRIMARY_COLOR:
      return {
        ...state,
        pendingChanges: {
          ...state.pendingChanges,
          theme: {
            ...(state.pendingChanges.theme || state.data.theme),
            primaryColor: action.payload
          }
        },
        dirtyFields: [...new Set([...state.dirtyFields, 'theme'])]
      };

    case SET_FONT_SIZE:
      return {
        ...state,
        pendingChanges: {
          ...state.pendingChanges,
          theme: {
            ...(state.pendingChanges.theme || state.data.theme),
            fontSize: action.payload
          }
        },
        dirtyFields: [...new Set([...state.dirtyFields, 'theme'])]
      };

    case ADD_CUSTOM_FONT:
      return {
        ...state,
        pendingChanges: {
          ...state.pendingChanges,
          theme: {
            ...(state.pendingChanges.theme || state.data.theme),
            customFonts: [
              ...(state.pendingChanges.theme?.customFonts || state.data.theme.customFonts),
              action.payload
            ]
          }
        },
        dirtyFields: [...new Set([...state.dirtyFields, 'theme'])]
      };

    case REMOVE_CUSTOM_FONT:
      return {
        ...state,
        pendingChanges: {
          ...state.pendingChanges,
          theme: {
            ...(state.pendingChanges.theme || state.data.theme),
            customFonts: (state.pendingChanges.theme?.customFonts || state.data.theme.customFonts)
              .filter(font => font !== action.payload)
          }
        },
        dirtyFields: [...new Set([...state.dirtyFields, 'theme'])]
      };

    case UPDATE_SETTINGS_REQUEST:
      return {
        ...state,
        saveInProgress: true,
        saveError: null
      };

    case UPDATE_SETTINGS_SUCCESS:
      return {
        ...state,
        saveInProgress: false,
        data: {
          ...state.data,
          theme: action.payload.theme
        },
        pendingChanges: {
          ...state.pendingChanges,
          theme: null
        },
        dirtyFields: state.dirtyFields.filter(field => field !== 'theme')
      };

    case UPDATE_SETTINGS_FAILURE:
      return {
        ...state,
        saveInProgress: false,
        saveError: action.payload
      };

    default:
      return state;
  }
};

export { settingsReducer };
