// ─── Normalized Webhook Event Handler ────────────────────────────────────────
// Both Razorpay and Stripe webhooks are routed here after signature verification.
// Handles idempotency (dedup via Redis) and routes to business logic.

import { WebhookEvent } from "./payment.interface";
import { PaymentOrderModel } from "../../models/paymentOrderModel";
import { SubscriptionModel } from "../../models/subscriptionModel";
import { SubscriptionHistoryModel } from "../../models/subscriptionHistoryModel";
import { ReferralModel } from "../../models/referralModel";
import { RedisManager } from "../../utils/redisClient";
import { withTransaction } from "../../utils/mongoUtils";
import { Types } from "mongoose";
import CreditController from "../../controllers/creditController";

const WEBHOOK_DEDUP_GROUP = "webhook_event";
const WEBHOOK_DEDUP_TTL = 7 * 24 * 60 * 60; // 7 days in seconds

export class WebhookHandler {
  /**
   * Main entry point — call after signature verification.
   * Returns true if event was processed, false if duplicate (already seen).
   */
  static async process(event: WebhookEvent): Promise<{ processed: boolean; message: string }> {
    // ── Deduplication: skip if we've seen this eventId before ──
    const existing = await RedisManager.getDataFromGroup<string>(WEBHOOK_DEDUP_GROUP, event.eventId);
    if (existing) {
      console.log(`[Webhook] Duplicate event skipped: ${event.eventId}`);
      return { processed: false, message: "duplicate" };
    }

    // Mark event as seen before processing (prevents double-processing on retry)
    await RedisManager.cacheDataInGroup(
      WEBHOOK_DEDUP_GROUP,
      event.eventId,
      { eventType: event.eventType, processedAt: new Date().toISOString() },
      WEBHOOK_DEDUP_TTL
    );

    try {
      switch (event.eventType) {
        case "payment.success":
          await WebhookHandler.handlePaymentSuccess(event);
          break;
        case "payment.failed":
          await WebhookHandler.handlePaymentFailed(event);
          break;
        case "refund.processed":
          await WebhookHandler.handleRefundProcessed(event);
          break;
        default:
          console.log(`[Webhook] Unhandled event type: ${event.eventType}`);
      }
      return { processed: true, message: "ok" };
    } catch (err: any) {
      // Remove dedup key so the event can be retried if processing failed
      await RedisManager.removeDataFromGroup(WEBHOOK_DEDUP_GROUP, event.eventId);
      console.error(`[Webhook] Processing failed for ${event.eventId}:`, err.message);
      throw err;
    }
  }

  /** payment.captured (Razorpay) / payment_intent.succeeded (Stripe) */
  private static async handlePaymentSuccess(event: WebhookEvent): Promise<void> {
    const { providerOrderId, providerPaymentId, amountInPaise } = event;

    if (!providerOrderId || !providerPaymentId) {
      console.error("[Webhook] payment.success missing orderId or paymentId");
      return;
    }

    await withTransaction(async (session) => {
      // Find PaymentOrder — atomic: only process if status is "created" or "attempted"
      const paymentOrder = await PaymentOrderModel.findOneAndUpdate(
        {
          providerOrderId,
          status: { $in: ["created", "attempted"] },
        },
        {
          status: "paid",
          providerPaymentId,
          webhookVerified: true,
          $set: { "metadata.webhookEvent": event.rawEvent },
        },
        { new: true, session }
      );

      if (!paymentOrder) {
        // Already paid (by verify endpoint) or unknown order — idempotent, skip
        console.log(`[Webhook] PaymentOrder not found or already paid: ${providerOrderId}`);
        return;
      }

      // Cross-check amount: fetched amount must match what we stored
      if (amountInPaise && amountInPaise !== paymentOrder.amount) {
        console.error(
          `[Webhook] Amount mismatch for order ${providerOrderId}: ` +
          `expected ${paymentOrder.amount}, got ${amountInPaise}`
        );
        // Mark as suspicious — do not activate
        await PaymentOrderModel.updateOne(
          { _id: paymentOrder._id },
          { status: "failed", "metadata.amountMismatch": true },
          { session }
        );
        return;
      }

      // Activate subscription (same logic as _updatePaymentStatus)
      await WebhookHandler.activateSubscription({
        subscriptionId: paymentOrder.subscriptionId.toString(),
        userId: paymentOrder.userId.toString(),
        paymentId: providerPaymentId,
        transactionId: providerOrderId,
        paymentMethod: event.rawEvent?.payload?.payment?.entity?.method || "razorpay",
        session,
      });

      console.log(`[Webhook] Subscription activated via webhook: ${paymentOrder.subscriptionId}`);
    });
  }

