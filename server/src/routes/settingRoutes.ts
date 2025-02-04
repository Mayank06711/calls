import { Router } from "express";
import { Middleware } from "../middlewares/middlewares";
import { UserSettings } from "../controllers/settingController";
const router = Router();

// Settiings routes
// router.use(Middleware.VerifyJWT);
router.post("/create", UserSettings.createSettings);
router.get(
  "/fetch",
  UserSettings.getSettings
);
router.patch("/update", UserSettings.updateSettings);
export default router;
