import { Request, Response } from "express";
import { PaymentProviderFactory } from "../services/payment/payment.factory";
import { WebhookHandler } from "../services/payment/webhook.handler";
import { ApiError } from "../utils/apiError";
import { AsyncHandler } from "../utils/AsyncHandler";
import { successResponse } from "../utils/apiResponse";

class Webhook {
  // ─── POST /webhooks/razorpay ──────────────────────────────────────────────
  // IMPORTANT: This route must receive the raw Buffer body (express.raw middleware).
  // Signature is verified against raw bytes — parsed JSON will break verification.
  private static async _handleRazorpay(req: Request, res: Response) {
    const signature = req.headers["x-razorpay-signature"] as string | undefined;

    if (!signature) {
      throw new ApiError(400, "Missing x-razorpay-signature header");
    }

    const rawBody = req.body as Buffer;
    if (!Buffer.isBuffer(rawBody) || rawBody.length === 0) {
      throw new ApiError(400, "Empty or non-raw webhook body");
    }

    // Always respond 200 quickly — Razorpay retries on non-2xx
    // We ack first, then process (fire-and-forget pattern with error logging)
    const provider = PaymentProviderFactory.getProvider();

    // Verify signature — throws ApiError(400) if invalid
    const isValid = provider.verifyWebhookSignature(rawBody, signature);
    if (!isValid) {
      throw new ApiError(400, "Webhook signature verification failed");
    }

    // Parse normalized event
    const event = provider.parseWebhookEvent(rawBody);

    // Process asynchronously — respond 200 before processing completes
    // This prevents Razorpay from retrying due to slow processing
    res.status(200).json(successResponse({ received: true }, "Webhook received"));

    // Fire-and-forget processing after responding
    WebhookHandler.process(event).catch((err) => {
      console.error(`[Webhook/Razorpay] Failed to process event ${event.eventId}:`, err.message);
    });
  }

  // ─── POST /webhooks/stripe ────────────────────────────────────────────────
  // Stub — same pattern, implement when PAYMENT_PROVIDER=stripe
  private static async _handleStripe(req: Request, res: Response) {
    // When implemented: verify stripe-signature header, parse event, process
    throw new ApiError(501, "Stripe webhooks not yet configured");
  }

  public static handleRazorpay = AsyncHandler.wrap(Webhook._handleRazorpay);
  public static handleStripe = AsyncHandler.wrap(Webhook._handleStripe);
}

export { Webhook };
