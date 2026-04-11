import { makeRequest } from "../../utils/apiHandlers";
import { HTTP_METHODS, ENDPOINTS, API_CONFIG } from "../../constants/apiEndpoints";
import { ADMIN_TOKEN_KEY, ADMIN_ID_KEY, ADMIN_INFO_KEY } from "../../constants/adminConstants";
import {
  adminLoginRequest,
  adminLoginSuccess,
  adminLoginFailure,
  adminLogout,
  adminDashboardRequest,
  adminDashboardSuccess,
  adminDashboardFailure,
  adminDataRequest,
  adminDataSuccess,
  adminDataFailure,
} from "../actions/admin.actions";
import { showNotification } from "../actions";
import axios from "axios";

// ── Admin token refresh queue (prevents concurrent refresh calls) ──
let isAdminRefreshing = false;
let adminRefreshSubscribers = [];

const onAdminTokenRefreshed = (newToken) => {
  adminRefreshSubscribers.forEach((cb) => cb(newToken));
  adminRefreshSubscribers = [];
};

const addAdminRefreshSubscriber = (cb) => {
  adminRefreshSubscribers.push(cb);
};

/**
 * Create an axios instance specifically for admin API calls.
 * - Uses adminToken from localStorage (NOT the user token)
 * - Has its own 401 interceptor that refreshes via /admins/refresh-token
 * - Does NOT share the user token request interceptor
 */
const getAdminAxios = () => {
  const adminToken = localStorage.getItem(ADMIN_TOKEN_KEY);

  const instance = axios.create({
    baseURL: API_CONFIG.BASE_URL,
    headers: {
      "Content-Type": "application/json",
      ...(adminToken ? { Authorization: `Bearer ${adminToken}` } : {}),
    },
    withCredentials: true, // Needed for refresh token cookie
  });

  // Response interceptor — normalize response + handle 401 refresh
  instance.interceptors.response.use(
    (response) => {
      // Normalize into { data, error, statusCode } shape like the main axios config
      if (response.data?.body && typeof response.data.body === "string") {
        try {
          const parsedBody = JSON.parse(response.data.body);
          response.data = {
            data: parsedBody,
            error: null,
            statusCode: response.data.statusCode || response.status,
          };
        } catch {
          // leave as-is
        }
      } else {
        response.data = {
          data: response.data,
          error: null,
          statusCode: response.status,
        };
      }
      return response;
    },
    async (error) => {
      const originalRequest = error.config;

      // Only attempt refresh on 401 (or 403 with token message), and not on the refresh endpoint itself
      const isTokenError =
        error.response?.status === 401 ||
        (error.response?.status === 403 &&
          /token/i.test(error.response?.data?.message || ""));

      const isRefreshUrl = originalRequest?.url?.includes("/refresh-token");

      if (isTokenError && !originalRequest._adminRetry && !isRefreshUrl) {
        originalRequest._adminRetry = true;

        // If already refreshing, queue this request
        if (isAdminRefreshing) {
          return new Promise((resolve, reject) => {
            addAdminRefreshSubscriber((newToken) => {
              if (newToken) {
                originalRequest.headers.Authorization = `Bearer ${newToken}`;
                resolve(instance(originalRequest));
              } else {
                reject(error);
              }
            });
          });
        }

        isAdminRefreshing = true;

        try {
          // Call admin refresh endpoint — refresh token is in HTTP-only cookie
          const refreshRes = await axios.post(
            `${API_CONFIG.BASE_URL}${ENDPOINTS.ADMIN.REFRESH_TOKEN}`,
            {},
            { withCredentials: true }
          );

          // Backend successResponse wraps body as JSON string: { statusCode, body: "..." }
          let newToken;
          if (refreshRes.data?.body && typeof refreshRes.data.body === "string") {
            const parsed = JSON.parse(refreshRes.data.body);
            newToken = parsed?.data?.accessToken;
          } else {
            newToken = refreshRes.data?.data?.accessToken;
          }
          if (newToken) {
            localStorage.setItem(ADMIN_TOKEN_KEY, newToken);
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            onAdminTokenRefreshed(newToken);
            isAdminRefreshing = false;
            return instance(originalRequest);
          }
        } catch (refreshError) {
          // Refresh failed — clear admin session and notify UI
          onAdminTokenRefreshed(null);
          isAdminRefreshing = false;
          localStorage.removeItem(ADMIN_TOKEN_KEY);
          localStorage.removeItem(ADMIN_ID_KEY);
          localStorage.removeItem(ADMIN_INFO_KEY);
          // Dispatch custom event so AdminLayout can show login gate
          window.dispatchEvent(new CustomEvent("admin-session-expired"));
          return Promise.reject({
            data: null,
            error: {
              message: "Admin session expired. Please log in again.",
              statusCode: 401,
            },
          });
        }
      }

      // Normalize error response
      return Promise.reject({
        data: null,
        error: {
          message:
            error.response?.data?.message ||
            error.message ||
            "Something went wrong",
          statusCode: error.response?.status || 500,
        },
      });
    }
  );

  return instance;
};

