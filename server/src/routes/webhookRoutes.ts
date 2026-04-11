import { Router, raw } from "express";
import { Webhook } from "../controllers/webhookController";

const webhookRouter = Router();

// CRITICAL: express.raw() must be applied PER-ROUTE here (not globally).
// Webhook signature verification requires the raw Buffer body.
// If express.json() runs first the body is already parsed and sig verification breaks.

// POST /api/v1/webhooks/razorpay
webhookRouter.post(
  "/razorpay",
  raw({ type: "application/json" }),
  Webhook.handleRazorpay
);

// POST /api/v1/webhooks/stripe  (stub — implement when PAYMENT_PROVIDER=stripe)
webhookRouter.post(
  "/stripe",
  raw({ type: "application/json" }),
  Webhook.handleStripe
);

export { webhookRouter };
