import { createSocket } from "../socket/config";
import { emitEvent } from "../socket/socketUtils";
import { SOCKET_CONSTANTS } from "../constants/socketContanst";
import {
  socketConnected,
  socketAuthenticated,
} from "../redux/actions/socket.actions";
import store from "../redux/store";
import { showNotification } from "../redux/actions/notification.actions";

export const authenticateSocket = async (token) => {
  try {
    const socket = createSocket(false);

    if (!socket.connected) {
      socket.connect();
      store.dispatch(socketConnected());
    }

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
            store.dispatch(socketAuthenticated());
            console.log("Socket authenticated successfully:", response);
          } else {
            store.dispatch(showNotification("You may not be able to chat... since not connected with real time connection", "info"))
          }
        },
        onError: (error) => {
          console.error("Socket authentication error:", error);
          store.dispatch(showNotification("Real-time services limited", "error"));
        },
        onTimeout: () => {
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
