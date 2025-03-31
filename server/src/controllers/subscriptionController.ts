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
import { executeModelOperation, withTransaction } from "../utils/mongoUtils";
import { SUBSCRIPTION_CONFIG, SubscriptionTier } from "../helper/constants";
import { PaymentStatus, SubscriptionType } from "../types/typesGeneral";
import {
  ISubscriptionHistory,
  ISubscriptionStatistics,
} from "../interface/ISubscriptionHistroy";
import { ISubscription } from "../interface/ISubscription";

class Subscription {
  // Helper functions to access tier information
  public static getTierLevel = (tier: SubscriptionTier): number => {
    return SUBSCRIPTION_CONFIG.TIERS[tier]?.level || 0;
  };

  private static calculatePriceForDuration(
    tier: SubscriptionTier,
    numberOfDays: number
  ): number {
    if (tier === "Free") return 0;

    const pricingTiers = SUBSCRIPTION_CONFIG.TIERS[tier].dailyPricing;
    const applicableTier = pricingTiers.find(
      (pricing) =>
        numberOfDays >= pricing.minDays && numberOfDays <= pricing.maxDays
    );

    if (!applicableTier) {
      throw new ApiError(
        400,
        `Invalid duration. Must be between ${SUBSCRIPTION_CONFIG.SUBSCRIPTION_RULES.MINIMUM_DAYS} and ${SUBSCRIPTION_CONFIG.SUBSCRIPTION_RULES.MAXIMUM_DAYS} days`
      );
    }

    return Math.round(applicableTier.pricePerDay * numberOfDays);
  }

