import Razorpay from "razorpay";
import crypto from "crypto";
import { ApiError } from "../../utils/apiError";
import {
  IPaymentProvider,
  CreateOrderParams,
  CreateOrderResult,
  VerifyPaymentParams,
  VerifyPaymentResult,
  PaymentDetails,
  RefundParams,
  RefundResult,
  WebhookEvent,
  NormalizedEventType,
} from "./payment.interface";

export class RazorpayAdapter implements IPaymentProvider {
  private readonly client: Razorpay;
  private readonly keySecret: string;
  private readonly webhookSecret: string;

  constructor() {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!keyId || !keySecret || !webhookSecret) {
      throw new Error(
        "Missing Razorpay env vars: RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET"
      );
    }

    this.keySecret = keySecret;
    this.webhookSecret = webhookSecret;
    this.client = new Razorpay({ key_id: keyId, key_secret: keySecret });
  }

  async createOrder(params: CreateOrderParams): Promise<CreateOrderResult> {
    try {
      const order = await this.client.orders.create({
        amount: params.amountInPaise,
        currency: params.currency,
        receipt: params.receipt,
        notes: params.notes || {},
      });
      return {
        providerOrderId: order.id,
        amount: typeof order.amount === "string" ? parseInt(order.amount) : order.amount,
        currency: order.currency,
      };
    } catch (err: any) {
      throw new ApiError(502, `Razorpay createOrder failed: ${err.message || JSON.stringify(err)}`);
    }
  }

  async verifyPayment(params: VerifyPaymentParams): Promise<VerifyPaymentResult> {
    // Step 1: Verify HMAC-SHA256 signature — prevents forgery
    // Signature = HMAC_SHA256(orderId + "|" + paymentId, keySecret)
    const body = `${params.providerOrderId}|${params.providerPaymentId}`;
    const expectedSig = crypto
      .createHmac("sha256", this.keySecret)
      .update(body)
      .digest("hex");

    const expectedBuf = Buffer.from(expectedSig, "hex");
    const receivedBuf = Buffer.from(params.signature, "hex");

    // Use timingSafeEqual to prevent timing attacks
    // Wrap in Uint8Array to satisfy TypeScript's strict ArrayBufferView typing
    const valid =
      expectedBuf.length === receivedBuf.length &&
      crypto.timingSafeEqual(new Uint8Array(expectedBuf), new Uint8Array(receivedBuf));

    if (!valid) {
      throw new ApiError(400, "Payment signature verification failed");
    }

    // Step 2: Fetch actual payment amount from Razorpay API
    // This cross-checks the amount even though signature is valid
    const payment = await this.fetchPayment(params.providerPaymentId);

    return {
      verified: true,
      fetchedAmountInPaise: payment.amountInPaise,
    };
  }

  async fetchPayment(providerPaymentId: string): Promise<PaymentDetails> {
    try {
      const payment = await this.client.payments.fetch(providerPaymentId);
      return {
        providerPaymentId: payment.id,
        providerOrderId: payment.order_id as string,
        amountInPaise: typeof payment.amount === "string" ? parseInt(payment.amount) : payment.amount as number,
        currency: payment.currency as string,
        status: payment.status as string,
        method: payment.method as string | undefined,
        email: payment.email as string | undefined,
        contact: payment.contact as string | undefined,
      };
    } catch (err: any) {
      throw new ApiError(502, `Razorpay fetchPayment failed: ${err.message || JSON.stringify(err)}`);
    }
  }

  async createRefund(params: RefundParams): Promise<RefundResult> {
    try {
      const refund = await this.client.payments.refund(params.providerPaymentId, {
        amount: params.amountInPaise,
        notes: {
          reason: params.reason,
          ...(params.notes || {}),
        },
      });
      return {
        refundId: refund.id,
        amountInPaise: typeof refund.amount === "string" ? parseInt(refund.amount) : refund.amount as number,
        status: refund.status as string,
      };
    } catch (err: any) {
      throw new ApiError(502, `Razorpay refund failed: ${err.message || JSON.stringify(err)}`);
    }
  }

  verifyWebhookSignature(rawBody: Buffer, signature: string): boolean {
    // Signature = HMAC_SHA256(rawBody, webhookSecret)
    // Pass rawBody as utf-8 string — HMAC over UTF-8 encoded JSON bytes is equivalent
    const expected = crypto
      .createHmac("sha256", this.webhookSecret)
      .update(rawBody.toString("utf-8"))
      .digest("hex");

    const expectedBuf = Buffer.from(expected, "hex");

    let receivedBuf: Buffer;
    try {
      receivedBuf = Buffer.from(signature, "hex");
    } catch {
      return false;
    }

    if (expectedBuf.length !== receivedBuf.length) return false;
    // Wrap in Uint8Array to satisfy TypeScript's strict ArrayBufferView typing
    return crypto.timingSafeEqual(new Uint8Array(expectedBuf), new Uint8Array(receivedBuf));
  }

  parseWebhookEvent(rawBody: Buffer): WebhookEvent {
    let payload: Record<string, any>;
    try {
      payload = JSON.parse(rawBody.toString("utf-8"));
    } catch {
      throw new ApiError(400, "Invalid webhook payload: not valid JSON");
    }

    const razorpayEvent: string = payload.event || "";
    const paymentEntity = payload.payload?.payment?.entity;
    const refundEntity = payload.payload?.refund?.entity;

    const normalizedType: NormalizedEventType =
      razorpayEvent === "payment.captured"
        ? "payment.success"
        : razorpayEvent === "payment.failed"
        ? "payment.failed"
        : razorpayEvent === "payment.authorized"
        ? "payment.pending"
        : razorpayEvent === "refund.processed" || razorpayEvent === "refund.created"
        ? "refund.processed"
        : "unknown";

    return {
      eventId: payload.id || `rzp_${Date.now()}`,
      eventType: normalizedType,
      providerPaymentId: paymentEntity?.id || refundEntity?.payment_id,
      providerOrderId: paymentEntity?.order_id,
      amountInPaise: paymentEntity?.amount || refundEntity?.amount,
      refundId: refundEntity?.id,
      rawEvent: payload,
    };
  }
}
