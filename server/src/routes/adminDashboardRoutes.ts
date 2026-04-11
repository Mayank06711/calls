import express from "express";
import AdminDashboardController from "../controllers/adminDashboardController";

const router = express.Router();

router.get("/overview", AdminDashboardController.getOverview);
router.get("/user-growth", AdminDashboardController.getUserGrowth);
router.get("/subscription-revenue", AdminDashboardController.getSubscriptionRevenue);
router.get("/expert-stats", AdminDashboardController.getExpertStats);
router.get("/platform-activity", AdminDashboardController.getPlatformActivity);
router.get("/recent-activity", AdminDashboardController.getRecentActivity);

export default router;
