import { Router } from "express";
import { Middleware } from "../middlewares/middlewares";
import { Payment } from "../controllers/paymentController";
import {
  validate,
  CreatePaymentOrderSchema,
  VerifyPaymentSchema,
  RefundPaymentSchema,
} from "../validation/zodSchema";

const paymentRouter = Router();

// All payment routes require authenticated user
paymentRouter.use(Middleware.VerifyJWT);

// GET  /api/v1/payments/config       — public key + provider name for frontend
paymentRouter.get("/config", Payment.getConfig);

// GET  /api/v1/payments/history      — paginated payment history for current user
paymentRouter.get("/history", Payment.getPaymentHistory);

// GET  /api/v1/payments/order/:providerOrderId — order status polling fallback
paymentRouter.get("/order/:providerOrderId", Payment.getOrderStatus);

// POST /api/v1/payments/create-order — create Razorpay/Stripe order for a pending subscription
paymentRouter.post("/create-order", validate(CreatePaymentOrderSchema), Payment.createOrder);

// POST /api/v1/payments/verify       — verify payment signature + activate subscription
paymentRouter.post("/verify", validate(VerifyPaymentSchema), Payment.verifyPayment);

// POST /api/v1/payments/refund       — initiate refund (7-day window)
paymentRouter.post("/refund", validate(RefundPaymentSchema), Payment.createRefund);

export { paymentRouter };
