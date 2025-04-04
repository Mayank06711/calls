import React, { useEffect, useMemo } from "react";
import { useLocation, useParams } from "react-router-dom";
import { COLORS } from "../../../../../constants/colorPalettes";
import { motion } from "framer-motion";
import { Button, TextField } from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import TimelineIcon from "@mui/icons-material/Timeline";
import SupportAgentIcon from "@mui/icons-material/SupportAgent";
import PaymentIcon from "@mui/icons-material/Payment";
import SecurityIcon from "@mui/icons-material/Security";
import { useState } from "react";
import CalculateIcon from "@mui/icons-material/Calculate";
import DataSaverOnIcon from "@mui/icons-material/DataSaverOn";
import StarIcon from "@mui/icons-material/Star";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import LocalOfferIcon from "@mui/icons-material/LocalOffer";
import SpeedIcon from "@mui/icons-material/Speed";
import WorkspacePremiumIcon from "@mui/icons-material/WorkspacePremium";
import Payment from "../Payment/Payment";

function GoldSubscription() {
  const location = useLocation();
  const { planType } = useParams();
  const { planDetails, pricingOptions, features, paymentMethods, policies } =
    location.state || {};

  const [customDays, setCustomDays] = useState("");
  const [calculatedPrice, setCalculatedPrice] = useState(null);
  const [selectedDays, setSelectedDays] = useState(null);

  const planColor = COLORS.GOLD.fourth;

  // Enhanced duration plans for Gold
  const durationPlans = [
    {
      duration: "7 Days",
      pricePerDay: planDetails?.basePrice || 0,
      savings: 0,
      tag: "Trial",
    },
    {
      duration: "15 Days",
      pricePerDay: planDetails?.basePrice * 0.95 || 0,
      savings: 5,
      tag: "Quick Start",
    },
    {
      duration: "1 Month",
      pricePerDay: planDetails?.basePrice * 0.9 || 0,
      savings: 10,
      tag: "Popular",
    },
    {
      duration: "3 Months",
      pricePerDay: planDetails?.basePrice * 0.85 || 0,
      savings: 15,
      tag: "Best Value",
    },
    {
      duration: "6 Months",
      pricePerDay: planDetails?.basePrice * 0.8 || 0,
      savings: 20,
      tag: "Pro Choice",
    },
  ];

  const fadeIn = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6 },
  };

  // Function to calculate total price
  const calculateTotalPrice = (pricePerDay, duration) => {
    const durationMap = {
      "7 Days": 7,
      "15 Days": 15,
      "1 Month": 30,
      "3 Months": 90,
      "6 Months": 180,
    };
    return Math.round(pricePerDay * durationMap[duration]);
  };

  // Function to calculate custom price
  const calculateCustomPrice = () => {
    const days = parseInt(customDays);
    if (isNaN(days) || days < 7 || days > 180) return;

    let pricePerDay = planDetails?.basePrice || 0;
    let savings = 0;

    // Calculate price based on duration
    if (days <= 15) {
      pricePerDay = planDetails?.basePrice * 0.95;
      savings = 5;
    } else if (days <= 30) {
      pricePerDay = planDetails?.basePrice * 0.9;
      savings = 10;
    } else if (days <= 90) {
      pricePerDay = planDetails?.basePrice * 0.85;
      savings = 15;
    } else {
      pricePerDay = planDetails?.basePrice * 0.8;
      savings = 20;
    }

    const totalPrice = Math.round(pricePerDay * days);
    const regularPrice = Math.round(planDetails?.basePrice * days);
    const savedAmount = regularPrice - totalPrice;
    const dailySavings = planDetails?.basePrice - pricePerDay;
    const monthlyEquivalent = Math.round(pricePerDay * 30);

    setCalculatedPrice({
      total: totalPrice,
      perDay: pricePerDay.toFixed(2),
      savings,
      savedAmount,
      dailySavings: dailySavings.toFixed(2),
      monthlyEquivalent,
      days,
    });
    setSelectedDays(days);
  };

  const handleDurationSelect = (duration) => {
    const durationMap = {
      "7 Days": 7,
      "15 Days": 15,
      "1 Month": 30,
      "3 Months": 90,
      "6 Months": 180,
    };
    setSelectedDays(durationMap[duration]);
  };

  const MemoizedPayment = useMemo(() => {
    if (!selectedDays) return null;

    return (
      <motion.div
        className="mb-12"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Payment
          key={selectedDays} // Add key prop to force update only when days change
          numberOfDays={selectedDays}
          planColor={planColor}
        />
      </motion.div>
    );
  }, [selectedDays, planColor]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
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
          {/* Plan badge and main heading group */}
          <div className="text-center mb-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-light-secondary/10 dark:bg-dark-secondary/10 mb-2">
              <WorkspacePremiumIcon sx={{ color: planColor, fontSize: 30 }} />
              <span className="text-3xl font-bold" style={{ color: planColor }}>
                Gold Plan
              </span>
            </div>

            <h1
              className="text-2xl md:text-3xl font-extrabold"
              style={{
                background: `linear-gradient(135deg, ${planColor}, ${planColor})`,
                WebkitBackgroundClip: "text",
              }}
            >
              Unlock Premium Experience
            </h1>
            <p className="text-sm text-light-text/60 dark:text-dark-text/60 mt-1">
              Enhanced features with premium support
            </p>
          </div>

          {/* Price and features in a compact card */}
          <div className="w-full max-w-3xl bg-light-secondary/5 dark:bg-dark-secondary/5 rounded-lg p-4 mb-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              {/* Price section */}
              <div className="flex items-center gap-3">
                <div>
                  <div className="flex items-baseline gap-1">
                    <span
                      className="text-3xl font-bold"
                      style={{ color: planColor }}
                    >
                      ₹{planDetails?.basePrice}
                    </span>
                    <span className="text-sm text-light-text/60 dark:text-dark-text/60">
                      /day
                    </span>
                  </div>
                  <span className="text-xs font-medium text-green-500">
                    Save up to 20% on longer plans
                  </span>
                </div>
              </div>

              {/* Feature highlights */}
              <div className="flex gap-4">
                <div className="flex items-center gap-2">
                  <SpeedIcon sx={{ color: planColor, fontSize: 20 }} />
                  <div>
                    <h3 className="text-sm font-bold">Premium Features</h3>
                    <p className="text-xs text-light-text/60">
                      Enhanced access
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <SupportAgentIcon sx={{ color: planColor, fontSize: 20 }} />
                  <div>
                    <h3 className="text-sm font-bold">Premium Support</h3>
                    <p className="text-xs text-light-text/60">
                      Priority assistance
                    </p>
                  </div>
                </div>
              </div>

              {/* CTA Button */}
              <Button
                variant="contained"
                size="medium"
                sx={{
                  backgroundColor: planColor,
                  fontSize: "0.875rem",
                  padding: "6px 16px",
                  "&:hover": {
                    backgroundColor: planColor + "dd",
                    boxShadow: `0 2px 8px ${planColor}40`,
                  },
                  minWidth: "140px",
                  borderRadius: "9999px",
                }}
              >
                Get Started
              </Button>
            </div>
          </div>

          {/* Bottom text */}
          <p className="text-xs text-light-text/60 dark:text-dark-text/60">
            No credit card required • Instant access • Cancel anytime
          </p>
        </div>
      </motion.div>

      {/* Price Calculator */}
      <motion.div
        className="mb-12 bg-light-primary dark:bg-dark-primary rounded-xl p-6 shadow-lg"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold mb-2">
            Calculate Your Custom Price
          </h2>
          <p className="text-light-text/70 dark:text-dark-text/70 text-sm">
            Enter number of days (7-180) to calculate your custom price
          </p>
        </div>

        <div className="flex flex-col md:flex-row items-center gap-4 mb-6">
          <TextField
            type="number"
            value={customDays}
            onChange={(e) => setCustomDays(e.target.value)}
            placeholder="Enter days"
            size="small"
            inputProps={{
              min: 7,
              max: 180,
              style: {
                WebkitAppearance: "none",
                MozAppearance: "textfield",
              },
            }}
            sx={{
              "& .MuiOutlinedInput-root": {
                "& fieldset": { borderColor: planColor + "80" },
                "&:hover fieldset": { borderColor: planColor },
                "&.Mui-focused fieldset": { borderColor: planColor },
                "& input": { color: planColor },
                border: `1px solid ${planColor}`,
              },
              width: { xs: "100%", md: "200px" },
            }}
          />
          <Button
            variant="contained"
            onClick={calculateCustomPrice}
            startIcon={<CalculateIcon />}
            disabled={!customDays || customDays < 7 || customDays > 180}
            sx={{
              backgroundColor: planColor,
              "&:hover": { backgroundColor: planColor + "dd" },
              width: { xs: "100%", md: "auto" },
            }}
          >
            Calculate Price
          </Button>
        </div>

        {calculatedPrice && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-4"
          >
            {/* Price Summary */}
            <div className="bg-light-secondary/10 dark:bg-dark-secondary/10 rounded-lg p-4">
              <h3 className="font-semibold mb-3">Price Summary</h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-light-text/70 dark:text-dark-text/70">
                    Per Day:
                  </span>
                  <span className="font-bold" style={{ color: planColor }}>
                    ₹{calculatedPrice.perDay}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-light-text/70 dark:text-dark-text/70">
                    Total ({calculatedPrice.days} days):
                  </span>
                  <span className="font-bold" style={{ color: planColor }}>
                    ₹{calculatedPrice.total}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-light-text/70 dark:text-dark-text/70">
                    Monthly Equivalent:
                  </span>
                  <span className="font-bold" style={{ color: planColor }}>
                    ₹{calculatedPrice.monthlyEquivalent}
                  </span>
                </div>
              </div>
            </div>

            {/* Savings */}
            <div className="bg-light-secondary/10 dark:bg-dark-secondary/10 rounded-lg p-4">
              <h3 className="font-semibold mb-3">Your Savings</h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-light-text/70 dark:text-dark-text/70">
                    Discount:
                  </span>
                  <span className="font-bold text-green-500">
                    {calculatedPrice.savings}%
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-light-text/70 dark:text-dark-text/70">
                    Daily Savings:
                  </span>
                  <span className="font-bold text-green-500">
                    ₹{calculatedPrice.dailySavings}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-light-text/70 dark:text-dark-text/70">
                    Total Savings:
                  </span>
                  <span className="font-bold text-green-500">
                    ₹{calculatedPrice.savedAmount}
                  </span>
                </div>
              </div>
            </div>

            {/* Recommendation */}
            <div
              className="rounded-lg p-4"
              style={{ backgroundColor: planColor + "15" }}
            >
              <div className="flex items-center gap-2 mb-3">
                <DataSaverOnIcon sx={{ color: planColor }} />
                <h3 className="font-semibold">Smart Choice</h3>
              </div>
              <p className="text-sm text-light-text/70 dark:text-dark-text/70 mb-4">
                {calculatedPrice.days >= 90
                  ? "Great choice! Long-term commitment brings maximum savings."
                  : "Consider a longer duration for better savings!"}
              </p>
              <Button
                variant="outlined"
                fullWidth
                size="small"
                sx={{
                  borderColor: planColor,
                  color: planColor,
                  "&:hover": { borderColor: planColor + "dd" },
                }}
              >
                Select This Plan
              </Button>
            </div>
          </motion.div>
        )}
      </motion.div>

      {/* Pricing Tiers */}
      <motion.section
        className="mb-12"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h2 className="text-2xl font-bold mb-3 text-center">
          Choose Your Duration
        </h2>
        <p className="text-center text-light-text/70 dark:text-dark-text/70 mb-8 max-w-2xl mx-auto text-sm">
          Longer commitments come with greater savings
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {durationPlans.map((plan, index) => (
            <motion.div
              key={index}
              className="relative p-4 bg-light-primary dark:bg-dark-primary rounded-lg border border-light-secondary/20 dark:border-dark-secondary/20"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              style={{
                transition: "box-shadow 0.1s ease, border-color 0.1s ease",
              }}
              whileHover={{
                boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
                borderColor: planColor,
              }}
            >
              {/* Tag Badge */}
              {plan.tag && (
                <div
                  className="absolute -top-2 -right-2 px-2 py-0.5 rounded-full text-xs font-medium"
                  style={{
                    backgroundColor:
                      plan.tag === "Best Value" ? "#22c55e" : planColor,
                    color: "white",
                  }}
                >
                  {plan.tag}
                </div>
              )}

              {/* Duration and Price */}
              <div className="text-center">
                <h3 className="text-lg font-bold mb-2">{plan.duration}</h3>
                <div className="mb-2">
                  <span
                    className="text-xl font-bold"
                    style={{ color: planColor }}
                  >
                    ₹{plan.pricePerDay.toFixed(2)}
                  </span>
                  <span className="text-sm text-light-text/70 dark:text-dark-text/70">
                    /day
                  </span>
                </div>
                <div className="space-y-1 mb-3">
                  <p className="text-xs text-light-text/60 dark:text-dark-text/60">
                    Total: ₹
                    {calculateTotalPrice(plan.pricePerDay, plan.duration)}
                  </p>
                  {plan.savings > 0 && (
                    <p className="text-xs font-medium text-green-500">
                      Save {plan.savings}%
                    </p>
                  )}
                </div>

                {/* Compact Features List */}
                <div className="space-y-1 mb-4 text-xs text-light-text/70 dark:text-dark-text/70">
                  <div className="flex items-center justify-center gap-1">
                    <CheckCircleIcon sx={{ color: planColor, fontSize: 14 }} />
                    <span>All Features</span>
                  </div>
                  {plan.duration !== "7 Days" && (
                    <div className="flex items-center justify-center gap-1">
                      <CheckCircleIcon
                        sx={{ color: planColor, fontSize: 14 }}
                      />
                      <span>Priority Support</span>
                    </div>
                  )}
                </div>

                {/* Action Button */}
                <Button
                  fullWidth
                  size="small"
                  variant={plan.tag === "Best Value" ? "contained" : "outlined"}
                  onClick={() => handleDurationSelect(plan.duration)}
                  sx={{
                    borderColor: planColor,
                    backgroundColor:
                      plan.tag === "Best Value" ? planColor : "transparent",
                    color: plan.tag === "Best Value" ? "white" : planColor,
                    "&:hover": {
                      backgroundColor:
                        plan.tag === "Best Value"
                          ? planColor
                          : `${planColor}10`,
                      borderColor: planColor,
                      boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                    },
                    fontSize: "0.875rem",
                    padding: "4px 8px",
                    minHeight: "32px",
                  }}
                >
                  {plan.tag === "Trial" ? "Start Trial" : "Select"}
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/*Payment Component */}
      {MemoizedPayment}

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
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
                <span className="text-green-500 mt-1">•</span>
                <span>{feature.name}</span>
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
                <span className="text-blue-500 mt-1">•</span>
                <span>{limit.name}</span>
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
                <span className="text-purple-500 mt-1">•</span>
                <span>{item.name}</span>
              </li>
            ))}
          </ul>
        </motion.div>

        {/* Payment Methods */}
        <motion.div
          className="bg-light-primary dark:bg-dark-primary p-4 rounded-lg shadow-md"
          {...fadeIn}
        >
          <div className="flex items-center gap-2 mb-3">
            <PaymentIcon sx={{ color: planColor, fontSize: 20 }} />
            <h3 className="text-lg font-semibold">Payment</h3>
          </div>
          <ul className="space-y-2 text-sm">
            {paymentMethods?.map((method, index) => (
              <li key={index} className="flex items-start gap-2">
                <span className="text-orange-500 mt-1">•</span>
                <span>{method.type}</span>
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
          <h2 className="text-lg font-semibold">Policies</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          {Object.entries(policies || {}).map(([key, value]) => (
            <div
              key={key}
              className="p-3 bg-light-secondary/10 dark:bg-dark-secondary/10 rounded-lg"
            >
              <h3 className="font-medium mb-1 capitalize">
                {key.replace(/([A-Z])/g, " $1").trim()}
              </h3>
              <p className="text-light-text/70 dark:text-dark-text/70 text-xs">
                {value}
              </p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Bottom CTA Section */}
      <motion.div
        className="mt-8 text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <p className="mt-4 text-sm text-light-text/60 dark:text-dark-text/60">
          Experience premium features and dedicated support with our Gold
          subscription
        </p>
      </motion.div>
    </div>
  );
}

export default GoldSubscription;
