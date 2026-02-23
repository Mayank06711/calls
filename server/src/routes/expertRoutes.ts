import express from "express";
import ExpertProfileController from "../controllers/expertProfileController";
import { Middleware } from "../middlewares/middlewares";
import { validate, ExpertProfileUpdateSchema } from "../validation/zodSchema";

const router = express.Router();

// All routes require authentication
router.use(Middleware.VerifyJWT);

// Expert profile routes
router.get("/profile", ExpertProfileController.getProfile);
router.put("/profile", validate(ExpertProfileUpdateSchema), ExpertProfileController.updateProfile);

// Admin routes
router.get("/all", Middleware.IsAdmin, ExpertProfileController.listAllExperts);
router.patch("/:expertId/toggle-status", Middleware.IsAdmin, ExpertProfileController.toggleExpertStatus);
router.patch("/:expertId/verify-degree", Middleware.IsAdmin, ExpertProfileController.verifyDegree);

export default router;
