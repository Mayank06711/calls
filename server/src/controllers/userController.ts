import express, { CookieOptions } from "express";
import { UserModel } from "../models/userModel";
import { ApiError } from "../utils/apiError";
import { AsyncHandler } from "../utils/AsyncHandler";
import { successResponse } from "../utils/apiResponse";
import { FileUploadData, FileUploadResponse } from "../interface/interface";
import { FileHandler } from "../helper/fileHandler";
import { ISubscription } from "../interface/ISubscription";
import { sendEmails } from "../utils/email";
import { generateToken, verifyToken } from "../utils/tokens";
class User {
  private static options: CookieOptions = {
    httpOnly: true, // Prevent JavaScript access to the cookie
    secure: process.env.NODE_ENV === "prod" ? true : true, // Use HTTPS in production
    sameSite: process.env.NODE_ENV === "prod" ? "none" : "none", // Allow cross-site cookies in production with HTTPS
    maxAge: 24 * 60 * 60 * 1000, // Cookie lifespan: 1 day
    domain: process.env.NODE_ENV === "prod" ? "frontend.com" : undefined, // Set domain in production (replace with actual domain)
  };

  private static refreshOptions: CookieOptions = {
    httpOnly: true, // Prevent JavaScript access to the cookie
    secure: process.env.NODE_ENV === "prod" ? true : true, // Use HTTPS in production
    sameSite: process.env.NODE_ENV === "prod" ? "none" : "none", // Allow cross-site cookies in production with HTTPS
    maxAge: 15 * 24 * 60 * 60 * 1000, // 15 days (for refresh token) - 15 days * 24 hours * 60 minutes * 60 seconds * 1000 milliseconds
    domain: process.env.NODE_ENV === "prod" ? "frontend.com" : undefined, // Set domain in production (replace with actual domain)
  };

  private static async updateUserAvatar(
    userId: string,
    photoData: {
      public_id: string;
      url: string;
      thumbnail_url?: string;
    }
  ) {
    const user = await UserModel.findById(userId);
    if (!user) {
      return {
        status: "error",
        message: "Failed to update avatar",
        error: "User not found",
      };
    }

    await user.addProfilePhoto(photoData);
    const allMedia = await user.getAllMedia();
    return {
      currentPhoto: {
        url: photoData.url,
        thumbnail_url: photoData.thumbnail_url,
      },
      allPhotos: allMedia.photos,
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
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, "Internal Server Error: Unable to create user");
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
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, "Internal Server Error: Unable to create user");
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

