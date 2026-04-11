import express from "express";
import AdminComplaintController from "../controllers/adminComplaintManagementController";
import ExpertComplaintController from "../controllers/expertComplaintController";

const router = express.Router();

router.get("/stats", AdminComplaintController.getStats);
router.get("/list", AdminComplaintController.listComplaints);
router.get("/expert/:expertId", AdminComplaintController.getByExpert);
router.get("/:complaintId", AdminComplaintController.getDetail);
router.put("/:complaintId", ExpertComplaintController.updateComplaintStatus);

export default router;
