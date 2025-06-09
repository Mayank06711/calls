import { io } from "socket.io-client";
import env from "../config/env.config";
import store from "../redux/store";
import { socketAuthenticated, socketConnected } from "../redux/actions";
import { authenticateSocket } from "./authentication";
import { useEffect, useState } from 'react';


export const useSocket = () => {
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    const socketInstance = SocketManager.getSocket(false, true);
    setSocket(socketInstance);

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

  // Setting Event Listeners to fix disconnect issue

  static setupEventListeners() {
    SocketManager.socket.on("disconnect", (reason) => {
      store.dispatch(socketConnected(false));
      store.dispatch(socketAuthenticated(false));

      // Attempt to reconnect if disconnected by server
      if (reason === "io server disconnect") {
        SocketManager.handleReconnection();
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
        SocketManager.handleReconnection();
      });
    });
  }

  static async handleReconnection() {
    if (SocketManager.reconnectAttempts > SocketManager.maxReconnectAttempts) {
      console.error("Max reconnection attempts reached. Giving up.");
      return;
    }

    SocketManager.reconnectAttempts++;
    try {
      if (!SocketManager.socket.connected) {
        SocketManager.socket.connect();
      }
    } catch (error) {
      console.error("Reconnection failed:", error);
    }
  }

  static async handleAuthentication() {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        await authenticateSocket(token);
      } catch (error) {
        console.error("Authentication failed during reconnection:", error);
      }
    }
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
