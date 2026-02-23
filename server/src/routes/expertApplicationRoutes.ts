import express from "express";
import ExpertApplicationController from "../controllers/expertApplicationController";
import { Middleware } from "../middlewares/middlewares";
import {
  validate,
  ExpertApplicationSubmitSchema,
  ExpertApplicationUpdateSchema,
  ExpertApplicationReviewSchema,
} from "../validation/zodSchema";

const router = express.Router();

// All routes require authentication
router.use(Middleware.VerifyJWT);

// User routes
router.post("/", validate(ExpertApplicationSubmitSchema), ExpertApplicationController.submitApplication);
router.get("/mine", ExpertApplicationController.getMyApplication);
router.put("/mine", validate(ExpertApplicationUpdateSchema), ExpertApplicationController.updateApplication);
router.post("/mine/withdraw", ExpertApplicationController.withdrawApplication);

// Admin routes
router.get("/all", Middleware.IsAdmin, ExpertApplicationController.listApplications);
router.get("/:applicationId", Middleware.IsAdmin, ExpertApplicationController.getApplicationById);
router.put("/:applicationId/review", Middleware.IsAdmin, validate(ExpertApplicationReviewSchema), ExpertApplicationController.reviewApplication);

export default router;
