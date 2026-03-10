// ─── Provider-agnostic payment types ─────────────────────────────────────────
// All payment providers must implement IPaymentProvider.
// Controllers always call PaymentProviderFactory.getProvider() — never import
// a concrete adapter directly. To switch providers set PAYMENT_PROVIDER in .env.

export interface CreateOrderParams {
  amountInPaise: number;      // smallest unit: paise for INR, cents for USD
  currency: string;           // "INR" | "USD"
  receipt: string;            // subscriptionId — acts as idempotency key
  notes?: Record<string, string>;
}

export interface CreateOrderResult {
  providerOrderId: string;    // e.g. "order_xxxxx" from Razorpay
  amount: number;             // in paise/cents (echoed back)
  currency: string;
}

export interface VerifyPaymentParams {
  providerOrderId: string;
  providerPaymentId: string;
  signature: string;
}

export interface VerifyPaymentResult {
  verified: boolean;
  fetchedAmountInPaise: number;  // amount confirmed from provider API (for cross-check)
}

export interface PaymentDetails {
  providerPaymentId: string;
  providerOrderId: string;
  amountInPaise: number;
  currency: string;
  status: string;
  method?: string;
  email?: string;
  contact?: string;
}

export interface RefundParams {
  providerPaymentId: string;
  amountInPaise: number;  // partial or full
  reason: string;
  notes?: Record<string, string>;
}

export interface RefundResult {
  refundId: string;
  amountInPaise: number;
  status: string;
}

// Normalized webhook event — provider-specific fields live in rawEvent
export interface WebhookEvent {
  eventId: string;          // used for deduplication (x-razorpay-event-id / Stripe event.id)
  eventType: NormalizedEventType;
  providerPaymentId?: string;
  providerOrderId?: string;
  amountInPaise?: number;
  refundId?: string;
  rawEvent: Record<string, any>;
}

export type NormalizedEventType =
  | "payment.success"
  | "payment.failed"
  | "payment.pending"
  | "refund.processed"
  | "unknown";

// ─── The contract every provider adapter must satisfy ────────────────────────
export interface IPaymentProvider {
  /** Create a payment order on the provider side */
  createOrder(params: CreateOrderParams): Promise<CreateOrderResult>;

  /** Verify payment signature + cross-check amount via provider API */
  verifyPayment(params: VerifyPaymentParams): Promise<VerifyPaymentResult>;

  /** Fetch payment details directly from provider (for amount cross-check) */
  fetchPayment(providerPaymentId: string): Promise<PaymentDetails>;

  /** Initiate a refund */
  createRefund(params: RefundParams): Promise<RefundResult>;

  /** Verify webhook signature against raw request body */
  verifyWebhookSignature(rawBody: Buffer, signature: string): boolean;

  /** Parse raw webhook body into a normalized WebhookEvent */
  parseWebhookEvent(rawBody: Buffer): WebhookEvent;
}
