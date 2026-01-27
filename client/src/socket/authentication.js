// Authentication utility for socket.io
// Handles socket authentication, token refresh, and retry logic
// Does not own the socket or manage global state, but can dispatch Redux actions for flags

import { SocketManager } from "../socket/config";
import { emitEvent } from "../socket/socketUtils";
import { SOCKET_CONSTANTS } from "../constants/socketContanst";
import { socketAuthenticated, socketConnected } from "../redux/actions/socket.actions";
import store from "../redux/store";
import { showNotification } from "../redux/actions/notification.actions";
import { makeRequest } from "../utils/apiHandlers";
import { ENDPOINTS, HTTP_METHODS } from "../constants/apiEndpoints";
import { getAccessToken, setAccessToken, clearAuthData } from "../utils/tokenManager";

// Waits for the socket to fully disconnect before proceeding
const waitForSocketDisconnect = (socket) => {
  return new Promise((resolve) => {
    if (!socket.connected) return resolve();
    socket.once("disconnect", resolve);
  });
};

// Authenticates the socket with the current access token
// Handles token expiration by refreshing and retrying once
const authenticateSocket = async () => {
  if (SocketManager.isAuthenticating) {
    return;
  }
  try {
    const socket = SocketManager.getSocket(false, true);
    SocketManager.isAuthenticating = true;
    console.log("[authenticateSocket] Emitting AUTHENTICATE event with token:", getAccessToken());
    const response = await emitEvent(socket, {
      event: SOCKET_CONSTANTS.AUTH.AUTHENTICATE,
      data: () => ({ accessToken: getAccessToken() }),
      timeout: 30000,
      retryOptions: {
        maxRetries: 3,
        delay: 1000,
        exponential: true,
        shouldRetry: (error) => {
          // Only retry for network/unexpected errors, not for token_expired or unexpected_error
          return (
            error.message !== SOCKET_CONSTANTS.ERROR_TYPES.TOKEN_EXPIRED &&
            error.message !== SOCKET_CONSTANTS.ERROR_TYPES.UNEXPECTED_ERROR &&
            error.code !== "SOCKET_REAUTHENTICATE"
          );
        },
      },
      handlers: {
        onBefore: () => {
          store.dispatch(showNotification("Connecting to real-time services...", "info"));
        },
        onSuccess: (response) => {
          if (response.status === SOCKET_CONSTANTS.STATUS.AUTHENTICATED) {
            store.dispatch(socketAuthenticated(true));
            store.dispatch(showNotification(response.message || "Socket authenticated successfully", "info"));
            console.log("[authenticateSocket] Server confirmed authentication!");
          } else {
            store.dispatch(showNotification("You may not be able to chat... since not connected with real time connection", "info"));
          }
        },
        onError: async (error) => {
          if (error && error.response && error.response.errorType === "token_expired") {
            // Token expired, try to refresh
            const { data, statusCode } = await makeRequest(
              HTTP_METHODS.POST,
              ENDPOINTS.AUTH.REFRESH_TOKEN
            );
            const newToken = data?.data?.token || data?.token;
            if (statusCode === 200 && newToken) {
              setAccessToken(newToken);
              // Throw special error to break retry loop and signal re-auth
              throw Object.assign(new Error("SOCKET_REAUTHENTICATE"), { code: "SOCKET_REAUTHENTICATE" });
            } else {
              clearAuthData();
              store.dispatch(showNotification("Session expired. Please log in again.", "error"));
            }
          } else {
            store.dispatch(showNotification("Real-time services limited", "error"));
          }
        },
        onTimeout: () => {
          store.dispatch(showNotification("Connection timeout, please try again", "error"));
        },
      },
      validateResponse: (response) => {
        return response.status === SOCKET_CONSTANTS.STATUS.AUTHENTICATED;
      },
    });
    return response;
  } catch (error) {
    if (error.code === "SOCKET_REAUTHENTICATE" || error.message === "SOCKET_REAUTHENTICATE") {
      // After refresh, disconnect and let caller re-authenticate
      const socket = SocketManager.getSocket();
      SocketManager.disconnectSocket();
      await waitForSocketDisconnect(socket);
      return { status: "reauthenticate" };
    }
    return null;
  } finally {
    SocketManager.isAuthenticating = false;
  }
};

// Returns true if socket is authenticated (from Redux flag)
const isSocketAuthenticated = () => {
  const state = store.getState();
  return state.socketMetrics.authenticated;
};

// Ensures socket is authenticated, handles re-authentication if needed
const ensureSocketAuthenticated = async () => {
  // Always authenticate on new socket connection
  if (SocketManager.isAuthenticating) {
    for (let i = 0; i < 30; i++) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      if (isSocketAuthenticated()) {
        return true;
      }
    }
    throw new Error("Timed out waiting for authentication to complete");
  }
  const token = getAccessToken();
  if (!token) {
    SocketManager.isAuthenticating = false;
    throw new Error("No authentication token found");
  }
  try {
    let response = await authenticateSocket();
    if (response && response.status === "reauthenticate") {
      await new Promise((resolve) => setTimeout(resolve, 200));
      response = await authenticateSocket();
    }
    if (!response || response.status !== SOCKET_CONSTANTS.STATUS.AUTHENTICATED) {
      throw new Error("Socket authentication failed");
    }
    return true;
  } catch (error) {
    store.dispatch(socketAuthenticated(false));
    store.dispatch(socketConnected(false));
    throw error;
  } finally {
    SocketManager.isAuthenticating = false;
  }
};

// Add this to handle page visibility changes
const setupVisibilityListener = () => {
  let reconnectionTimeout;

  document.addEventListener("visibilitychange", async () => {
    if (document.visibilityState === "visible") {
      // Clear any existing timeout
      if (reconnectionTimeout) {
        clearTimeout(reconnectionTimeout);
      }

      // Add a small delay and check if reconnection is really needed
      reconnectionTimeout = setTimeout(async () => {
        const socket = SocketManager.getSocket();
        const isAuthenticated = store.getState().socketMetrics.authenticated;

        if (
          !socket.connected &&
          !isAuthenticated &&
          !SocketManager.isAuthenticating
        ) {
          await ensureSocketAuthenticated();
        }
      }, 1000);
    }
  });
};

// Initialize visibility listener
setupVisibilityListener();

/*
========================================
Socket Authentication Retry Behavior
========================================
| Condition                                 | Will it retry? | Why?                                         |
|--------------------------------------------|:--------------:|----------------------------------------------|
| Timeout/network error                      |      Yes       | shouldRetry returns true for timeouts/errors  |
| Token expired (errorType: 'token_expired') |      No        | shouldRetry returns false, triggers refresh   |
| Unexpected error                          |      Yes       | shouldRetry returns true                     |
| Page refresh, valid token, network OK      |      N/A       | Socket authenticates normally                |
| Page refresh, valid token, network slow    |      Yes       | Retries up to max retries                    |
| Page refresh, no token                     |      No        | No authentication attempted                  |

- Timeouts and network errors: Will be retried up to the configured max retries.
- Token expired: Will NOT be retried; instead, triggers token refresh and socket disconnect/re-auth.
- Page refresh with valid token: Socket authenticates as normal; if network issues, will retry.
*/

export { ensureSocketAuthenticated, isSocketAuthenticated };
