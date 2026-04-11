import { Request, Response } from "express";
import { SubscriptionModel } from "../models/subscriptionModel";
import { AsyncHandler } from "../utils/AsyncHandler";
import { successResponse } from "../utils/apiResponse";
import { ApiError } from "../utils/apiError";
import { UserModel } from "../models/userModel";
import { ReferralModel } from "../models/referralModel";
import { sanitizeData } from "../helper/sanitizeData";
import mongoose, { Types, UpdateQuery } from "mongoose";
import { SubscriptionHistoryModel } from "../models/subscriptionHistoryModel";
import { withTransaction } from "../utils/mongoUtils";
import { SUBSCRIPTION_CONFIG, SubscriptionTier } from "../helper/constants";
import { PaymentStatus } from "../types/typesGeneral";
import {
  ISubscriptionHistory,
  ISubscriptionStatistics,
} from "../interface/ISubscriptionHistroy";
import { ISubscription } from "../interface/ISubscription";
import CreditController from "./creditController";

class Subscription {
  // ── Public helpers ────────────────────────────────────────────────────────

  public static getTierLevel = (tier: SubscriptionTier): number => {
    return SUBSCRIPTION_CONFIG.TIERS[tier]?.level || 0;
  };

  /** Returns the flat price for a tier (from constants). */
  public static getSubscriptionPrice = (tier: SubscriptionTier): number => {
    return SUBSCRIPTION_CONFIG.TIERS[tier]?.price ?? 0;
  };

  public static isValidUpgrade = (currentTier: any, newTier: any): boolean => {
    const currentLevel = Subscription.getTierLevel(currentTier);
    const newLevel = Subscription.getTierLevel(newTier);
    return newLevel > currentLevel;
  };

  public static getFeatureLimits = (tier: SubscriptionTier) => {
    return SUBSCRIPTION_CONFIG.TIERS[tier]?.limits || {};
  };

  public static isValidSubscriptionTier = (
    tier: string
  ): tier is SubscriptionTier => {
    return tier in SUBSCRIPTION_CONFIG.TIERS && tier !== "Free";
  };

  // ── Create subscription (credits-based, flat price) ───────────────────────

