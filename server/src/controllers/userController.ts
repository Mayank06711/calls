import express, { CookieOptions } from "express";
import { UserModel } from "../models/userModel";
import { ApiError } from "../utils/apiError";
import { AsyncHandler } from "../utils/AsyncHandler";
import { ObjectId } from "mongoose";
import { AuthServices } from "../helper/auth";
import { successResponse } from "../utils/apiResponse";
import { FileUploadData, FileUploadResponse } from "../types/interface";
import { FileHandler } from "../helper/fileHandler";
class User {
  private static options: CookieOptions = {
    httpOnly: true, // Prevents JavaScript access to the cookie
    secure: process.env.NODE_ENV! === "prod", // Ensures the cookie is sent only over HTTPS
    sameSite: "strict", // Prevents the browser from sending this cookie along with cross-site requests
    maxAge: 24 * 60 * 60 * 1000, // 1 day (for access token) - 24 hours * 60 minutes * 60 seconds * 1000 milliseconds
  };

  private static refreshOptions: CookieOptions = {
    httpOnly: true, // Prevents JavaScript access to the cookie
    secure: process.env.NODE_ENV! === "prod", // Ensures the cookie is sent only over HTTPS
    sameSite: "strict", // Prevents the browser from sending this cookie along with cross-site requests
    maxAge: 15 * 24 * 60 * 60 * 1000, // 15 days (for refresh token) - 15 days * 24 hours * 60 minutes * 60 seconds * 1000 milliseconds
  };

  private static async updateUserAvatar(
    userId: string,
    photoData: {
      public_id: string;
      url: string;
      thumbnail_url?: string;
    }
  ) {
    const user = await UserModel.findByIdAndUpdate(
      userId,
      {
        $set: { photo: photoData },
      },
      { new: true }
    );

    if (!user) {
      return {
        status: "error",
        message: "Failed to update avatar",
        error: "User not found",
      };
    }

    return {
      photo: {
        url: user.photo?.url,
        thumbnail_url: user.photo?.thumbnail_url,
      },
      userId: user._id,
    };
  }

