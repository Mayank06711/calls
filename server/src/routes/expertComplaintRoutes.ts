import express from "express";
import ExpertComplaintController from "../controllers/expertComplaintController";
import { Middleware } from "../middlewares/middlewares";

const router = express.Router();

// All routes require authentication
router.use(Middleware.VerifyJWT);

// Submit a complaint
router.post("/", ExpertComplaintController.submitComplaint);

// User's own complaints
router.get("/my-complaints", ExpertComplaintController.getMyComplaints);

// Admin-only routes
router.get("/all", Middleware.IsAdmin, ExpertComplaintController.getComplaints);
router.put("/:complaintId", Middleware.IsAdmin, ExpertComplaintController.updateComplaintStatus);

export default router;
