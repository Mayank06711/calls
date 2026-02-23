import express from "express";
import AdminSubscriptionController from "../controllers/adminSubscriptionManagementController";
import { validate, AdminSubscriptionExtendSchema } from "../validation/zodSchema";

const router = express.Router();

router.get("/stats", AdminSubscriptionController.getStats);
router.get("/user/:userId", AdminSubscriptionController.getUserSubscriptions);
router.get("/:subscriptionId", AdminSubscriptionController.getDetail);
router.patch("/:subscriptionId/extend", validate(AdminSubscriptionExtendSchema), AdminSubscriptionController.extendSubscription);
router.get("/", AdminSubscriptionController.listSubscriptions);

export default router;