  static async signUp(req: express.Request, res: express.Response) {
    try {
      const { username, fullName, password, email } = req.body;
      if ([username, password, email].some((f) => f == null || f === "")) {
        throw new ApiError(400, "All fields must be present");
      }
      const usernameExists = await UserModel.findOne({ username });
      const emailExists = await UserModel.findOne({ email });

      if (usernameExists && emailExists) {
        throw new ApiError(409, "Both username and email already exist");
      } else if (usernameExists) {
        throw new ApiError(409, "Username already exists");
      } else if (emailExists) {
        throw new ApiError(409, "Email already exists");
      }

      const user = await UserModel.create({
        username,
        fullName,
        password,
        email,
      });
      // Check if the user is created
      if (user) {
        console.log("User created successfully:", user);
        console.log(req.body);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();
        if (!refreshToken || !accessToken) {
          await UserModel.findByIdAndDelete(user._id);
          throw new ApiError(
            500,
            "Failed to generate access or refresh token."
          );
        }
        // Set HTTP-only cookie for refresh token (secure it for production)
        res
          .status(200)
          .cookie("refreshToken", refreshToken, this.options) // Store refresh token in an HttpOnly cookie
          .cookie("accessToken", accessToken, this.refreshOptions) // Store refresh token in an HttpOnly cookie
          .json({
            message: "User signed up successfully, Please fill other fields",
            userId: user._id, // Optional: You can remove this if using only cookies
            localToken: user._id, // Send access token to frontend
            username: user.username,
          });
      } else {
        throw new ApiError(500, "User creation failed without error");
      }
    } catch (error: any) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, "Internal Server Error: Unable to create user");
    }
  }

  static login(req: express.Request, res: express.Response) {
    try {
      console.log(req.body);
      res
        .status(200)
        .cookie("accessToken", 1234, User.options)
        .cookie("refreshToken", 2321, User.refreshOptions)
        .json({
          message: "User logged in successfully",
          userId: "user",
          localToken: "localToken",
          username: "username",
        });
    } catch (error) {
      if (error instanceof ApiError) throw error;
      console.log(error);
    }
  }

  private static async _logout(req: express.Request, res: express.Response) {
    try {
      const userId = req.user?._id;
      if (!userId) {
        throw new ApiError(401, "Unauthorized access");
      }

      // Find user and clear refresh token
      const user = await UserModel.findByIdAndUpdate(
        userId,
        {
          $set: { refreshToken: "" },
        },
        { new: true }
      );

      if (!user) {
        throw new ApiError(404, "User not found");
      }

      if (req.isMobileApp) {
        // For mobile: Clear headers and send response
        return res
          .status(200)
          .setHeader("x-access-token", "")
          .setHeader("x-refresh-token", "")
          .json(successResponse({}, "Logged out successfully"));
      }

      // For web: Clear cookies and send response
      return res
        .status(200)
        .clearCookie("accessToken", User.options)
        .clearCookie("refreshToken", User.refreshOptions)
        .json(successResponse({}, "Logged out successfully"));
    } catch (error) {
      console.error("Error in logout:", error);
      if (error instanceof ApiError) throw error;
      throw new ApiError(500, "Something went wrong during logout");
    }
  }

  static changePassword(req: express.Request, res: express.Response) {
    try {
      // check validation here only
      res.json({ message: "Changed successfully, Login With New Password" });
    } catch (error) {
      console.log(error);
    }
  }

  static forgotPassword(req: express.Request, res: express.Response) {
    try {
      // check validation here only
      res.json({ message: "Reset Password Link Sent Successfully" });
    } catch (error) {
      if (error instanceof ApiError) throw error;
      console.log(error);
    }
  }

  static verifyEmail(req: express.Request, res: express.Response) {
    try {
      // check validation here only
      res.json({ message: "Email Verified Successfully" });
    } catch (error) {
      if (error instanceof ApiError) throw error;
      console.log(error);
    }
  }

  // Public method to be used by socket handler
  public static async handleAvatarUpdate(
    userId: string,
    fileUploadResponse: FileUploadResponse
  ) {
    try {
      if (
        fileUploadResponse.status !== "success" ||
        !fileUploadResponse.fileUrl
      ) {
        return {
          status: "error",
          message: "Failed to update avatar",
          error: "Invalid file upload response",
        };
      }
      const updatedUser = await this.updateUserAvatar(userId, {
        public_id: fileUploadResponse.publicId!,
        url: fileUploadResponse.fileUrl,
        thumbnail_url: fileUploadResponse.thumbnailUrl,
      });

      return {
        status: "success",
        message: "Avatar updated successfully",
        data: updatedUser,
      };
    } catch (error) {
      return {
        status: "error",
        message: "Failed to update avatar",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  public static async handleAvatarUploadEvent(
    data: FileUploadData,
    userId: string,
    emitter: {
      start: (data: any) => void;
      success: (data: any) => void;
      error: (data: any) => void;
      broadcast: (data: any) => void;
    }
  ): Promise<void> {
    try {
      // Emit upload start
      emitter.start({
        status: "processing",
        message: "Starting avatar upload",
      });

      // Handle file upload
      await FileHandler.handleFileUpload({
        data: {
          ...data,
          type: "avatar",
          metadata: {
            ...data.metadata,
            userId,
          },
        },
        userId,
        callback: async (response: FileUploadResponse) => {
          try {
            const result = await this.handleAvatarUpdate(userId, response);

            if (result.status === "success") {
              // Emit success to current user
              emitter.success(result);
              // Broadcast to other sessions
              emitter.broadcast(result.data);
            } else {
              emitter.error({
                status: "error",
                message: result.message,
                error: result.error,
              });
            }
          } catch (error) {
            emitter.error({
              status: "error",
              message: "Failed to update avatar",
              error: error instanceof Error ? error.message : "Unknown error",
            });
          }
        },
      });
    } catch (error) {
      emitter.error({
        status: "error",
        message: "Avatar upload failed",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  private static async _getProfile(
    req: express.Request,
    res: express.Response
  ) {
    try {
      const userId = req.user?._id;
      if (!userId) {
        throw new ApiError(401, "Unauthorized access");
      }

      const user = await UserModel.findById(userId);
      if (!user) {
        throw new ApiError(404, "User not found");
      }

      if (!user.isActive) {
        throw new ApiError(401, "Account is not active");
      }

      // Prepare sanitized response data
      const responseData = {
        fullName: user.fullName,
        username: user.username,
        // Mask email: show first 2 chars and domain
        email: user.email
          ? `${user.email.slice(0, 2)}***${user.email.slice(
              user.email.indexOf("@")
            )}`
          : undefined,
        // Mask phone: show only last 4 digits
        phoneNumber: user.phoneNumber?.slice(-4).padStart(10, "*"),
        gender: user.gender,
        age: user.age,
        dob: user.dob,
        city: user.city,
        country: user.country,
        // Verification statuses
        isEmailVerified: user.isEmailVerified,
        isPhoneVerified: user.isPhoneVerified,
        // Subscription info
        isSubscribed: user.isSubscribed,
        subscriptionDetail: user.subscriptionDetail,
        // Security settings (only boolean flags, no sensitive data)
        isMFAEnabled: user.isMFAEnabled,
        // Photo info (excluding public_id)
        photo: user.photo
          ? {
              url: user.photo.url,
              thumbnail_url: user.photo.thumbnail_url,
            }
          : null,
        // Account status
        isActive: user.isActive,
        isExpert: user.isExpert,
        // Add timestamps
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };

      return res
        .status(200)
        .json(successResponse(responseData, "Profile fetched successfully"));
    } catch (error: any) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(500, "Error fetching profile: " + error.message);
    }
  }

  private static async _updateProfile(
    req: express.Request,
    res: express.Response
  ) {
    try {
      const {
        fullName,
        gender,
        dob, // Get DOB from request
        city,
        country,
        email,
      } = req.body;

      // Get user ID from authenticated request
      const userId = req.user?._id;
      if (!userId) {
        throw new ApiError(401, "Unauthorized access");
      }

      if (!req.user?.isActive) {
        throw new ApiError(
          401,
          "Activate your account first before accessing anything"
        );
      }

      // Find the user
      const user = await UserModel.findById(userId);
      if (!user) {
        throw new ApiError(404, "User not found");
      }

      // Update fields if provided
      if (fullName) user.fullName = fullName;
      if (gender && ["Male", "Female", "Not to say"].includes(gender)) {
        user.gender = gender;
      }

      // Handle DOB and age calculation
      if (dob) {
        // Validate DOB format (assuming YYYY-MM-DD format)
        const dobDate = new Date(dob);
        if (isNaN(dobDate.getTime())) {
          throw new ApiError(
            400,
            "Invalid date format. Please use YYYY-MM-DD format"
          );
        }

        // Calculate age
        const today = new Date();
        let age = today.getFullYear() - dobDate.getFullYear();
        const monthDiff = today.getMonth() - dobDate.getMonth();

        // Adjust age if birthday hasn't occurred this year
        if (
          monthDiff < 0 ||
          (monthDiff === 0 && today.getDate() < dobDate.getDate())
        ) {
          age--;
        }

        // Validate minimum age requirement
        if (age < 14) {
          throw new ApiError(400, "User must be at least 14 years old");
        }

        user.dob = dob;
        user.age = age;
      }

      if (city) user.city = city;
      if (country) user.country = country;

      // Special handling for email since it's unique and requires verification
      if (email && email !== user.email) {
        // Check if email already exists for another user
        const emailExists = await UserModel.findOne({
          email,
          _id: { $ne: userId },
        });
        if (emailExists) {
          throw new ApiError(409, "Email already exists");
        }
        user.email = email;
        user.isEmailVerified = false; // Reset email verification status
      }

      // Save the updated user
      await user.save();

      const responseData = User.sanitizeUserData(user);

      return res
        .status(200)
        .json(successResponse(responseData, "Profile updated successfully"));
    } catch (error: any) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, "Error updating profile: " + error.message);
    }
  }

  public static sanitizeUserData(user: any) {
    return {
      fullName: user.fullName,
      username: user.username,
      email: user.email
        ? `${user.email.slice(0, 2)}***${user.email.slice(
            user.email.indexOf("@")
          )}`
        : undefined, // e.g., "jo***@example.com"
      phoneNumber: user.phoneNumber?.slice(-4).padStart(10, "*"), // Only show last 4 digits
      gender: user.gender,
      age: user.age,
      dob: user.dob, // Include DOB in response
      city: user.city,
      country: user.country,
      isEmailVerified: user.isEmailVerified,
      isPhoneVerified: user.isPhoneVerified,
      photo: user.photo
        ? {
            url: user.photo.url,
            thumbnail_url: user.photo.thumbnail_url,
          }
        : null, // Return photo only if it has a value
    };
  }
  public static getProfile = AsyncHandler.wrap(User._getProfile);
  public static updateProfile = AsyncHandler.wrap(User._updateProfile);
  public static logout = AsyncHandler.wrap(User._logout);
}

export default User;
