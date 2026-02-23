import express from "express";
import AdminUserManagementController from "../controllers/adminUserManagementController";

const router = express.Router();

router.get("/search", AdminUserManagementController.searchUsers);
router.get("/", AdminUserManagementController.listUsers);
router.get("/:userId", AdminUserManagementController.getUserDetail);
router.get("/:userId/sessions", AdminUserManagementController.getUserSessions);
router.post("/:userId/sessions/:sessionId/revoke", AdminUserManagementController.revokeUserSession);
router.post("/:userId/force-logout", AdminUserManagementController.forceLogout);
router.post("/:userId/reactivate", AdminUserManagementController.reactivateUser);
router.delete("/:userId", AdminUserManagementController.softDeleteUser);

export default router;
