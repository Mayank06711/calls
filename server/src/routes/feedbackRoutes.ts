import express from "express";
import FeedbackController from "../controllers/feedbackController";
import { Middleware } from "../middlewares/middlewares";
const router = express.Router();

// Create Feedback
router.post(
  "/new",
  Middleware.VerifyJWT,
  FeedbackController.createFeedback
);

// Get Feedbacks (filtered by criteria)
// router.get("/find", Middleware.VerifyJWT, FeedbackController.getFeedback);

// // Update Feedback (by feedbackId)
// router.put(
//   "/:feedbackId",
//   Middleware.VerifyJWT,
//   FeedbackController.updateFeedback
// );

export default router;
