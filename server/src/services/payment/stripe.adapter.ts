// ─── Stripe Adapter Stub ──────────────────────────────────────────────────────
// Fully interface-compliant but throws 501 on every call.
// Implement when PAYMENT_PROVIDER=stripe is needed.
// Switch by setting PAYMENT_PROVIDER=stripe in .env.

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
} from "./payment.interface";

export class StripeAdapter implements IPaymentProvider {
  private readonly NOT_CONFIGURED = "Stripe is not configured yet. Set PAYMENT_PROVIDER=razorpay or implement StripeAdapter.";

  async createOrder(_params: CreateOrderParams): Promise<CreateOrderResult> {
    throw new ApiError(501, this.NOT_CONFIGURED);
  }

  async verifyPayment(_params: VerifyPaymentParams): Promise<VerifyPaymentResult> {
    throw new ApiError(501, this.NOT_CONFIGURED);
  }

  async fetchPayment(_providerPaymentId: string): Promise<PaymentDetails> {
    throw new ApiError(501, this.NOT_CONFIGURED);
  }

  async createRefund(_params: RefundParams): Promise<RefundResult> {
    throw new ApiError(501, this.NOT_CONFIGURED);
  }

  verifyWebhookSignature(_rawBody: Buffer, _signature: string): boolean {
    throw new ApiError(501, this.NOT_CONFIGURED);
  }

  parseWebhookEvent(_rawBody: Buffer): WebhookEvent {
    throw new ApiError(501, this.NOT_CONFIGURED);
  }
}
