import express from "express";
import Authentication from "../controllers/authController";
import { AuthServices } from "../helper/auth";
const router = express.Router();

// Create Feedback
router.post("/generate_otp", Authentication.generateOtp);

// Get Feedbacks (filtered by criteria)
router.post("/verify_otp", Authentication.verifyOtp);

// refreshAccessToken
router.post("/refresh_token", AuthServices.RefreshAccessToken)

export default router;
