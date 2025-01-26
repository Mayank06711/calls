export const SOCKET_CONSTANTS = {
  // Authentication Events
  AUTH: {
    AUTHENTICATE: "authenticate",
    AUTHENTICATED: "authenticated",
    AUTH_ERROR: "auth_error",
    AUTH_TIMEOUT: "auth_timeout",
    LOGOUT: "logout",
  },

  // Connection Events
  CONNECTION: {
    CONNECT: "connect",
    DISCONNECT: "disconnect",
    CONNECT_ERROR: "connect_error",
    RECONNECT: "reconnect",
    RECONNECT_ATTEMPT: "reconnect_attempt",
    RECONNECT_ERROR: "reconnect_error",
    RECONNECT_FAILED: "reconnect_failed",
  },

  // File Upload Events
  FILE: {
    UPLOAD: "file:upload",
    UPLOAD_START: "file:upload:start",
    UPLOAD_SUCCESS: "file:upload:success",
    UPLOAD_ERROR: "file:upload:error",
    UPLOAD_PROGRESS: "file:upload:progress",
    UPLOAD_RESPONSE: "file:upload:response",
  },

  // User Events
  USER: {
    AVATAR_UPDATED: "avatar:updated",
    STATUS_CHANGE: "user:status",
    PROFILE_UPDATE: "user:profile:update",
  },

  // System Events
  SYSTEM: {
    ERROR: "error",
    TOTAL_SOCKETS: "total:sockets",
    SERVER_SHUTDOWN: "server:shutdown",
  },

  // Room Events
  ROOM: {
    JOIN: "room:join",
    LEAVE: "room:leave",
    MESSAGE: "room:message",
  },

  // Status Codes
  STATUS: {
    SUCCESS: "success",
    ERROR: "error",
    AUTHENTICATED: "authenticated",
    REFRESHED: "refreshed",
  },

  // Error Types
  ERROR_TYPES: {
    AUTH_FAILED: "Authentication failed",
    CONNECTION_ERROR: "Connection error",
    TIMEOUT: "Request timeout",
    SERVER_ERROR: "Server error",
    INVALID_TOKEN: "Invalid token",
    TOO_MANY_CONNECTIONS: "Too many connections",
    UPLOAD_FAILED: "File upload failed",
  },

  // Response Types
  RESPONSE_TYPES: {
    ACK: "acknowledgement",
    NOTIFICATION: "notification",
    DATA: "data",
    ERROR: "error",
  },
};
