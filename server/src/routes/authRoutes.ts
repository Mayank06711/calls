import express from "express";
import Authentication from "../controllers/authController";
import { AuthServices } from "../helper/auth";
import { Middleware } from "../middlewares/middlewares";
const router = express.Router();

// Create Feedback
router.post("/generate_otp", Authentication.generateOtp);

// Get Feedbacks (filtered by criteria)
router.post("/verify_otp", Authentication.verifyOtp);

// refreshAccessToken
router.post("/refresh_token", AuthServices.RefreshAccessToken);

// Protected route - needs authentication
router.post(
  "/process",
  Middleware.VerifyJWT,
  AuthServices.verifyAndForwardToAI
);
export default router;
