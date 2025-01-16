import { Router } from "express";
import { Middleware } from "../middlewares/middlewares";

const router = Router();

// Admin routes
 router.route("/").post(Middleware.IsAdmin)

export default router;