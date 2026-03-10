import React, { useEffect, useState } from "react";

import CheckIcon from "@mui/icons-material/Check";
import { useSubscriptionColors } from "../../../../utils/getSubscriptionColors";
import { COLORS } from "../../../../constants/colorPalettes";
import { Button } from "@mui/material";
import { useSelector, useDispatch } from "react-redux";
import { LOADER_TYPES } from "../../../../redux/action_creators";
import SubscriptionSkeleton from "./SubscriptionSkeleton";
import { useNavigate } from "react-router-dom";
import ErrorMessage from "./ErrorMessage";
import { getSubscriptionPlansThunk } from "../../../../redux/thunks/subscription.thunks";
import { useAIContext } from "../../../../context/AIContext";

function Subscriptions() {
  const dispatch = useDispatch();
  const currentColors = useSubscriptionColors();
  const userName = localStorage.getItem("fullName") || "Guest";
  const firstName = userName.split(" ")[0];
  const subscriptionPlans = useSelector((state) => state.plans);
  const plans = subscriptionPlans.plans;
  const loaders = useSelector((state) => state.loaderState.loaders);
  const navigate = useNavigate();
  const currentSub = useSelector((state) => state.userInfo?.data?.subscription?.type || "Free");
  const { setAIPageContext, clearAIPageContext } = useAIContext();
  const [showAllFeatures, setShowAllFeatures] = useState(false);

  // Fetch subscription plans on mount if not already loaded
  useEffect(() => {
    if (!plans) {
      dispatch(getSubscriptionPlansThunk());
    }
  }, [dispatch, plans]);

  // Set AI context with subscription info
  useEffect(() => {
    const summary = `User is viewing subscription plans. Current plan: ${currentSub}. Available plans: Free (₹0/day), Silver (₹2/day), Gold (₹5/day, recommended), Platinum (₹8/day).`;
    setAIPageContext({
      page: "subscriptions",
      description: summary,
    });
    return () => clearAIPageContext();
  }, [currentSub]);

  // Get colors for each subscription type
  const subscriptionColors = {
    FREE: COLORS.CASUAL,
    GOLD: COLORS.GOLD,
    SILVER: COLORS.SILVER,
    PLATINUM: COLORS.PLATINUM,
  };

  const planCards = [
    {
      type: "FREE",
      name: "Free",
      price: "₹0",
      period: "forever",
      recommended: false,
      level: 0,
      highlights: [
        "Basic AI outfit suggestions",
        "Upload up to 20 items",
        "Standard color detection",
        "Community support",
      ],
    },
    {
      type: "SILVER",
      name: "Silver",
      price: "₹2",
      period: "/day",
      recommended: false,
      level: 1,
      highlights: [
        "Advanced AI suggestions",
        "Upload up to 50 items",
        "Full color intelligence",
        "Email support",
      ],
    },
    {
      type: "GOLD",
      name: "Gold",
      price: "₹5",
      period: "/day",
      recommended: true,
      level: 2,
      highlights: [
        "Unlimited AI suggestions",
        "Upload up to 200 items",
        "Expert chat access",
        "Flat-lay generation",
        "Priority support",
      ],
    },
    {
      type: "PLATINUM",
      name: "Platinum",
      price: "₹8",
      period: "/day",
      recommended: false,
      level: 3,
      highlights: [
        "Everything in Gold",
        "Unlimited items",
        "Priority expert access",
        "Advanced analytics",
        "Dedicated support",
      ],
    },
  ];

  const getAllFeatures = () => {
    if (!plans) return [];
    const features = [];
    const firstPlan = plans.features;
    for (const [category, values] of Object.entries(firstPlan)) {
      if (Array.isArray(values)) {
        const formattedName = category.replace(/([A-Z])/g, " $1").trim();
        features.push({
          name: formattedName,
          platinum: values[3] || "Not Available",
          gold: values[2] || "Not Available",
          silver: values[1] || "Not Available",
          free: values[0] || "Not Available",
        });
      }
    }
    return features;
  };

  const dynamicFeatures = getAllFeatures();

  // Update the handleSubscriptionSelect function
  const handleSubscriptionSelect = (planType) => {
    const routeMap = {
      PLATINUM: "platinum",
      GOLD: "gold",
      SILVER: "silver",
    };

    const route = routeMap[planType];
    if (route) {
      const selectedPlan = plans?.plans?.find(
        (p) => p.type.toUpperCase() === planType
      );

      if (!selectedPlan) {
        console.error("Selected plan not found");
        return;
      }

      const minimumPricing = selectedPlan.pricing?.[0];

      if (!minimumPricing) {
        console.error("Pricing information not found");
        return;
      }

      const planSummary = {
        type: selectedPlan.type || planType,
        level: selectedPlan.level || 0,
        basePrice: minimumPricing.pricePerDay || 0,
        minDuration: minimumPricing.minDays || 7,
        maxDuration: minimumPricing.maxDays || 15,
        features: plans.features || {},
        limits: plans.limits || {},
        support: plans.support || {},
        pricing: selectedPlan.pricing || [],
      };

      const planIndex = ["FREE", "SILVER", "GOLD", "PLATINUM"].indexOf(planType);

      navigate(`/subscriptions/${route}`, {
        state: {
          planDetails: planSummary,
          pricingOptions: (selectedPlan.pricing || []).map((tier) => ({
            duration: `${tier.minDays}-${tier.maxDays} days`,
            pricePerDay: tier.pricePerDay,
            totalPrice: tier.pricePerDay * tier.minDays,
            savings: (
              ((minimumPricing.pricePerDay - tier.pricePerDay) /
                minimumPricing.pricePerDay) *
              100
            ).toFixed(1),
          })),
          features: {
            included: Object.entries(plans.features || {}).map(
              ([key, values]) => ({
                name: key.replace(/([A-Z])/g, " $1").trim(),
                value: Array.isArray(values) ? values[planIndex] : values,
              })
            ),
            limits: Object.entries(plans.limits || {}).map(([key, values]) => ({
              name: key.replace(/([A-Z])/g, " $1").trim(),
              value: Array.isArray(values) ? values[planIndex] : values,
            })),
            support: Object.entries(plans.support || {}).map(
              ([key, values]) => ({
                name: key.replace(/([A-Z])/g, " $1").trim(),
                value: Array.isArray(values) ? values[planIndex] : values,
              })
            ),
          },
          paymentMethods: [
            { type: "UPI", options: ["GPay", "PhonePe", "Paytm"] },
            { type: "Cards", options: ["Credit Card", "Debit Card", "RuPay"] },
            { type: "NetBanking", options: ["All Indian Banks"] },
            { type: "QR", options: ["UPI QR"] },
          ],
          policies: {
            refund: "7-day money-back guarantee",
            cancellation: "Cancel anytime, no questions asked",
            prorated: "Prorated refunds for unused time",
            autoRenewal: "Auto-renewal can be turned off anytime",
          },
        },
      });
    }
  };

  return (
    <div className="px-4 md:px-14 py-6 md:py-10 bg-light-secondary/30 dark:bg-dark-secondary/30 rounded-3xl overflow-x-hidden">
      {/* Header */}
      <div className="text-center mb-8 md:mb-12">
        <h2 className="text-xl md:text-2xl font-medium mb-2 text-light-text/90 dark:text-dark-text/90">
          Hey{" "}
          <span className="font-bold text-light-accent dark:text-dark-accent">
            {firstName}
          </span>
          , choose your plan
        </h2>
        <p className="text-sm md:text-base text-light-text/60 dark:text-dark-text/60 max-w-lg mx-auto">
          Start free and upgrade when you need more. All plans include core AI styling.
        </p>
      </div>

      {/* Plan Cards */}
      {loaders[LOADER_TYPES.SUBSCRIPTION_GET_PLANS] ? (
        <SubscriptionSkeleton />
      ) : !dynamicFeatures.length > 0 ? (
        <ErrorMessage />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto">
            {planCards.map((plan) => {
              const colors = subscriptionColors[plan.type];
              const isCurrentPlan = currentSub.toUpperCase() === plan.type;
              const isRecommended = plan.recommended;

              return (
                <div
                  key={plan.type}
                  className={`relative flex flex-col rounded-2xl border-2 transition-all duration-300 hover:shadow-lg ${
                    isRecommended
                      ? "shadow-md"
                      : "hover:scale-[1.01]"
                  }`}
                  style={{
                    borderColor: isRecommended
                      ? colors?.fourth
                      : isCurrentPlan
                      ? `${colors?.fourth}60`
                      : "transparent",
                    backgroundColor: isRecommended
                      ? `${colors?.fourth}08`
                      : undefined,
                  }}
                >
                  {/* Most Popular badge */}
                  {isRecommended && (
                    <div
                      className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[11px] font-bold text-white tracking-wide whitespace-nowrap"
                      style={{ backgroundColor: colors?.fourth }}
                    >
                      MOST POPULAR
                    </div>
                  )}

                  {/* Current plan indicator */}
                  {isCurrentPlan && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[11px] font-medium bg-light-text/10 dark:bg-dark-text/10 text-light-text/60 dark:text-dark-text/60 whitespace-nowrap">
                      CURRENT PLAN
                    </div>
                  )}

                  {/* Card content */}
                  <div className="p-5 sm:p-6 flex flex-col flex-1">
                    {/* Plan name */}
                    <h3
                      className="text-lg font-bold mb-1"
                      style={{ color: colors?.fourth }}
                    >
                      {plan.name}
                    </h3>

                    {/* Price */}
                    <div className="mb-4">
                      <span className="text-3xl font-extrabold text-light-text dark:text-dark-text">
                        {plan.price}
                      </span>
                      <span className="text-sm text-light-text/50 dark:text-dark-text/50 ml-0.5">
                        {plan.period}
                      </span>
                    </div>

                    {/* Highlights */}
                    <ul className="space-y-2.5 mb-6 flex-1">
                      {plan.highlights.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <CheckIcon
                            sx={{ fontSize: 16, marginTop: "2px", flexShrink: 0 }}
                            style={{ color: colors?.fourth }}
                          />
                          <span className="text-sm text-light-text/80 dark:text-dark-text/80">
                            {feature}
                          </span>
                        </li>
                      ))}
                    </ul>

                    {/* CTA */}
                    {plan.type === "FREE" ? (
                      <div className="text-center text-xs text-light-text/40 dark:text-dark-text/40 py-2">
                        {isCurrentPlan ? "Your current plan" : "No signup needed"}
                      </div>
                    ) : (
                      <Button
                        variant={isRecommended ? "contained" : "outlined"}
                        onClick={() => handleSubscriptionSelect(plan.type)}
                        fullWidth
                        sx={{
                          padding: "0.625rem 1rem",
                          borderRadius: "0.75rem",
                          fontWeight: 600,
                          fontSize: "0.875rem",
                          textTransform: "none",
                          boxShadow: isRecommended ? `0 4px 14px ${colors?.fourth}40` : "none",
                        }}
                        style={{
                          backgroundColor: isRecommended
                            ? colors?.fourth
                            : "transparent",
                          borderColor: colors?.fourth,
                          borderWidth: "2px",
                          color: isRecommended ? "white" : colors?.fourth,
                        }}
                      >
                        {isCurrentPlan ? "Manage Plan" : isRecommended ? "Get Started" : "Select Plan"}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Compare all features — expandable */}
          {dynamicFeatures.length > 0 && (
            <div className="mt-8 max-w-5xl mx-auto">
              <button
                onClick={() => setShowAllFeatures(!showAllFeatures)}
                className="mx-auto flex items-center gap-2 text-sm font-medium text-light-text/50 dark:text-dark-text/50 hover:text-light-accent dark:hover:text-dark-accent transition-colors"
              >
                {showAllFeatures ? "Hide" : "Compare all features"}
                <svg
                  className={`w-4 h-4 transition-transform ${showAllFeatures ? "rotate-180" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showAllFeatures && (
                <div className="mt-4 rounded-2xl border border-light-text/10 dark:border-dark-text/10 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-light-secondary/50 dark:bg-dark-secondary/50">
                        <th className="p-3 text-left font-semibold text-light-text dark:text-dark-text">Feature</th>
                        {planCards.map((plan) => (
                          <th
                            key={plan.type}
                            className="p-3 text-center font-semibold"
                            style={{ color: subscriptionColors[plan.type]?.fourth }}
                          >
                            {plan.name}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {dynamicFeatures.map((feature, idx) => (
                        <tr key={idx} className="border-t border-light-text/5 dark:border-dark-text/5">
                          <td className="p-3 text-light-text/70 dark:text-dark-text/70">{feature.name}</td>
                          {["platinum", "gold", "silver", "free"].map((tier) => (
                            <td key={tier} className="p-3 text-center text-light-text/60 dark:text-dark-text/60">
                              {feature[tier]}
                            </td>
                          ))}
                        </tr>
                      ))}

                      {/* Limits */}
                      {plans && Object.entries(plans.limits).map(([limitKey, values], idx) => (
                        <tr key={`limit-${idx}`} className="border-t border-light-text/5 dark:border-dark-text/5">
                          <td className="p-3 text-light-text/70 dark:text-dark-text/70">
                            {limitKey.replace(/([A-Z])/g, " $1").trim()}
                          </td>
                          {[3, 2, 1, 0].map((planIdx) => (
                            <td key={planIdx} className="p-3 text-center text-light-text/60 dark:text-dark-text/60">
                              {Array.isArray(values) ? values[planIdx] : values}
                            </td>
                          ))}
                        </tr>
                      ))}

                      {/* Support */}
                      {plans && Object.entries(plans.support).map(([supportKey, values], idx) => (
                        <tr key={`support-${idx}`} className="border-t border-light-text/5 dark:border-dark-text/5">
                          <td className="p-3 text-light-text/70 dark:text-dark-text/70">
                            {supportKey.replace(/([A-Z])/g, " $1").trim()}
                          </td>
                          {[3, 2, 1, 0].map((planIdx) => (
                            <td key={planIdx} className="p-3 text-center text-light-text/60 dark:text-dark-text/60">
                              {Array.isArray(values) ? values[planIdx] : values}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Trust strip — compact */}
      <div className="mt-8 flex flex-wrap items-center justify-center gap-4 md:gap-6 text-xs text-light-text/40 dark:text-dark-text/40">
        <span>7-day money-back guarantee</span>
        <span className="hidden sm:inline">•</span>
        <span>Cancel anytime</span>
        <span className="hidden sm:inline">•</span>
        <span>Secure payments via Razorpay</span>
      </div>
    </div>
  );
}

export default Subscriptions;
