import { SocketManager } from "../socket/config";
import { emitEvent } from "../socket/socketUtils";
import { SOCKET_CONSTANTS } from "../constants/socketContanst";
import { socketAuthenticated } from "../redux/actions/socket.actions";
import store from "../redux/store";
import { showNotification } from "../redux/actions/notification.actions";

const authenticateSocket = async (token) => {
  try {
    // Get a connected socket using the SocketManager
    const socket = SocketManager.getSocket(false, true);

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
          if (response.status === SOCKET_CONSTANTS.STATUS.AUTHENTICATED) {
            store.dispatch(socketAuthenticated(true));
            console.log("Socket authenticated successfully");
            store.dispatch(
              showNotification("Socket authenticated successfully", "info")
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
  }
};

const isSocketAuthenticated = () => {
  const state = store.getState();
  return state.socketMetrics.authenticated;
};

// Helper to ensure socket is authenticated
const ensureSocketAuthenticated = async () => {
  if (!isSocketAuthenticated()) {
    const token = localStorage.getItem("token");
    if (!token) {
      throw new Error("No authentication token found");
    }
    const response = await authenticateSocket(token);
    if (
      !response ||
      response.status !== SOCKET_CONSTANTS.STATUS.AUTHENTICATED
    ) {
      throw new Error("Socket authentication failed");
    }
  }
  return true;
};

export { ensureSocketAuthenticated, isSocketAuthenticated, authenticateSocket };