  private static async _createSubscription(req: Request, res: Response) {
    const userId = req.user?._id;
    if (!userId) throw new ApiError(401, "Unauthorized access");

    const { type, referralCode } = req.body;

    // Validate subscription type
    if (!Subscription.isValidSubscriptionTier(type)) {
      throw new ApiError(
        400,
        `Invalid subscription type. Valid types are: ${Object.keys(
          SUBSCRIPTION_CONFIG.TIERS
        )
          .filter((t) => t !== "Free")
          .join(", ")}`
      );
    }

    const subscriptionType = type as SubscriptionTier;
    const tierConfig = SUBSCRIPTION_CONFIG.TIERS[subscriptionType];

    // Check existing subscription
    const existingSubscription = await SubscriptionModel.findOne({
      userId,
      status: { $in: ["Active", "Pending"] },
    }).select("type status endDate amount");

    if (existingSubscription) {
      if (
        existingSubscription.status === "Pending" &&
        existingSubscription.type !== "Free"
      ) {
        throw new ApiError(
          400,
          `You have a pending ${existingSubscription.type} subscription. Please complete payment or raise a complaint.`
        );
      }

      if (
        !Subscription.isValidUpgrade(
          existingSubscription.type,
          subscriptionType
        )
      ) {
        if (existingSubscription.type === subscriptionType) {
          throw new ApiError(400, "You already have this subscription tier");
        }
        throw new ApiError(400, "Subscription downgrade is not allowed");
      }
    }

    const result = await withTransaction(async (session) => {
      const startDate = new Date();
      const endDate = new Date();
      const durationDays = tierConfig.tierDurationDays ?? 30;
      endDate.setDate(startDate.getDate() + durationDays);

      const finalAmount = tierConfig.price;
      let creditsGranted = tierConfig.creditsGranted;
      let upgradeDetails = null;

      // Handle upgrade: cancel old, start fresh (no pro-rating in credits model)
      if (existingSubscription?.status === "Active") {
        upgradeDetails = {
          previousType: existingSubscription.type,
          upgradeDate: startDate,
          proRatedCredit: 0,
          previousEndDate: existingSubscription.endDate,
          previousAmount: existingSubscription.amount,
        };
      }

      // Process referral → bonus credits
      let referralData = {
        referralBonusCredits: 0,
        referralId: undefined as undefined | mongoose.Types.ObjectId | string,
      };

      if (referralCode) {
        const existingReferralUse = await ReferralModel.findOne({
          userId: new mongoose.Types.ObjectId(userId.toString()),
          status: "Completed",
        }).session(session);

        if (existingReferralUse) {
          throw new ApiError(400, "You have already used a referral code");
        }

        const referral = await ReferralModel.findOne({
          referralCode,
          status: "Pending",
          validTill: { $gt: new Date() },
          referralType: "Subscription",
          validSubscriptionTypes: { $in: [subscriptionType] },
        }).session(session);

        if (referral) {
          const benefits = await referral.getReferralBenefits();
          const bonusCredits = Math.min(
            benefits.coins || 0,
            SUBSCRIPTION_CONFIG.SUBSCRIPTION_RULES.MAXIMUM_REFERRAL_BONUS_CREDITS
          );
          referralData = {
            referralBonusCredits: bonusCredits,
            referralId: referral._id as Types.ObjectId,
          };
          creditsGranted += bonusCredits;
        }
      }

      // Find or create subscription history
      let subscriptionHistory = await SubscriptionHistoryModel.findOne({
        userId,
      }).session(session);

      if (!subscriptionHistory) {
        const [created] = await SubscriptionHistoryModel.create(
          [
            {
              userId: new mongoose.Types.ObjectId(userId.toString()),
              subscriptions: [],
            },
          ],
          { session }
        );
        subscriptionHistory = created;
      }

      if (!subscriptionHistory) {
        throw new ApiError(500, "Failed to create subscription history");
      }

      // Build subscription document
      const subscriptionData: any = {
        userId: new mongoose.Types.ObjectId(userId.toString()),
        type: subscriptionType,
        status: "Pending",
        startDate,
        endDate,
        amount: finalAmount,
        creditsGranted,
        historyId: subscriptionHistory._id,
        ...(referralData.referralId && { referralId: referralData.referralId }),
        ...(referralData.referralBonusCredits > 0 && {
          referralBonusCredits: referralData.referralBonusCredits,
        }),
        ...(upgradeDetails && { upgradedFrom: upgradeDetails }),
      };

      let newSubscription: any;
      if (existingSubscription?.status === "Active") {
        newSubscription = await SubscriptionModel.findOneAndUpdate(
          { _id: existingSubscription._id },
          subscriptionData,
          { new: true, session }
        );
      } else {
        [newSubscription] = await SubscriptionModel.create(
          [subscriptionData],
          { session }
        );
      }

      // Add history entry
      const historyEntry = {
        subscriptionId: newSubscription._id,
        type: subscriptionType,
        status: "Pending",
        startDate,
        endDate,
        amount: finalAmount,
        paymentStatus: "Pending",
        ...(upgradeDetails && { metadata: { upgradeDetails } }),
      };

      await SubscriptionHistoryModel.updateOne(
        { _id: subscriptionHistory._id },
        { $push: { subscriptions: historyEntry }, lastUpdated: new Date() },
        { session }
      );

      // Update user
      await UserModel.updateOne(
        { _id: userId },
        {
          currentSubscriptionId: newSubscription._id,
          isSubscribed: true,
        },
        { session }
      );

      return newSubscription;
    });

    const sanitizedData = sanitizeData(result.toObject(), {
      include: [
        "_id",
        "userId",
        "type",
        "status",
        "startDate",
        "endDate",
        "amount",
        "creditsGranted",
        "paymentStatus",
        "paymentMethod",
        "paymentId",
        "referralBonusCredits",
        "historyId",
        "upgradedFrom",
        "createdAt",
        "updatedAt",
      ],
    });

    return res
      .status(200)
      .json(successResponse(sanitizedData, "Subscription created successfully"));
  }

