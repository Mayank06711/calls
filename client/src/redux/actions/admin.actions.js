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

// Auth
export const adminLoginRequest = () => ({ type: ADMIN_LOGIN_REQUEST });
export const adminLoginSuccess = (payload) => ({ type: ADMIN_LOGIN_SUCCESS, payload });
export const adminLoginFailure = (error) => ({ type: ADMIN_LOGIN_FAILURE, payload: error });
export const adminLogout = () => ({ type: ADMIN_LOGOUT });
export const setAdminInfo = (info) => ({ type: SET_ADMIN_INFO, payload: info });

// Dashboard
export const adminDashboardRequest = () => ({ type: ADMIN_DASHBOARD_REQUEST });
export const adminDashboardSuccess = (data) => ({ type: ADMIN_DASHBOARD_SUCCESS, payload: data });
export const adminDashboardFailure = (error) => ({ type: ADMIN_DASHBOARD_FAILURE, payload: error });

// Generic data (for management pages)
export const adminDataRequest = (key) => ({ type: ADMIN_DATA_REQUEST, payload: key });
export const adminDataSuccess = (key, data) => ({ type: ADMIN_DATA_SUCCESS, payload: { key, data } });
export const adminDataFailure = (key, error) => ({ type: ADMIN_DATA_FAILURE, payload: { key, error } });
export const adminDataClear = (key) => ({ type: ADMIN_DATA_CLEAR, payload: key });