  /** payment.failed */
  private static async handlePaymentFailed(event: WebhookEvent): Promise<void> {
    const { providerOrderId, providerPaymentId } = event;
    if (!providerOrderId) return;

    await PaymentOrderModel.findOneAndUpdate(
      { providerOrderId, status: { $in: ["created", "attempted"] } },
      {
        status: "failed",
        ...(providerPaymentId && { providerPaymentId }),
        $inc: { attempts: 1 },
        $set: { "metadata.lastFailedEvent": event.rawEvent },
      }
    );

    // Also mark subscription paymentStatus as Failed
    const order = await PaymentOrderModel.findOne({ providerOrderId });
    if (order) {
      await SubscriptionModel.updateOne(
        { _id: order.subscriptionId, status: "Pending" },
        { paymentStatus: "Failed" }
      );
    }

    console.log(`[Webhook] Payment failed for order: ${providerOrderId}`);
  }

  /** refund.processed */
  private static async handleRefundProcessed(event: WebhookEvent): Promise<void> {
    const { providerPaymentId, refundId, amountInPaise } = event;
    if (!providerPaymentId) return;

    await PaymentOrderModel.findOneAndUpdate(
      { providerPaymentId },
      {
        status: "refunded",
        refundId,
        refundAmount: amountInPaise,
        $set: { "metadata.refundEvent": event.rawEvent },
      }
    );

    console.log(`[Webhook] Refund processed for payment: ${providerPaymentId}`);
  }

  /** Shared: activate subscription after confirmed payment */
  static async activateSubscription(params: {
    subscriptionId: string;
    userId: string;
    paymentId: string;
    transactionId: string;
    paymentMethod: string;
    session?: any;
  }): Promise<void> {
    const { subscriptionId, userId, paymentId, transactionId, paymentMethod, session } = params;

    const subscription = await SubscriptionModel.findOneAndUpdate(
      {
        _id: new Types.ObjectId(subscriptionId),
        userId: new Types.ObjectId(userId),
        paymentStatus: { $ne: "Completed" }, // idempotent — skip if already activated
      },
      {
        paymentStatus: "Completed",
        paymentId,
        transactionId,
        paymentMethod,
        status: "Active",
      },
      { new: true, session }
    );

    if (!subscription) {
      // Already activated — idempotent, skip
      return;
    }

    // Complete referral if one was applied
    if (subscription.referralId) {
      await ReferralModel.updateOne(
        { _id: subscription.referralId, status: "Pending" },
        { status: "Completed", subscriptionId: subscription._id },
        { session }
      );
    }

    // Append to subscription history
    await SubscriptionHistoryModel.updateOne(
      { userId: new Types.ObjectId(userId) },
      {
        $push: {
          subscriptions: {
            subscriptionId: subscription._id,
            type: subscription.type,
            startDate: subscription.startDate,
            endDate: subscription.endDate,
            amount: subscription.amount,
            status: "Active",
            paymentStatus: "Completed",
            paymentId,
            transactionId,
            paymentMethod,
            timestamp: new Date(),
          },
        },
      },
      { session }
    );

    // Grant credits based on subscription tier
    await CreditController.grantSubscriptionCredits(userId, subscription.type, session);

    // Update user's tier expiry
    const { UserModel } = await import("../../models/userModel");
    await UserModel.updateOne(
      { _id: new Types.ObjectId(userId) },
      { tierExpiresAt: subscription.endDate },
      { session }
    );
  }
}
