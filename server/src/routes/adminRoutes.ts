import { Router } from "express";
import { Middleware } from "../middlewares/middlewares";

const router = Router();

// Admin routes
 router.route("/check").post(Middleware.IsAdmin)

export default router;