  // ── Cancel subscription ─────────────────────────────────────────────────

  private static async _cancelSubscription(req: Request, res: Response) {
    const userId = req.user?._id;
    const { subscriptionId } = req.params;
    const { cancellationReason } = req.body;

    if (!userId) throw new ApiError(401, "User Id is missing");
    if (!subscriptionId) throw new ApiError(400, "Subscription Id required");
    if (!cancellationReason)
      throw new ApiError(400, "Cannot cancel without a reason");

    const result = await withTransaction(async (session) => {
      const subscription = await SubscriptionModel.findOne({
        _id: new Types.ObjectId(subscriptionId),
        userId: new Types.ObjectId(userId.toString()),
      }).session(session);

      if (!subscription) throw new ApiError(404, "Subscription not found");
      if (!subscription.isActive())
        throw new ApiError(400, "Subscription is not active");
      if (subscription.type === "Free")
        throw new ApiError(400, "Cannot cancel a Free subscription");

      const updateData: Partial<ISubscription> = {
        status: "Cancelled",
        type: "Free",
        endDate: new Date(),
      };

      await Promise.all([
        SubscriptionModel.updateOne(
          { _id: new Types.ObjectId(subscriptionId) },
          updateData,
          { session }
        ),
        UserModel.updateOne(
          { _id: new Types.ObjectId(userId.toString()) },
          {
            isSubscribed: false,
            currentSubscriptionId: undefined,
            tierExpiresAt: undefined,
          },
          { session }
        ),
        SubscriptionHistoryModel.updateOne(
          { userId: new Types.ObjectId(userId.toString()) },
          {
            $push: {
              subscriptions: {
                subscriptionId: new Types.ObjectId(subscriptionId),
                status: "Cancelled",
                type: "Free",
              },
            },
            cancelledAt: new Date(),
            cancellationReason,
          } as UpdateQuery<ISubscriptionHistory>,
          { session }
        ),
      ]);

      return await SubscriptionModel.findById(subscriptionId)
        .select("_id userId type status endDate amount paymentStatus")
        .session(session);
    });

    if (!result) throw new ApiError(500, "Error retrieving updated subscription");

    const sanitizedSubscription = sanitizeData(result.toObject(), {
      include: ["_id", "userId", "type", "status", "endDate", "amount"],
      transform: {
        endDate: (date) => new Date(date).toISOString(),
        amount: (amount) => Number(amount.toFixed(2)),
      },
    });

    return res
      .status(200)
      .json(
        successResponse(
          sanitizedSubscription,
          "Subscription cancelled successfully"
        )
      );
  }

  // ── Get current subscription ──────────────────────────────────────────────

  private static async _getCurrentSubscription(req: Request, res: Response) {
    const userId = req.user?._id;
    if (!userId) throw new ApiError(401, "Unauthorized access");

    const currentSubscription = await SubscriptionModel.findOne({ userId });
    if (!currentSubscription)
      throw new ApiError(404, "No subscription found");

    const sanitizedSubscription = sanitizeData(
      currentSubscription.toObject(),
      {
        include: [
          "_id",
          "userId",
          "type",
          "status",
          "startDate",
          "endDate",
          "amount",
          "creditsGranted",
          "paymentStatus",
          "paymentMethod",
          "historyId",
          "referralBonusCredits",
          "createdAt",
          "updatedAt",
        ],
        transform: {
          paymentStatus: (value) => value || "Not Available",
          paymentMethod: (value) => value || "Not Available",
        },
      }
    );

    return res
      .status(200)
      .json(
        successResponse(
          sanitizedSubscription,
          "Current subscription retrieved successfully"
        )
      );
  }

