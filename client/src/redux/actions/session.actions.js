// Session Action Types
export const SESSION_ACTIONS = {
  FETCH_SESSIONS_REQUEST: "FETCH_SESSIONS_REQUEST",
  FETCH_SESSIONS_SUCCESS: "FETCH_SESSIONS_SUCCESS",
  FETCH_SESSIONS_FAILURE: "FETCH_SESSIONS_FAILURE",
  REVOKE_SESSION_REQUEST: "REVOKE_SESSION_REQUEST",
  REVOKE_SESSION_SUCCESS: "REVOKE_SESSION_SUCCESS",
  REVOKE_SESSION_FAILURE: "REVOKE_SESSION_FAILURE",
  REVOKE_ALL_SESSIONS_REQUEST: "REVOKE_ALL_SESSIONS_REQUEST",
  REVOKE_ALL_SESSIONS_SUCCESS: "REVOKE_ALL_SESSIONS_SUCCESS",
  REVOKE_ALL_SESSIONS_FAILURE: "REVOKE_ALL_SESSIONS_FAILURE",
  CLEAR_SESSIONS: "CLEAR_SESSIONS",
};

// Fetch sessions actions
export const fetchSessionsRequest = () => ({
  type: SESSION_ACTIONS.FETCH_SESSIONS_REQUEST,
});

export const fetchSessionsSuccess = (sessions) => ({
  type: SESSION_ACTIONS.FETCH_SESSIONS_SUCCESS,
  payload: sessions,
});

export const fetchSessionsFailure = (error) => ({
  type: SESSION_ACTIONS.FETCH_SESSIONS_FAILURE,
  payload: error,
});

// Revoke single session actions
export const revokeSessionRequest = () => ({
  type: SESSION_ACTIONS.REVOKE_SESSION_REQUEST,
});

export const revokeSessionSuccess = (sessionId) => ({
  type: SESSION_ACTIONS.REVOKE_SESSION_SUCCESS,
  payload: sessionId,
});

export const revokeSessionFailure = (error) => ({
  type: SESSION_ACTIONS.REVOKE_SESSION_FAILURE,
  payload: error,
});

// Revoke all sessions actions
export const revokeAllSessionsRequest = () => ({
  type: SESSION_ACTIONS.REVOKE_ALL_SESSIONS_REQUEST,
});

export const revokeAllSessionsSuccess = (count) => ({
  type: SESSION_ACTIONS.REVOKE_ALL_SESSIONS_SUCCESS,
  payload: count,
});

export const revokeAllSessionsFailure = (error) => ({
  type: SESSION_ACTIONS.REVOKE_ALL_SESSIONS_FAILURE,
  payload: error,
});

// Clear sessions (on logout)
export const clearSessions = () => ({
  type: SESSION_ACTIONS.CLEAR_SESSIONS,
});
