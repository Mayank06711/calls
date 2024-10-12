import User from "../controllers/userController";
import { Router } from "express";
import { middleware } from "../middlewares/middlewares";
const router = Router();

// User routes
router.route("/signup").post(User.signUp);
router.route("/verify-email").post(User.verifyEmail);
// below are secured routes;
router.route("/login").post(User.login);
router.route("/verify-phone").post(User.verifyPhone); // Verify phone number
router.route("/update-profile").put(User.updateProfile); // Update user profile
router.route("/get-profile").get(User.getProfile); // Get user profile
router.route("/change-avatar").patch(User.changeAvatar); // Change user avatar
router.route("/forgot-password").post(User.forgotPassword); // Handle forgot password
router.route("/change-password").put( middleware.VerifyJWT, User.changePassword); // Change user password
router.route("/refresh-token").post(User.refreshToken); // Refresh access token
router.route("/logout").post(User.logout); // User logout
router.route("/create ").post(User.create);
export default router;
