import express from "express";
import AdminNotificationController from "../controllers/adminNotificationManagementController";

const router = express.Router();

router.get("/stats", AdminNotificationController.getStats);
router.get("/:notificationId", AdminNotificationController.getDetail);
router.get("/", AdminNotificationController.listNotifications);

export default router;
