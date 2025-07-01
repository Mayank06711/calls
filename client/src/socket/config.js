// SocketManager singleton: encapsulates all socket logic (connect, disconnect, authenticate, event listeners)
// Does not own state, only dispatches Redux actions for flag updates
// No React hooks in this file

import { io } from "socket.io-client";
import env from "../config/env.config";
import store from "../redux/store";
import { socketAuthenticated, socketConnected } from "../redux/actions";
// import { ensureSocketAuthenticated } from "./authentication";

class SocketManager {
  static socket = null;
  static reconnectAttempts = 0;
  static maxReconnectAttempts = 5;
  static isAuthenticating = false;

  // Create or return the singleton socket instance
  static #createSocket(testSocket = false, connectSocket = false) {
    if (SocketManager.socket) {
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

  // Get the singleton socket instance
  static getSocket(testSocket = false, connectSocket = false) {
    console.log(`[SocketManager] getSocket called. testSocket: ${testSocket}, connectSocket: ${connectSocket}`);
    return SocketManager.#createSocket(testSocket, connectSocket);
  }

  // Returns true if socket is connected and authenticated (Redux flags)
  static isSocketConnected() {
    const isConnected = SocketManager.socket?.connected || false;
    const isAuthenticated = store.getState().socketMetrics.authenticated;
    store.dispatch(socketConnected(isConnected && isAuthenticated));
    return isConnected && isAuthenticated;
  }

  // Disconnects the socket and resets flags
  static disconnectSocket() {
    if (SocketManager.socket?.connected) {
      console.log("[SocketManager] disconnectSocket called");
      SocketManager.socket.disconnect();
      SocketManager.isAuthenticating = false;
      store.dispatch(socketConnected(false));
      store.dispatch(socketAuthenticated(false));
    }
  }

  // (Optional) Add event listeners for custom events
  static on(event, handler) {
    if (SocketManager.socket) {
      SocketManager.socket.on(event, handler);
    }
  }

  static off(event, handler) {
    if (SocketManager.socket) {
      SocketManager.socket.off(event, handler);
    }
  }
}

export { SocketManager };
