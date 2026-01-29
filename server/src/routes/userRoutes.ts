import User from "../controllers/userController";
import { Router } from "express";
import { Middleware } from "../middlewares/middlewares";
import { validate, SignUpSchema, VerifyEmailSchema, GetUserByIdSchema } from "../validation/zodSchema";
const router = Router();

// User routes
router.route("/signup").post(validate(SignUpSchema), User.signUp);
router.route("/email_verify/:token").get(User.verifyEmailToken);
router.route("/login").post(User.login);
// Secured routes
router.use(Middleware.VerifyJWT); // Apply JWT middleware to all routes below
router.route("/email_verification").post(validate(VerifyEmailSchema), User.verifyEmail);
router.route("/profile").get(User.getProfile).patch(User.updateProfile); // Combined profile routes
router.route("/password").post(User.forgotPassword).patch(User.changePassword); // Combined password routes
router.route("/logout").post(User.logout);
router.route("/all-users").get(User.getAllUsers);
router.route("/get_user_by_id").post(validate(GetUserByIdSchema), User.getUserById);
export default router;
