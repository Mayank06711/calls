import { SocketManager } from "./config";
import { emitEvent } from "./socketUtils";
import { SOCKET_CONSTANTS } from "../constants/socketContanst";
import store from "../redux/store";
import { showNotification } from "../redux/actions/notification.actions";
import { ensureSocketAuthenticated } from "./authentication";

const validateFile = (file) => {
  console.log("Validating file:", {
    type: file.type,
    size: file.size,
    name: file.name,
  });

  const validTypes = [
    "image/jpeg",
    "image/png",
    "image/jpg",
    "image/gif",
    "image/webp",
  ];
  const maxSize = 5 * 1024 * 1024; // 5MB

  if (!validTypes.includes(file.type)) {
    throw new Error("Please upload a valid image file (JPEG, PNG, GIF, WebP)");
  }

  if (file.size > maxSize) {
    throw new Error("File size should not exceed 5MB");
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
      // Convert ArrayBuffer to Uint8Array
      const arrayBuffer = reader.result;
      const uint8Array = new Uint8Array(arrayBuffer);
      console.log(
        "Buffer conversion successful, length:",
        uint8Array.length,
        uint8Array
      );
      resolve(uint8Array);
    };

    reader.onerror = (error) => {
      console.error("Buffer conversion failed:", error);
      reject(error);
    };
  });
};

export const uploadImage = async (file, onProgress = () => {}) => {
  console.log("Starting image upload process for:", file.name);
  const socket = SocketManager.getSocket(false, true);

  try {
    // Ensure socket is connected and authenticated
    // Ensure socket is connected
    if (!SocketManager.isSocketConnected()) {
      socket.connect();
    }
    // Check and ensure authentication before proceeding
    await ensureSocketAuthenticated();

    validateFile(file);
    const fileBuffer = await convertToBuffer(file);

    // Handle single upload at a time instead of parallel uploads
    const uploadFile = async (fileData) => {
      console.log("upload file with file data", fileData);
      return new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          cleanup();
          reject(new Error("Upload timed out"));
        }, 300000);

        const cleanup = () => {
          console.log("clean up starting");
          socket.off(SOCKET_CONSTANTS.FILE.UPLOAD_RESPONSE);
          socket.off(SOCKET_CONSTANTS.FILE.UPLOAD_ERROR);
          socket.off(SOCKET_CONSTANTS.FILE.UPLOAD_START);
          socket.off(SOCKET_CONSTANTS.FILE.UPLOAD_SUCCESS);
          clearTimeout(timeoutId);
        };

        // Setup event listeners
        socket.on(SOCKET_CONSTANTS.FILE.UPLOAD_START, (data) => {
          console.log(`${fileData.type} upload started:`, data);
          onProgress(10);
        });

        socket.on(SOCKET_CONSTANTS.FILE.UPLOAD_SUCCESS, (response) => {
          console.log(`${fileData.type} upload response:`, response);
          if (response.status === "success") {
            onProgress(100);
            cleanup();
            console.log("upload response", resolve);
            resolve(response);
          } else {
            cleanup();
            reject(new Error(response.message || "Upload failed"));
          }
        });

        socket.on(SOCKET_CONSTANTS.FILE.UPLOAD_ERROR, (error) => {
          console.error(`${fileData.type} upload error:`, error);
          cleanup();
          reject(new Error(error.message || "Upload failed"));
        });

        // Emit the upload event
        const uploadData = {
          file: fileBuffer,
          fileName: file.name,
          fileType: file.type,
          size: file.size,
          type: fileData.type,
          metadata: fileData.metadata,
        };

        console.log(
          `Emitting file upload event for ${fileData.type}, ${socket.connected}, ${socket.id}`
        );
        socket.emit("file:upload", uploadData);
      });
    };

    // Upload avatar first, then chat file if needed
    const avatarData = {
      type: "avatar",
      metadata: {
        uploadType: "cloudinary",
        folder: "avatars",
      },
    };

    const result = await uploadFile(avatarData);
    return result;
  } catch (error) {
    console.error("Upload process error:", error);
    store.dispatch(showNotification(error.message || "Upload failed", "error"));
    throw error;
  }
};


