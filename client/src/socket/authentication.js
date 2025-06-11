import { SocketManager } from "../socket/config";
import { emitEvent } from "../socket/socketUtils";
import { SOCKET_CONSTANTS } from "../constants/socketContanst";
import {
  socketAuthenticated,
  socketConnected,
} from "../redux/actions/socket.actions";
import store from "../redux/store";
import { showNotification } from "../redux/actions/notification.actions";

const authenticateSocket = async (token) => {
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
    // make the flag true;
    SocketManager.isAuthenticating = true;
    const response = await emitEvent(socket, {
      event: SOCKET_CONSTANTS.AUTH.AUTHENTICATE,
      data: { accessToken: token },
      timeout: 30000,
      retryOptions: {
        maxRetries: 3,
        delay: 1000,
        exponential: true,
        shouldRetry: (error) =>
          error.message !== SOCKET_CONSTANTS.ERROR_TYPES.INVALID_TOKEN,
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
        onError: (error) => {
          console.error("Socket authentication error:", error);
          store.dispatch(
            showNotification("Real-time services limited", "error")
          );
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
    // Wait for a reasonable time for authentication to complete
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
    const response = await authenticateSocket(token);

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

export { ensureSocketAuthenticated, isSocketAuthenticated, authenticateSocket };
