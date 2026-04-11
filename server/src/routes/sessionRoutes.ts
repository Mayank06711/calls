import { Router } from "express";
import { SessionController } from "../controllers/sessionController";
import { Middleware } from "../middlewares/middlewares";

const router = Router();

// All session routes require authentication
router.use(Middleware.VerifyJWT);

// Get all active sessions for current user
router.get("/", SessionController.getSessions);

// Get session statistics
router.get("/stats", SessionController.getSessionStats);

// Revoke a specific session
router.delete("/:sessionId", SessionController.revokeSession);

// Revoke all sessions (optionally keep current)
router.post("/revoke-all", SessionController.revokeAllSessions);

export default router;