  // ── Subscription history ──────────────────────────────────────────────────

  private static async _getSubscriptionHistory(req: Request, res: Response) {
    const userId = req.user?._id;
    if (!userId) throw new ApiError(401, "Unauthorized access");

    const subscriptionHistory = await SubscriptionHistoryModel.findOne({
      userId,
    });
    if (!subscriptionHistory)
      throw new ApiError(404, "No subscription history found");

    const statistics =
      Subscription._calculateSubscriptionStatistics(subscriptionHistory);
    const yearlyBreakdown = Subscription._calculateYearlyBreakdown(
      subscriptionHistory.subscriptions
    );

    const response = {
      overview: {
        totalSpent: statistics?.totalSpent || 0,
        totalSubscriptions:
          statistics?.subscriptionMetrics.totalSubscriptions || 0,
        mostCommonPlan: statistics?.subscriptionMetrics.mostCommonPlan || "",
      },
      currentPlan: statistics?.currentPlan || null,
      yearlyBreakdown: yearlyBreakdown.map((yearGroup) => ({
        year: yearGroup.year,
        totalSpent: Number(yearGroup.totalSpent.toFixed(2)),
        failedAttempts: yearGroup.failedAttempts,
        pendingAttempts: yearGroup.pendingAttempts,
        subscriptions: yearGroup.subscriptions.map((sub: any) =>
          sanitizeData(sub, {
            include: [
              "_id",
              "type",
              "status",
              "startDate",
              "endDate",
              "amount",
              "creditsGranted",
              "paymentStatus",
            ],
            transform: {
              startDate: (date) => new Date(date).toISOString(),
              endDate: (date) => new Date(date).toISOString(),
              amount: (amount) => Number(amount.toFixed(2)),
            },
          })
        ),
        summary: {
          totalSubscriptions: yearGroup.subscriptions.length,
          averageAmount: yearGroup.subscriptions.length
            ? Number(
                (
                  yearGroup.totalSpent / yearGroup.subscriptions.length
                ).toFixed(2)
              )
            : 0,
        },
      })),
      trends: {
        spending: statistics?.trends.spendingTrend || [],
        usage: statistics?.trends.usageTrend || [],
      },
      featureUsage: statistics?.featureUsage || {
        totalVideoConsultations: 0,
        totalAiCredits: 0,
        totalStyleReports: 0,
        mostUsedFeatures: [],
      },
      consultationStats: {
        total: statistics?.totalConsultations || {
          completed: 0,
          cancelled: 0,
          noShow: 0,
        },
        averageRating: statistics?.averageRating || 0,
        preferredStylists: statistics?.preferredStylists || [],
      },
    };

    return res
      .status(200)
      .json(
        successResponse(
          response,
          "Subscription history retrieved successfully"
        )
      );
  }

  // ── Subscription details ──────────────────────────────────────────────────

  private static async _getSubscriptionDetails(req: Request, res: Response) {
    const { subscriptionId } = req.params;
    if (!subscriptionId || !mongoose.Types.ObjectId.isValid(subscriptionId)) {
      throw new ApiError(400, "Invalid subscription ID format");
    }

    const subscription = await SubscriptionModel.findById(subscriptionId);
    if (!subscription) throw new ApiError(404, "Subscription not found");

    if (subscription.userId.toString() !== req.user?._id.toString()) {
      throw new ApiError(403, "Unauthorized to view this subscription");
    }

    const daysRemaining = subscription.getDaysRemaining();
    const isActive = subscription.isActive();

    const sanitizedSubscription = sanitizeData(
      { ...subscription.toObject(), daysRemaining, isActive },
      {
        include: [
          "_id",
          "userId",
          "type",
          "status",
          "startDate",
          "endDate",
          "amount",
          "creditsGranted",
          "paymentStatus",
          "paymentMethod",
          "historyId",
          "referralBonusCredits",
          "daysRemaining",
          "isActive",
          "createdAt",
          "updatedAt",
        ],
        transform: {
          startDate: (date) => new Date(date).toISOString(),
          endDate: (date) => new Date(date).toISOString(),
          createdAt: (date) => new Date(date).toISOString(),
          updatedAt: (date) => new Date(date).toISOString(),
          amount: (amount) => Number(amount.toFixed(2)),
          paymentStatus: (value) => value || "Not Available",
          paymentMethod: (value) => value || "Not Available",
        },
      }
    );

    return res
      .status(200)
      .json(
        successResponse(
          sanitizedSubscription,
          "Subscription details retrieved successfully"
        )
      );
  }

