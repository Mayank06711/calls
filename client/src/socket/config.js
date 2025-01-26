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

// Socket state
// let socket = null;
// let connected = false;
// let authenticated = false;

// Socket management functions
// const socketManager = {
//   // Initialize socket connection
//   init() {
//     if (!socket) {
//       socket = createSocket();
//       this.setupEventListeners();
//     }
//     return socket;
//   },

//   // Setup default event listeners
//   setupEventListeners() {
//     socket.on("connect", () => {
//       console.log("Connected to socket server");
//       connected = true;
//     });

//     socket.on("disconnect", (reason) => {
//       console.log("Disconnected from socket server:", reason);
//       connected = false;
//       authenticated = false;
//     });

//     socket.on("connect_error", (error) => {
//       console.error("Socket connection error:", error);
//       connected = false;
//     });

//     socket.on("error", (error) => {
//       console.error("Socket error:", error);
//     });

//     socket.on("authenticate", (response) => {
//       authenticated = response.status === "success";
//       console.log("Authentication response:", response);
//     });
//   },

//   // Connect to socket server
//   connect() {
//     if (!socket) this.init();
//     socket.connect();
//   },

//   // Disconnect from socket server
//   disconnect() {
//     if (connected && socket) {
//       socket.disconnect();
//     }
//   },

//   // Authenticate socket connection
//   async authenticate(tokens) {
//     return new Promise((resolve) => {
//       const timeout = setTimeout(() => {
//         resolve({ status: "error", message: "Authentication timeout" });
//       }, 5000);

//       socket.emit("authenticate", tokens, (response) => {
//         clearTimeout(timeout);
//         authenticated = response.status === "success";
//         resolve(response);
//       });
//     });
//   },

//   // Handle file uploads
//   async uploadFile(fileData) {
//     return new Promise((resolve, reject) => {
//       const timeout = setTimeout(() => {
//         reject(new Error("File upload timeout"));
//       }, 30000);

//       socket.emit("file:upload", fileData, (response) => {
//         clearTimeout(timeout);
//         if (response.status === "success") {
//           resolve(response);
//         } else {
//           reject(new Error(response.message));
//         }
//       });
//     });
//   },

//   // Emit events with timeout
//   async emit(event, data, options = {}) {
//     return new Promise((resolve, reject) => {
//       const timeout = setTimeout(() => {
//         reject(new Error(`Event ${event} timeout`));
//       }, options.timeout || 5000);

//       socket.emit(event, data, (response) => {
//         clearTimeout(timeout);
//         resolve(response);
//       });
//     });
//   },

//   // Subscribe to events
//   on(event, callback) {
//     if (!socket) this.init();
//     socket.on(event, callback);
//     return () => socket.off(event, callback);
//   },

//   // Status checks
//   isConnected() {
//     return connected;
//   },

//   isAuthenticated() {
//     return authenticated;
//   },

//   getSocketId() {
//     return socket?.id;
//   },

//   // Room management
//   joinRoom(room) {
//     socket.emit("join:room", { room });
//   },

//   leaveRoom(room) {
//     socket.emit("leave:room", { room });
//   },

//   // Get socket instance
//   getSocket() {
//     if (!socket) this.init();
//     return socket;
//   },
// };

// export default socketManager;

// Example usage in React components:
/*
import socketManager from './socket/config';
import { useEffect } from 'react';

function YourComponent() {
  useEffect(() => {
    // Connect to socket
    socketManager.connect();

    // Authenticate
    const authenticate = async () => {
      try {
        const response = await socketManager.authenticate({
          accessToken: 'your-token',
          refreshToken: 'your-refresh-token'
        });
        console.log('Authentication:', response);
      } catch (error) {
        console.error('Authentication failed:', error);
      }
    };

    authenticate();

    // Setup event listener
    const cleanup = socketManager.on('some:event', (data) => {
      console.log('Event received:', data);
    });

    // Cleanup on unmount
    return () => {
      cleanup();
      socketManager.disconnect();
    };
  }, []);

  // File upload example
  const handleFileUpload = async (file) => {
    try {
      const fileData = {
        type: 'avatar',
        file: await convertToBase64(file),
        fileName: file.name
      };
      
      const response = await socketManager.uploadFile(fileData);
      console.log('Upload success:', response);
    } catch (error) {
      console.error('Upload failed:', error);
    }
  };

  return <div>Your Component</div>;
}

// Custom hook example
export function useSocket(event, callback) {
  useEffect(() => {
    socketManager.connect();
    const cleanup = socketManager.on(event, callback);
    
    return () => {
      cleanup();
    };
  }, [event, callback]);

  return {
    isConnected: socketManager.isConnected(),
    isAuthenticated: socketManager.isAuthenticated(),
    socketId: socketManager.getSocketId(),
    emit: socketManager.emit,
    uploadFile: socketManager.uploadFile,
  };
}
*/
