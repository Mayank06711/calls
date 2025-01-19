import { Middleware } from "../middlewares/middlewares";
import {
  FileUploadData,
  FileUploadResponse,
  CloudinaryUploadOptions,
} from "../types/interface";
import { getCloudinary } from "../db";

class FileHandler {
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
          { width: 800, crop: "scale", quality: "auto" },
          { width: 400, crop: "scale", quality: "auto" },
        ],
        eager_async: true,
        quality: "auto:good",
      };

      // Convert file to base64
      if (isBuffer && Buffer.isBuffer(file)) {
        // If it's a buffer with mimetype info
        if (Array.isArray(file) && file[0]?.mimetype) {
          uploadData.file = Middleware.getBase64(file);
        } else {
          // Fallback for plain buffer
          uploadData.file = `data:image/jpeg;base64,${file.toString("base64")}`;
        }
      } else if (typeof file === "string") {
        // If it's already a base64 string, use it directly
        if (file.startsWith("data:")) {
          uploadData.file = file;
        } else {
          // If it's a string but not base64, assume it's base64 without prefix
          uploadData.file = `data:${
            uploadPreset || "image/png"
          };base64,${file}`;
        }
      } else {
        return {
          status: "error",
          message: "Invalid file format",
          metadata: {
            error: undefined,
          },
        };
      }

      // Add public_id if filename is provided
      if (fileName) {
        uploadData.public_id = fileName.split(".")[0];
      }

      // Add upload preset if provided
      if (uploadPreset) {
        uploadData.upload_preset = uploadPreset;
      }

      const result = await getCloudinary().uploader.upload(
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

  public static async handleFileUpload({
    data,
    callback,
    userId,
  }: {
    data: FileUploadData;
    callback: (response: FileUploadResponse) => void;
    userId: string;
  }): Promise<void> {
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
      console.log(data);
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

      const folder =
        data.type === "avatar" ? `avatars/${userId}` : `chat/${userId}`;

      // Upload to Cloudinary
      const uploadResult = await FileHandler.upload({
        folder,
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