  // ── Get subscription plans (credits-based, flat pricing) ──────────────────

  private static async _getSubscriptionPlans(_req: Request, res: Response) {
    if (!SUBSCRIPTION_CONFIG?.TIERS) {
      throw new ApiError(
        500,
        "Subscription configuration is not properly initialized"
      );
    }

    // Transform features/limits/support into comparison arrays [Free, Silver, Gold, Platinum]
    type TierValues = [string, string, string, string];
    type TierNumericValues = [
      string | number,
      string | number,
      string | number,
      string | number
    ];

    const transformFeature = (
      key: keyof typeof SUBSCRIPTION_CONFIG.TIERS.Platinum.features
    ): TierValues => [
      SUBSCRIPTION_CONFIG.TIERS.Free.features[key],
      SUBSCRIPTION_CONFIG.TIERS.Silver.features[key],
      SUBSCRIPTION_CONFIG.TIERS.Gold.features[key],
      SUBSCRIPTION_CONFIG.TIERS.Platinum.features[key],
    ];

    const transformLimit = (
      key: keyof typeof SUBSCRIPTION_CONFIG.TIERS.Platinum.limits
    ): TierNumericValues => [
      SUBSCRIPTION_CONFIG.TIERS.Free.limits[key],
      SUBSCRIPTION_CONFIG.TIERS.Silver.limits[key],
      SUBSCRIPTION_CONFIG.TIERS.Gold.limits[key],
      SUBSCRIPTION_CONFIG.TIERS.Platinum.limits[key],
    ];

    const transformSupport = (
      key: keyof typeof SUBSCRIPTION_CONFIG.TIERS.Platinum.support
    ): TierValues => [
      SUBSCRIPTION_CONFIG.TIERS.Free.support[key],
      SUBSCRIPTION_CONFIG.TIERS.Silver.support[key],
      SUBSCRIPTION_CONFIG.TIERS.Gold.support[key],
      SUBSCRIPTION_CONFIG.TIERS.Platinum.support[key],
    ];

    const transformedFeatures: Record<string, TierValues> = {};
    (
      Object.keys(SUBSCRIPTION_CONFIG.TIERS.Platinum.features) as Array<
        keyof typeof SUBSCRIPTION_CONFIG.TIERS.Platinum.features
      >
    ).forEach((key) => {
      transformedFeatures[key] = transformFeature(key);
    });

    const transformedLimits: Record<string, TierNumericValues> = {};
    (
      Object.keys(SUBSCRIPTION_CONFIG.TIERS.Platinum.limits) as Array<
        keyof typeof SUBSCRIPTION_CONFIG.TIERS.Platinum.limits
      >
    ).forEach((key) => {
      transformedLimits[key] = transformLimit(key);
    });

    const transformedSupport: Record<string, TierValues> = {};
    (
      Object.keys(SUBSCRIPTION_CONFIG.TIERS.Platinum.support) as Array<
        keyof typeof SUBSCRIPTION_CONFIG.TIERS.Platinum.support
      >
    ).forEach((key) => {
      transformedSupport[key] = transformSupport(key);
    });

    const response = {
      plans: Object.entries(SUBSCRIPTION_CONFIG.TIERS).map(
        ([type, config]) => ({
          type,
          level: config.level,
          price: config.price,
          creditsGranted: config.creditsGranted,
          tierDurationDays: config.tierDurationDays,
        })
      ),
      features: transformedFeatures,
      limits: transformedLimits,
      support: transformedSupport,
      rules: {
        subscription: {
          tierDurationDays:
            SUBSCRIPTION_CONFIG.SUBSCRIPTION_RULES.TIER_DURATION_DAYS,
          maximumReferralBonusCredits:
            SUBSCRIPTION_CONFIG.SUBSCRIPTION_RULES
              .MAXIMUM_REFERRAL_BONUS_CREDITS,
          featureLevels:
            SUBSCRIPTION_CONFIG.SUBSCRIPTION_RULES.FEATURE_LEVELS,
          allowedStatusTransitions:
            SUBSCRIPTION_CONFIG.SUBSCRIPTION_RULES.STATUS_TRANSITIONS,
        },
        videoConsultation: SUBSCRIPTION_CONFIG.VIDEO_CONSULTATION_RULES,
        aiFeatures: SUBSCRIPTION_CONFIG.AI_FEATURES,
      },
      policies: SUBSCRIPTION_CONFIG.POLICIES,
      payment: {
        methods: SUBSCRIPTION_CONFIG.PAYMENT_METHODS,
      },
    };

    return res
      .status(200)
      .json(
        successResponse(
          response,
          "Subscription plans retrieved successfully"
        )
      );
  }

