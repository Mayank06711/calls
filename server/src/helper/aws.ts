import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import {
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { ApiError } from "../utils/apiError";

const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

interface UploadPart {
  ETag: string | undefined;
  PartNumber: number;
}

class AWS_SERVICES {
  // Multipart upload method
  private static async multipartUploadToS3(
    bucket: string,
    key: string,
    file: Express.Multer.File
  ) {
    const createMultipartUpload = new CreateMultipartUploadCommand({
      Bucket: bucket,
      Key: key,
      ContentType: file.mimetype,
    });

    try {
      const multipartUpload = await s3Client.send(createMultipartUpload);
      const uploadId = multipartUpload.UploadId;

      const chunkSize = 5 * 1024 * 1024; // 5 MB
      const numChunks = Math.ceil(file.size / chunkSize);
      const uploadParts: UploadPart[] = [];

      for (let i = 0; i < numChunks; i++) {
        const start = i * chunkSize;
        const end = Math.min(start + chunkSize, file.size);
        const chunk = file.buffer.slice(start, end);
        // console.log(chunk)
        const uploadPart = new UploadPartCommand({
          Bucket: bucket,
          Key: key,
          PartNumber: i + 1,
          UploadId: uploadId,
          Body: chunk,
        });

        const uploadPartResponse = await s3Client.send(uploadPart);
        //console.log(uploadPartResponse.ETag,"ET")
        uploadParts.push({
          ETag: uploadPartResponse.ETag,
          PartNumber: i + 1,
        });
      }

      const completeMultipartUpload = new CompleteMultipartUploadCommand({
        Bucket: bucket,
        Key: key,
        UploadId: uploadId,
        MultipartUpload: {
          Parts: uploadParts,
        },
      });

      await s3Client.send(completeMultipartUpload);

      return `https://${bucket}.s3.amazonaws.com/${key}`;
    } catch (error: any) {
      console.error(error);
      throw new ApiError(500, error?.message, error);
    }
  }

  private static async putObjectTos3(
    bucket: string,
    fileName: string,
    contentType: string,
    expiresIn: number
  ): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: fileName,
      ContentType: contentType,
      // ACL: 'public-read' // Uncomment if you want files to be publicly accessible
    });
    try {
      const preSignedUrlForPutingObject = await getSignedUrl(
        s3Client,
        command,
        { expiresIn: expiresIn }
      );
      console.log("Generated presigned URL:", preSignedUrlForPutingObject);
      return preSignedUrlForPutingObject;
    } catch (error: any) {
      console.error("Error generating presigned URL:", error);
      throw new ApiError(
        500,
        error?.message || "Failed to generate presigned URL",
        [error]
      );
    }
  }

  static putObjectToS3 = AWS_SERVICES.putObjectTos3;
  static multipartUpload = AWS_SERVICES.multipartUploadToS3;
}

export { AWS_SERVICES };
