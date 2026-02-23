import express from "express";
import AdminSessionController from "../controllers/adminSessionManagementController";
import { validate, AdminBulkSessionRevokeSchema } from "../validation/zodSchema";

const router = express.Router();

router.get("/stats", AdminSessionController.getStats);
router.post("/revoke-bulk", validate(AdminBulkSessionRevokeSchema), AdminSessionController.revokeBulk);
router.post("/:sessionId/revoke", AdminSessionController.revokeSession);
router.get("/", AdminSessionController.listSessions);

export default router;
