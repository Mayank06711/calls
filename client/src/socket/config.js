import { io } from "socket.io-client";
import env from "../config/env.config";
import store from "../redux/store";
import { socketAuthenticated, socketConnected } from "../redux/actions";
import { ensureSocketAuthenticated } from "./authentication";
import { useEffect, useState } from "react";

/**
 * This hook initializes and manages the socket connection.
 * It returns the socket instance.
 *
 * When a component that uses this hook is removed from the DOM (unmounts), it disconnects the socket to prevent memory leaks. This ensures that the socket connection is not left open unnecessarily, which can cause performance issues or other problems. However, if another component (like component B) is still using the socket, this disconnection might cause issues for that component. To avoid this, it's essential to ensure that all components that use the socket are properly managing their socket connections, and ideally, there should be a single source of truth for socket management in the application.
 * @returns The socket instance.
 */
// I feel it problamatic.. as if one componen unmounts and socket disconnect and other dependent on soceket will face roblem isn1t
export const useSocket = () => {
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    // Initialize the socket instance with default parameters.
    const socketInstance = SocketManager.getSocket(false, true);
    setSocket(socketInstance);

    // Cleanup function to disconnect the socket when the component unmounts.
    return () => {
      if (socketInstance) {
        SocketManager.disconnectSocket();
      }
    };
  }, []);

  return socket;
};

class SocketManager {
  static socket = null;
  static reconnectAttempts = 0;
  static maxReconnectAttempts = 5;
  static isAuthenticating = false;

  static #createSocket(testSocket = false, connectSocket = false) {
    if (SocketManager.socket) {
      // Only connect if not already connected or authenticating
      if (
        connectSocket &&
        !SocketManager.socket.connected &&
        !SocketManager.isAuthenticating
      ) {
        console.log("[SocketManager] Connecting existing socket...");
        SocketManager.socket.connect();
        store.dispatch(socketConnected(true));
      }
      return SocketManager.socket;
    }

    const SERVER_URL = env.API_BASE_URL;
    const socketOptions = {
      reconnection: true,
      reconnectionAttempts: 3,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000,
      secure: true,
      rejectUnauthorized: false,
      autoConnect: false,
      transports: ["websocket", "polling"],
    };

    if (testSocket) {
      socketOptions.query = {
        testMode: "true",
        userId: "123",
        phoneNumber: "1234567890",
      };
    }

    console.log("[SocketManager] Creating new socket instance...");
    SocketManager.socket = io(SERVER_URL, socketOptions);
    // Handle disconnect - reset both connection and authentication status
    SocketManager.socket.on("disconnect", () => {
      console.log("[SocketManager] Socket disconnected");
      store.dispatch(socketConnected(false));
      store.dispatch(socketAuthenticated(false));
      SocketManager.isAuthenticating = false;
    });

    if (connectSocket) {
      console.log("[SocketManager] Connecting new socket...");
      SocketManager.socket.connect();
      store.dispatch(socketConnected(true));
    }

    return SocketManager.socket;
  }

  // Setting Event Listeners to fix disconnect issue

  static setupEventListeners() {
    SocketManager.socket.on("disconnect", (reason) => {
      store.dispatch(socketConnected(false));
      store.dispatch(socketAuthenticated(false));
      SocketManager.isAuthenticating = false;
      // Attempt to reconnect if disconnected by server
      if (reason === "io server disconnect") {
        // Only reset authentication flag if we're not going to reconnect
        SocketManager.handleReconnection();
      } else {
        // Reset authentication flag only if we're not attempting reconnection
        SocketManager.isAuthenticating = false;
      }

      // Handle reconnect
      SocketManager.socket.on("reconnect", async () => {
        store.dispatch(socketConnected(true));
        await SocketManager.handleAuthentication();
      });

      // Handle connect
      SocketManager.socket.on("connect", async () => {
        store.dispatch(socketConnected(true));
        SocketManager.reconnectAttempts = 0;
        await SocketManager.handleAuthentication();
      });

      // Handle connect error
      SocketManager.socket.on("connect_error", (error) => {
        console.error("Connection error:", error);
        SocketManager.isAuthenticating = false;
        SocketManager.handleReconnection();
      });
    });
  }

  static async handleReconnection() {
    if (SocketManager.reconnectAttempts > SocketManager.maxReconnectAttempts) {
      console.error("[SocketManager] Max reconnection attempts reached. Giving up.");
      return;
    }

    SocketManager.reconnectAttempts++;
    try {
      if (!SocketManager.socket.connected) {
        console.log("[SocketManager] Attempting to reconnect socket...");
        SocketManager.socket.connect();
      }
    } catch (error) {
      console.error("[SocketManager] Reconnection failed:", error);
    }
  }

  static async handleAuthentication() {
    if (localStorage.getItem("token") && !SocketManager.isAuthenticating) {
      try {
        console.log("[SocketManager] handleAuthentication called");
        await ensureSocketAuthenticated();
      } catch (error) {
        console.error("[SocketManager] Authentication failed during reconnection:", error);
      }
    }
  }

  static getSocket(testSocket = false, connectSocket = false) {
    console.log(`[SocketManager] getSocket called. testSocket: ${testSocket}, connectSocket: ${connectSocket}`);
    return SocketManager.#createSocket(testSocket, connectSocket);
  }

  static isSocketConnected() {
    const isConnected = SocketManager.socket?.connected || false;
    const isAuthenticated = store.getState().socketMetrics.authenticated;
    store.dispatch(socketConnected(isConnected && isAuthenticated));
    return isConnected && isAuthenticated;
  }

  static disconnectSocket() {
    if (SocketManager.socket?.connected) {
      console.log("[SocketManager] disconnectSocket called");
      SocketManager.socket.disconnect();
      SocketManager.isAuthenticating = false;
      store.dispatch(socketConnected(false));
      store.dispatch(socketAuthenticated(false));
    }
  }
}

export { SocketManager };
