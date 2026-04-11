import {
  ADMIN_LOGIN_REQUEST,
  ADMIN_LOGIN_SUCCESS,
  ADMIN_LOGIN_FAILURE,
  ADMIN_LOGOUT,
  SET_ADMIN_INFO,
  ADMIN_DASHBOARD_REQUEST,
  ADMIN_DASHBOARD_SUCCESS,
  ADMIN_DASHBOARD_FAILURE,
  ADMIN_DATA_REQUEST,
  ADMIN_DATA_SUCCESS,
  ADMIN_DATA_FAILURE,
  ADMIN_DATA_CLEAR,
} from "../action_creators/admin.action_creators";

const initialState = {
  // Auth
  adminInfo: null,
  isAdminLoggingIn: false,
  adminLoginError: null,

  // Dashboard
  dashboard: null,
  isDashboardLoading: false,
  dashboardError: null,

  // Generic data store — keyed by section name (users, subscriptions, etc.)
  data: {},
  loading: {},
  errors: {},
};

const adminReducer = (state = initialState, action) => {
  switch (action.type) {
    // ── Auth ──
    case ADMIN_LOGIN_REQUEST:
      return { ...state, isAdminLoggingIn: true, adminLoginError: null };
    case ADMIN_LOGIN_SUCCESS:
      return { ...state, isAdminLoggingIn: false, adminInfo: action.payload };
    case ADMIN_LOGIN_FAILURE:
      return { ...state, isAdminLoggingIn: false, adminLoginError: action.payload };
    case ADMIN_LOGOUT:
      return { ...initialState };
    case SET_ADMIN_INFO:
      return { ...state, adminInfo: action.payload };

    // ── Dashboard ──
    case ADMIN_DASHBOARD_REQUEST:
      return { ...state, isDashboardLoading: true, dashboardError: null };
    case ADMIN_DASHBOARD_SUCCESS:
      return { ...state, isDashboardLoading: false, dashboard: action.payload };
    case ADMIN_DASHBOARD_FAILURE:
      return { ...state, isDashboardLoading: false, dashboardError: action.payload };

    // ── Generic data (keyed) ──
    case ADMIN_DATA_REQUEST:
      return {
        ...state,
        loading: { ...state.loading, [action.payload]: true },
        errors: { ...state.errors, [action.payload]: null },
      };
    case ADMIN_DATA_SUCCESS:
      return {
        ...state,
        loading: { ...state.loading, [action.payload.key]: false },
        data: { ...state.data, [action.payload.key]: action.payload.data },
      };
    case ADMIN_DATA_FAILURE:
      return {
        ...state,
        loading: { ...state.loading, [action.payload.key]: false },
        errors: { ...state.errors, [action.payload.key]: action.payload.error },
      };
    case ADMIN_DATA_CLEAR:
      return {
        ...state,
        data: { ...state.data, [action.payload]: undefined },
        errors: { ...state.errors, [action.payload]: null },
      };

    default:
      return state;
  }
};

export { adminReducer };