  public static getSubscriptionPrice = (tier: SubscriptionTier): number => {
    if (tier === "Free") return 0;
    const pricingTiers = SUBSCRIPTION_CONFIG.TIERS[tier].dailyPricing;
    if (!pricingTiers || !pricingTiers.length) return 0;
    // Return the base price (first tier's price per day)
    return pricingTiers[0].pricePerDay;
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

  private static calculateProRatedAmount(
    currentSubscription: ISubscription,
    newType: SubscriptionTier,
    numberOfDays: number
  ): { creditAmount: number; newAmount: number } {
    // If downgrading to Free tier, no credit or new amount is needed
    if (newType === "Free") {
      return {
        creditAmount: 0,
        newAmount: 0,
      };
    }

    // If current subscription is Free, no credit to calculate
    if (currentSubscription.type === "Free") {
      return {
        creditAmount: 0,
        newAmount: Subscription.calculatePriceForDuration(
          newType,
          numberOfDays
        ),
      };
    }

    // Calculate pro-rated amount for paid tier transitions
    const daysRemaining = currentSubscription.getDaysRemaining();
    const currentDailyRate =
      currentSubscription.amount / currentSubscription.durationInDays;

    // Calculate credit amount based on remaining days
    const creditAmount = Math.round(currentDailyRate * daysRemaining);

    // Calculate new amount based on new subscription duration
    const newAmount = Subscription.calculatePriceForDuration(
      newType,
      numberOfDays
    );

    // Final amount after applying credit
    const finalAmount = Math.max(0, newAmount - creditAmount);

    return { creditAmount, newAmount: finalAmount };
  }

  // Update calculateUpgradeDetails method
  private static calculateUpgradeDetails(
    currentSubscription: ISubscription,
    newType: SubscriptionType,
    numberOfDays: number,
    referralDiscount: number = 0
  ): {
    startDate: Date;
    endDate: Date;
    amount: number;
    creditAmount: number;
    upgradeDetails: any;
  } {
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(startDate.getDate() + numberOfDays);

    const { creditAmount, newAmount } = Subscription.calculateProRatedAmount(
      currentSubscription,
      newType,
      numberOfDays
    );

    // Apply referral discount if any
    const finalAmount = Math.round(newAmount * (1 - referralDiscount / 100));

    const upgradeDetails = {
      previousType: currentSubscription.type,
      upgradeDate: startDate,
      proRatedCredit: creditAmount,
      previousEndDate: currentSubscription.endDate,
      previousAmount: currentSubscription.amount,
      previousDurationInDays: currentSubscription.durationInDays,
    };

    return {
      startDate,
      endDate,
      amount: finalAmount,
      creditAmount,
      upgradeDetails,
    };
  }

  private static _calculateSubscriptionStatistics(subscriptionHistory: any) {
    const { subscriptions } = subscriptionHistory;

    // Calculate statistics
    const statistics: ISubscriptionStatistics = {
      totalSpent: 0,
      consultationsAttended: 0,
      averageRating: 0,
      totalConsultations: {
        completed: 0,
        cancelled: 0,
        noShow: 0,
      },
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
      trends: {
        spendingTrend: [],
        usageTrend: [],
      },
    };

    // Calculate total spent and other metrics
    statistics.totalSpent = subscriptions.reduce(
      (total: number, sub: any) => total + sub.amount,
      0
    );

    // Calculate consultation statistics
    const allConsultations = subscriptions.flatMap(
      (sub: any) => sub.consultations
    );
    statistics.consultationsAttended = allConsultations.length;

    // Calculate average rating
    const ratings = allConsultations
      .filter((c: any) => c.rating)
      .map((c: any) => c.rating);
    statistics.averageRating = ratings.length
      ? ratings.reduce((sum: number, rating: number) => sum + rating, 0) /
        ratings.length
      : 0;

    // Update total consultations
    statistics.totalConsultations = {
      completed: allConsultations.filter((c: any) => c.status === "Completed")
        .length,
      cancelled: allConsultations.filter((c: any) => c.status === "Cancelled")
        .length,
      noShow: allConsultations.filter((c: any) => c.status === "NoShow").length,
    };

    // Calculate preferred stylists
    const stylistStats = new Map<
      string,
      { count: number; totalRating: number }
    >();
    allConsultations.forEach((consultation: any) => {
      const stylistId = consultation.stylistId.toString();
      const current = stylistStats.get(stylistId) || {
        count: 0,
        totalRating: 0,
      };
      stylistStats.set(stylistId, {
        count: current.count + 1,
        totalRating: current.totalRating + (consultation.rating || 0),
      });
    });

    statistics.preferredStylists = Array.from(stylistStats.entries()).map(
      ([stylistId, stats]): {
        stylistId: mongoose.Types.ObjectId;
        consultationCount: number;
        averageRating: number;
      } => ({
        stylistId: new mongoose.Types.ObjectId(stylistId),
        consultationCount: stats.count,
        averageRating: stats.count ? stats.totalRating / stats.count : 0,
      })
    );

    return statistics;
  }

  private static _calculateYearlyBreakdown(subscriptions: any[]) {
    // Group subscriptions by year
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

    // Sort by year descending
    return yearlyBreakdown.sort((a, b) => b.year - a.year);
  }

  private static async _createSubscription(req: Request, res: Response) {
    try {
      const userId = req.user?._id;
      if (!userId) {
        throw new ApiError(401, "Unauthorized access");
      }

      const { type, referralCode, numberOfDays } = req.body;

      // Validate number of days
      if (!numberOfDays || typeof numberOfDays !== "number") {
        throw new ApiError(400, "Number of days is required");
      }

      if (
        numberOfDays < SUBSCRIPTION_CONFIG.SUBSCRIPTION_RULES.MINIMUM_DAYS ||
        numberOfDays > SUBSCRIPTION_CONFIG.SUBSCRIPTION_RULES.MAXIMUM_DAYS
      ) {
        throw new ApiError(
          400,
          `Subscription duration must be between ${SUBSCRIPTION_CONFIG.SUBSCRIPTION_RULES.MINIMUM_DAYS} and ${SUBSCRIPTION_CONFIG.SUBSCRIPTION_RULES.MAXIMUM_DAYS} days`
        );
      }

      // Validate subscription type using type guard
      if (!Subscription.isValidSubscriptionTier(type)) {
        throw new ApiError(
          400,
          `Invalid subscription type. Valid types are: ${Object.keys(
            SUBSCRIPTION_CONFIG.TIERS
          )
            .filter((tier) => tier !== "Free")
            .join(", ")}`
        );
      }

      const subscriptionType = type;

      // Check existing subscription
      const existingSubscription = await executeModelOperation(
        SubscriptionModel,
        "findOne",
        {
          queryOptions: {
            select: "type status endDate amount",
          },
        },
        undefined,
        { userId, status: { $in: ["Active", "Pending"] } }
      );

      // Handle existing subscription scenarios
      if (existingSubscription) {
        if (
          existingSubscription.status === "Pending" &&
          existingSubscription.type !== "Free"
        ) {
          throw new ApiError(
            400,
            `You have a pending ${existingSubscription.type} subscription request, Please make payment if paid raise complain.`
          );
        }

        // Use isValidUpgrade to check upgrade validity
        if (
          !Subscription.isValidUpgrade(
            existingSubscription.type,
            subscriptionType
          )
        ) {
          // If same tier
          if (existingSubscription.type === subscriptionType) {
            throw new ApiError(400, "You already have this subscription tier");
          }
          // If downgrade attempt
          throw new ApiError(400, "Subscription downgrade is not allowed");
        }
      }

      const result = await withTransaction(async (session) => {
        const startDate = new Date();
        const endDate = new Date();
        endDate.setDate(startDate.getDate() + numberOfDays);
        // Calculate base price using daily pricing
        let finalAmount = Subscription.calculatePriceForDuration(
          subscriptionType,
          numberOfDays
        );
        let upgradeDetails = null;

        // Handle upgrade scenario
        if (existingSubscription?.status === "Active") {
          let { creditAmount, newAmount } =
            Subscription.calculateProRatedAmount(
              existingSubscription,
              subscriptionType,
              numberOfDays
            );

          finalAmount = newAmount;
          upgradeDetails = {
            previousType: existingSubscription.type,
            upgradeDate: startDate,
            proRatedCredit: creditAmount,
            previousEndDate: existingSubscription.endDate,
            previousAmount: existingSubscription.amount,
            previousDurationInDays: existingSubscription.durationInDays,
          };
        }

        // Process referral
        let referralData = {
          referralDiscount: 0,
          extraValidityDays: 0,
          referralId: undefined as undefined | mongoose.Types.ObjectId | string,
        };

        if (referralCode) {
          // Check if user has already used a referral
          const existingReferralUse = await executeModelOperation(
            ReferralModel,
            "findOne",
            { queryOptions: { session } },
            undefined,
            {
              userId: new mongoose.Types.ObjectId(userId.toString()),
              status: "Completed",
            }
          );

          if (existingReferralUse) {
            throw new ApiError(400, "You have already used a referral code");
          }

          const referral = await executeModelOperation(
            ReferralModel,
            "findOne",
            { queryOptions: { session } },
            undefined,
            {
              referralCode,
              status: "Pending",
              validTill: { $gt: new Date() },
              referralType: "Subscription",
              // Optionally: check if referral is valid for this subscription type
              validSubscriptionTypes: { $in: [subscriptionType] },
            }
          );

          if (referral) {
            const benefits = await referral.getReferralBenefits();
            referralData = {
              referralDiscount: benefits.discountPercentage,
              extraValidityDays: benefits.extraDays,
              referralId: referral._id,
            };
            endDate.setDate(endDate.getDate() + referralData.extraValidityDays);
            // Apply percentage discount
            const discountAmount =
              (finalAmount * referralData.referralDiscount) / 100;
            finalAmount = Math.max(0, finalAmount - discountAmount);
          }
        }

        // Find or create subscription history
        let subscriptionHistory = await executeModelOperation(
          SubscriptionHistoryModel,
          "findOne",
          {
            queryOptions: {
              session,
            },
          },
          undefined,
          { userId }
        );

        if (!subscriptionHistory) {
          // Create with only required fields, let defaults handle the rest
          subscriptionHistory = await executeModelOperation(
            SubscriptionHistoryModel,
            "create",
            { queryOptions: { session } },
            {
              userId: new mongoose.Types.ObjectId(userId.toString()),
              subscriptions: [],
            }
          );
        }

        // Create subscription with only necessary fields
        const subscriptionData = {
          userId: new mongoose.Types.ObjectId(userId.toString()),
          type: subscriptionType,
          status: "Pending",
          startDate,
          endDate,
          amount: finalAmount,
          durationInDays: numberOfDays,
          historyId: subscriptionHistory._id,
          ...(referralData.referralId && {
            referralId: referralData.referralId,
          }),
          ...(referralData.referralDiscount > 0 && {
            referralDiscount: referralData.referralDiscount,
          }),
          ...(referralData.extraValidityDays > 0 && {
            extraValidityDays: referralData.extraValidityDays,
          }),
          ...(upgradeDetails && { upgradedFrom: upgradeDetails }),
        };

        const newSubscription = await executeModelOperation(
          SubscriptionModel,
          existingSubscription?.status === "Active"
            ? "findOneAndUpdate"
            : "create",
          { queryOptions: { session } },
          subscriptionData,
          existingSubscription?.status === "Active"
            ? { _id: existingSubscription._id }
            : undefined
        );

        // Update subscription history with minimal required fields
        const historyEntry = {
          subscriptionId: newSubscription._id,
          type: subscriptionType,
          status: "Pending",
          startDate,
          endDate,
          amount: finalAmount,
          paymentStatus: "Pending",
          ...(upgradeDetails && { metadata: { upgradeDetails } }),
          ...(referralData.referralDiscount > 0 && {
            referralDiscount: referralData.referralDiscount,
          }),
          ...(referralData.extraValidityDays > 0 && {
            extraValidityDays: referralData.extraValidityDays,
          }),
        };

        await executeModelOperation(
          SubscriptionHistoryModel,
          "updateOne",
          { queryOptions: { session } },
          {
            $push: { subscriptions: historyEntry },
            lastUpdated: new Date(),
          },
          { _id: subscriptionHistory._id }
        );

        // Update user
        await executeModelOperation(
          UserModel,
          "updateOne",
          { queryOptions: { session } },
          {
            currentSubscriptionId: newSubscription._id,
            isSubscribed: true,
          },
          { _id: userId }
        );
        console.log(newSubscription);
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
          "paymentStatus",
          "paymentMethod",
          "paymentId",
          "referralDiscount",
          "extraValidityDays",
          "historyId",
          "upgradedFrom",
          "createdAt",
          "updatedAt",
        ],
      });

      return res
        .status(200)
        .json(
          successResponse(sanitizedData, "Subscription added successfully")
        );
    } catch (error: any) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(500, "Error adding subscription: " + error.message);
    }
  }

  private static async _cancelSubscription(req: Request, res: Response) {
    try {
      const userId = req.user?._id;
      const { subscriptionId } = req.params;
      const { cancellationReason } = req.body;
      if (!userId) {
        throw new ApiError(
          401,
          "User Id is missing, please provide a valid user id"
        );
      }
      if (!subscriptionId) {
        throw new ApiError(400, "Requires susbcription Id");
      }
      if (!cancellationReason) {
        throw new ApiError(400, "Can not cancel without any reason.");
      }

      const result = await withTransaction(async (session) => {
        // Finding subscription
        const subscription = await executeModelOperation(
          SubscriptionModel,
          "findOne",
          {
            queryOptions: { session },
          },
          undefined,
          {
            _id: new Types.ObjectId(subscriptionId),
            userId: new Types.ObjectId(userId.toString()),
          }
        );
        if (!subscription) {
          throw new ApiError(404, "Subscription not found");
        }
        if (!subscription.isActive()) {
          throw new ApiError(
            400,
            "Subscription is not active, no need to cancel"
          );
        }
        if (subscription.type === "Free") {
          throw new ApiError(400, "Cannot cancel a Free subscription");
        }
        // Use proper enums and types
        const updateData: Partial<ISubscription> = {
          status: "Cancelled",
          type: "Free",
          endDate: new Date(),
        };

        await Promise.all([
          //  // Total time: (time of slowest promise)
          // update subscription status
          executeModelOperation(
            SubscriptionModel,
            "updateOne",
            { queryOptions: { session } },
            updateData,
            { _id: new Types.ObjectId(subscriptionId) }
          ),
          // update userModel subsctiption status
          executeModelOperation(
            UserModel,
            "updateOne",
            { queryOptions: { session } },
            {
              isSubscribed: false,
              currentSubscriptionId: undefined,
            },
            { _id: new Types.ObjectId(userId.toString()) }
          ),
          //
          executeModelOperation(
            SubscriptionHistoryModel,
            "updateOne",
            { queryOptions: { session } },
            {
              $push: {
                subscriptions: {
                  subscriptionId: new Types.ObjectId(subscriptionId),
                  status: "Cancelled",
                  type: "Free",
                },
              },
              cancelledAt: new Date(),
              cancellationReason: cancellationReason,
            } as UpdateQuery<ISubscriptionHistory>,
            { userId: new Types.ObjectId(userId.toString()) }
          ),
        ]);
        // now get updated subscription status
        return await executeModelOperation(
          SubscriptionModel,
          "findById",
          {
            queryOptions: {
              session,
              select: [
                "_id",
                "userId",
                "type",
                "status",
                "endDate",
                "amount",
                "paymentStatus",
              ].join(" "),
            },
          },
          undefined,
          subscriptionId
        );
      });

      if (!result) {
        throw new ApiError(500, "Error retrieving updated subscription");
      }

      const sanitizedSubscription = sanitizeData(result.toObject(), {
        include: ["_id", "userId", "type", "status", "endDate", "amount"],
        transform: {
          endDate: (date) => new Date(date).toISOString(),
          amount: (amount) => Number(amount.toFixed(2)),
        },
      });

      //NOTE: In future here we should also update the payment and notification service linked with this particular subscription

      return res
        .status(200)
        .json(
          successResponse(
            sanitizedSubscription,
            "Subscription cancelled successfully"
          )
        );
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(
        500,
        "Error cancelling Subscription details, please try again"
      );
    }
  }

  private static async _getCurrentSubscription(req: Request, res: Response) {
    try {
      const userId = req.user?._id;
      if (!userId) {
        throw new ApiError(401, "Unauthorized access");
      }

      const currentSubscription = await SubscriptionModel.findOne({ userId });

      if (!currentSubscription) {
        throw new ApiError(
          404,
          "No active, pending or requestd subscription found"
        );
      }

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
            "paymentStatus",
            "paymentMethod",
            "historyId",
            "referralDiscount",
            "extraValidityDays",
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
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(500, "Error getting CurrentSubscription details");
    }
  }

  private static async _getSubscriptionHistory(req: Request, res: Response) {
    try {
      const userId = req.user?._id;
      if (!userId) {
        throw new ApiError(401, "Unauthorized access");
      }

      // Get the full history from SubscriptionHistoryModel instead
      const subscriptionHistory = await SubscriptionHistoryModel.findOne({
        userId,
      });
      if (!subscriptionHistory) {
        throw new ApiError(404, "No subscription history found");
      }

      // Use private methods to calculate statistics and breakdown
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
          averageSubscriptionDuration:
            statistics?.subscriptionMetrics.averageSubscriptionDuration || 0,
          mostCommonPlan: statistics?.subscriptionMetrics.mostCommonPlan || "",
          renewalRate: statistics?.subscriptionMetrics.renewalRate || 0,
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
                "paymentStatus",
                "durationInDays",
              ],
              transform: {
                startDate: (date) => new Date(date).toISOString(),
                endDate: (date) => new Date(date).toISOString(),
                amount: (amount) => Number(amount.toFixed(2)),
                durationInDays: (days) => Number(days),
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
            totalAttempts:
              yearGroup.subscriptions.length +
              yearGroup.failedAttempts +
              yearGroup.pendingAttempts,
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
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(500, "Error getting subscription history details");
    }
  }

  private static async _getSubscriptionDetails(req: Request, res: Response) {
    try {
      const { subscriptionId } = req.params;
      // Validate if subscriptionId is a valid MongoDB ObjectId
      if (!subscriptionId || !mongoose.Types.ObjectId.isValid(subscriptionId)) {
        throw new ApiError(400, "Invalid subscription ID format");
      }

      const subscription = await SubscriptionModel.findById(subscriptionId);
      if (!subscription) {
        throw new ApiError(404, "Subscription not found");
      }

      // Verify user ownership
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
            "paymentStatus",
            "paymentMethod",
            "historyId",
            "referralDiscount",
            "extraValidityDays",
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
            referralDiscount: (value) => value || 0,
            extraValidityDays: (value) => value || 0,
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
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(500, "Error getting Subscription details");
    }
  }

  private static async _getSubscriptionPlans(req: Request, res: Response) {
    try {
      if (!SUBSCRIPTION_CONFIG?.TIERS) {
        throw new ApiError(500, "Subscription configuration is not properly initialized");
      }
  
      const response = {
        plans: Object.entries(SUBSCRIPTION_CONFIG.TIERS).map(([type, config]) => ({
          type,
          level: config.level,
          features: config.features,
          limits: config.limits,
          support: config.support,
          pricing: config.dailyPricing,
        })),
        rules: {
          subscription: {
            minimumDays: SUBSCRIPTION_CONFIG.SUBSCRIPTION_RULES.MINIMUM_DAYS,
            maximumDays: SUBSCRIPTION_CONFIG.SUBSCRIPTION_RULES.MAXIMUM_DAYS,
            maximumReferralDiscount: SUBSCRIPTION_CONFIG.SUBSCRIPTION_RULES.MAXIMUM_REFERRAL_DISCOUNT,
            minimumAmount: SUBSCRIPTION_CONFIG.SUBSCRIPTION_RULES.MINIMUM_AMOUNT,
            featureLevels: SUBSCRIPTION_CONFIG.SUBSCRIPTION_RULES.FEATURE_LEVELS,
            allowedStatusTransitions: SUBSCRIPTION_CONFIG.SUBSCRIPTION_RULES.STATUS_TRANSITIONS
          },
          videoConsultation: {
            ...SUBSCRIPTION_CONFIG.VIDEO_CONSULTATION_RULES,
          },
          aiFeatures: {
            ...SUBSCRIPTION_CONFIG.AI_FEATURES
          }
        },
        policies: {
          cancellation: {
            ...SUBSCRIPTION_CONFIG.POLICIES.CANCELLATION_POLICY,
            title: "Cancellation Policy",
            description: "Terms and conditions for cancelling your subscription"
          },
          refund: {
            ...SUBSCRIPTION_CONFIG.POLICIES.REFUND_POLICY,
            title: "Refund Policy",
            description: "Guidelines for refund eligibility and processing"
          },
          upgrade: {
            ...SUBSCRIPTION_CONFIG.POLICIES.UPGRADE_POLICY,
            title: "Upgrade Policy",
            description: "Rules and benefits for upgrading your subscription"
          },
          downgrade: {
            ...SUBSCRIPTION_CONFIG.POLICIES.DOWNGRADE_POLICY,
            title: "Downgrade Policy",
            description: "Terms and conditions for downgrading your subscription"
          }
        },
        payment: {
          methods: Object.entries(SUBSCRIPTION_CONFIG.PAYMENT_METHODS).map(([method, config]) => ({
            method,
            ...config
          }))
        },
      };
  
      return res.status(200).json(
        successResponse(response, "Subscription plans and policies retrieved successfully")
      );
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(500, "Error retrieving subscription plans");
    }
  }

  private static async _getSubscriptionConfig(req: Request, res: Response) {
    try {
      const config = {
        tiers: Object.entries(SUBSCRIPTION_CONFIG.TIERS).map(
          ([type, config]) => {
            // Base structure for all tiers
            const tierConfig = {
              type,
              level: config.level,
              features: config.features,
              limits: config.limits,
              support: config.support,
            };

            // Type guard to check if tier has dailyPricing
            if (type !== "Free" && "dailyPricing" in config) {
              const paidConfig = config as
                | typeof SUBSCRIPTION_CONFIG.TIERS.Silver
                | typeof SUBSCRIPTION_CONFIG.TIERS.Gold
                | typeof SUBSCRIPTION_CONFIG.TIERS.Platinum;

              return {
                ...tierConfig,
                pricing: paidConfig.dailyPricing.map((pricing) => ({
                  duration: {
                    min: pricing.minDays,
                    max: pricing.maxDays,
                  },
                  pricePerDay: pricing.pricePerDay,
                  examples: {
                    minDuration: {
                      days: pricing.minDays,
                      totalPrice: pricing.pricePerDay * pricing.minDays,
                    },
                    maxDuration: {
                      days: pricing.maxDays,
                      totalPrice: pricing.pricePerDay * pricing.maxDays,
                    },
                  },
                })),
              };
            }

            // For Free tier
            return {
              ...tierConfig,
              duration: (config as typeof SUBSCRIPTION_CONFIG.TIERS.Free)
                .duration,
            };
          }
        ),
        rules: {
          duration: {
            minimum: SUBSCRIPTION_CONFIG.SUBSCRIPTION_RULES.MINIMUM_DAYS,
            maximum: SUBSCRIPTION_CONFIG.SUBSCRIPTION_RULES.MAXIMUM_DAYS,
          },
          referral: {
            maximumDiscount:
              SUBSCRIPTION_CONFIG.SUBSCRIPTION_RULES.MAXIMUM_REFERRAL_DISCOUNT,
          },
          featureLevels: SUBSCRIPTION_CONFIG.SUBSCRIPTION_RULES.FEATURE_LEVELS,
          statusTransitions:
            SUBSCRIPTION_CONFIG.SUBSCRIPTION_RULES.STATUS_TRANSITIONS,
        },
        paymentMethods: SUBSCRIPTION_CONFIG.PAYMENT_METHODS,
        policies: {
          cancellation: SUBSCRIPTION_CONFIG.POLICIES.CANCELLATION_POLICY,
          refund: SUBSCRIPTION_CONFIG.POLICIES.REFUND_POLICY,
          upgrade: SUBSCRIPTION_CONFIG.POLICIES.UPGRADE_POLICY,
          downgrade: SUBSCRIPTION_CONFIG.POLICIES.DOWNGRADE_POLICY,
        },
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
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(500, "Error retrieving subscription configuration");
    }
  }

  private static async _updatePaymentStatus(req: Request, res: Response) {
    try {
      //  NOTE : this should be called from payment service only not directly from frontend
      const { subscriptionId } = req.params;
      const { paymentStatus, paymentId, transactionId, paymentMethod } =
        req.body;

      // Validate inputs
      if (!subscriptionId) {
        throw new ApiError(404, "Subscription ID is required");
      }
      if (!paymentStatus || !paymentId || !transactionId || !paymentMethod) {
        throw new ApiError(400, "Payment details are required");
      }

      const result = await withTransaction(async (session) => {
        // Find subscription with history in a single query
        const subscription = await executeModelOperation(
          SubscriptionModel,
          "findById", // Using findById instead of findOne
          {
            queryOptions: {
              populate: "historyId",
              session,
            },
          },
          undefined,
          subscriptionId
        );

        if (!subscription) {
          throw new ApiError(404, "Subscription not found");
        }

        if (subscription.userId.toString() !== req.user?._id.toString()) {
          throw new ApiError(403, "Unauthorized to update this subscription");
        }

        if (!subscription.historyId) {
          throw new ApiError(
            404,
            "Can not update payment status, no history found related to this subcriptionId"
          );
        }

        // Prepare update data
        // Properly typed update data
        const updateData: Partial<ISubscription> = {
          paymentStatus: paymentStatus as PaymentStatus,
          paymentId,
          transactionId,
          paymentMethod: paymentMethod,
          ...(paymentStatus === "Completed" && {
            status: "Active",
          }),
        };

        // Batch all updates in parallel
        await Promise.all(
          [
            // Update subscription
            executeModelOperation(
              SubscriptionModel,
              "updateOne",
              { queryOptions: { session } },
              updateData,
              { _id: subscriptionId }
            ),

            // Update referral if exists
            subscription.referralId &&
              paymentStatus === "Completed" &&
              executeModelOperation(
                ReferralModel,
                "updateOne",
                { queryOptions: { session } },
                {
                  status: "Completed",
                  subscriptionId: subscription._id,
                },
                { _id: subscription.referralId }
              ),

            // Update history
            executeModelOperation(
              SubscriptionHistoryModel,
              "updateOne",
              { queryOptions: { session } },
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
              { _id: subscription.historyId }
            ),
          ].filter(Boolean)
        ); // Filter out falsy values (when referral update is not needed)

        // Get updated document
        return await executeModelOperation(
          SubscriptionModel,
          "findById",
          {
            queryOptions: {
              session,
              select: [
                "_id",
                "userId",
                "type",
                "status",
                "startDate",
                "endDate",
                "amount",
                "paymentStatus",
                "paymentMethod",
                "referralDiscount",
                "extraValidityDays",
              ].join(" "),
            },
          },
          undefined,
          subscriptionId
        );
      });

      const sanitizedSubscription = sanitizeData(result, {
        include: [
          "_id",
          "userId",
          "type",
          "status",
          "startDate",
          "endDate",
          "amount",
          "paymentStatus",
          "paymentMethod",
          "referralDiscount",
          "extraValidityDays",
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
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(500, "Error updating Subscription payment");
    }
  }

  private static async _updateSubscription(req: Request, res: Response) {}
  // Public methods using AsyncHandler wrapper
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
