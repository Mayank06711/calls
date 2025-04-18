import { Router } from "express";
import { Subscription } from "../controllers/subscriptionController";
import { Middleware } from "../middlewares/middlewares";

const router = Router();

// Apply authentication middleware to all subscription routes
router.use(Middleware.VerifyJWT);

// IMPORTANT: Put static routes BEFORE parameter routes
// Subscription plans and configuration
router.get("/plans", Subscription.getSubscriptionPlans);
router.get("/config", Subscription.getSubscriptionConfig);

// Create and manage subscriptions
router.post("/create", Subscription.createSubscription);
router.get("/current", Subscription.getCurrentSubscription);
router.get("/history", Subscription.getSubscriptionHistory);
router.get("/update", Subscription.updateSubscription);

// Individual subscription operations (with parameters)
router.get("/details/:subscriptionId", Subscription.getSubscriptionDetails);
router.post(
  "/payment-status/:subscriptionId",
  Subscription.updatePaymentStatus
);
router.post("/cancel/:subscriptionId", Subscription.cancelSubscription);

/**
 * @swagger
 * /api/subscriptions:
 *   /create:
 *     post:
 *       summary: Create a new subscription
 *       tags: [Subscriptions]
 *       security:
 *         - bearerAuth: []
 *   /current:
 *     get:
 *       summary: Get current active subscription
 *   /history:
 *     get:
 *       summary: Get subscription history
 *   /:subscriptionId:
 *     get:
 *       summary: Get detailed subscription information
 *   /:subscriptionId/payment-status:
 *     post:
 *       summary: Update subscription payment status
 *   /:subscriptionId/cancel:
 *     post:
 *       summary: Cancel an active subscription
 *   /plans:
 *     get:
 *       summary: Get available subscription plans
 *   /config:
 *     get:
 *       summary: Get subscription configuration
 */

// Route summary:
// POST /api/subscriptions/create - Create new subscription
// GET /api/subscriptions/current - Get current subscription
// GET /api/subscriptions/history - Get subscription history
// GET /api/subscriptions/:subscriptionId - Get subscription details
// POST /api/subscriptions/:subscriptionId/payment-status - Update payment status
// POST /api/subscriptions/:subscriptionId/cancel - Cancel subscription
// GET /api/subscriptions/plans - Get available plans
// GET /api/subscriptions/config - Get subscription configuration

export default router;
