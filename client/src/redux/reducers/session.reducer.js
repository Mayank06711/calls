import { SESSION_ACTIONS } from "../actions/session.actions";

const initialState = {
  sessions: [],
  count: 0,
  loading: false,
  error: null,
  revoking: false,
};

export const sessionReducer = (state = initialState, action) => {
  switch (action.type) {
    case SESSION_ACTIONS.FETCH_SESSIONS_REQUEST:
      return {
        ...state,
        loading: true,
        error: null,
      };

    case SESSION_ACTIONS.FETCH_SESSIONS_SUCCESS:
      return {
        ...state,
        loading: false,
        sessions: action.payload.sessions || [],
        count: action.payload.count || 0,
        error: null,
      };

    case SESSION_ACTIONS.FETCH_SESSIONS_FAILURE:
      return {
        ...state,
        loading: false,
        error: action.payload,
      };

    case SESSION_ACTIONS.REVOKE_SESSION_REQUEST:
    case SESSION_ACTIONS.REVOKE_ALL_SESSIONS_REQUEST:
      return {
        ...state,
        revoking: true,
        error: null,
      };

    case SESSION_ACTIONS.REVOKE_SESSION_SUCCESS:
      return {
        ...state,
        revoking: false,
        sessions: state.sessions.filter(
          (session) => session.id !== action.payload
        ),
        count: state.count - 1,
        error: null,
      };

    case SESSION_ACTIONS.REVOKE_ALL_SESSIONS_SUCCESS:
      return {
        ...state,
        revoking: false,
        // Sessions will be refreshed by fetchSessionsThunk
        error: null,
      };

    case SESSION_ACTIONS.REVOKE_SESSION_FAILURE:
    case SESSION_ACTIONS.REVOKE_ALL_SESSIONS_FAILURE:
      return {
        ...state,
        revoking: false,
        error: action.payload,
      };

    case SESSION_ACTIONS.CLEAR_SESSIONS:
      return initialState;

    default:
      return state;
  }
};
