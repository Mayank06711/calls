import { Request, Response } from "express";
import { Types } from "mongoose";
import { AsyncHandler } from "../utils/AsyncHandler";
import { successResponse, errorResponse } from "../utils/apiResponse";
import { ApiError } from "../utils/apiError";
import { PaymentProviderFactory } from "../services/payment/payment.factory";
import { PaymentOrderModel } from "../models/paymentOrderModel";
import { SubscriptionModel } from "../models/subscriptionModel";
import { RedisManager } from "../utils/redisClient";
import { WebhookHandler } from "../services/payment/webhook.handler";
import { withTransaction } from "../utils/mongoUtils";

class Payment {
  // ─── GET /payments/config ─────────────────────────────────────────────────
  // Returns the public key and provider name for the frontend.
  // Never expose key_secret here.
  private static async _getConfig(req: Request, res: Response) {
    const provider = (process.env.PAYMENT_PROVIDER || "razorpay").toLowerCase();
    const config =
      provider === "razorpay"
        ? { provider: "razorpay", keyId: process.env.RAZORPAY_KEY_ID }
        : provider === "stripe"
        ? { provider: "stripe", publishableKey: process.env.STRIPE_PUBLISHABLE_KEY }
        : null;

    if (!config) {
      throw new ApiError(503, "Payment provider not configured");
    }

    return res.status(200).json(successResponse(config, "Payment config retrieved"));
  }

  // ─── POST /payments/create-order ─────────────────────────────────────────
  // Client sends { subscriptionId }.
  // Server looks up the subscription's amount — client never sends the price.
  private static async _createOrder(req: Request, res: Response) {
    const userId = req.user?._id;
    if (!userId) throw new ApiError(401, "Unauthorized");

    const { subscriptionId } = req.body as { subscriptionId: string };

    // ── Redis lock: prevent double-order creation for same subscription ──
    const lockKey = `payment:create:${userId}:${subscriptionId}`;
    const lockId = await RedisManager.acquireLock(lockKey, 30_000); // 30s
    if (!lockId) {
      throw new ApiError(429, "Payment in progress. Please wait and try again.");
    }

    try {
      // Fetch the subscription — verify ownership
      const subscription = await SubscriptionModel.findOne({
        _id: new Types.ObjectId(subscriptionId),
        userId: new Types.ObjectId(userId.toString()),
        status: "Pending",
        paymentStatus: { $ne: "Completed" },
      });

      if (!subscription) {
        throw new ApiError(404, "Pending subscription not found. Please create a subscription first.");
      }

      // Check if an order already exists for this subscription (idempotency)
      const existingOrder = await PaymentOrderModel.findOne({
        subscriptionId: subscription._id,
        status: { $in: ["created", "attempted"] },
      });

      if (existingOrder) {
        // Return existing order instead of creating a new one
        const provider = (process.env.PAYMENT_PROVIDER || "razorpay").toLowerCase();
        const keyId = provider === "razorpay" ? process.env.RAZORPAY_KEY_ID : process.env.STRIPE_PUBLISHABLE_KEY;
        return res.status(200).json(
          successResponse(
            {
              providerOrderId: existingOrder.providerOrderId,
              amount: existingOrder.amount,
              currency: existingOrder.currency,
              keyId,
              provider,
              paymentOrderId: existingOrder._id,
            },
            "Existing payment order returned"
          )
        );
      }

      // Amount is in rupees in the DB — convert to paise for Razorpay
      const amountInPaise = Math.round(subscription.amount * 100);
      const provider = PaymentProviderFactory.getProvider();

      const orderResult = await provider.createOrder({
        amountInPaise,
        currency: "INR",
        receipt: subscriptionId,
        notes: {
          userId: userId.toString(),
          subscriptionType: subscription.type,
          durationInDays: subscription.durationInDays.toString(),
        },
      });

      // Persist the PaymentOrder
      const providerName = (process.env.PAYMENT_PROVIDER || "razorpay") as "razorpay" | "stripe";
      const paymentOrder = await PaymentOrderModel.create({
        subscriptionId: subscription._id,
        userId: new Types.ObjectId(userId.toString()),
        providerOrderId: orderResult.providerOrderId,
        provider: providerName,
        amount: amountInPaise,
        currency: orderResult.currency,
        receipt: subscriptionId,
        status: "created",
      });

      // Update subscription status to "Requested" (payment initiated)
      await SubscriptionModel.updateOne(
        { _id: subscription._id },
        { status: "Requested" }
      );

      const keyId =
        providerName === "razorpay"
          ? process.env.RAZORPAY_KEY_ID
          : process.env.STRIPE_PUBLISHABLE_KEY;

      return res.status(201).json(
        successResponse(
          {
            providerOrderId: orderResult.providerOrderId,
            amount: amountInPaise,
            currency: orderResult.currency,
            keyId,
            provider: providerName,
            paymentOrderId: paymentOrder._id,
            // Subscription summary for Razorpay checkout prefill
            subscriptionType: subscription.type,
            durationInDays: subscription.durationInDays,
          },
          "Payment order created"
        )
      );
    } finally {
      await RedisManager.releaseLock(lockKey, lockId);
    }
  }

