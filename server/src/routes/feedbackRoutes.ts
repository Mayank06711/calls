import express from "express";
import FeedbackController from "../controllers/feedbackController";
import { Middleware } from "../middlewares/middlewares";
import { validate, BugFeedbackSchema, ExpertFeedbackSchema } from "../validation/zodSchema";
const router = express.Router();

// PUBLIC ROUTES

// Submit Bug Feedback - Anyone can submit (anonymous or logged-in)
router.post("/bug", validate(BugFeedbackSchema), FeedbackController.submitBugFeedback);

// PROTECTED ROUTES
router.use(Middleware.VerifyJWT);
// Submit Expert Feedback - Only logged-in users
router.post(
  "/expert",
  validate(ExpertFeedbackSchema),
  FeedbackController.submitExpertFeedback
);

// Get User's Own Feedback History
router.get(
  "/my-feedback/:userId",
  FeedbackController.getUserFeedback
);

//ADMIN/DEVELOPER ROUTES (Authentication + Authorization Required) 

// Get All Feedback with filters and pagination
router.get(
  "/all",
  FeedbackController.getAllFeedback
);

// Get Feedback Statistics
router.get(
  "/stats",
  FeedbackController.getFeedbackStats
);

// Update Feedback Status/Response
router.put(
  "/:feedbackId",
  FeedbackController.updateFeedback
);

// Assign Feedback to Developer
router.put(
  "/:feedbackId/assign",
  FeedbackController.assignFeedback
);

// Mark Feedback as Fixed
router.put(
  "/:feedbackId/fixed",
  FeedbackController.markAsFixed
);

// Delete Feedback
router.delete(
  "/:feedbackId",
  FeedbackController.deleteFeedback
);

//DEVELOPER ROUTES 

// Get Feedback Assigned to Developer
router.get(
  "/assigned/:developerId",
  FeedbackController.getAssignedFeedback
);


export default router;