  // ── Get subscription config ───────────────────────────────────────────────

  private static async _getSubscriptionConfig(_req: Request, res: Response) {
    const config = {
      tiers: Object.entries(SUBSCRIPTION_CONFIG.TIERS).map(
        ([type, tierConfig]) => ({
          type,
          level: tierConfig.level,
          price: tierConfig.price,
          creditsGranted: tierConfig.creditsGranted,
          tierDurationDays: tierConfig.tierDurationDays,
          features: tierConfig.features,
          limits: tierConfig.limits,
          support: tierConfig.support,
        })
      ),
      rules: {
        tierDurationDays:
          SUBSCRIPTION_CONFIG.SUBSCRIPTION_RULES.TIER_DURATION_DAYS,
        referral: {
          maximumBonusCredits:
            SUBSCRIPTION_CONFIG.SUBSCRIPTION_RULES
              .MAXIMUM_REFERRAL_BONUS_CREDITS,
        },
        featureLevels:
          SUBSCRIPTION_CONFIG.SUBSCRIPTION_RULES.FEATURE_LEVELS,
        statusTransitions:
          SUBSCRIPTION_CONFIG.SUBSCRIPTION_RULES.STATUS_TRANSITIONS,
      },
      paymentMethods: SUBSCRIPTION_CONFIG.PAYMENT_METHODS,
      policies: SUBSCRIPTION_CONFIG.POLICIES,
      videoConsultationRules: SUBSCRIPTION_CONFIG.VIDEO_CONSULTATION_RULES,
      aiFeatures: SUBSCRIPTION_CONFIG.AI_FEATURES,
    };

    return res
      .status(200)
      .json(
        successResponse(
          config,
          "Subscription configuration retrieved successfully"
        )
      );
  }

  // ── Update payment status (called from payment service) ───────────────────

