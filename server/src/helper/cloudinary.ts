import { v2 as cloudinary, UploadApiResponse } from "cloudinary";
import { ApiError } from "../utils/apiError";
import streamifier from "streamifier";

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

interface CloudinaryUploadResult {
  url: string;
  public_id: string;
  secure_url: string;
}

class CLOUDINARY_SERVICES {
  // Upload single file to Cloudinary
  private static async uploadToCloudinary(
    file: Express.Multer.File,
    folder: string = "uploads"
  ): Promise<string> {
    try {
      return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: folder,
            resource_type: "auto", // Automatically detect file type
            use_filename: true,
            unique_filename: true,
          },
          (error, result) => {
            if (error) {
              reject(
                new ApiError(500, error.message || "Cloudinary upload failed")
              );
            } else {
              resolve(result!.secure_url);
            }
          }
        );

        // Convert buffer to stream and pipe to Cloudinary
        streamifier.createReadStream(file.buffer).pipe(uploadStream);
      });
    } catch (error: any) {
      console.error("Error uploading to Cloudinary:", error);
      throw new ApiError(
        500,
        error?.message || "Failed to upload to Cloudinary",
        [error]
      );
    }
  }

  // Upload multiple files to Cloudinary
  private static async uploadMultipleToCloudinary(
    files: Express.Multer.File[],
    folder: string = "uploads"
  ): Promise<string[]> {
    try {
      const uploadPromises = files.map((file) =>
        CLOUDINARY_SERVICES.uploadToCloudinary(file, folder)
      );
      return await Promise.all(uploadPromises);
    } catch (error: any) {
      console.error("Error uploading multiple files to Cloudinary:", error);
      throw new ApiError(
        500,
        error?.message || "Failed to upload files to Cloudinary",
        [error]
      );
    }
  }

  // Generate presigned upload URL for Cloudinary (using unsigned upload)
  private static async generateCloudinaryUploadUrl(
    fileName: string,
    folder: string = "uploads"
  ): Promise<{
    uploadUrl: string;
    publicId: string;
    signature: string;
    timestamp: number;
  }> {
    try {
      const timestamp = Math.round(new Date().getTime() / 1000);
      const publicId = `${folder}/${Date.now()}-${fileName.replace(
        /[^a-zA-Z0-9.-]/g,
        "_"
      )}`;

      // Generate signature for secure upload
      const signature = cloudinary.utils.api_sign_request(
        {
          timestamp: timestamp,
          folder: folder,
          public_id: publicId,
        },
        process.env.CLOUDINARY_API_SECRET!
      );

      const uploadUrl = `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/auto/upload`;

      return {
        uploadUrl,
        publicId,
        signature,
        timestamp,
      };
    } catch (error: any) {
      console.error("Error generating Cloudinary upload URL:", error);
      throw new ApiError(
        500,
        error?.message || "Failed to generate Cloudinary upload URL",
        [error]
      );
    }
  }

  static uploadSingle = CLOUDINARY_SERVICES.uploadToCloudinary;
  static uploadMultiple = CLOUDINARY_SERVICES.uploadMultipleToCloudinary;
  static generateUploadUrl = CLOUDINARY_SERVICES.generateCloudinaryUploadUrl;
}

export { CLOUDINARY_SERVICES };
