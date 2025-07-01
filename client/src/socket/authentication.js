import { SocketManager } from "../socket/config";
import { emitEvent } from "../socket/socketUtils";
import { SOCKET_CONSTANTS } from "../constants/socketContanst";
import {
  socketAuthenticated,
  socketConnected,
} from "../redux/actions/socket.actions";
import store from "../redux/store";
import { showNotification } from "../redux/actions/notification.actions";
import { makeRequest } from "../utils/apiHandlers";
import { ENDPOINTS, HTTP_METHODS } from "../constants/apiEndpoints";

const waitForSocketDisconnect = (socket) => {
  return new Promise((resolve) => {
    console.log("im about to disconnect socket", socket.id);
    if (!socket.connected) return resolve();
    console.log("hey from line 17");
    socket.once("disconnect", resolve);
  });
};

const authenticateSocket = async () => {
  // Prevent multiple simultaneous authentication attempts
  if (SocketManager.isAuthenticating) {
    console.log("Authentication already in progress");
    return;
  }
  try {
    // Get a connected socket using the SocketManager
    const socket = SocketManager.getSocket(false, true);
    // Check if already authenticated
    if (store.getState().socketMetrics.authenticated) {
      console.log("Socket already authenticated");
      store.dispatch(socketAuthenticated(true));
      return { status: SOCKET_CONSTANTS.STATUS.AUTHENTICATED };
    }
    SocketManager.isAuthenticating = true;
    console.log("[authenticateSocket] Starting emitEvent with retry logic");
    const response = await emitEvent(socket, {
      event: SOCKET_CONSTANTS.AUTH.AUTHENTICATE,
      data: () => ({ accessToken: localStorage.getItem("token") }),
      timeout: 30000,
      retryOptions: {
        maxRetries: 3,
        delay: 1000,
        exponential: true,
        shouldRetry: (error) => {
          // Only retry for network/unexpected errors, not for token_expired or unexpected_error
          const should =
            error.message !== SOCKET_CONSTANTS.ERROR_TYPES.TOKEN_EXPIRED &&
            error.message !== SOCKET_CONSTANTS.ERROR_TYPES.UNEXPECTED_ERROR &&
            error.code !== "SOCKET_REAUTHENTICATE";
          console.log(
            `[emitEvent:shouldRetry] error.message: ${error.message}, shouldRetry: ${should}`
          );
          return should;
        },
        onRetry: (attempt, error) => {
          console.log(`[emitEvent:retry] Attempt ${attempt}, error:`, error);
        },
      },
      handlers: {
        onBefore: () => {
          console.log("Starting socket authentication...");
          store.dispatch(
            showNotification("Connecting to real-time services...", "info")
          );
        },
        onSuccess: (response) => {
          console.log("socket authenticated response", response);
          if (response.status === SOCKET_CONSTANTS.STATUS.AUTHENTICATED) {
            store.dispatch(socketAuthenticated(true));
            console.log("Socket authenticated successfully");
            store.dispatch(
              showNotification(
                response.message || "Socket authenticated successfully",
                "info"
              )
            );
          } else {
            store.dispatch(
              showNotification(
                "You may not be able to chat... since not connected with real time connection",
                "info"
              )
            );
          }
        },
        onError: async (error) => {
          console.log("onError called!", error);
          console.log("error.response:", error.response);
          if (
            error &&
            error.response &&
            error.response.errorType === "token_expired"
          ) {
            console.log("Token expired detected, calling makeRequest...");
            const {
              data,
              error: apiError,
              statusCode,
            } = await makeRequest(
              HTTP_METHODS.POST,
              ENDPOINTS.AUTH.REFRESH_TOKEN
            );
            console.log("makeRequest result:", data, apiError, statusCode);

            // FIX: Extract token from correct place
            const newToken = data?.data?.token || data?.token;
            if (statusCode === 200 && newToken) {
              localStorage.setItem("token", newToken);
              console.log("[onError] New token set in localStorage:", newToken);
              // Throw a special error to break the retry loop and signal the need to disconnect and re-authenticate
              throw Object.assign(new Error("SOCKET_REAUTHENTICATE"), {
                code: "SOCKET_REAUTHENTICATE",
              });
            } else {
              console.log("[onError] Refresh failed, clearing session");
              localStorage.removeItem("token");
              localStorage.removeItem("userId");
              store.dispatch(
                showNotification(
                  "Session expired. Please log in again.",
                  "error"
                )
              );
            }
          } else {
            store.dispatch(
              showNotification("Real-time services limited", "error")
            );
          }
        },
        onTimeout: () => {
          console.log("Connection timeout, please try again", "error");
          store.dispatch(
            showNotification("Connection timeout, please try again", "error")
          );
        },
      },
      validateResponse: (response) => {
        return response.status === SOCKET_CONSTANTS.STATUS.AUTHENTICATED;
      },
    });
    return response;
  } catch (error) {
    if (
      error.code === "SOCKET_REAUTHENTICATE" ||
      error.message === "SOCKET_REAUTHENTICATE"
    ) {
      console.log(
        "[authenticateSocket] Caught SOCKET_REAUTHENTICATE, disconnecting and re-authenticating"
      );
      const socket = SocketManager.getSocket();
      SocketManager.disconnectSocket();
      await waitForSocketDisconnect(socket);
      // Let the caller handle re-authentication after disconnect
      return { status: "reauthenticate" };
    }
    console.error("Socket authentication failed:", error);
    return null;
  } finally {
    // CRITICAL: Reset authentication flag here because:
    // 1. Ensures flag is reset whether authentication succeeds or fails
    // 2. Prevents flag getting stuck in 'true' state if errors occur
    // 3. Runs after both try and catch blocks complete
    // 4. Guarantees cleanup even if promises are rejected
    // 5. Prevents deadlocks in future authentication attempts
    SocketManager.isAuthenticating = false;
  }
};

const isSocketAuthenticated = () => {
  const state = store.getState();
  return state.socketMetrics.authenticated;
};

// Helper to ensure socket is authenticated
const ensureSocketAuthenticated = async () => {
  // If already authenticated, return early
  if (isSocketAuthenticated()) {
    return true;
  }

  // If authentication is in progress, wait for it
  if (SocketManager.isAuthenticating) {
    console.log("Authentication already in progress, waiting...");
    for (let i = 0; i < 30; i++) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      if (isSocketAuthenticated()) {
        return true;
      }
    }
    throw new Error("Timed out waiting for authentication to complete");
  }

  // Start new authentication process
  const token = localStorage.getItem("token");
  if (!token) {
    SocketManager.isAuthenticating = false;
    throw new Error("No authentication token found");
  }
  try {
    let response = await authenticateSocket();
    // If reauthenticate is needed, do it once
    if (response && response.status === "reauthenticate") {
      // Wait a moment for socket to fully disconnect
      await new Promise((resolve) => setTimeout(resolve, 200));
      response = await authenticateSocket();
    }
    if (
      !response ||
      response.status !== SOCKET_CONSTANTS.STATUS.AUTHENTICATED
    ) {
      throw new Error("Socket authentication failed");
    }
    return true;
  } catch (error) {
    console.error("Socket authentication ensure failed:", error);
    // Cleanup on failure
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
