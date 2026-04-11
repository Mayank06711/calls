import { Router } from "express";
import { Middleware } from "../middlewares/middlewares";
import { ChatHTTPController } from "../controllers/chatHttpController";

const router = Router();

router.use(Middleware.VerifyJWT);

// Chat request status check — HTTP fallback when socket is unavailable
router.get("/request-status/:otherUserId", ChatHTTPController.getRequestStatus);

export default router;
