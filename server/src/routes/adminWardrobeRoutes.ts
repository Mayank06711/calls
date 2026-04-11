import express from "express";
import AdminWardrobeController from "../controllers/adminWardrobeAnalyticsController";

const router = express.Router();

router.get("/stats", AdminWardrobeController.getStats);
router.get("/trends", AdminWardrobeController.getTrends);
router.get("/ai-usage", AdminWardrobeController.getAIUsage);
router.get("/user/:userId", AdminWardrobeController.getUserWardrobe);

export default router;