  private static async _updatePaymentStatus(req: Request, res: Response) {
    const { subscriptionId } = req.params;
    const { paymentStatus, paymentId, transactionId, paymentMethod } = req.body;

    if (!subscriptionId) throw new ApiError(404, "Subscription ID is required");
    if (!paymentStatus || !paymentId || !transactionId || !paymentMethod) {
      throw new ApiError(400, "Payment details are required");
    }

    const result = await withTransaction(async (session) => {
      const subscription = await SubscriptionModel.findById(subscriptionId)
        .populate("historyId")
        .session(session);

      if (!subscription) throw new ApiError(404, "Subscription not found");

      if (subscription.userId.toString() !== req.user?._id.toString()) {
        throw new ApiError(403, "Unauthorized to update this subscription");
      }

      if (!subscription.historyId) {
        throw new ApiError(404, "No history found for this subscription");
      }

      const updateData: Partial<ISubscription> = {
        paymentStatus: paymentStatus as PaymentStatus,
        paymentId,
        transactionId,
        paymentMethod,
        ...(paymentStatus === "Completed" && { status: "Active" }),
      };

      await Promise.all(
        [
          SubscriptionModel.updateOne(
            { _id: subscriptionId },
            updateData,
            { session }
          ),

          // Mark referral completed if exists
          subscription.referralId &&
            paymentStatus === "Completed" &&
            ReferralModel.updateOne(
              { _id: subscription.referralId },
              { status: "Completed", subscriptionId: subscription._id },
              { session }
            ),

          // Add history entry
          SubscriptionHistoryModel.updateOne(
            { _id: subscription.historyId },
            {
              $push: {
                subscriptions: {
                  subscriptionId: subscription._id,
                  type: subscription.type,
                  startDate: subscription.startDate,
                  endDate: subscription.endDate,
                  amount: subscription.amount,
                  status:
                    paymentStatus === "Completed"
                      ? "Active"
                      : subscription.status,
                  paymentStatus,
                  paymentId,
                  transactionId,
                  paymentMethod,
                  timestamp: new Date(),
                },
              },
            } as UpdateQuery<ISubscriptionHistory>,
            { session }
          ),
        ].filter(Boolean)
      );

      // On completed payment: grant credits + update tier expiry
      if (paymentStatus === "Completed") {
        const creditsToGrant = subscription.creditsGranted || 0;
        if (creditsToGrant > 0) {
          await CreditController.grantSubscriptionCredits(
            subscription.userId.toString(),
            subscription.type,
            session
          );
        }

        // Update user's tierExpiresAt
        await UserModel.updateOne(
          { _id: subscription.userId },
          { tierExpiresAt: subscription.endDate },
          { session }
        );
      }

      return await SubscriptionModel.findById(subscriptionId)
        .select(
          "_id userId type status startDate endDate amount creditsGranted paymentStatus paymentMethod referralBonusCredits"
        )
        .session(session);
    });

    if (!result) {
      throw new ApiError(500, "Failed to retrieve updated subscription");
    }

    // Non-blocking statistics update
    if (paymentStatus === "Completed" && result.userId) {
      SubscriptionHistoryModel.findOne({ userId: result.userId })
        .then((history: any) => {
          if (history && typeof history.updateStatistics === "function") {
            return history.updateStatistics();
          }
        })
        .catch((err) =>
          console.error(
            "[Subscription] updateStatistics error (non-blocking):",
            err
          )
        );
    }

    const sanitizedSubscription = sanitizeData(result.toObject(), {
      include: [
        "_id",
        "userId",
        "type",
        "status",
        "startDate",
        "endDate",
        "amount",
        "creditsGranted",
        "paymentStatus",
        "paymentMethod",
        "referralBonusCredits",
      ],
      transform: {
        paymentStatus: (value) => value || "Not Available",
        paymentMethod: (value) => value || "Not Available",
      },
    });

    return res
      .status(200)
      .json(
        successResponse(
          sanitizedSubscription,
          "Payment status updated successfully"
        )
      );
  }

  // ── Statistics helpers (kept for history) ─────────────────────────────────

