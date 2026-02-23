import express from "express";
import Admin, { AdminPosition } from "../models/adminModel";
import { UserModel } from "../models/userModel";
import { ApiError } from "../utils/apiError";
import { AsyncHandler } from "../utils/AsyncHandler";
import { successResponse } from "../utils/apiResponse";
import crypto from "crypto";
import JWT from "jsonwebtoken";
import { AuthServices } from "../helper/auth";
import NotificationService from "../services/notifications";

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

  // Refresh admin access token
  private static async _refreshToken(
    req: express.Request,
    res: express.Response
  ) {
    const incomingRefreshToken =
      req.cookies?.adminRefreshToken ||
      (req.headers["x-admin-refresh-token"] as string);

    if (!incomingRefreshToken) {
      throw new ApiError(401, "No admin refresh token provided");
    }

    try {
      const wrappedToken = JWT.verify(
        incomingRefreshToken,
        process.env.ADMIN_REFRESH_TOKEN_SECRET!,
        { algorithms: ["HS512"], complete: true }
      ) as any;

      const decryptedPayloadStr = AuthServices.decrypt(wrappedToken.payload.data);
      const decodedToken = JSON.parse(decryptedPayloadStr);

      if (decodedToken.iss !== "KYF-ADMIN" || decodedToken.aud !== "kyf-admin-api") {
        throw new ApiError(401, "Invalid admin token");
      }

      const admin = await Admin.findById(decodedToken._id).populate("userId");
      if (!admin || !admin.isActive) {
        throw new ApiError(401, "Admin not found or deactivated");
      }

      const accessToken = AdminController.generateAdminAccessToken(admin, admin.userId);

      return res
        .status(200)
        .cookie("adminAccessToken", accessToken, AdminController.options)
        .json(
          successResponse(
            { accessToken },
            "Admin token refreshed"
          )
        );
    } catch (error: any) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(401, "Invalid or expired admin refresh token");
    }
  }

  // Upgrade a user to admin — only superadmin (canManageAdmins) can do this
  // Body: { targetUserId, adminKey, position? }
  private static async _upgradeUserToAdmin(
    req: express.Request,
    res: express.Response
  ) {
    try {
      // Permission check — only superadmin
      const requestingAdmin = await Admin.findById(req.admin?._id);
      if (!requestingAdmin?.hasPermission("canManageAdmins")) {
        throw new ApiError(403, "Only superadmin can create new admins");
      }

      const { targetUserId, adminKey, position = AdminPosition.AGENT } = req.body;

      // Validate position enum
      if (!Object.values(AdminPosition).includes(position)) {
        throw new ApiError(400, `Invalid position. Must be one of: ${Object.values(AdminPosition).join(", ")}`);
      }

      // Check if target user exists
      const user = await UserModel.findById(targetUserId);
      if (!user) {
        throw new ApiError(404, "Target user not found");
      }

      if (user.isAdmin) {
        throw new ApiError(409, "User is already an admin");
      }

      // Require verified email and phone
      if (!user.isEmailVerified) {
        throw new ApiError(400, "User must have a verified email before being upgraded to admin");
      }
      if (!user.isPhoneVerified) {
        throw new ApiError(400, "User must have a verified phone number before being upgraded to admin");
      }

      // Create admin record for the target user
      const admin = await Admin.upgradeUserToAdmin(targetUserId, adminKey, position);

      console.log(`[Admin Upgrade] Superadmin ${req.admin?._id} upgraded user ${targetUserId} to ${position}`);

      return res
        .status(201)
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
              upgradedBy: req.admin?._id,
            },
            "User upgraded to admin successfully"
          )
        );
    } catch (error: any) {
      throw error;
    }
  }

  // Admin login
  private static async _adminLogin(
    req: express.Request,
    res: express.Response
  ) {
    try {
      // VerifyJWT middleware has already confirmed the user is logged in
      // Now verify they have admin privileges on their user account
      if (!req.user?.isAdmin) {
        throw new ApiError(403, "You do not have admin privileges");
      }

      const adminKey = req.body.adminKey?.trim();

      if (!adminKey) {
        throw new ApiError(400, "Admin key is required");
      }

      // Find admin record by the logged-in user's ID
      const admin = await Admin.findOne({ userId: req.user._id }).populate(
        "userId"
      );
      if (!admin) {
        throw new ApiError(404, "Admin record not found for this user");
      }
      console.log("admin login attempt for user:", req.user._id, "admin._id:", admin._id);

      if (!admin.isActive) {
        throw new ApiError(403, "Admin account is deactivated");
      }
      // Verify admin key
      const isKeyValid = await admin.verifyAdminKey(adminKey);
      if (!isKeyValid) {
        throw new ApiError(403, "Invalid admin key");
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
                permissions: {
                  canBlockUsers: admin.hasPermission("canBlockUsers"),
                  canDeleteUsers: admin.hasPermission("canDeleteUsers"),
                  canManageAdmins: admin.hasPermission("canManageAdmins"),
                  canViewAnalytics: admin.hasPermission("canViewAnalytics"),
                  canManageContent: admin.hasPermission("canManageContent"),
                  canAccessReports: admin.hasPermission("canAccessReports"),
                  canSendNotifications: admin.hasPermission("canSendNotifications"),
                  canManageExperts: admin.hasPermission("canManageExperts"),
                  canManageSubscriptions: admin.hasPermission("canManageSubscriptions"),
                },
                lastLoginAt: admin.lastLoginAt,
                loginCount: admin.loginCount,
              },
              user: admin.userId, // Populated user data
              token: accessToken, // For header-based auth (admin panel)
            },
            "Admin logged in successfully"
          )
        );
    } catch (error: any) {
      throw error;
    }
  }

  // Admin logout
  private static async _adminLogout(
    req: express.Request,
    res: express.Response
  ) {
    try {
      const isAdmin = req.admin?.isActive;
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
      throw error;
    }
  }

  // Get admin profile
  private static async _getAdminProfile(
    req: express.Request,
    res: express.Response
  ) {
    try {
      const admin = await Admin.findById(req.admin?._id).populate("userId");
      if (!admin) {
        throw new ApiError(404, "Admin not found");
      }

      if (!admin.isActive) {
        throw new ApiError(403, "Admin account is deactivated");
      }

      const responseData = {
        admin: {
          _id: admin._id,
          position: admin.position,
          permissions: {
            canBlockUsers: admin.hasPermission("canBlockUsers"),
            canDeleteUsers: admin.hasPermission("canDeleteUsers"),
            canManageAdmins: admin.hasPermission("canManageAdmins"),
            canViewAnalytics: admin.hasPermission("canViewAnalytics"),
            canManageContent: admin.hasPermission("canManageContent"),
            canAccessReports: admin.hasPermission("canAccessReports"),
            canSendNotifications: admin.hasPermission("canSendNotifications"),
            canManageExperts: admin.hasPermission("canManageExperts"),
            canManageSubscriptions: admin.hasPermission("canManageSubscriptions"),
          },
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
      throw error;
    }
  }

  // Block user
  private static async _blockUser(req: express.Request, res: express.Response) {
    try {
      const adminId = req.admin?._id;

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
      throw error;
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

      // Clear the isBlockedByAdmin flag on the user document
      const user = await UserModel.findById(userId);
      if (user) {
        user.isBlockedByAdmin = false;
        await user.save();
      }

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
      throw error;
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
      throw error;
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
      throw error;
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
      throw error;
    }
  }

  // Reactivate admin (super admin only)
  private static async _reactivateAdmin(
    req: express.Request,
    res: express.Response
  ) {
    try {
      const adminId = req.admin?._id;
      const { targetAdminId } = req.params;

      if (!adminId) throw new ApiError(401, "Unauthorized access");
      if (!targetAdminId) throw new ApiError(400, "Target admin ID is required");

      const currentAdmin = await Admin.findById(adminId);
      if (!currentAdmin) throw new ApiError(404, "Admin not found");
      if (!currentAdmin.isActive) throw new ApiError(401, "Admin account is deactivated");
      if (currentAdmin.position !== AdminPosition.SUPER_ADMIN) {
        throw new ApiError(403, "Only super admin can reactivate admins");
      }

      const targetAdmin = await Admin.findById(targetAdminId);
      if (!targetAdmin) throw new ApiError(404, "Target admin not found");

      if (targetAdmin.isActive) {
        throw new ApiError(400, "Admin is already active");
      }

      targetAdmin.isActive = true;
      await targetAdmin.save();

      // Restore user's admin status
      await UserModel.findByIdAndUpdate(targetAdmin.userId, { isAdmin: true });

      return res.status(200).json(
        successResponse(
          { reactivatedAdminId: targetAdminId },
          "Admin reactivated successfully"
        )
      );
    } catch (error: any) {
      throw error;
    }
  }

  // Reset admin key (super admin only)
  private static async _resetAdminKey(
    req: express.Request,
    res: express.Response
  ) {
    try {
      const adminId = req.admin?._id;
      const { targetAdminId } = req.params;
      const { newKey } = req.body;

      if (!adminId) throw new ApiError(401, "Unauthorized access");
      if (!targetAdminId) throw new ApiError(400, "Target admin ID is required");
      if (!newKey || newKey.length < 8) throw new ApiError(400, "New key must be at least 8 characters");

      const currentAdmin = await Admin.findById(adminId);
      if (!currentAdmin) throw new ApiError(404, "Admin not found");
      if (!currentAdmin.isActive) throw new ApiError(401, "Admin account is deactivated");
      if (currentAdmin.position !== AdminPosition.SUPER_ADMIN) {
        throw new ApiError(403, "Only super admin can reset admin keys");
      }

      const targetAdmin = await Admin.findById(targetAdminId);
      if (!targetAdmin) throw new ApiError(404, "Target admin not found");

      targetAdmin.adminKey = newKey; // pre-save hook will hash it
      await targetAdmin.save();

      return res.status(200).json(
        successResponse({ targetAdminId }, "Admin key reset successfully")
      );
    } catch (error: any) {
      throw error;
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
      throw error;
    }
  }

  private static async _sendnotification(
    req: express.Request,
    res: express.Response
  ) {
    try {
      const { type, message, extLink, stickyTime } = req.body;
      // Validate required fields (Zod already validates, but just in case)
      if (!type || !message) {
        throw new ApiError(400, "type and message are required");
      }

      // Validate admin permissions
      const adminId = req.admin?._id;
      if (!adminId) {
        throw new ApiError(401, "Unauthorized access");
      }

      const admin = await Admin.findById(adminId);
      if (!admin || !admin.isActive) {
        throw new ApiError(401, "Admin account not found or deactivated");
      }

      // Check if admin has permission to send notifications
      if (!admin.hasPermission("canSendNotifications")) {
        throw new ApiError(
          403,
          "Insufficient permissions to send notifications"
        );
      }

      // Use the notification service with MongoDB persistence
      const notificationService = NotificationService.getInstance();
      const notification = await notificationService.emitBroadcastNotification({
        type: type as any,
        title: message,
        message: message,
        severity: req.body.severity,
        discount: req.body.discount,
        expiresIn: req.body.expiresIn,
        description: req.body.description,
        extLink: extLink || null,
        stickyTime: stickyTime || 1000,
        sentBy: {
          adminId: adminId.toString(),
          position: admin.position === "superadmin" ? "" : admin.position,
        },
      });

      return res.status(200).json(
        successResponse(
          {
            notification,
          },
          "Notification sent successfully"
        )
      );
    } catch (error: any) {
      throw error;
    }
  }

  private static async _sendUserNotification(
    req: express.Request,
    res: express.Response
  ) {
    try {
      const { recipientId, type, title, message, product, severity, extLink, stickyTime } = req.body;

      if (!recipientId || !type || !message) {
        throw new ApiError(400, "recipientId, type, and message are required");
      }

      // Suggestion notifications MUST have complete product data
      if (type === "suggestion") {
        if (
          !product ||
          !product.name ||
          !product.image ||
          !product.link ||
          product.price == null ||
          !product.brand ||
          !product.platform
        ) {
          throw new ApiError(
            400,
            "Suggestion notifications require complete product data: name, image, link, price, brand, platform"
          );
        }
      }

      // Social notifications MUST have user info and action
      if (type === "social") {
        const { user, action } = req.body;
        if (!user || !user.name || !action) {
          throw new ApiError(
            400,
            "Social notifications require user (with name) and action"
          );
        }
      }

      const adminId = req.admin?._id;
      if (!adminId) {
        throw new ApiError(401, "Unauthorized access");
      }

      const admin = await Admin.findById(adminId);
      if (!admin || !admin.isActive) {
        throw new ApiError(401, "Admin account not found or deactivated");
      }

      if (!admin.hasPermission("canSendNotifications")) {
        throw new ApiError(403, "Insufficient permissions to send notifications");
      }

      const notificationService = NotificationService.getInstance();
      const notification = await notificationService.emitUserNotification({
        recipientId,
        type,
        title: title || "",
        message,
        product,
        action: req.body.action,
        user: req.body.user,
        content: req.body.content,
        discount: req.body.discount,
        expiresIn: req.body.expiresIn,
        description: req.body.description,
        severity,
        extLink,
        stickyTime,
        sentBy: {
          adminId: adminId.toString(),
          position: admin.position === "superadmin" ? "" : admin.position,
        },
      });

      return res.status(200).json(
        successResponse(
          { notification },
          "User notification sent successfully"
        )
      );
    } catch (error: any) {
      throw error;
    }
  }

  // Public methods wrapped with AsyncHandler
  public static refreshToken = AsyncHandler.wrap(AdminController._refreshToken);
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
  public static reactivateAdmin = AsyncHandler.wrap(
    AdminController._reactivateAdmin
  );
  public static resetAdminKey = AsyncHandler.wrap(
    AdminController._resetAdminKey
  );
  public static fetchModelData = AsyncHandler.wrap(
    AdminController._fetchModelData
  );
  public static sendNotification = AsyncHandler.wrap(
    AdminController._sendnotification
  );
  public static sendUserNotification = AsyncHandler.wrap(
    AdminController._sendUserNotification
  );
}

export default AdminController;
