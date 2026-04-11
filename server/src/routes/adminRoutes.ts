import express from "express";
import AdminController from "../controllers/adminController";
import { Middleware } from "../middlewares/middlewares";
import {
  validate,
  validateParams,
  UpgradeToAdminSchema,
  AdminLoginSchema,
  UserIdParamSchema,
  SendNotificationSchema,
  SendUserNotificationSchema,
} from "../validation/zodSchema";
import adminDashboardRouter from "./adminDashboardRoutes";
import adminUserManagementRouter from "./adminUserManagementRoutes";
import adminSubscriptionRouter from "./adminSubscriptionRoutes";
import adminFeedbackRouter from "./adminFeedbackRoutes";
import adminComplaintRouter from "./adminComplaintRoutes";
import adminSessionRouter from "./adminSessionRoutes";
import adminWardrobeRouter from "./adminWardrobeRoutes";
import adminNotificationRouter from "./adminNotificationRoutes";
import ExpertApplicationController from "../controllers/expertApplicationController";
import ExpertBlockController from "../controllers/expertBlockController";
import { ExpertApplicationReviewSchema } from "../validation/zodSchema";

const router = express.Router();

// Public routes (no auth)
router.post("/refresh-token", AdminController.refreshToken);

// Admin login — user must be logged in + have isAdmin: true, only needs adminKey
router.post("/login", Middleware.VerifyJWT, validate(AdminLoginSchema), AdminController.adminLogin);

// Protected routes (admin token required)
router.use(Middleware.IsAdmin);

router.post("/logout", AdminController.adminLogout);
router.get("/profile", AdminController.getAdminProfile);

// Upgrade a user to admin — superadmin only (canManageAdmins)
router.post("/upgrade", validate(UpgradeToAdminSchema), AdminController.upgradeUserToAdmin);

// User management routes
router.post("/users/:userId/block", validateParams(UserIdParamSchema), AdminController.blockUser);
router.post("/users/:userId/unblock", validateParams(UserIdParamSchema), AdminController.unblockUser);
router.get("/users/blocked", AdminController.getBlockedUsers);

// Admin management routes (super admin only)
router.get("/all", AdminController.getAllAdmins);
router.post("/:targetAdminId/deactivate", AdminController.deactivateAdmin);
router.post("/:targetAdminId/reactivate", AdminController.reactivateAdmin);
router.post("/:targetAdminId/reset-key", AdminController.resetAdminKey);

// Data fetching routes
router.get("/data/:modelName", AdminController.fetchModelData);

// Notification routes (legacy)
router.post("/notifications/send", validate(SendNotificationSchema), AdminController.sendNotification);
router.post("/notifications/send/user", validate(SendUserNotificationSchema), AdminController.sendUserNotification);

// Sub-routers for admin panel modules
router.use("/dashboard", adminDashboardRouter);
router.use("/manage-users", adminUserManagementRouter);
router.use("/manage-subscriptions", adminSubscriptionRouter);
router.use("/manage-feedback", adminFeedbackRouter);
router.use("/manage-complaints", adminComplaintRouter);
router.use("/manage-sessions", adminSessionRouter);
router.use("/wardrobe-analytics", adminWardrobeRouter);
router.use("/manage-notifications", adminNotificationRouter);

// Expert application management
router.get("/expert-applications", ExpertApplicationController.listApplications);
router.get("/expert-applications/:applicationId", ExpertApplicationController.getApplicationById);
router.put("/expert-applications/:applicationId/review", validate(ExpertApplicationReviewSchema), ExpertApplicationController.reviewApplication);

// Expert block requests
router.get("/expert-block-requests", ExpertBlockController.getBlockRequests);
router.put("/expert-block-requests/:requestId/review", ExpertBlockController.reviewBlockRequest);

export default router;
