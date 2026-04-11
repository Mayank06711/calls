import { Middleware } from "../middlewares/middlewares";
import {
  FileUploadData,
  FileUploadResponse,
  CloudinaryUploadOptions,
} from "../interface/interface";
import { getCloudinary } from "../db";
import { AWS_SERVICES } from "./aws";

class FileHandler {
  // Type-specific allowed MIME types
  private static readonly ALLOWED_IMAGE_TYPES = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
  ];
  private static readonly ALLOWED_VIDEO_TYPES = [
    "video/mp4",
    "video/webm",
    "video/quicktime",
  ];

  // Type-specific size limits
  private static readonly SIZE_LIMITS: Record<string, number> = {
    avatar: 5 * 1024 * 1024,  // 5MB
    chat: 5 * 1024 * 1024,    // 5MB
    reel: 8 * 1024 * 1024,    // 8MB
  };

  // Type-specific folder mapping
  private static readonly FOLDER_MAP: Record<string, string> = {
    avatar: "avatars",
    chat: "chat",
    reel: "reels",
  };

  /** Returns allowed MIME types for the given upload type */
  private static getAllowedTypes(uploadType: string): string[] {
    switch (uploadType) {
      case "avatar":
        return this.ALLOWED_IMAGE_TYPES;
      case "chat":
        return [...this.ALLOWED_IMAGE_TYPES, ...this.ALLOWED_VIDEO_TYPES];
      case "reel":
        return this.ALLOWED_VIDEO_TYPES;
      default:
        return this.ALLOWED_IMAGE_TYPES;
    }
  }

  /** Returns whether a MIME type is a video type */
  private static isVideoType(fileType: string): boolean {
    return this.ALLOWED_VIDEO_TYPES.includes(fileType);
  }

  public static async upload({
    folder,
    file,
    isBuffer = false,
    fileName,
    uploadPreset,
    fileType,
  }: CloudinaryUploadOptions): Promise<FileUploadResponse> {
    try {
      const isVideo = fileType ? this.isVideoType(fileType) : false;

      let uploadData: any = {
        folder,
        resource_type: "auto",
        eager_async: true,
        quality: "auto:good",
      };

      // Use different eager transforms for video vs image
      if (isVideo) {
        uploadData.eager = [
          { width: 720, crop: "scale", quality: "auto", format: "mp4" },
          { width: 480, crop: "scale", quality: "auto", format: "jpg", start_offset: "0" },
        ];
      } else {
        uploadData.eager = [
          { width: 800, crop: "scale", quality: "auto" },
          { width: 400, crop: "scale", quality: "auto" },
        ];
      }

      // Convert file to base64
      if (isBuffer && Buffer.isBuffer(file)) {
        // If it's a buffer with mimetype info
        if (Array.isArray(file) && file[0]?.mimetype) {
          uploadData.file = Middleware.getBase64(file);
        } else {
          // Fallback for plain buffer
          const mimePrefix = fileType || "image/jpeg";
          uploadData.file = `data:${mimePrefix};base64,${file.toString("base64")}`;
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
          duration: result.duration,
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

  /**
   * Delete a single resource from Cloudinary by public_id.
   * Automatically detects resource_type from the public_id path.
   */
  public static async deleteFromCloudinary(publicId: string, resourceType: "image" | "video" = "image"): Promise<boolean> {
    try {
      const result = await getCloudinary().uploader.destroy(publicId, {
        resource_type: resourceType,
      });
      return result.result === "ok";
    } catch (error) {
      console.error(`Cloudinary delete error for ${publicId}:`, error);
      return false;
    }
  }

  /**
   * Delete all media (photos + videos) from a message's media object.
   * Reusable for delete-for-everyone and any other cleanup.
   */
  public static async deleteMessageMedia(media?: { photos?: { public_id?: string }[]; videos?: { public_id?: string }[] }): Promise<void> {
    if (!media) return;

    const promises: Promise<boolean>[] = [];

    if (media.photos?.length) {
      for (const photo of media.photos) {
        if (photo.public_id) {
          promises.push(this.deleteFromCloudinary(photo.public_id, "image"));
        }
      }
    }

    if (media.videos?.length) {
      for (const video of media.videos) {
        if (video.public_id) {
          promises.push(this.deleteFromCloudinary(video.public_id, "video"));
        }
      }
    }

    if (promises.length > 0) {
      await Promise.allSettled(promises);
    }
  }

  /**
   * Delete a file from cloud storage given its full URL.
   * Detects whether the URL is Cloudinary or S3 and calls the appropriate API.
   */
  public static async deleteFromUrl(url: string): Promise<boolean> {
    if (!url || typeof url !== "string") return false;

    try {
      // Cloudinary URL
      if (url.includes("res.cloudinary.com")) {
        const match = url.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.\w+)?$/);
        if (!match) return false;
        const publicId = match[1];
        return this.deleteFromCloudinary(publicId, "image");
      }

      // S3 URL
      if (url.includes(".s3.") || url.includes("s3.amazonaws.com")) {
        const urlObj = new URL(url);
        const key = urlObj.pathname.slice(1); // remove leading /
        const bucket = process.env.AWS_S3_BUCKET_NAME!;
        return AWS_SERVICES.deleteObject(bucket, key);
      }
    } catch (error) {
      console.error(`Cloud delete error for URL ${url}:`, error);
    }

    return false;
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
      const uploadType = data.type || "chat";
      const maxSize = this.SIZE_LIMITS[uploadType] || this.SIZE_LIMITS.chat;
      const maxMB = maxSize / (1024 * 1024);

      // Validate file size
      if (data.size > maxSize) {
        return callback({
          status: "error",
          message: `File size exceeds ${maxMB}MB limit`,
          metadata: {
            error: "File size limit exceeded",
            size: data.size,
            type: data.fileType,
          },
        });
      }

      // Validate file type based on upload type
      const allowedTypes = this.getAllowedTypes(uploadType);
      if (!allowedTypes.includes(data.fileType)) {
        const typeLabels: Record<string, string> = {
          avatar: "JPEG, PNG, GIF and WebP",
          chat: "JPEG, PNG, GIF, WebP, MP4, WebM and MOV",
          reel: "MP4, WebM and MOV",
        };
        return callback({
          status: "error",
          message: `Invalid file type. Only ${typeLabels[uploadType] || typeLabels.chat} allowed`,
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

      const folderPrefix = this.FOLDER_MAP[uploadType] || "chat";
      const folder = `${folderPrefix}/${userId}`;

      // Upload to Cloudinary
      const uploadResult = await FileHandler.upload({
        folder,
        file: fileData,
        isBuffer,
        fileName: data.fileName,
        fileType: data.fileType,
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
