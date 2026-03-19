import { Request, Response } from "express";
import { Types } from "mongoose";
import { AsyncHandler } from "../utils/AsyncHandler";
import { successResponse } from "../utils/apiResponse";
import { ApiError } from "../utils/apiError";
import { UserModel } from "../models/userModel";
import { CreditTransactionModel } from "../models/creditTransactionModel";
import { PaymentProviderFactory } from "../services/payment/payment.factory";
import { PaymentOrderModel } from "../models/paymentOrderModel";
import { RedisManager } from "../utils/redisClient";

// ─── Credit Packs ───────────────────────────────────────────────────────────

const CREDIT_PACKS = [
  { id: "starter", name: "Starter Pack", credits: 100, priceINR: 99, popular: false },
  { id: "standard", name: "Standard Pack", credits: 300, priceINR: 249, popular: true },
  { id: "premium", name: "Premium Pack", credits: 700, priceINR: 499, popular: false },
  { id: "mega", name: "Mega Pack", credits: 1500, priceINR: 899, popular: false },
];

const SUBSCRIPTION_CREDIT_GRANTS: Record<string, number> = {
  Free: 90,
  Silver: 600,
  Gold: 1500,
  Platinum: 5000,
};

class CreditController {
  // ─── GET /credits/balance ─────────────────────────────────────────────────
  private static async _getBalance(req: Request, res: Response) {
    const userId = req.user?._id;
    if (!userId) throw new ApiError(401, "Unauthorized");

    const user = await UserModel.findById(userId).select("creditBalance").lean();
    if (!user) throw new ApiError(404, "User not found");

    return res.status(200).json(
      successResponse({ creditBalance: user.creditBalance || 0 })
    );
  }

  // ─── GET /credits/transactions ────────────────────────────────────────────
  private static async _getTransactions(req: Request, res: Response) {
    const userId = req.user?._id;
    if (!userId) throw new ApiError(401, "Unauthorized");

    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      CreditTransactionModel.find({ user: userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      CreditTransactionModel.countDocuments({ user: userId }),
    ]);

    return res.status(200).json(
      successResponse({
        transactions,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      })
    );
  }

  // ─── GET /credits/packs ──────────────────────────────────────────────────
  private static async _getPacks(_req: Request, res: Response) {
    return res.status(200).json(successResponse({ packs: CREDIT_PACKS }));
  }

  // ─── POST /credits/purchase ──────────────────────────────────────────────
  // Creates a Razorpay order for a credit pack
  private static async _purchasePack(req: Request, res: Response) {
    const userId = req.user?._id;
    if (!userId) throw new ApiError(401, "Unauthorized");

    const { packId } = req.body as { packId: string };
    const pack = CREDIT_PACKS.find((p) => p.id === packId);
    if (!pack) throw new ApiError(400, "Invalid pack ID");

    // Redis lock to prevent double-order
    const lockKey = `credit:purchase:${userId}:${packId}`;
    const lockId = await RedisManager.acquireLock(lockKey, 30_000);
    if (!lockId) {
      throw new ApiError(429, "Purchase in progress. Please wait.");
    }

    try {
      const amountInPaise = Math.round(pack.priceINR * 100);
      const provider = PaymentProviderFactory.getProvider();

      const orderResult = await provider.createOrder({
        amountInPaise,
        currency: "INR",
        receipt: `credit_${packId}_${userId}`,
        notes: {
          type: "credit_pack",
          packId,
          credits: pack.credits.toString(),
          userId: userId.toString(),
        },
      });

      const providerName = (process.env.PAYMENT_PROVIDER || "razorpay") as "razorpay" | "stripe";
      const paymentOrder = await PaymentOrderModel.create({
        subscriptionId: new Types.ObjectId(), // placeholder — not a subscription purchase
        userId: new Types.ObjectId(userId.toString()),
        providerOrderId: orderResult.providerOrderId,
        provider: providerName,
        amount: amountInPaise,
        currency: orderResult.currency,
        receipt: `credit_${packId}_${userId}`,
        status: "created",
        notes: { type: "credit_pack", packId, credits: pack.credits },
      });

      const keyId =
        providerName === "razorpay"
          ? process.env.RAZORPAY_KEY_ID
          : process.env.STRIPE_PUBLISHABLE_KEY;

      return res.status(201).json(
        successResponse({
          providerOrderId: orderResult.providerOrderId,
          amount: amountInPaise,
          currency: orderResult.currency,
          keyId,
          provider: providerName,
          paymentOrderId: paymentOrder._id,
          packName: pack.name,
          credits: pack.credits,
        }, "Credit pack order created")
      );
    } finally {
      await RedisManager.releaseLock(lockKey, lockId);
    }
  }