  static async _verifyEmail(req: express.Request, res: express.Response) {
    try {
      const userId = req.user?._id;
      const { email, final_path } = req.body;

      // Combine validation checks
      if (!userId || !email) {
        throw new ApiError(
          400,
          !userId ? "Unauthorized access" : "Email not provided"
        );
      }
      const user = await UserModel.findOne(
        { _id: userId },
        { email: 1, isEmailVerified: 1, fullName: 1 }
      );
      if (!user) {
        throw new ApiError(404, "User not found");
      }

      // Combine validation checks
      if (user.isEmailVerified) {
        throw new ApiError(
          400, `Already exist a verified email, ${user.email.toLocaleLowerCase()}`
        );
      }

      // Generate token with minimal data
      const token = generateToken({
        id: userId.toString(),
        email: user.email || email,
        fullName: user.fullName,
        final_path: final_path ? final_path : "profile/posts"
      });

      if (!token) {
        throw new ApiError(
          500,
          "Something went wrong while sending verification email"
        );
      }
      const verificationUrl = `${process.env.API_URL}/api/v1/users/email_verify/${token}`;

      // Run database update and email sending in parallel
      await Promise.all([
        UserModel.updateOne({ _id: userId }, { emailToken: token, email:email}),
        sendEmails({
          email,
          templateCode: "EMAIL_VERIFICATION",
          subject: "Email Verification",
          message: "Please verify your email address",
          data: {
            fullName: user.fullName,
            url: verificationUrl,
          },
        }),
      ]);

      res.json(successResponse({}, "Email verification sent"));
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, "Internal Server Error: Unable to send email");
    }
  }

  static async verifyEmailToken(req: express.Request, res: express.Response) {
    const clientUrl = process.env.CLIENT_URL_DEV;
    try {
      const { token } = req.params;
      // Verify token exists
      if (!token) {
        // return res.redirect(
        //   `${clientUrl}/email-verification-error?message=Token is required`
        // );
        return res.redirect(`${clientUrl}`)
        // return res.redirect(`${clientUrl}/system/_status/health_check`);
      }
      const verificationResult = verifyToken(token);
      if (!verificationResult.isValid || !verificationResult.data) {
        // return res.redirect(
        //   `${clientUrl}/email-verification-error?message=${encodeURIComponent(
        //     verificationResult.error || "Invalid token"
        //   )}`
        // );
        return res.redirect(`${clientUrl}/error/verification`)
        // return res.redirect(`${clientUrl}/system/_status/health_check`);
      }
      // Find user with matching token
      const user = await UserModel.findOne({
        _id: verificationResult.data.id,
        emailToken: token,
      });
      if (!user) {
        // return res.redirect(
        //   `${clientUrl}/email-verification-error?message=${encodeURIComponent(
        //     "User not found or token already used"
        //   )}`
        // );
        return res.redirect(`${clientUrl}/error/verification`)
      }

      // If already verified, redirect to success with a different message
      if (user.isEmailVerified) {
        // return res.redirect(
        //   `${clientUrl}/email-verification-success?message=${encodeURIComponent(
        //     "Email already verified"
        //   )}`
        // );
        return res.redirect(`${clientUrl}/${verificationResult.data.final_path}`)
        // return res.redirect(`${clientUrl}/system/_status/health_check`);
      }

      // Verify email matches
      if (user.email !== verificationResult.data.email) {
        // return res.redirect(
        //   `${clientUrl}/email-verification-error?message=${encodeURIComponent(
        //     "Email mismatch"
        //   )}`
        // );
        return res.redirect(`${clientUrl}/error/verification`)
        // return res.redirect(`${clientUrl}/system/_status/health_check`);
      }
      // Update user verification status
      await UserModel.findByIdAndUpdate(user._id, {
        isEmailVerified: true,
        emailToken: undefined, // Clear the token
      });
      // const redirectUrl = `${clientUrl}/hello`;
      // Ensure we have a valid URL to redirect to
      // if (!redirectUrl) {
      //   console.log("novalid url");
      //   return res.redirect(`${clientUrl}`)
      //   // return res.redirect(`${clientUrl}/system/_status/health_check`);
      // }
      // Redirect to frontend success page
      // res.redirect(redirectUrl);
      return res.redirect(`${clientUrl}/${verificationResult.data.final_path}`)
      // return res.redirect(
      //   `${redirectUrl}?message=${encodeURIComponent(
      //     "Email verified successfully"
      //   )}`
      // );
    } catch (error) {
      console.error("Email verification error:", error);
      return res.redirect(
        `${clientUrl}/email-verification-error?message=${encodeURIComponent(
          "Verification failed"
        )}`
      );
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

      // Get user and current subscription in parallel
      const user = await UserModel.findById(userId).populate(
        "currentSubscriptionId"
      );

      if (!user) {
        throw new ApiError(404, "User not found");
      }

      if (!user.isActive) {
        throw new ApiError(401, "Account is not active");
      }

      // Get profile media using the new method
      const profileMedia = await user.getProfileMedia();

      // Type guard to check if subscription is populated
      const isSubscriptionPopulated = (sub: any): sub is ISubscription => {
        return (
          sub && typeof sub === "object" && "type" in sub && "status" in sub
        );
      };

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
        // Security settings (only boolean flags, no sensitive data)
        isMFAEnabled: user.isMFAEnabled,
        // Photo info (excluding public_id)
        photo: profileMedia.photo
          ? {
              url: profileMedia.photo.url,
              thumbnail_url: profileMedia.photo.thumbnail_url,
            }
          : null,
        video: profileMedia.video
          ? {
              url: profileMedia.video.url,
              thumbnail_url: profileMedia.video.thumbnail_url,
            }
          : null,
        // Account status
        isActive: user.isActive,
        isExpert: user.isExpert,
        // Add timestamps
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        // Add subscription details
        isSubscribed: user.isSubscribed,
        subscription: isSubscriptionPopulated(user.currentSubscriptionId)
          ? {
              type: user.currentSubscriptionId.type,
              status: user.currentSubscriptionId.status,
            }
          : {
              type: "Free",
              status: "N/A",
            },
      };

      return res
        .status(200)
        .json(successResponse(responseData, "Profile fetched successfully"));
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, "Internal Server Error: Unable to create user");
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
      const user = await UserModel.findById(userId).populate(
        "currentSubscriptionId"
      );
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

      const responseData = await User.sanitizeUserData(user);

      return res
        .status(200)
        .json(successResponse(responseData, "Profile updated successfully"));
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, "Internal Server Error: Unable to create user");
    }
  }

  public static async sanitizeUserData(user: any) {
    const [profileMedia, allMedia] = await Promise.all([
      user.getProfileMedia(),
      user.getAllMedia(),
    ]);

    // Add type guard for subscription
    const isSubscriptionPopulated = (sub: any): sub is ISubscription => {
      return sub && typeof sub === "object" && "type" in sub && "status" in sub;
    };

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
      // Add subscription data
      isSubscribed: user.isSubscribed,
      subscription: isSubscriptionPopulated(user.currentSubscriptionId)
        ? {
            type: user.currentSubscriptionId.type,
            status: user.currentSubscriptionId.status,
          }
        : {
            type: "Free",
            status: "N/A",
          },
      currentPhoto: profileMedia.photo
        ? {
            url: profileMedia.photo.url,
            thumbnail_url: profileMedia.photo.thumbnail_url,
          }
        : null,
      currentVideo: profileMedia.video
        ? {
            url: profileMedia.video.url,
            thumbnail_url: profileMedia.video.thumbnail_url,
          }
        : null,
      allPhotos: allMedia.photos,
      allVideos: allMedia.videos, // Return photo or video only if it has a value
    };
  }

  public static getProfile = AsyncHandler.wrap(User._getProfile);
  public static updateProfile = AsyncHandler.wrap(User._updateProfile);
  public static logout = AsyncHandler.wrap(User._logout);
  public static verifyEmail = AsyncHandler.wrap(User._verifyEmail);
}

export default User;
