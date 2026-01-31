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

const router = express.Router();

router.post("/upgrade", validate(UpgradeToAdminSchema), AdminController.upgradeUserToAdmin);

router.post("/login", validate(AdminLoginSchema), AdminController.adminLogin);

// Protected routes (authentication required)
router.use(Middleware.IsAdmin); // Apply admin auth middleware to all routes below

router.post("/logout", AdminController.adminLogout);
router.get("/profile", AdminController.getAdminProfile);

// User management routes
router.post("/users/:userId/block", validateParams(UserIdParamSchema), AdminController.blockUser);
router.post("/users/:userId/unblock", validateParams(UserIdParamSchema), AdminController.unblockUser);
router.get("/users/blocked", AdminController.getBlockedUsers);

// Admin management routes (super admin only)
router.get("/all", AdminController.getAllAdmins);
router.post("/:targetAdminId/deactivate", AdminController.deactivateAdmin);

// Data fetching routes
router.get("/data/:modelName", AdminController.fetchModelData);

// Notification routes
router.post("/notifications/send", validate(SendNotificationSchema), AdminController.sendNotification);
router.post("/notifications/send/user", validate(SendUserNotificationSchema), AdminController.sendUserNotification);

export default router;
