import express from "express";
import Admin, { AdminPosition } from "../models/adminModel";
import { UserModel } from "../models/userModel";
import { ApiError } from "../utils/apiError";
import { AsyncHandler } from "../utils/AsyncHandler";
import { successResponse } from "../utils/apiResponse";
import crypto from "crypto";
import JWT from "jsonwebtoken";
import { AuthServices } from "../helper/auth";

class AdminController {
  private static options: express.CookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "prod" ? true : true,
    sameSite: process.env.NODE_ENV === "prod" ? "none" : "none",
    maxAge: 24 * 60 * 60 * 1000, // 1 day
    domain: process.env.NODE_ENV === "prod" ? "frontend.com" : undefined,
  };

  private static refreshOptions: express.CookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "prod" ? true : true,
    sameSite: process.env.NODE_ENV === "prod" ? "none" : "none",
    maxAge: 15 * 24 * 60 * 60 * 1000, // 15 days
    domain: process.env.NODE_ENV === "prod" ? "frontend.com" : undefined,
  };

  // Generate admin access token
  private static generateAdminAccessToken(admin: any, user: any) {
    const payload = {
      _id: admin._id,
      userId: admin.userId,
      position: admin.position,
      iss: "KYF-ADMIN",
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 24 * 60 * 60, // 24 hours
      aud: "kyf-admin-api",
      jti: crypto.randomBytes(16).toString("hex"),
    };

    const encryptedPayload = AuthServices.encrypt(JSON.stringify(payload));

    return JWT.sign(
      {
        data: encryptedPayload,
        iss: "KYF-ADMIN",
        aud: "kyf-admin-api",
      },
      process.env.ADMIN_ACCESS_TOKEN_SECRET!,
      {
        algorithm: "HS512",
        expiresIn: process.env.ADMIN_ACCESS_TOKEN_EXPIRY || "24h",
      }
    );
  }

  // Generate admin refresh token
  private static generateAdminRefreshToken(admin: any) {
    const payload = {
      _id: admin._id,
      userId: admin.userId,
      iss: "KYF-ADMIN",
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 15 * 24 * 60 * 60, // 15 days
      aud: "kyf-admin-api",
      jti: crypto.randomBytes(16).toString("hex"),
    };

    const encryptedPayload = AuthServices.encrypt(JSON.stringify(payload));

    return JWT.sign(
      {
        data: encryptedPayload,
        iss: "KYF-ADMIN",
        aud: "kyf-admin-api",
      },
      process.env.ADMIN_REFRESH_TOKEN_SECRET!,
      {
        algorithm: "HS512",
        expiresIn: process.env.ADMIN_REFRESH_TOKEN_EXPIRY || "15d",
      }
    );
  }

  // Upgrade user to admin
  private static async _upgradeUserToAdmin(
    req: express.Request,
    res: express.Response
  ) {
    try {
      const { userId, adminKey, position = AdminPosition.AGENT } = req.body;

      // Validate required fields
      if (!userId || !adminKey) {
        throw new ApiError(400, "userId and adminKey are required");
      }

      // Validate position enum
      if (!Object.values(AdminPosition).includes(position)) {
        throw new ApiError(400, "Invalid admin position");
      }

      // Check if user exists
      const user = await UserModel.findById(userId);
      if (!user) {
        throw new ApiError(404, "User not found");
      }

      // Check if user is already an admin
      if (user.isAdmin) {
        throw new ApiError(409, "User is already an admin");
      }

      // Upgrade user to admin
      const admin = await Admin.upgradeUserToAdmin(userId, adminKey, position);

      // Generate tokens
      const accessToken = AdminController.generateAdminAccessToken(admin, user);
      const refreshToken = AdminController.generateAdminRefreshToken(admin);

      return res
        .status(201)
        .cookie("adminAccessToken", accessToken, AdminController.options)
        .cookie(
          "adminRefreshToken",
          refreshToken,
          AdminController.refreshOptions
        )
        .json(
          successResponse(
            {
              admin: {
                _id: admin._id,
                userId: admin.userId,
                position: admin.position,
                isActive: admin.isActive,
              },
              user: {
                _id: user._id,
                fullName: user.fullName,
                username: user.username,
                email: user.email,
                isAdmin: true,
              },
            },
            "User upgraded to admin successfully"
          )
        );
    } catch (error: any) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        500,
        "Internal Server Error: Unable to upgrade user to admin"
      );
    }
  }

  // Admin login
  private static async _adminLogin(
    req: express.Request,
    res: express.Response
  ) {
    try {
      const { userId, adminKey } = req.body;

      if (!userId || !adminKey) {
        throw new ApiError(400, "userId and adminKey are required");
      }

      // Find admin by userId
      const admin = await Admin.findOne({ userId }).populate("userId");
      if (!admin) {
        throw new ApiError(404, "Admin not found");
      }

      if (!admin.isActive) {
        throw new ApiError(401, "Admin account is deactivated");
      }

      // Verify admin key
      const isKeyValid = await admin.verifyAdminKey(adminKey);
      if (!isKeyValid) {
        throw new ApiError(401, "Invalid admin key");
      }

      // Update login activity
      await admin.updateLoginActivity();

      // Generate tokens
      const accessToken = AdminController.generateAdminAccessToken(
        admin,
        admin.userId
      );
      const refreshToken = AdminController.generateAdminRefreshToken(admin);

      return res
        .status(200)
        .cookie("adminAccessToken", accessToken, AdminController.options)
        .cookie(
          "adminRefreshToken",
          refreshToken,
          AdminController.refreshOptions
        )
        .json(
          successResponse(
            {
              admin: {
                _id: admin._id,
                userId: admin.userId,
                position: admin.position,
                lastLoginAt: admin.lastLoginAt,
                loginCount: admin.loginCount,
              },
              user: admin.userId, // Populated user data
            },
            "Admin logged in successfully"
          )
        );
    } catch (error: any) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, "Internal Server Error: Unable to login");
    }
  }

  // Admin logout
  private static async _adminLogout(
    req: express.Request,
    res: express.Response
  ) {
    try {
      const isAdmin = req.user?.isAdmin;
      if (!isAdmin) {
        throw new ApiError(401, "Unauthorized access");
      }

      if (req.isMobileApp) {
        return res
          .status(200)
          .setHeader("x-admin-access-token", "")
          .setHeader("x-admin-refresh-token", "")
          .json(successResponse({}, "Admin logged out successfully"));
      }

      return res
        .status(200)
        .clearCookie("adminAccessToken", AdminController.options)
        .clearCookie("adminRefreshToken", AdminController.refreshOptions)
        .json(successResponse({}, "Admin logged out successfully"));
    } catch (error: any) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, "Internal Server Error: Unable to logout");
    }
  }

  // Get admin profile
  private static async _getAdminProfile(
    req: express.Request,
    res: express.Response
  ) {
    try {
      const isAdmin = req.user?.isAdmin;
      if (!isAdmin) {
        throw new ApiError(401, "Unauthorized access");
      }

      const admin = await Admin.findById(req.user?._id).populate("userId");
      if (!admin) {
        throw new ApiError(404, "Admin not found");
      }

      if (!admin.isActive) {
        throw new ApiError(401, "Admin account is deactivated");
      }

      const responseData = {
        admin: {
          _id: admin._id,
          position: admin.position,
          lastLoginAt: admin.lastLoginAt,
          loginCount: admin.loginCount,
          isActive: admin.isActive,
          blockedUsersCount: admin.getBlockedUsersCount(),
          createdAt: admin.createdAt,
          updatedAt: admin.updatedAt,
        },
        user: admin.userId, // Populated user data
      };

      return res
        .status(200)
        .json(
          successResponse(responseData, "Admin profile fetched successfully")
        );
    } catch (error: any) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        500,
        "Internal Server Error: Unable to fetch admin profile"
      );
    }
  }

  // Block user
  private static async _blockUser(req: express.Request, res: express.Response) {
    try {
      if (req.user?.isAdmin) {
        throw new ApiError(401, "Unauthorized access");
      }
      const adminId = req.user?._id;

      if (!adminId) {
        throw new ApiError(401, "Unauthorized access");
      }

      const { userId } = req.params;

      if (!userId) {
        throw new ApiError(400, "User ID is required");
      }

      const admin = await Admin.findById(adminId);
      if (!admin) {
        throw new ApiError(404, "Admin not found");
      }

      if (!admin.isActive) {
        throw new ApiError(401, "Admin account is deactivated");
      }

      // Check if admin has permission to block users
      if (!admin.hasPermission("canBlockUsers")) {
        throw new ApiError(403, "Insufficient permissions to block users");
      }

      // Check if user exists
      const user = await UserModel.findById(userId);
      if (!user) {
        throw new ApiError(404, "User not found");
      }

      // Check if user is already blocked
      if (admin.isUserBlocked(userId)) {
        throw new ApiError(400, "User is already blocked");
      }

      // Block the user
      user.isBlockedByAdmin = true;
      await user.save(); 
      await admin.blockUser(userId);
      

      return res.status(200).json(
        successResponse(
          {
            blockedUserId: userId,
            blockedUsersCount: admin.getBlockedUsersCount(),
          },
          "User blocked successfully"
        )
      );
    } catch (error: any) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, "Internal Server Error: Unable to block user");
    }
  }

  // Unblock user
  private static async _unblockUser(
    req: express.Request,
    res: express.Response
  ) {
    try {
      const adminId = req.admin?._id;
      const { userId } = req.params;

      if (!adminId) {
        throw new ApiError(401, "Unauthorized access");
      }

      if (!userId) {
        throw new ApiError(400, "User ID is required");
      }

      const admin = await Admin.findById(adminId);
      if (!admin) {
        throw new ApiError(404, "Admin not found");
      }

      if (!admin.isActive) {
        throw new ApiError(401, "Admin account is deactivated");
      }

      // Check if user is blocked
      if (!admin.isUserBlocked(userId)) {
        throw new ApiError(400, "User is not blocked");
      }

      // Unblock the user
      await admin.unblockUser(userId);

      return res.status(200).json(
        successResponse(
          {
            unblockedUserId: userId,
            blockedUsersCount: admin.getBlockedUsersCount(),
          },
          "User unblocked successfully"
        )
      );
    } catch (error: any) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, "Internal Server Error: Unable to unblock user");
    }
  }

  // Get blocked users
  private static async _getBlockedUsers(
    req: express.Request,
    res: express.Response
  ) {
    try {
      const adminId = req.admin?._id;
      if (!adminId) {
        throw new ApiError(401, "Unauthorized access");
      }

      const admin = await Admin.findById(adminId).populate("blockedUsers");
      if (!admin) {
        throw new ApiError(404, "Admin not found");
      }

      if (!admin.isActive) {
        throw new ApiError(401, "Admin account is deactivated");
      }

      const blockedUsers = admin.blockedUsers.map((user: any) => ({
        _id: user._id,
        fullName: user.fullName,
        username: user.username,
        email: user.email,
        phoneNumber: user.phoneNumber,
        isActive: user.isActive,
      }));

      return res.status(200).json(
        successResponse(
          {
            blockedUsers,
            count: admin.getBlockedUsersCount(),
          },
          "Blocked users fetched successfully"
        )
      );
    } catch (error: any) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        500,
        "Internal Server Error: Unable to fetch blocked users"
      );
    }
  }

  // Get all admins (super admin only)
  private static async _getAllAdmins(
    req: express.Request,
    res: express.Response
  ) {
    try {
      const adminId = req.admin?._id;
      if (!adminId) {
        throw new ApiError(401, "Unauthorized access");
      }

      const currentAdmin = await Admin.findById(adminId);
      if (!currentAdmin) {
        throw new ApiError(404, "Admin not found");
      }

      if (!currentAdmin.isActive) {
        throw new ApiError(401, "Admin account is deactivated");
      }

      // Only super admin can view all admins
      if (currentAdmin.position !== AdminPosition.SUPER_ADMIN) {
        throw new ApiError(403, "Insufficient permissions to view all admins");
      }

      const admins = await Admin.find().populate("userId");

      const adminsData = admins.map((admin) => ({
        _id: admin._id,
        userId: admin.userId,
        position: admin.position,
        lastLoginAt: admin.lastLoginAt,
        loginCount: admin.loginCount,
        isActive: admin.isActive,
        blockedUsersCount: admin.getBlockedUsersCount(),
        createdAt: admin.createdAt,
        updatedAt: admin.updatedAt,
      }));

      return res.status(200).json(
        successResponse(
          {
            admins: adminsData,
            count: admins.length,
          },
          "Admins fetched successfully"
        )
      );
    } catch (error: any) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, "Internal Server Error: Unable to fetch admins");
    }
  }

  // Deactivate admin (super admin only)
  private static async _deactivateAdmin(
    req: express.Request,
    res: express.Response
  ) {
    try {
      const adminId = req.admin?._id;
      const { targetAdminId } = req.params;

      if (!adminId) {
        throw new ApiError(401, "Unauthorized access");
      }

      if (!targetAdminId) {
        throw new ApiError(400, "Target admin ID is required");
      }

      const currentAdmin = await Admin.findById(adminId);
      if (!currentAdmin) {
        throw new ApiError(404, "Admin not found");
      }

      if (!currentAdmin.isActive) {
        throw new ApiError(401, "Admin account is deactivated");
      }

      // Only super admin can deactivate other admins
      if (currentAdmin.position !== AdminPosition.SUPER_ADMIN) {
        throw new ApiError(403, "Insufficient permissions to deactivate admin");
      }

      // Cannot deactivate self
      if (adminId.toString() === targetAdminId) {
        throw new ApiError(400, "Cannot deactivate your own account");
      }

      const targetAdmin = await Admin.findById(targetAdminId);
      if (!targetAdmin) {
        throw new ApiError(404, "Target admin not found");
      }

      targetAdmin.isActive = false;
      await targetAdmin.save();

      // Also update user's admin status
      await UserModel.findByIdAndUpdate(targetAdmin.userId, { isAdmin: false });

      return res.status(200).json(
        successResponse(
          {
            deactivatedAdminId: targetAdminId,
          },
          "Admin deactivated successfully"
        )
      );
    } catch (error: any) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        500,
        "Internal Server Error: Unable to deactivate admin"
      );
    }
  }

  // Fetch model data (generic data fetching)
  private static async _fetchModelData(
    req: express.Request,
    res: express.Response
  ) {
    try {
      const adminId = req.admin?._id;
      const { modelName, limit = 10, page = 1 } = req.query;

      if (!adminId) {
        throw new ApiError(401, "Unauthorized access");
      }

      if (!modelName) {
        throw new ApiError(400, "Model name is required");
      }

      const admin = await Admin.findById(adminId);
      if (!admin) {
        throw new ApiError(404, "Admin not found");
      }

      if (!admin.isActive) {
        throw new ApiError(401, "Admin account is deactivated");
      }

      // Check if admin has permission to view analytics
      if (!admin.hasPermission("canViewAnalytics")) {
        throw new ApiError(403, "Insufficient permissions to fetch data");
      }

      const query = {}; // You can extend this to accept query parameters

      const data = await admin.fetchModelData(
        modelName as string,
        query,
        Number(limit),
        { createdAt: -1 }
      );

      return res.status(200).json(
        successResponse(
          {
            data,
            modelName,
            count: data.length,
            page: Number(page),
            limit: Number(limit),
          },
          "Data fetched successfully"
        )
      );
    } catch (error: any) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, "Internal Server Error: Unable to fetch data");
    }
  }

  // Public methods wrapped with AsyncHandler
  public static upgradeUserToAdmin = AsyncHandler.wrap(
    AdminController._upgradeUserToAdmin
  );
  public static adminLogin = AsyncHandler.wrap(AdminController._adminLogin);
  public static adminLogout = AsyncHandler.wrap(AdminController._adminLogout);
  public static getAdminProfile = AsyncHandler.wrap(
    AdminController._getAdminProfile
  );
  public static blockUser = AsyncHandler.wrap(AdminController._blockUser);
  public static unblockUser = AsyncHandler.wrap(AdminController._unblockUser);
  public static getBlockedUsers = AsyncHandler.wrap(
    AdminController._getBlockedUsers
  );
  public static getAllAdmins = AsyncHandler.wrap(AdminController._getAllAdmins);
  public static deactivateAdmin = AsyncHandler.wrap(
    AdminController._deactivateAdmin
  );
  public static fetchModelData = AsyncHandler.wrap(
    AdminController._fetchModelData
  );
}

export default AdminController;