  // ─── POST /payments/verify ────────────────────────────────────────────────
  // Client sends the three values returned by Razorpay checkout on success.
  // We verify signature and cross-check the amount — then activate the subscription.
  private static async _verifyPayment(req: Request, res: Response) {
    const userId = req.user?._id;
    if (!userId) throw new ApiError(401, "Unauthorized");

    const { providerOrderId, providerPaymentId, signature } = req.body as {
      providerOrderId: string;
      providerPaymentId: string;
      signature: string;
    };

    // ── Redis lock: prevent double-activation ──
    const lockKey = `payment:verify:${userId}:${providerOrderId}`;
    const lockId = await RedisManager.acquireLock(lockKey, 30_000);
    if (!lockId) {
      throw new ApiError(429, "Verification already in progress.");
    }

    try {
      // Find the PaymentOrder — atomic check: must be "created" or "attempted"
      const paymentOrder = await PaymentOrderModel.findOne({
        providerOrderId,
        userId: new Types.ObjectId(userId.toString()),
        status: { $in: ["created", "attempted"] },
      });

      if (!paymentOrder) {
        // Check if already paid — idempotent response
        const paidOrder = await PaymentOrderModel.findOne({ providerOrderId, status: "paid" });
        if (paidOrder) {
          return res.status(200).json(successResponse({ alreadyVerified: true }, "Payment already verified"));
        }
        throw new ApiError(404, "Payment order not found or already processed");
      }

      // Verify signature + fetch actual amount from provider
      const paymentProvider = PaymentProviderFactory.getProvider();
      const verifyResult = await paymentProvider.verifyPayment({
        providerOrderId,
        providerPaymentId,
        signature,
      });

      // Cross-check amount: fetched amount from Razorpay must match our stored amount
      if (verifyResult.fetchedAmountInPaise !== paymentOrder.amount) {
        throw new ApiError(
          400,
          `Payment amount mismatch. Expected ${paymentOrder.amount} paise, got ${verifyResult.fetchedAmountInPaise}`
        );
      }

      // Fetch payment details for method
      const paymentDetails = await paymentProvider.fetchPayment(providerPaymentId);

      await withTransaction(async (session) => {
        // Atomic: update PaymentOrder only if it's still "created"/"attempted"
        const updated = await PaymentOrderModel.findOneAndUpdate(
          {
            _id: paymentOrder._id,
            status: { $in: ["created", "attempted"] },
          },
          {
            status: "paid",
            providerPaymentId,
            metadata: { paymentDetails },
          },
          { new: true, session }
        );

        if (!updated) {
          // Concurrently updated (webhook beat us) — OK, idempotent
          return;
        }

        // Activate subscription
        await WebhookHandler.activateSubscription({
          subscriptionId: paymentOrder.subscriptionId.toString(),
          userId: userId.toString(),
          paymentId: providerPaymentId,
          transactionId: providerOrderId,
          paymentMethod: paymentDetails.method || "razorpay",
          session,
        });
      });

      return res.status(200).json(
        successResponse(
          {
            verified: true,
            providerPaymentId,
            subscriptionId: paymentOrder.subscriptionId,
          },
          "Payment verified and subscription activated"
        )
      );
    } finally {
      await RedisManager.releaseLock(lockKey, lockId);
    }
  }