  private static _calculateSubscriptionStatistics(subscriptionHistory: any) {
    const { subscriptions } = subscriptionHistory;

    const statistics: ISubscriptionStatistics = {
      totalSpent: 0,
      consultationsAttended: 0,
      averageRating: 0,
      totalConsultations: { completed: 0, cancelled: 0, noShow: 0 },
      preferredStylists: [],
      featureUsage: {
        totalVideoConsultations: 0,
        totalAiCredits: 0,
        totalStyleReports: 0,
        mostUsedFeatures: [],
      },
      subscriptionMetrics: {
        totalSubscriptions: subscriptions.length,
        averageSubscriptionDuration: 0,
        mostCommonPlan: "",
        renewalRate: 0,
      },
      lifetime: {
        totalSpent: 0,
        subscriptionCount: subscriptions.length,
        averageSubscriptionDuration: 0,
        mostUsedPlan: "",
        renewalRate: 0,
        averageRating: 0,
      },
      lastYear: {
        totalSpent: 0,
        subscriptionCount: 0,
        consultationsUsed: 0,
        aiFeatureUsage: 0,
        mostUsedFeatures: [],
      },
      currentPlan: null,
      trends: { spendingTrend: [], usageTrend: [] },
    };

    statistics.totalSpent = subscriptions.reduce(
      (total: number, sub: any) => total + sub.amount,
      0
    );

    const allConsultations = subscriptions.flatMap(
      (sub: any) => sub.consultations || []
    );
    statistics.consultationsAttended = allConsultations.length;

    const ratings = allConsultations
      .filter((c: any) => c.rating)
      .map((c: any) => c.rating);
    statistics.averageRating = ratings.length
      ? ratings.reduce((sum: number, r: number) => sum + r, 0) / ratings.length
      : 0;

    statistics.totalConsultations = {
      completed: allConsultations.filter((c: any) => c.status === "Completed")
        .length,
      cancelled: allConsultations.filter((c: any) => c.status === "Cancelled")
        .length,
      noShow: allConsultations.filter((c: any) => c.status === "NoShow").length,
    };

    return statistics;
  }

  private static _calculateYearlyBreakdown(subscriptions: any[]) {
    const yearlyBreakdown = subscriptions.reduce(
      (acc: any[], subscription: any) => {
        const year = new Date(subscription.startDate).getFullYear();
        const yearGroup = acc.find((group) => group.year === year);

        if (yearGroup) {
          yearGroup.subscriptions.push(subscription);
          yearGroup.totalSpent += subscription.amount;
          if (subscription.paymentStatus === "Failed")
            yearGroup.failedAttempts++;
          if (subscription.paymentStatus === "Pending")
            yearGroup.pendingAttempts++;
        } else {
          acc.push({
            year,
            subscriptions: [subscription],
            totalSpent: subscription.amount,
            failedAttempts: subscription.paymentStatus === "Failed" ? 1 : 0,
            pendingAttempts: subscription.paymentStatus === "Pending" ? 1 : 0,
          });
        }

        return acc;
      },
      []
    );

    return yearlyBreakdown.sort((a, b) => b.year - a.year);
  }

  private static async _updateSubscription(_req: Request, _res: Response) {}

  // ── Public methods (AsyncHandler wrapped) ─────────────────────────────────

  public static getCurrentSubscription = AsyncHandler.wrap(
    Subscription._getCurrentSubscription
  );
  public static getSubscriptionHistory = AsyncHandler.wrap(
    Subscription._getSubscriptionHistory
  );
  public static createSubscription = AsyncHandler.wrap(
    Subscription._createSubscription
  );
  public static updatePaymentStatus = AsyncHandler.wrap(
    Subscription._updatePaymentStatus
  );
  public static cancelSubscription = AsyncHandler.wrap(
    Subscription._cancelSubscription
  );
  public static getSubscriptionDetails = AsyncHandler.wrap(
    Subscription._getSubscriptionDetails
  );
  public static getSubscriptionPlans = AsyncHandler.wrap(
    Subscription._getSubscriptionPlans
  );
  public static getSubscriptionConfig = AsyncHandler.wrap(
    Subscription._getSubscriptionConfig
  );
  public static updateSubscription = AsyncHandler.wrap(
    Subscription._updateSubscription
  );
}

export { Subscription };
