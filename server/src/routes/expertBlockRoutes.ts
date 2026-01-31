import express from "express";
import ExpertBlockController from "../controllers/expertBlockController";
import { Middleware } from "../middlewares/middlewares";

const router = express.Router();

// All routes require authentication
router.use(Middleware.VerifyJWT);

// Expert submits a block request
router.post("/request", ExpertBlockController.submitBlockRequest);

// Expert views their own block requests
router.get("/my-requests", ExpertBlockController.getMyBlockRequests);

// Admin-only routes
router.get("/pending", Middleware.IsAdmin, ExpertBlockController.getBlockRequests);
router.put("/:requestId/review", Middleware.IsAdmin, ExpertBlockController.reviewBlockRequest);

export default router;