  // ─── GET /payments/order/:providerOrderId ─────────────────────────────────
  // Polling fallback: check order status without relying on webhook/verify response.
  private static async _getOrderStatus(req: Request, res: Response) {
    const userId = req.user?._id;
    if (!userId) throw new ApiError(401, "Unauthorized");

    const { providerOrderId } = req.params;

    const order = await PaymentOrderModel.findOne({
      providerOrderId,
      userId: new Types.ObjectId(userId.toString()),
    }).select("providerOrderId status providerPaymentId amount currency subscriptionId createdAt");

    if (!order) throw new ApiError(404, "Order not found");

    return res.status(200).json(successResponse(order, "Order status retrieved"));
  }

  // ─── GET /payments/history ────────────────────────────────────────────────
  private static async _getPaymentHistory(req: Request, res: Response) {
    const userId = req.user?._id;
    if (!userId) throw new ApiError(401, "Unauthorized");

    const { page = "1", limit = "10" } = req.query as { page?: string; limit?: string };
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit)));

    const [orders, total] = await Promise.all([
      PaymentOrderModel.find({ userId: new Types.ObjectId(userId.toString()) })
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .select("providerOrderId providerPaymentId status amount currency provider subscriptionId refundId refundAmount createdAt")
        .populate("subscriptionId", "type durationInDays startDate endDate"),
      PaymentOrderModel.countDocuments({ userId: new Types.ObjectId(userId.toString()) }),
    ]);

    return res.status(200).json(
      successResponse(
        { orders, total, page: pageNum, pages: Math.ceil(total / limitNum) },
        "Payment history retrieved"
      )
    );
  }

  // ─── POST /payments/refund ────────────────────────────────────────────────
  // Restricted: 7-day window, one refund per order.
  private static async _createRefund(req: Request, res: Response) {
    const userId = req.user?._id;
    if (!userId) throw new ApiError(401, "Unauthorized");

    const { paymentOrderId, reason } = req.body as { paymentOrderId: string; reason: string };

    const order = await PaymentOrderModel.findOne({
      _id: new Types.ObjectId(paymentOrderId),
      userId: new Types.ObjectId(userId.toString()),
      status: "paid",
    });

    if (!order) throw new ApiError(404, "Paid payment order not found");
    if (!order.providerPaymentId) throw new ApiError(400, "Payment ID not recorded — contact support");
    if (order.refundId) throw new ApiError(400, "A refund has already been initiated for this payment");

    // 7-day refund window
    const daysSincePurchase = (Date.now() - order.createdAt.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSincePurchase > 7) {
      throw new ApiError(400, "Refund window has expired (7 days from purchase)");
    }

    const provider = PaymentProviderFactory.getProvider();
    const refundResult = await provider.createRefund({
      providerPaymentId: order.providerPaymentId,
      amountInPaise: order.amount, // full refund
      reason,
    });

    await PaymentOrderModel.updateOne(
      { _id: order._id },
      {
        status: "refunded",
        refundId: refundResult.refundId,
        refundAmount: refundResult.amountInPaise,
        refundReason: reason,
      }
    );

    // Cancel the subscription on refund
    await SubscriptionModel.updateOne(
      { _id: order.subscriptionId, status: "Active" },
      { status: "Cancelled", paymentStatus: "Failed", endDate: new Date() }
    );

    return res.status(200).json(
      successResponse(
        { refundId: refundResult.refundId, status: refundResult.status },
        "Refund initiated successfully"
      )
    );
  }

  // ─── Public method bindings ───────────────────────────────────────────────
  public static getConfig = AsyncHandler.wrap(Payment._getConfig);
  public static createOrder = AsyncHandler.wrap(Payment._createOrder);
  public static verifyPayment = AsyncHandler.wrap(Payment._verifyPayment);
  public static getOrderStatus = AsyncHandler.wrap(Payment._getOrderStatus);
  public static getPaymentHistory = AsyncHandler.wrap(Payment._getPaymentHistory);
  public static createRefund = AsyncHandler.wrap(Payment._createRefund);
}

export { Payment };
