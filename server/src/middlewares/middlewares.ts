import { Request, Response, NextFunction } from "express";
import JWT from "jsonwebtoken";
import { v4 as uuid } from "uuid";
import bcrypt from "bcrypt";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import { newRequest } from "../types/expres";
import { UserModel } from "../models/userModel";
import { ExpertModel } from "../models/expertModel";
import AsyncHandler from "../utils/AsyncHandler";
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

console.log(process.env.CLOUDINARY_API_KEY, "cloudinary API key: ");
class middleware {
  // Multer middleware method for single and multiple files
  private static multerUpload = multer({
    limits: {
      fileSize: 1024 * 1024 * 5, // 5mb
    },
  }); //  by default it will use our ram memory  to store files in buffer format  as we have not provided any location to store files
  private static singleFile = middleware.multerUpload.array("avatar", 1);
  private static attachmentsMulter = middleware.multerUpload.array(
    "arrayFiles",
    5
  );

  private static getBase64 = (file: any) =>
    `data:${file[0].mimetype};base64,${file[0].buffer.toString("base64")}`;
  private static async uploadFilesToCloudinary(files: any[] = []) {
    if (!files || files.length === 0) {
      throw new Error("No files provided for upload");
    }

    const uploadPromises = files.map((file) => {
      if (!file) {
        console.error("Undefined file encountered:", file);
        return Promise.reject(new Error("Undefined file encountered"));
      }
      return new Promise((resolve, reject) => {
        cloudinary.uploader.upload(
          middleware.getBase64(file),
          {
            resource_type: "auto",
            public_id: uuid(),
          },
          (error, result) => {
            if (error) {
              console.log(error, "Upload failed");
              return reject(error);
            }
            resolve(result);
          }
        );
      });
    });

    try {
      const results = await Promise.all(uploadPromises);
      console.log(results, "\n --------------------------------->");
      const formattedResults = results.map((result: any) => ({
        public_id: result.public_id,
        url: result.secure_url,
      }));
      return formattedResults;
    } catch (err: any) {
      console.log(err);
      throw new Error("Error uploading files to cloudinary");
    }
  }
  


  private static async verifyMFA(MFASecretKey: string, id: string) {
    try {
      // Find the user by id and check if MFA is enabled
      const user = await UserModel.findOne(
        { _id: id, isMFAEnabled: true }, // Query to find user by id and check if MFA is enabled
        { MFASecretKey: 1 } // Select only the MFASecretKey field
      );

      // If user is null or MFASecretKey is not defined, return false
      if (!user || !user.MFASecretKey) {
        return false;
      }

      // Compare the provided MFASecretKey with the stored one using bcrypt
      const verified = await bcrypt.compare(MFASecretKey, user.MFASecretKey);

      return verified;
    } catch (error) {
      console.error("Error verifying MFA:", error);
      return false;
    }
  }

  private static async isMFAEnabled(
    req: newRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    // we may have to remove promise any
    if (!req.user?.isMFAEnabled) {
      next();
    } else {
      const { MFASecretKey } = req.body;
      if (!MFASecretKey) {
        res
          .status(401)
          .json({ message: "Two-factor authentication (MFA) is required" });
        return;
      }
      const isValid = await middleware.verifyMFA(MFASecretKey, req.user.id);
      if (isValid) {
        next();
      } else {
        res
          .status(401)
          .json({ message: "Invalid two-factor authentication (MFA) code" });
      }
    }
  }

  //   chech if admin or not
  private static isAdmin(req: Request, res: Response, next: NextFunction) {
    const id = req.admin?.id;
    const originalUrl = req.originalUrl;
    console.log("isAdmin middleware originalURL", originalUrl);
    if (id && req.originalUrl.startsWith("/admin")) {
      // i do have another logic apache kafka later
      next();
    } else {
      // apache kafka used here
      res
        .status(401)
        .json({ message: "You are not authorized to access this resource" }); // throwing erro instead of thus
    }
  }

  // for all error
  private static errorMiddleware(
    err: any,
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    err.message ||= "Internal Server Error, please try again later";
    const statusCode = err.statusCode || 500;

    console.error(`Error: ${err}`); // apierror
    res.status(statusCode).json({
      sucess: false,
      message: err.message,
      // message: process.env.NODE_ENV.trim() === "DEVELOPMENT" ? err: err.message // here i will use apiError class
    });
  }

  // Expose the private methods as static methods wrapped in AsyncHandler so that erros can be catched
  static SingleFile = middleware.singleFile;
  static AttachmentsMulter = middleware.attachmentsMulter;
  static UploadFilesToCloudinary = middleware.uploadFilesToCloudinary;
  // static VerifyJWT = AsyncHandler.wrap(middleware.verifyJWT);
  // static IsMFAEnabled = AsyncHandler.wrap(middleware.isMFAEnabled);
  static IsAdmin = AsyncHandler.wrap(middleware.isAdmin);
  // static IsPayment = AsyncHandler.wrap(middleware.isPayment);
  static ErrorMiddleware = middleware.errorMiddleware;
}

export { middleware };