/**
 * Generic admin API call — uses adminToken header.
 */
const adminRequest = async (method, url, payload = null) => {
  const instance = getAdminAxios();
  const upperMethod = method.toUpperCase();

  let response;
  if (upperMethod === "GET" || upperMethod === "DELETE") {
    response = await instance[method.toLowerCase()](url, payload ? { params: payload } : undefined);
  } else {
    response = await instance[method.toLowerCase()](url, payload || {});
  }
  return response.data;
};

// ── Admin Login ──
export const adminLoginThunk = (adminKey) => async (dispatch) => {
  dispatch(adminLoginRequest());
  try {
    const result = await makeRequest(HTTP_METHODS.POST, ENDPOINTS.ADMIN.LOGIN, { adminKey });

    if (result?.data?.success) {
      const { admin, user, token } = result.data.data;
      const adminInfo = {
        ...admin,
        name: user?.fullName || "Admin",
        username: user?.username,
      };
      localStorage.setItem(ADMIN_TOKEN_KEY, token);
      localStorage.setItem(ADMIN_ID_KEY, admin._id);
      localStorage.setItem(ADMIN_INFO_KEY, JSON.stringify(adminInfo));
      dispatch(adminLoginSuccess(adminInfo));
      return { success: true };
    }

    const msg = result?.error?.message || result?.data?.message || "Admin login failed";
    dispatch(adminLoginFailure(msg));
    return { success: false, message: msg };
  } catch (err) {
    const msg = err?.message || "Admin login failed";
    dispatch(adminLoginFailure(msg));
    return { success: false, message: msg };
  }
};

// ── Admin Logout ──
export const adminLogoutThunk = () => (dispatch) => {
  localStorage.removeItem(ADMIN_TOKEN_KEY);
  localStorage.removeItem(ADMIN_ID_KEY);
  localStorage.removeItem(ADMIN_INFO_KEY);
  dispatch(adminLogout());
  dispatch(showNotification("Admin logged out", "info"));
};

// ── Restore admin session from localStorage ──
export const restoreAdminSession = () => (dispatch) => {
  const adminInfo = localStorage.getItem(ADMIN_INFO_KEY);
  const adminToken = localStorage.getItem(ADMIN_TOKEN_KEY);
  if (adminInfo && adminToken) {
    dispatch(adminLoginSuccess(JSON.parse(adminInfo)));
  }
};

// ── Dashboard Overview ──
export const fetchDashboardOverview = () => async (dispatch) => {
  dispatch(adminDashboardRequest());
  try {
    const result = await adminRequest("GET", ENDPOINTS.ADMIN.DASHBOARD_OVERVIEW);
    if (result?.data?.success) {
      dispatch(adminDashboardSuccess(result.data.data));
    } else {
      dispatch(adminDashboardFailure(result?.error?.message || "Failed to load dashboard"));
    }
  } catch (err) {
    dispatch(adminDashboardFailure(err?.error?.message || err?.message || "Failed to load dashboard"));
  }
};

// ── Generic admin data fetcher ──
export const fetchAdminData = (key, endpoint, params = null) => async (dispatch) => {
  dispatch(adminDataRequest(key));
  try {
    const result = await adminRequest("GET", endpoint, params);
    if (result?.data?.success) {
      dispatch(adminDataSuccess(key, result.data.data));
      return result.data.data;
    } else {
      dispatch(adminDataFailure(key, result?.error?.message || "Failed to load data"));
      return null;
    }
  } catch (err) {
    dispatch(adminDataFailure(key, err?.error?.message || err?.message || "Failed to load data"));
    return null;
  }
};

// ── Generic admin action (POST/PATCH/DELETE) ──
export const adminAction = async (method, endpoint, payload = null) => {
  try {
    const result = await adminRequest(method, endpoint, payload);
    if (result?.data?.success) {
      return { success: true, data: result.data.data, message: result.data.message };
    }
    return { success: false, message: result?.error?.message || result?.data?.message || "Action failed" };
  } catch (err) {
    return { success: false, message: err?.error?.message || err?.message || "Action failed" };
  }
};
