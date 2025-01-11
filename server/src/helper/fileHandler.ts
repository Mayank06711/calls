import { Socket } from "socket.io";
import {
  FileUploadData,
  FileUploadResponse,
  CloudinaryUploadOptions,
} from "../types/interface";
import { v2 as cloudinary } from "cloudinary";

class FileHandler {
  static {
    // Configure cloudinary
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET_KEY,
    });
  }

  private static readonly MAX_FILE_SIZE = 3 * 1024 * 1024; // 3MB
  private static readonly ALLOWED_TYPES = [
    "image/jpeg",
    "image/png",
    "image/gif",
  ];

  public static async upload({
    folder,
    file,
    isBuffer = false,
    fileName,
    uploadPreset,
  }: CloudinaryUploadOptions): Promise<FileUploadResponse> {
    try {
      let uploadData: any = {
        folder,
        resource_type: "auto",
        eager: [
          { width: 800, quality: "auto" }, // Full size
          { width: 400, quality: "auto" }, // Thumbnail
        ],
        eager_async: true,
        format: "auto",
        quality: "auto",
      };

      // If it's a buffer, we need to convert it to base64
      if (isBuffer && Buffer.isBuffer(file)) {
        uploadData.file = `data:image/jpeg;base64,${file.toString("base64")}`;
      } else {
        uploadData.file = file;
      }

      // Add public_id if filename is provided
      if (fileName) {
        uploadData.public_id = `${folder}/${fileName.split(".")[0]}`;
      }

      // Add upload preset if provided
      if (uploadPreset) {
        uploadData.upload_preset = uploadPreset;
      }

      const result = await cloudinary.uploader.upload(
        uploadData.file,
        uploadData
      );

      return {
        status: "success",
        message: "File uploaded successfully",
        fileUrl: result.secure_url,
        publicId: result.public_id,
        thumbnailUrl: result.eager?.[1]?.secure_url,
        metadata: {
          width: result.width,
          height: result.height,
          type: result.format,
          size: result.bytes,
        },
      };
    } catch (error) {
      console.error("Cloudinary upload error:", error);
      return {
        status: "error",
        message: "Failed to upload file to cloud storage",
        metadata: {
          error: error instanceof Error ? error.message : "Unknown error",
        },
      };
    }
  }

  public static async handleFileUpload(
    {
      data,
      callback,
    }: {
      data: FileUploadData;
      callback: (response: FileUploadResponse) => void;
    },
    socket: Socket
  ): Promise<void> {
    try {
      // Validate file size
      if (data.size > this.MAX_FILE_SIZE) {
        return callback({
          status: "error",
          message: "File size exceeds 3MB limit",
          metadata: {
            error: "File size limit exceeded",
            size: data.size,
            type: data.fileType,
          },
        });
      }

      // Validate file type
      if (!this.ALLOWED_TYPES.includes(data.fileType)) {
        return callback({
          status: "error",
          message: "Invalid file type. Only JPEG, PNG and GIF allowed",
          metadata: {
            error: "Invalid file type",
            type: data.fileType,
          },
        });
      }

      // Get user ID from socket data
      const userId = socket.data.userId;
      if (!userId) {
        return callback({
          status: "error",
          message: "User not authenticated",
        });
      }

      if (typeof data.file !== "string" && !Buffer.isBuffer(data.file)) {
        return callback({
          status: "error",
          message: "Invalid file format",
          metadata: {
            error: "Invalid file format",
            type: typeof data.file,
          },
        });
      }

      let fileData: string | Buffer;
      let isBuffer = false;

      // Handle different file formats
      if (Buffer.isBuffer(data.file)) {
        fileData = data.file;
        isBuffer = true;
      } else if (typeof data.file === "string") {
        if (data.file.includes("base64")) {
          fileData = data.file;
        } else {
          // If it's a string but not base64, convert to buffer
          fileData = Buffer.from(data.file);
          isBuffer = true;
        }
      } else {
        return callback({
          status: "error",
          message: "Invalid file format",
          metadata: { type: typeof data.file },
        });
      }

      // Upload to Cloudinary
      const uploadResult = await this.upload({
        folder: `chat/${socket.data.userId}`,
        file: fileData,
        isBuffer,
        fileName: data.fileName,
      });
      if (uploadResult.status === "error") {
        return callback(uploadResult);
      }

      const response: FileUploadResponse = {
        status: "success",
        message: "File uploaded successfully",
        fileUrl: uploadResult.fileUrl,
        publicId: uploadResult.publicId,
        thumbnailUrl: uploadResult.thumbnailUrl,
        metadata: {
          ...uploadResult.metadata,
          ...data.metadata,
        },
      };

      callback(response);
    } catch (error) {
      console.error("File upload error:", error);
      callback({
        status: "error",
        message: "Failed to process file",
        metadata: {
          error: error instanceof Error ? error.message : "Unknown error",
        },
      });
    }
  }
}

export { FileHandler };
