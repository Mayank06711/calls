import express from "express";
import AdminFeedbackController from "../controllers/adminFeedbackManagementController";

const router = express.Router();

router.get("/bug-reports", AdminFeedbackController.listBugReports);
router.get("/bug-reports/:bugId", AdminFeedbackController.getBugDetail);
router.get("/expert-reviews/stats", AdminFeedbackController.getExpertReviewStats);
router.get("/expert-reviews", AdminFeedbackController.listExpertReviews);
router.delete("/expert-reviews/:feedbackId", AdminFeedbackController.deleteExpertReview);

export default router;
