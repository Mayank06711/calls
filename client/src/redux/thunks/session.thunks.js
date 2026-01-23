import { ENDPOINTS, HTTP_METHODS } from "../../constants/apiEndpoints";
import { makeRequest } from "../../utils/apiHandlers";
import { showNotification } from "../actions/notification.actions";
import {
  fetchSessionsRequest,
  fetchSessionsSuccess,
  fetchSessionsFailure,
  revokeSessionRequest,
  revokeSessionSuccess,
  revokeSessionFailure,
  revokeAllSessionsRequest,
  revokeAllSessionsSuccess,
  revokeAllSessionsFailure,
} from "../actions/session.actions";

/**
 * Fetch all active sessions for the current user
 */
export const fetchSessionsThunk = () => async (dispatch) => {
  try {
    dispatch(fetchSessionsRequest());

    const { data, error } = await makeRequest(
      HTTP_METHODS.GET,
      ENDPOINTS.SESSIONS.GET_ALL
    );

    if (error) {
      dispatch(fetchSessionsFailure(error.message));
      return { success: false, error: error.message };
    }

    if (data?.success) {
      dispatch(fetchSessionsSuccess(data.data));
      return { success: true, data: data.data };
    }

    dispatch(fetchSessionsFailure("Failed to fetch sessions"));
    return { success: false, error: "Failed to fetch sessions" };
  } catch (error) {
    const errorMessage = error.message || "Failed to fetch sessions";
    dispatch(fetchSessionsFailure(errorMessage));
    return { success: false, error: errorMessage };
  }
};

/**
 * Revoke a specific session
 */
export const revokeSessionThunk = (sessionId, token = null) => async (dispatch) => {
  try {
    dispatch(revokeSessionRequest());

    const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};

    const { data, error } = await makeRequest(
      HTTP_METHODS.DELETE,
      `${ENDPOINTS.SESSIONS.REVOKE}/${sessionId}`,
      null,
      config
    );

    if (error) {
      dispatch(revokeSessionFailure(error.message));
      dispatch(showNotification(error.message, "error"));
      return { success: false, error: error.message };
    }

    if (data?.success) {
      dispatch(revokeSessionSuccess(sessionId));
      dispatch(showNotification("Session revoked successfully", "success"));
      return { success: true };
    }

    dispatch(revokeSessionFailure("Failed to revoke session"));
    return { success: false, error: "Failed to revoke session" };
  } catch (error) {
    const errorMessage = error.message || "Failed to revoke session";
    dispatch(revokeSessionFailure(errorMessage));
    dispatch(showNotification(errorMessage, "error"));
    return { success: false, error: errorMessage };
  }
};

/**
 * Revoke all sessions (optionally keep current)
 */
export const revokeAllSessionsThunk = (keepCurrent = true, token = null) => async (dispatch) => {
  try {
    dispatch(revokeAllSessionsRequest());

    const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};

    const { data, error } = await makeRequest(
      HTTP_METHODS.POST,
      ENDPOINTS.SESSIONS.REVOKE_ALL,
      { keepCurrent },
      config
    );

    if (error) {
      dispatch(revokeAllSessionsFailure(error.message));
      dispatch(showNotification(error.message, "error"));
      return { success: false, error: error.message };
    }

    if (data?.success) {
      dispatch(revokeAllSessionsSuccess(data.data?.revokedCount || 0));
      dispatch(showNotification(
        `${data.data?.revokedCount || 0} session(s) revoked successfully`, 
        "success"
      ));
      // Refresh sessions list
      dispatch(fetchSessionsThunk());
      return { success: true, revokedCount: data.data?.revokedCount };
    }

    dispatch(revokeAllSessionsFailure("Failed to revoke sessions"));
    return { success: false, error: "Failed to revoke sessions" };
  } catch (error) {
    const errorMessage = error.message || "Failed to revoke sessions";
    dispatch(revokeAllSessionsFailure(errorMessage));
    dispatch(showNotification(errorMessage, "error"));
    return { success: false, error: errorMessage };
  }
};
