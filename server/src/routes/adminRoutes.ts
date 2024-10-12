import { Router } from "express";
import { middleware } from "../middlewares/middlewares";

const router = Router();

// Admin routes
 router.route("/check").post(middleware.IsAdmin)

export default router;