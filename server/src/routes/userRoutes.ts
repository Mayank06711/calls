import User from "../controllers/userController";
import { Router } from "express";
import { Middleware } from "../middlewares/middlewares";
const router = Router();

// User routes
router.route("/signup").post(User.signUp);
router.route("/email_verify/:token").get(User.verifyEmailToken);
router.route("/login").post(User.login);
// Secured routes
router.use(Middleware.VerifyJWT); // Apply JWT middleware to all routes below
router.route("/email_verification").post(User.verifyEmail);
router.route("/profile").get(User.getProfile).patch(User.updateProfile); // Combined profile routes
router.route("/password").post(User.forgotPassword).patch(User.changePassword); // Combined password routes
router.route("/logout").post(User.logout);
export default router;
