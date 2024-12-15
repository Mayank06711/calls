import express from "express";
import Authentication from "../controllers/authController";

const router = express.Router();

// Create Feedback
router.post("/generate_otp", Authentication.generateOtp);

// Get Feedbacks (filtered by criteria)
router.post("/verify_otp", Authentication.verifyOtp);

export default router;
