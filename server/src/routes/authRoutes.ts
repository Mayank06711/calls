import express from "express";
import { rateLimit } from "express-rate-limit";
import Authentication from "../controllers/authController";
import { AuthServices } from "../helper/auth";
import { Middleware } from "../middlewares/middlewares";
import {
  validate,
  GenerateOtpSchema,
  VerifyOtpSchema,
  GenerateEmailOtpSchema,
  VerifyEmailOtpSchema,
  GoogleAuthSchema,
} from "../validation/zodSchema";
const router = express.Router();

// Stricter rate limiter for auth endpoints (20 requests per 15 minutes)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: "Too many authentication attempts, please try again after 15 minutes.",
});

// Phone OTP
router.post("/generate_otp", authLimiter, validate(GenerateOtpSchema), Authentication.generateOtp);
router.post("/verify_otp", authLimiter, validate(VerifyOtpSchema), Authentication.verifyOtp);

// Email OTP
router.post("/generate_email_otp", authLimiter, validate(GenerateEmailOtpSchema), Authentication.generateEmailOtp);
router.post("/verify_email_otp", authLimiter, validate(VerifyEmailOtpSchema), Authentication.verifyEmailOtp);

// Google OAuth
router.post("/google", authLimiter, validate(GoogleAuthSchema), Authentication.googleAuth);

// refreshAccessToken
router.post("/refresh_token", AuthServices.RefreshAccessToken);

// Protected route - needs authentication
router.post(
  "/process",
  Middleware.VerifyJWT,
  AuthServices.verifyAndForwardToAI
);
export default router;