  // ─── POST /credits/verify-purchase ────────────────────────────────────────
  // Verifies Razorpay signature and grants credits
  private static async _verifyPurchase(req: Request, res: Response) {
    const userId = req.user?._id;
    if (!userId) throw new ApiError(401, "Unauthorized");

    const { providerOrderId, providerPaymentId, signature } = req.body as {
      providerOrderId: string;
      providerPaymentId: string;
      signature: string;
    };

    const lockKey = `credit:verify:${userId}:${providerOrderId}`;
    const lockId = await RedisManager.acquireLock(lockKey, 30_000);
    if (!lockId) {
      throw new ApiError(429, "Verification already in progress.");
    }

    try {
      const paymentOrder = await PaymentOrderModel.findOne({
        providerOrderId,
        userId: new Types.ObjectId(userId.toString()),
        status: { $in: ["created", "attempted"] },
      });

      if (!paymentOrder) {
        const paidOrder = await PaymentOrderModel.findOne({ providerOrderId, status: "paid" });
        if (paidOrder) {
          return res.status(200).json(successResponse({ alreadyVerified: true }, "Purchase already verified"));
        }
        throw new ApiError(404, "Payment order not found");
      }

      // Verify it's a credit pack order
      if (paymentOrder.notes?.type !== "credit_pack") {
        throw new ApiError(400, "This order is not a credit pack purchase");
      }

      // Verify signature + cross-check amount via provider API
      const provider = PaymentProviderFactory.getProvider();
      const verifyResult = await provider.verifyPayment({
        providerOrderId,
        providerPaymentId,
        signature,
      });

      if (!verifyResult.verified) {
        await PaymentOrderModel.updateOne(
          { _id: paymentOrder._id },
          { status: "failed", $inc: { attempts: 1 } }
        );
        throw new ApiError(400, "Payment signature verification failed");
      }

      // Mark order as paid
      await PaymentOrderModel.updateOne(
        { _id: paymentOrder._id },
        { status: "paid", providerPaymentId, webhookVerified: false }
      );

      // Atomic credit increment
      const credits = paymentOrder.notes.credits as number;
      const updatedUser = await UserModel.findOneAndUpdate(
        { _id: new Types.ObjectId(userId.toString()) },
        { $inc: { creditBalance: credits } },
        { new: true }
      );

      if (!updatedUser) throw new ApiError(404, "User not found");

      // Log transaction
      await CreditTransactionModel.create({
        user: userId,
        type: "pack_purchase",
        amount: credits,
        balanceAfter: updatedUser.creditBalance,
        description: `Purchased ${paymentOrder.notes.packId} pack (+${credits} credits)`,
        reference: { model: "PaymentOrder", id: paymentOrder._id },
      });

      return res.status(200).json(
        successResponse({
          creditBalance: updatedUser.creditBalance,
          creditsAdded: credits,
        }, "Credits purchased successfully")
      );
    } finally {
      await RedisManager.releaseLock(lockKey, lockId);
    }
  }

  // ─── Static: Grant subscription credits (called from webhook) ─────────────
  static async grantSubscriptionCredits(
    userId: string,
    subscriptionType: string,
    session?: any
  ): Promise<void> {
    const credits = SUBSCRIPTION_CREDIT_GRANTS[subscriptionType];
    if (!credits || credits <= 0) return;

    const updatedUser = await UserModel.findOneAndUpdate(
      { _id: new Types.ObjectId(userId) },
      { $inc: { creditBalance: credits } },
      { new: true, session }
    );

    if (!updatedUser) return;

    await CreditTransactionModel.create(
      [
        {
          user: new Types.ObjectId(userId),
          type: "subscription_grant",
          amount: credits,
          balanceAfter: updatedUser.creditBalance,
          description: `${subscriptionType} subscription — monthly credit grant (+${credits})`,
        },
      ],
      { session }
    );

    console.log(`[Credits] Granted ${credits} credits to user ${userId} for ${subscriptionType} subscription`);
  }

  // ── Wrapped public methods ──
  static getBalance = AsyncHandler.wrap(CreditController._getBalance);
  static getTransactions = AsyncHandler.wrap(CreditController._getTransactions);
  static getPacks = AsyncHandler.wrap(CreditController._getPacks);
  static purchasePack = AsyncHandler.wrap(CreditController._purchasePack);
  static verifyPurchase = AsyncHandler.wrap(CreditController._verifyPurchase);
}

export default CreditController;
