import express from "express";
import ExpertTipController from "../controllers/expertTipController";
import { Middleware } from "../middlewares/middlewares";

const router = express.Router();

// Public: tip stats for an expert
router.get("/expert/:expertId/stats", ExpertTipController.getExpertTipStats);

// Protected routes
router.use(Middleware.VerifyJWT);

// Create a tip
router.post("/", ExpertTipController.createTip);

// User's sent tips
router.get("/my-tips", ExpertTipController.getTipsByUser);

// Tips for a specific expert
router.get("/expert/:expertId", ExpertTipController.getTipsByExpert);

// Payment service callback (should be internal/restricted in production)
router.post("/payment-status/:tipId", ExpertTipController.updateTipPayment);

export default router;
