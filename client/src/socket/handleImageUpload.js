import { SocketManager } from "./config";
import { SOCKET_CONSTANTS } from "../constants/socketContanst";
import store from "../redux/store";
import { showNotification } from "../redux/actions/notification.actions";
import { ensureSocketAuthenticated, isSocketAuthenticated } from "./authentication";

// Type-specific validation rules
const UPLOAD_RULES = {
  avatar: {
    allowedTypes: ["image/jpeg", "image/png", "image/jpg", "image/gif", "image/webp"],
    maxSize: 5 * 1024 * 1024, // 5MB
    label: "image (JPEG, PNG, GIF, WebP)",
    folder: "avatars",
  },
  chat: {
    allowedTypes: [
      "image/jpeg", "image/png", "image/jpg", "image/gif", "image/webp",
      "video/mp4", "video/webm", "video/quicktime",
    ],
    maxSize: 5 * 1024 * 1024, // 5MB
    label: "image or video (JPEG, PNG, GIF, WebP, MP4, WebM, MOV)",
    folder: "chat_images",
  },
  reel: {
    allowedTypes: ["video/mp4", "video/webm", "video/quicktime"],
    maxSize: 8 * 1024 * 1024, // 8MB
    label: "video (MP4, WebM, MOV)",
    folder: "reels",
  },
};

const validateFile = (file, type) => {
  const rules = UPLOAD_RULES[type];
  if (!rules) {
    throw new Error(`Unknown upload type: ${type}`);
  }

  console.log("Validating file:", {
    type: file.type,
    size: file.size,
    name: file.name,
    uploadType: type,
  });

  if (!rules.allowedTypes.includes(file.type)) {
    throw new Error(`Please upload a valid ${rules.label}`);
  }

  const maxMB = rules.maxSize / (1024 * 1024);
  if (file.size > rules.maxSize) {
    throw new Error(`File size should not exceed ${maxMB}MB`);
  }

  console.log("File validation passed");
  return true;
};

const convertToBuffer = (file) => {
  console.log("Converting file to buffer:", file.name);
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsArrayBuffer(file);

    reader.onload = () => {
      const arrayBuffer = reader.result;
      const uint8Array = new Uint8Array(arrayBuffer);
      console.log(
        "Buffer conversion successful, length:",
        uint8Array.length
      );
      resolve(uint8Array);
    };

    reader.onerror = (error) => {
      console.error("Buffer conversion failed:", error);
      reject(error);
    };
  });
};

/**
 * Upload a file via socket.
 *
 * Supports two call signatures for backward compatibility:
 *   1. uploadImage(file, onProgress)          — legacy avatar upload
 *   2. uploadImage({ file, type, onProgress, metadata }) — new unified upload
 *
 * @param {File|Object} fileOrOptions - A File (legacy) or options object
 * @param {Function}    [onProgressLegacy] - Progress callback (legacy signature only)
 */
export const uploadImage = async (fileOrOptions, onProgressLegacy) => {
  // Normalise arguments: support both legacy (file, onProgress) and new ({ file, type, ... }) signatures
  let file, type, onProgress, metadata;

  if (fileOrOptions instanceof File) {
    // Legacy call: uploadImage(file, onProgress) — defaults to avatar
    file = fileOrOptions;
    type = "avatar";
    onProgress = onProgressLegacy || (() => {});
    metadata = { uploadType: "cloudinary", folder: "avatars" };
  } else {
    // New call: uploadImage({ file, type, onProgress, metadata })
    file = fileOrOptions.file;
    type = fileOrOptions.type || "avatar";
    onProgress = fileOrOptions.onProgress || (() => {});
    metadata = fileOrOptions.metadata || { uploadType: "cloudinary", folder: UPLOAD_RULES[type]?.folder || "uploads" };
  }

  console.log(`Starting ${type} upload for: ${file.name}`);
  const socket = SocketManager.getSocket(false, true);

  try {
    // Ensure socket is connected and authenticated
    if (!SocketManager.isSocketConnected()) {
      socket.connect();
    }
    if (!isSocketAuthenticated()) {
      await ensureSocketAuthenticated();
    }

    validateFile(file, type);
    const fileBuffer = await convertToBuffer(file);

    const result = await new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        cleanup();
        reject(new Error("Upload timed out"));
      }, 300000); // 5 minutes

      // Disconnect listener — reject if socket drops mid-upload
      const onDisconnect = (reason) => {
        console.error(`Socket disconnected during ${type} upload:`, reason);
        cleanup();
        reject(new Error("Connection lost during upload. Please try again."));
      };

      const cleanup = () => {
        console.log("Cleaning up upload listeners");
        socket.off(SOCKET_CONSTANTS.FILE.UPLOAD_RESPONSE);
        socket.off(SOCKET_CONSTANTS.FILE.UPLOAD_ERROR);
        socket.off(SOCKET_CONSTANTS.FILE.UPLOAD_START);
        socket.off(SOCKET_CONSTANTS.FILE.UPLOAD_SUCCESS);
        socket.off(SOCKET_CONSTANTS.CONNECTION.DISCONNECT, onDisconnect);
        clearTimeout(timeoutId);
      };

      // Listen for disconnect during upload
      socket.on(SOCKET_CONSTANTS.CONNECTION.DISCONNECT, onDisconnect);

      // Setup event listeners
      socket.on(SOCKET_CONSTANTS.FILE.UPLOAD_START, (data) => {
        console.log(`${type} upload started:`, data);
        onProgress(10);
      });

      socket.on(SOCKET_CONSTANTS.FILE.UPLOAD_SUCCESS, (response) => {
        console.log(`${type} upload success:`, response);
        if (response.status === "success") {
          onProgress(100);
          cleanup();
          resolve(response);
        } else {
          cleanup();
          reject(new Error(response.message || "Upload failed"));
        }
      });

      socket.on(SOCKET_CONSTANTS.FILE.UPLOAD_ERROR, (error) => {
        console.error(`${type} upload error:`, error);
        cleanup();
        reject(new Error(error.message || "Upload failed"));
      });

      // Emit the upload event
      const uploadData = {
        file: fileBuffer,
        fileName: file.name,
        fileType: file.type,
        size: file.size,
        type,
        metadata,
      };

      console.log(
        `Emitting file upload event for ${type}, connected: ${socket.connected}, id: ${socket.id}`
      );
      socket.emit("file:upload", uploadData);
    });

    return result;
  } catch (error) {
    console.error("Upload process error:", error);
    store.dispatch(showNotification(error.message || "Upload failed", "error"));
    throw error;
  }
};
