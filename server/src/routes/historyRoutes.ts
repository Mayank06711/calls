import express from "express";
import HistoryController from "../controllers/historyController";
import { Middleware } from "../middlewares/middlewares";

const router = express.Router();

// All history routes require authentication
router.use(Middleware.VerifyJWT);

// ─── User History ─────────────────────────────────────────────
router.get("/calls", HistoryController.getCallHistory);
router.get("/subscriptions", HistoryController.getSubscriptionHistory);
router.get("/payments", HistoryController.getPaymentHistory);
router.get("/sessions", HistoryController.getSessionHistory);
router.get("/ratings", HistoryController.getRatingsGiven);

// ─── Expert History ───────────────────────────────────────────
router.get("/expert/performance", HistoryController.getExpertPerformance);
router.get("/expert/earnings", HistoryController.getExpertEarnings);
router.get("/expert/complaints", HistoryController.getExpertComplaints);
router.get("/expert/summary", HistoryController.getExpertSummary);

export default router;
