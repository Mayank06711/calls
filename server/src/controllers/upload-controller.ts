import { Request, Response } from "express";
import { AWS_SERVICES } from "../helper/aws";
import { CLOUDINARY_SERVICES } from "../helper/cloudinary";
import { ApiError } from "../utils/apiError";

// Get upload provider from environment
const UPLOAD_PROVIDER = (process.env.UPLOAD_PROVIDER || "S3").toUpperCase();

class UploadController {
  // Try S3 upload, return null on failure
  private static async tryS3Upload(uniqueFileName: string, contentType: string) {
    try {
      const bucketName = process.env.AWS_BUCKET_NAME;
      const region = process.env.AWS_REGION;
      if (!bucketName || !region) {
        console.log("[Upload] S3 skipped — AWS_BUCKET_NAME or AWS_REGION not configured");
        return null;
      }
      console.log(`[Upload] Attempting S3 presigned URL for: ${uniqueFileName}`);
      const preSignedUrl = await AWS_SERVICES.putObjectToS3(
        bucketName,
        uniqueFileName,
        contentType,
        3600
      );
      if (!preSignedUrl) {
        console.log("[Upload] S3 returned empty presigned URL");
        return null;
      }
      const fileUrl = `https://${bucketName}.s3.${region}.amazonaws.com/${uniqueFileName}`;
      console.log("[Upload] S3 presigned URL generated successfully");
      return {
        success: true,
        provider: "s3",
        presignedUrl: preSignedUrl,
        uploadUrl: preSignedUrl,
        fileName: uniqueFileName,
        fileUrl,
        expiresIn: 3600,
      };
    } catch (err: any) {
      console.error("[Upload] S3 failed:", err.message);
      return null;
    }
  }

  // Try Cloudinary upload, return null on failure
  private static async tryCloudinaryUpload(fileName: string, uniqueFileName: string) {
    try {
      const cloudName = process.env.CLOUDINARY_NAME;
      if (!cloudName) {
        console.log("[Upload] Cloudinary skipped — CLOUDINARY_NAME not configured");
        return null;
      }
      console.log(`[Upload] Attempting Cloudinary upload URL for: ${uniqueFileName}`);
      const uploadData = await CLOUDINARY_SERVICES.generateUploadUrl(
        fileName,
        "uploads"
      );
      console.log("[Upload] Cloudinary upload URL generated successfully");
      return {
        success: true,
        provider: "cloudinary",
        uploadUrl: uploadData.uploadUrl,
        fileName: uniqueFileName,
        uploadParams: {
          timestamp: uploadData.timestamp,
          signature: uploadData.signature,
          api_key: process.env.CLOUDINARY_API_KEY,
          folder: "uploads",
          public_id: uploadData.publicId,
        },
        message: "Upload the file to uploadUrl with the uploadParams as form-data",
      };
    } catch (err: any) {
      console.error("[Upload] Cloudinary failed:", err.message);
      return null;
    }
  }

  // Generate presigned/upload URL — tries primary provider, falls back to the other
  static async generateUploadUrl(req: Request, res: Response) {
    try {
      const { fileName, contentType } = req.body;

      if (!fileName || !contentType) {
        throw new ApiError(400, "fileName and contentType are required");
      }

      const timestamp = Date.now();
      const uniqueFileName = `${timestamp}-${fileName.replace(
        /[^a-zA-Z0-9.-]/g,
        "_"
      )}`;

      console.log(`[Upload] Provider preference: ${UPLOAD_PROVIDER} | File: ${fileName} (${contentType})`);

      let result = null;

      if (UPLOAD_PROVIDER === "CLOUDINARY") {
        // Try Cloudinary first, fall back to S3
        result = await UploadController.tryCloudinaryUpload(fileName, uniqueFileName);
        if (!result) {
          console.log("[Upload] Cloudinary failed, falling back to S3...");
          result = await UploadController.tryS3Upload(uniqueFileName, contentType);
        }
      } else {
        // Try S3 first, fall back to Cloudinary
        result = await UploadController.tryS3Upload(uniqueFileName, contentType);
        if (!result) {
          console.log("[Upload] S3 failed, falling back to Cloudinary...");
          result = await UploadController.tryCloudinaryUpload(fileName, uniqueFileName);
        }
      }

      if (!result) {
        throw new ApiError(500, "Both S3 and Cloudinary upload failed. Check your configuration.");
      }

      res.status(200).json(result);
    } catch (error: any) {
      console.error("[Upload] Error generating upload URL:", error.message);
      const statusCode = error.statusCode || 500;
      res.status(statusCode).json({
        success: false,
        error: error.message || "Failed to generate upload URL",
      });
    }
  }

  // Generate batch presigned/upload URLs — one round-trip for up to 10 files
  static async generateUploadUrls(req: Request, res: Response) {
    try {
      const { files } = req.body; // validated by BatchUploadSchema

      console.log(`[Upload] Batch request for ${files.length} files | Provider: ${UPLOAD_PROVIDER}`);

      // Generate all upload URLs concurrently with Promise.all
      const results = await Promise.all(
        files.map(async (file: { fileName: string; contentType: string }) => {
          const { fileName, contentType } = file;
          const timestamp = Date.now();
          const uniqueFileName = `${timestamp}-${fileName.replace(/[^a-zA-Z0-9.-]/g, "_")}`;

          let result = null;

          if (UPLOAD_PROVIDER === "CLOUDINARY") {
            result = await UploadController.tryCloudinaryUpload(fileName, uniqueFileName);
            if (!result) result = await UploadController.tryS3Upload(uniqueFileName, contentType);
          } else {
            result = await UploadController.tryS3Upload(uniqueFileName, contentType);
            if (!result) result = await UploadController.tryCloudinaryUpload(fileName, uniqueFileName);
          }

          if (!result) {
            console.error(`[Upload] Both providers failed for: ${fileName}`);
            return { success: false, fileName, error: "Upload URL generation failed" };
          }
          return result;
        })
      );

      const allFailed = results.every(r => !r.success);
      if (allFailed) {
        throw new ApiError(500, "Failed to generate upload URLs for all files.");
      }

      console.log(`[Upload] Batch complete: ${results.filter(r => r.success).length}/${files.length} succeeded`);
      res.status(200).json({ success: true, urls: results });
    } catch (error: any) {
      console.error("[Upload] Batch error:", error.message);
      const statusCode = error.statusCode || 500;
      res.status(statusCode).json({
        success: false,
        error: error.message || "Failed to generate batch upload URLs",
      });
    }
  }

  // Get current provider
  static async getProvider(req: Request, res: Response) {
    res.status(200).json({
      success: true,
      provider: UPLOAD_PROVIDER.toLowerCase(),
      availableProviders: ["s3", "cloudinary"],
    });
  }
}

export { UploadController };
