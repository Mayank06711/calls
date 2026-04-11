import express from "express";
import ExpertProfileController from "../controllers/expertProfileController";
import { Middleware } from "../middlewares/middlewares";
import { validate, ExpertProfileUpdateSchema, ExpertPricingSchema, UpdateAvailabilitySchema } from "../validation/zodSchema";

const router = express.Router();

// All routes require authentication
router.use(Middleware.VerifyJWT);

// Expert profile routes
router.get("/profile", ExpertProfileController.getProfile);
router.put("/profile", validate(ExpertProfileUpdateSchema), ExpertProfileController.updateProfile);

// Instant expert matching
router.get("/instant", ExpertProfileController.findInstantExpert);

// Expert catalog
router.get("/catalog", ExpertProfileController.getCatalog);
router.get("/catalog/:expertId", ExpertProfileController.getExpertDetail);

// Expert availability
router.get("/availability/:expertId", ExpertProfileController.getAvailability);
router.put("/availability", validate(UpdateAvailabilitySchema), ExpertProfileController.updateAvailability);

// Admin routes
router.get("/all", Middleware.IsAdmin, ExpertProfileController.listAllExperts);
router.patch("/:expertId/toggle-status", Middleware.IsAdmin, ExpertProfileController.toggleExpertStatus);
router.patch("/:expertId/verify-degree", Middleware.IsAdmin, ExpertProfileController.verifyDegree);
router.patch("/:expertId/pricing", Middleware.IsAdmin, validate(ExpertPricingSchema), ExpertProfileController.updatePricing);

export default router;
