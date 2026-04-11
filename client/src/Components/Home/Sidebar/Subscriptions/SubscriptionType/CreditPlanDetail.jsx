import React, { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { COLORS } from "../../../../../constants/colorPalettes";
import { motion } from "framer-motion";
import { Button } from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import TimelineIcon from "@mui/icons-material/Timeline";
import SupportAgentIcon from "@mui/icons-material/SupportAgent";
import PaymentIcon from "@mui/icons-material/Payment";
import SecurityIcon from "@mui/icons-material/Security";
import WorkspacePremiumIcon from "@mui/icons-material/WorkspacePremium";
import DiamondIcon from "@mui/icons-material/Diamond";
import StarIcon from "@mui/icons-material/Star";
import SpeedIcon from "@mui/icons-material/Speed";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import Payment from "../Payment/Payment";
import { useAIContext } from "../../../../../context/AIContext";
import { useSelector } from "react-redux";

const PLAN_COLORS = {
  Gold: COLORS.GOLD.fourth,
  Silver: COLORS.SILVER.fourth,
  Platinum: COLORS.PLATINUM.fourth,
};

const PLAN_ICONS = {
  Gold: WorkspacePremiumIcon,
  Silver: DiamondIcon,
  Platinum: StarIcon,
};

function CreditPlanDetail() {
  const location = useLocation();
  const navigate = useNavigate();
  const { planDetails, features } = location.state || {};
  const currentSub = useSelector((state) => state.userInfo?.data?.subscription?.type || "Free");
  const { setAIPageContext, clearAIPageContext } = useAIContext();

  const planType = planDetails?.type || "Gold";
  const planColor = PLAN_COLORS[planType] || COLORS.GOLD.fourth;
  const PlanIcon = PLAN_ICONS[planType] || WorkspacePremiumIcon;

  // Redirect back if no plan data
  useEffect(() => {
    if (!planDetails) {
      navigate("/subscriptions", { replace: true });
    }
  }, [planDetails, navigate]);

  // Set AI context
  useEffect(() => {
    if (!planDetails) return;
    const included = features?.included?.map((f) => f.name).join(", ") || "";
    const summary = `User is viewing ${planType} plan. Price: ₹${planDetails.price}. Credits: ${planDetails.creditsGranted}. Tier duration: ${planDetails.tierDurationDays} days. Current plan: ${currentSub}.${included ? ` Features: ${included}.` : ""}`;
    setAIPageContext({ page: `subscriptions/${planType.toLowerCase()}`, description: summary });
    return () => clearAIPageContext();
  }, [planDetails, features, currentSub]);

  if (!planDetails) return null;

  const fadeIn = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6 },
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Back button */}
      <button
        onClick={() => navigate("/subscriptions")}
        className="flex items-center gap-1 text-sm text-light-text/60 dark:text-dark-text/60 hover:text-light-text dark:hover:text-dark-text transition-colors mb-4"
      >
        <ArrowBackIcon sx={{ fontSize: 18 }} />
        All Plans
      </button>

      {/* Hero Section */}
      <motion.div
        className="relative overflow-hidden rounded-xl bg-gradient-to-r from-light-primary/50 to-light-secondary/10 dark:from-dark-primary/50 dark:to-dark-secondary/10 p-5 mb-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        {/* Background accent */}
        <div
          className="absolute top-0 right-0 w-48 h-48 opacity-10"
          style={{
            background: `radial-gradient(circle, ${planColor}40 0%, transparent 70%)`,
            transform: "translate(20%, -20%)",
          }}
        />

        <div className="relative z-10 flex flex-col items-center">
          {/* Plan badge */}
          <div className="text-center mb-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-light-secondary/10 dark:bg-dark-secondary/10 mb-2">
              <PlanIcon sx={{ color: planColor, fontSize: 30 }} />
              <span className="text-3xl font-bold" style={{ color: planColor }}>
                {planType} Plan
              </span>
            </div>
          </div>

          {/* Price + Credits card */}
          <div className="w-full max-w-2xl bg-light-secondary/5 dark:bg-dark-secondary/5 rounded-lg p-4 mb-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              {/* Price */}
              <div>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold" style={{ color: planColor }}>
                    ₹{planDetails.price}
                  </span>
                  <span className="text-sm text-light-text/60 dark:text-dark-text/60">
                    /month
                  </span>
                </div>
                <span className="text-xs text-light-text/50 dark:text-dark-text/50">
                  {planDetails.tierDurationDays} days of premium features
                </span>
              </div>

              {/* Credits highlight */}
              <div className="flex items-center gap-3">
                <div
                  className="px-4 py-2 rounded-lg text-center"
                  style={{ backgroundColor: `${planColor}12` }}
                >
                  <div className="text-2xl font-bold" style={{ color: planColor }}>
                    {planDetails.creditsGranted.toLocaleString()}
                  </div>
                  <div className="text-xs text-light-text/60 dark:text-dark-text/60">
                    credits included
                  </div>
                </div>
              </div>

              {/* Quick stats */}
              <div className="flex gap-4">
                <div className="flex items-center gap-2">
                  <SpeedIcon sx={{ color: planColor, fontSize: 20 }} />
                  <div>
                    <h3 className="text-sm font-bold">Premium Features</h3>
                    <p className="text-xs text-light-text/60">Enhanced access</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <SupportAgentIcon sx={{ color: planColor, fontSize: 20 }} />
                  <div>
                    <h3 className="text-sm font-bold">Priority Support</h3>
                    <p className="text-xs text-light-text/60">Fast assistance</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <p className="text-xs text-light-text/60 dark:text-dark-text/60">
            Instant credit delivery · Secure payment via Razorpay
          </p>
        </div>
      </motion.div>

      {/* Payment Section */}
      <motion.div
        className="mb-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Payment
          planColor={planColor}
          subscriptionType={planType}
          creditsGranted={planDetails.creditsGranted}
          tierDurationDays={planDetails.tierDurationDays}
          price={planDetails.price}
        />
      </motion.div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {/* Features */}
        <motion.div
          className="bg-light-primary dark:bg-dark-primary p-4 rounded-lg shadow-md"
          {...fadeIn}
        >
          <div className="flex items-center gap-2 mb-3">
            <CheckCircleIcon sx={{ color: planColor, fontSize: 20 }} />
            <h3 className="text-lg font-semibold">Features</h3>
          </div>
          <ul className="space-y-2 text-sm">
            {features?.included?.map((feature, index) => (
              <li key={index} className="flex items-start gap-2">
                <span className="text-green-500 mt-1">·</span>
                <div>
                  <span className="text-light-text/70 dark:text-dark-text/70">{feature.name}</span>
                  {feature.value && (
                    <span className="ml-1 text-light-text/50 dark:text-dark-text/50">— {feature.value}</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </motion.div>

        {/* Limits */}
        <motion.div
          className="bg-light-primary dark:bg-dark-primary p-4 rounded-lg shadow-md"
          {...fadeIn}
        >
          <div className="flex items-center gap-2 mb-3">
            <TimelineIcon sx={{ color: planColor, fontSize: 20 }} />
            <h3 className="text-lg font-semibold">Limits</h3>
          </div>
          <ul className="space-y-2 text-sm">
            {features?.limits?.map((limit, index) => (
              <li key={index} className="flex items-start gap-2">
                <span className="text-blue-500 mt-1">·</span>
                <div>
                  <span className="text-light-text/70 dark:text-dark-text/70">{limit.name}</span>
                  {limit.value && (
                    <span className="ml-1 text-light-text/50 dark:text-dark-text/50">— {limit.value}</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </motion.div>

        {/* Support */}
        <motion.div
          className="bg-light-primary dark:bg-dark-primary p-4 rounded-lg shadow-md"
          {...fadeIn}
        >
          <div className="flex items-center gap-2 mb-3">
            <SupportAgentIcon sx={{ color: planColor, fontSize: 20 }} />
            <h3 className="text-lg font-semibold">Support</h3>
          </div>
          <ul className="space-y-2 text-sm">
            {features?.support?.map((item, index) => (
              <li key={index} className="flex items-start gap-2">
                <span className="text-purple-500 mt-1">·</span>
                <div>
                  <span className="text-light-text/70 dark:text-dark-text/70">{item.name}</span>
                  {item.value && (
                    <span className="ml-1 text-light-text/50 dark:text-dark-text/50">— {item.value}</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </motion.div>
      </div>

      {/* Policies */}
      <motion.div
        className="bg-light-primary dark:bg-dark-primary p-4 rounded-lg shadow-md"
        {...fadeIn}
      >
        <div className="flex items-center gap-2 mb-4">
          <SecurityIcon sx={{ color: planColor, fontSize: 20 }} />
          <h2 className="text-lg font-semibold">How It Works</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          <div className="p-3 bg-light-secondary/10 dark:bg-dark-secondary/10 rounded-lg">
            <h3 className="font-medium mb-1">Instant Credits</h3>
            <p className="text-light-text/70 dark:text-dark-text/70 text-xs">
              Credits are added to your account immediately after payment
            </p>
          </div>
          <div className="p-3 bg-light-secondary/10 dark:bg-dark-secondary/10 rounded-lg">
            <h3 className="font-medium mb-1">Tier Benefits</h3>
            <p className="text-light-text/70 dark:text-dark-text/70 text-xs">
              Premium features active for {planDetails.tierDurationDays} days from purchase
            </p>
          </div>
          <div className="p-3 bg-light-secondary/10 dark:bg-dark-secondary/10 rounded-lg">
            <h3 className="font-medium mb-1">Secure Payment</h3>
            <p className="text-light-text/70 dark:text-dark-text/70 text-xs">
              Powered by Razorpay with bank-grade encryption
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default CreditPlanDetail;
