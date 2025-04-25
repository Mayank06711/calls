import { io } from "socket.io-client";
import env from "../config/env.config";
import store from "../redux/store";
import { socketAuthenticated, socketConnected } from "../redux/actions";

class SocketManager {
  static socket = null;

  static #createSocket(testSocket = false, connectSocket = false) {
    if (SocketManager.socket) {
      if (connectSocket && !SocketManager.socket.connected) {
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

    SocketManager.socket = io(SERVER_URL, socketOptions);
    // Handle disconnect - reset both connection and authentication status
    SocketManager.socket.on("disconnect", () => {
      store.dispatch(socketConnected(false));
      store.dispatch(socketAuthenticated(false));
    });

    if (connectSocket) {
      SocketManager.socket.connect();
      store.dispatch(socketConnected(true));
    }

    return SocketManager.socket;
  }

  static getSocket(testSocket = false, connectSocket = false) {
    return SocketManager.#createSocket(testSocket, connectSocket);
  }

  static isSocketConnected() {
    const isConnected = SocketManager.socket?.connected || false;
    store.dispatch(socketConnected(isConnected));
    return isConnected;
  }

  static disconnectSocket() {
    if (SocketManager.socket?.connected) {
      SocketManager.socket.disconnect();
      store.dispatch(socketConnected(false));
      store.dispatch(socketAuthenticated(false));
    }
  }
}

export { SocketManager };
