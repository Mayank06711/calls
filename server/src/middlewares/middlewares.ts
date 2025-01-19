import { Request, Response, NextFunction } from "express";
import JWT, { JwtPayload } from "jsonwebtoken";
import { v4 as uuid } from "uuid";
import bcrypt from "bcrypt";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import { newRequest } from "../types/expres";
import { UserModel } from "../models/userModel";
import { ExpertModel } from "../models/expertModel";
import Admin from "../models/adminModel";
import { AsyncHandler } from "../utils/AsyncHandler";
import { ApiError } from "../utils/apiError";
import { ObjectId } from "mongoose";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

console.log(process.env.CLOUDINARY_API_KEY, "cloudinary API key: ");
class Middleware {
  // Multer Middleware method for single and multiple files
  private static multerUpload = multer({
    limits: {
      fileSize: 1024 * 1024 * 5, // 5mb
    },
  }); //  by default it will use our ram memory  to store files in buffer format  as we have not provided any location to store files

  private static singleFile = Middleware.multerUpload.array("avatar", 1);
  private static attachmentsMulter = Middleware.multerUpload.array(
    "arrayFiles",
    5
  );

  public static getBase64 = (file: any) =>
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
          Middleware.getBase64(file),
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

  private static async _verifyJWT(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      // Extract the access token from cookies or headers
      const accessToken =
        req.cookies?.accessToken ||
        req.header("Authorization")?.replace("Bearer ", "");

      if (!accessToken || accessToken.length === 0) {
        throw new ApiError(401, "No token provided", ["Authentication failed"]);
      }

      // Verify and decode the access token
      let decodedToken: string | JwtPayload = JWT.verify(
        accessToken,
        process.env.ACCESS_TOKEN_SECRET!
      );

      if (typeof decodedToken === "string") {
        throw new ApiError(401, "Invalid token type", [
          "Authentication failed",
        ]);
      }

      // Verify standard claims
      if (decodedToken.iss !== "KYF") {
        throw new ApiError(401, "Invalid token issuer", [
          "Authentication failed",
        ]);
      }

      // Check audience
      if (decodedToken.aud !== "kyf-api") {
        throw new ApiError(401, "Invalid token audience", [
          "Authentication failed",
        ]);
      }

      const now = Math.floor(Date.now() / 1000);

      // Check issued at time
      if (decodedToken.iat && decodedToken.iat > now) {
        throw new ApiError(401, "Token used before issued time", [
          "Authentication failed",
        ]);
      }

      // Find user based on decodedToken fields (either username or id)
      const user = await UserModel.findOne({
        _id: decodedToken._id,
      }).select("isExpert isAdmin isMFAEnabled isActive");
      // Check if user does not exist
      if (!user) {
        throw new ApiError(401, "Invalid access token", [
          "Authentication failed",
        ]);
      }

      // Attach admin info to the request
      req.user = {
        _id: user._id as ObjectId,
        isAdmin: user.isAdmin,
        isExpert: user.isExpert,
        isActive: user.isActive,
        isMFAEnabled: user.isMFAEnabled,
      };

      return next();
    } catch (error) {
      // JWT-specific error handling
      if (error instanceof JWT.TokenExpiredError) {
        const expiredAt = (error as JWT.TokenExpiredError).expiredAt;
        throw new ApiError(
          401,
          `Token expired at  ${expiredAt} Please login again`,
          ["Authentication failed"]
        );
      }

      // For any other errors
      throw new ApiError(401, "Token verification failed", [
        "Authentication failed",
        error as Error,
      ]);
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
      const isValid = await Middleware.verifyMFA(MFASecretKey, req.user.id);
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
  private static async _isAdmin(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const id = req.user?._id;
      const originalUrl = req.originalUrl;
      console.log("isAdmin Middleware originalURL", originalUrl);
      if (!id) {
        throw new ApiError(
          401,
          "User ID is missing. Authentication is required to access this resource."
        );
      }
      if (!req.originalUrl.startsWith("/admin")) {
        throw new ApiError(
          403,
          "Access to this resource is restricted to admin users only.",
          ["Unauthorised Access"]
        );
      }
      // Check if the user is an admin
      const admin = await Admin.findById(id);
      if (!admin) {
        throw new ApiError(
          401,
          "You are not an admin and cannot access this resource",
          ["Unauthorised Access"]
        );
      }
      next(); // Allow access if the user is an admin
    } catch (error) {
      throw new ApiError(500, "Internal Server Error");
    }
  }

  // for all error
  private static ErrorHandler(
    err: Error | ApiError, // The error caught by the middleware
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    // Log the error for internal tracking (you can use a logger library like Winston)
    console.error("Global Error Handler:", {
      name: err.name,
      message: err.message,
      stack: err.stack,
      path: req.path,
      method: req.method,
    });
    // Handle Validation Errors
    if (err.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: "Validation Error",
        errors: err.message,
      });
    }

    if (err.name === "MongoServerError" && (err as any).code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Duplicate entry error",
        error: "A record with this information already exists",
      });
    }
    // Handle MongoDB Errors
    if (err.name === "MongoError" || err.name === "MongoServerError") {
      return res.status(500).json({
        success: false,
        message: "Database Error",
        errors: [err.message],
      });
    }
    // If headers are already sent, don't try to send another response
    if (res.headersSent) {
      return next(err);
    }

    // Handle ApiError instances
    if (err instanceof ApiError) {
      return res.status(err.statusCode).json({
        success: false,
        message: err.message || "Internal Server Error",
        data: err.data,
        errors: err.errors,
      });
    }

    // Default error response
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      errors: [err.message],
    });
  }

  private static _platformDetector = (
    req: Request,
    _res: Response,
    next: NextFunction
  ) => {
    req.isMobileApp =
      req.get("x-platform") === "mobile" || Boolean(req.get("x-app-version"));
    next();
  };

  // Expose the private methods as static methods wrapped in AsyncHandler so that erros can be catched
  static SingleFile = Middleware.singleFile;
  static AttachmentsMulter = Middleware.attachmentsMulter;
  static UploadFilesToCloudinary = Middleware.uploadFilesToCloudinary;
  static VerifyJWT = AsyncHandler.wrap(Middleware._verifyJWT);
  static IsMFAEnabled = AsyncHandler.wrap(Middleware.isMFAEnabled);
  static IsAdmin = AsyncHandler.wrap(Middleware._isAdmin);
  static globalErrorHandler = Middleware.ErrorHandler;
  static platformDetector = Middleware._platformDetector;
}

export { Middleware };
