// ─── Payment Provider Factory ─────────────────────────────────────────────────
// Single source of truth for which payment provider is active.
// Never import RazorpayAdapter or StripeAdapter directly in controllers —
// always use PaymentProviderFactory.getProvider().
//
// To switch providers: set PAYMENT_PROVIDER=stripe in .env and restart server.

import { IPaymentProvider } from "./payment.interface";
import { RazorpayAdapter } from "./razorpay.adapter";
import { StripeAdapter } from "./stripe.adapter";

export class PaymentProviderFactory {
  private static instance: IPaymentProvider | null = null;

  static getProvider(): IPaymentProvider {
    if (!this.instance) {
      const provider = (process.env.PAYMENT_PROVIDER || "razorpay").toLowerCase();
      switch (provider) {
        case "razorpay":
          this.instance = new RazorpayAdapter();
          break;
        case "stripe":
          this.instance = new StripeAdapter();
          break;
        default:
          throw new Error(
            `Unknown PAYMENT_PROVIDER="${provider}". Valid values: razorpay, stripe`
          );
      }
      console.log(`[PaymentFactory] Provider initialized: ${provider}`);
    }
    return this.instance;
  }

  /** Reset singleton — useful for testing or hot-reload */
  static reset(): void {
    this.instance = null;
  }
}
