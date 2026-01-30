import {
  ADD_CUSTOM_FONT,
  FETCH_SETTINGS_FAILURE,
  FETCH_SETTINGS_REQUEST,
  FETCH_SETTINGS_SUCCESS,
  FETCH_STYLE_OPTIONS_REQUEST,
  FETCH_STYLE_OPTIONS_SUCCESS,
  FETCH_STYLE_OPTIONS_FAILURE,
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
      messageAlerts: true,
      chatSound: true,
      marketing: true,
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
      sidebarPosition: "left",
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
    usageTracking: {
      activityTracking: false,
    },
    analyticsPreferences: {
      personalAnalytics: false,
      anonymousUsage: false,
      weeklyReport: false,
      dataRetention: "6months",
    },
    reelsPreferences: {
      autoPlay: false,
      defaultQuality: "auto",
      downloadOptions: false,
      dataSaver: false,
    },
  },
  // Store unsaved changes separately
  pendingChanges: {
    theme: null,
  },
  // Style options for premium users
  styleOptions: {
    loading: false,
    error: null,
    hasAccess: false,
    subscriptionType: null,
    requiredSubscriptions: ['Gold', 'Platinum'],
    options: null,
    message: null,
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

    case UPDATE_SETTINGS_SUCCESS: {
      const { type, data } = action.payload;
      
      // Handle different setting types
      if (type === 'theme') {
        return {
          ...state,
          saveInProgress: false,
          data: {
            ...state.data,
            theme: data?.theme || state.data.theme
          },
          pendingChanges: {
            ...state.pendingChanges,
            theme: null
          },
          dirtyFields: (state.dirtyFields || []).filter(field => field !== 'theme')
        };
      }
      
      if (type === 'accessibility') {
        return {
          ...state,
          saveInProgress: false,
          data: {
            ...state.data,
            accessibility: data?.accessibility || state.data.accessibility
          }
        };
      }

      if (type === 'notifications') {
        return {
          ...state,
          saveInProgress: false,
          data: {
            ...state.data,
            notifications: data?.notifications || state.data.notifications
          }
        };
      }

      if (type === 'privacy') {
        return {
          ...state,
          saveInProgress: false,
          data: {
            ...state.data,
            privacy: data?.privacy || state.data.privacy
          }
        };
      }

      if (type === 'preferences') {
        return {
          ...state,
          saveInProgress: false,
          data: {
            ...state.data,
            preferences: data?.preferences || state.data.preferences
          }
        };
      }

      if (type === 'layout') {
        return {
          ...state,
          saveInProgress: false,
          data: {
            ...state.data,
            layout: data?.layout || state.data.layout
          }
        };
      }

      if (type === 'usageTracking') {
        return {
          ...state,
          saveInProgress: false,
          data: {
            ...state.data,
            usageTracking: data?.usageTracking || state.data.usageTracking
          }
        };
      }

      if (type === 'analyticsPreferences') {
        return {
          ...state,
          saveInProgress: false,
          data: {
            ...state.data,
            analyticsPreferences: data?.analyticsPreferences || state.data.analyticsPreferences
          }
        };
      }

      if (type === 'reelsPreferences') {
        return {
          ...state,
          saveInProgress: false,
          data: {
            ...state.data,
            reelsPreferences: data?.reelsPreferences || state.data.reelsPreferences
          }
        };
      }

      // Generic fallback - update the entire data from response
      return {
        ...state,
        saveInProgress: false,
        data: data || state.data
      };
    }

    case UPDATE_SETTINGS_FAILURE:
      return {
        ...state,
        saveInProgress: false,
        saveError: action.payload
      };

    // Style Options cases (premium features)
    case FETCH_STYLE_OPTIONS_REQUEST:
      return {
        ...state,
        styleOptions: {
          ...state.styleOptions,
          loading: true,
          error: null
        }
      };

    case FETCH_STYLE_OPTIONS_SUCCESS:
      return {
        ...state,
        styleOptions: {
          ...state.styleOptions,
          loading: false,
          hasAccess: action.payload.hasAccess,
          subscriptionType: action.payload.subscriptionType,
          requiredSubscriptions: action.payload.requiredSubscriptions,
          options: action.payload.options,
          message: action.payload.message
        }
      };

    case FETCH_STYLE_OPTIONS_FAILURE:
      return {
        ...state,
        styleOptions: {
          ...state.styleOptions,
          loading: false,
          error: action.payload
        }
      };

    default:
      return state;
  }
};

export { settingsReducer };
