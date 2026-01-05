import { Request, Response } from "express";
import { AWS_SERVICES } from "../helper/aws";
import { CLOUDINARY_SERVICES } from "../helper/cloudinary";
import { ApiError } from "../utils/apiError";

// Get upload provider from environment
const UPLOAD_PROVIDER = (process.env.UPLOAD_PROVIDER || "S3").toUpperCase();

class UploadController {
  // Generate presigned/upload URL based on provider
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

      if (UPLOAD_PROVIDER === "CLOUDINARY") {
        // Cloudinary upload
        const uploadData = await CLOUDINARY_SERVICES.generateUploadUrl(
          fileName,
          "uploads"
        );

        res.status(200).json({
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
          message:
            "Upload the file to uploadUrl with the uploadParams as form-data",
        });
      } else {
        // AWS S3 presigned URL
        const preSignedUrl = await AWS_SERVICES.putObjectToS3(
          process.env.AWS_BUCKET_NAME!,
          uniqueFileName,
          contentType,
          3600
        );

        if (!preSignedUrl) {
          throw new ApiError(500, "Failed to generate presigned URL");
        }

        const fileUrl = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${uniqueFileName}`;

        res.status(200).json({
          success: true,
          provider: "s3",
          presignedUrl: preSignedUrl,
          fileName: uniqueFileName,
          fileUrl: fileUrl,
          expiresIn: 3600,
        });
      }
    } catch (error: any) {
      console.error("Error generating upload URL:", error);
      const statusCode = error.statusCode || 500;
      res.status(statusCode).json({
        success: false,
        error: error.message || "Failed to generate upload URL",
      });
    }
  }

  // Server-side upload (alternative method)
  static async uploadFiles(req: Request, res: Response) {
    try {
      const files = req.files as Express.Multer.File[];

      if (!files || files.length === 0) {
        throw new ApiError(400, "No files uploaded");
      }

      let fileUrls: string[];

      if (UPLOAD_PROVIDER === "CLOUDINARY") {
        // Upload to Cloudinary
        fileUrls = await CLOUDINARY_SERVICES.uploadMultiple(files, "uploads");
      } else {
        // Upload to S3
        const uploadPromises = files.map((file) =>
          AWS_SERVICES.multipartUpload(
            process.env.AWS_BUCKET_NAME!,
            file.originalname,
            file
          )
        );
        fileUrls = await Promise.all(uploadPromises);
      }

      res.status(200).json({
        success: true,
        provider: UPLOAD_PROVIDER.toLowerCase(),
        message: "Files uploaded successfully",
        fileUrls: fileUrls,
      });
    } catch (error: any) {
      console.error("Error uploading files:", error);
      const statusCode = error.statusCode || 500;
      res.status(statusCode).json({
        success: false,
        error: error.message || "Failed to upload files",
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
