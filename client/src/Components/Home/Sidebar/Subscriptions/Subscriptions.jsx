import React from "react";

import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import { useSubscriptionColors } from "../../../../utils/getSubscriptionColors";
import { COLORS } from "../../../../constants/colorPalettes";
import { Button } from "@mui/material";
import CreditCardIcon from "@mui/icons-material/CreditCard";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import QrCodeIcon from "@mui/icons-material/QrCode";
import PhoneIphoneIcon from "@mui/icons-material/PhoneIphone";
import GooglePayIcon from "@mui/icons-material/Payment";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import { useSelector } from "react-redux";
import { LOADER_TYPES } from "../../../../redux/action_creators";
import SubscriptionSkeleton from "./SubscriptionSkeleton";
import { useNavigate } from "react-router-dom";

function Subscriptions() {
  const currentColors = useSubscriptionColors();
  const userName = localStorage.getItem("fullName") || "Guest";
  const firstName = userName.split(" ")[0];
  const subscriptionPlans = useSelector((state) => state.plans);
  const plans = subscriptionPlans.plans;
  const loaders = useSelector((state) => state.loaderState.loaders);
  const navigate = useNavigate();

  // Get colors for each subscription type
  const subscriptionColors = {
    FREE: COLORS.CASUAL,
    GOLD: COLORS.GOLD,
    SILVER: COLORS.SILVER,
    PLATINUM: COLORS.PLATINUM,
  };

  const getColumnStyle = (planType) => {
    const colors = subscriptionColors[planType.toUpperCase()];
    return `bg-gradient-to-b from-[${colors?.first}]/5 via-[${colors?.third}]/5 to-[${colors?.fourth}]/5
            hover:from-[${colors?.first}]/10 hover:via-[${colors?.third}]/10 hover:to-[${colors?.fourth}]/10
            transition-all `;
  };

  const planHeader = [
    {
      type: "FREE",
      name: "Free",
      price: "₹0/day",
      recommended: false,
      duration: "Lifetime",
      level: 0,
    },
    {
      type: "SILVER",
      name: "Silver",
      price: "₹2/day",
      recommended: false,
      duration: "Annualy",
      level: 1,
    },
    {
      type: "GOLD",
      name: "Gold",
      price: "₹5/day",
      recommended: true,
      duration: "Annualy",
      level: 2,
    },
    {
      type: "PLATINUM",
      name: "Platinum",
      price: "₹8/day",
      recommended: false,
      duration: "Annualy",
      level: 3,
    },
  ].sort((a, b) => b.level - a.level);

  const getAllFeatures = () => {
    if (!plans) return [];

    const features = [];
    const planTypes = ["Free", "Silver", "Gold", "Platinum"];

    // Get all feature categories
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
      // Find the selected plan data
      const selectedPlan = plans?.plans?.find(
        (p) => p.type.toUpperCase() === planType
      );

      if (!selectedPlan) {
        console.error("Selected plan not found");
        return;
      }

      // Get the minimum duration pricing tier
      const minimumPricing = selectedPlan.pricing?.[0];

      if (!minimumPricing) {
        console.error("Pricing information not found");
        return;
      }

      // Create a formatted plan summary with null checks
      const planSummary = {
        type: selectedPlan.type || planType,
        level: selectedPlan.level || 0,
        basePrice: minimumPricing.pricePerDay || 0,
        minDuration: minimumPricing.minDays || 7,
        maxDuration: minimumPricing.maxDays || 15,
        features: plans.features || {}, // Use plans.features instead of selectedPlan.features
        limits: plans.limits || {}, // Use plans.limits instead of selectedPlan.limits
        support: plans.support || {}, // Use plans.support instead of selectedPlan.support
        pricing: selectedPlan.pricing || [],
      };

      // Get the index for the current plan type to access correct feature values
      const planIndex = ["FREE", "SILVER", "GOLD", "PLATINUM"].indexOf(
        planType
      );

      // Navigate to the subscription route with plan details
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
    <div className="px-14 py-10 bg-light-secondary/30 dark:bg-dark-secondary/30 rounded-3xl">
      {/* Personal Greeting */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-medium mb-2 text-light-text/90 dark:text-dark-text/90">
          Hey{" "}
          <span className="font-bold text-light-accent dark:text-dark-accent">
            {firstName}
          </span>
          ! Ready to unlock premium features? ✨
        </h2>
      </div>
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold mb-3 bg-gradient-to-r from-light-accent to-dark-accent bg-clip-text text-transparent">
          Elevate Your Experience Today
        </h1>
        <p className="text-lg max-w-2xl mx-auto leading-relaxed font-normal tracking-wide bg-gradient-to-r from-light-text/90 to-light-text/70 dark:from-dark-text/90 dark:to-dark-text/70 bg-clip-text">
          Unlock your potential with our flexible subscription plans. Whether
          you're just starting or scaling up, we have the perfect plan to
          support your journey.
        </p>
      </div>
      {/* table content */}
      {loaders[LOADER_TYPES.SUBSCRIPTION_GET_PLANS] || !planHeader ? (
        <SubscriptionSkeleton />
      ) : (
        <table
          className="w-full rounded-2xl overflow-hidden shadow-2xl 
        border-separate border-spacing-[3px]
        bg-light-secondary/20 dark:bg-dark-secondary/20"
        >
          <thead>
            <tr>
              <th
                className="p-2 text-center text-light-text dark:text-dark-text 
              font-bold text-lg bg-slate-200 dark:bg-slate-700 rounded-tl-xl"
              >
                Features
              </th>
              {planHeader?.map((plan, index) => (
                <th
                  key={plan.type}
                  className={`p-3 text-center text-light-text dark:text-dark-text 
                  font-bold bg-slate-200 dark:bg-slate-700
          ${index === planHeader.length - 1 ? "rounded-tr-xl" : ""}
                  ${getColumnStyle(plan.type)}`}
                >
                  <div className="flex flex-col gap-1 py-2  ">
                    <span className="text-lg font-bold">{plan.name}</span>
                    <span
                      className="text-2xl font-extrabold"
                      style={{
                        color: subscriptionColors[plan.type]?.fourth,
                      }}
                    >
                      {plan.price}
                    </span>
                    {plan.type !== "FREE" && (
                      <>
                        <span className="text-xs opacity-75">
                          {plan.duration}
                        </span>
                        {/* {plan.recommended && (
                          <span
                            className="text-xs mt-1 py-1 px-2 rounded-full"
                            style={{
                              backgroundColor:
                                subscriptionColors[plan.type]?.fourth,
                              color: "white",
                            }}
                          >
                            Recommended
                      </span>
                        )} */}
                      </>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {dynamicFeatures.map((feature, index) => (
              <tr key={index}>
                <td className="p-3 text-left font-medium text-light-text dark:text-dark-text bg-light-primary dark:bg-dark-primary">
                  {feature.name}
                </td>
                {planHeader?.map((plan) => (
                  <td
                    key={plan.type}
                    className={`p-3 text-center rounded-sm bg-light-primary dark:bg-dark-primary
                    ${getColumnStyle(plan.type)}`}
                  >
                    <span
                      style={{ color: subscriptionColors[plan.type]?.fourth }}
                    >
                      {feature[plan.type.toLowerCase()]}
                    </span>
                  </td>
                ))}
              </tr>
            ))}

            {/* Limits Section */}

            {plans && (
              <>
                <tr>
                  <td
                    colSpan={planHeader?.length + 1}
                    className="p-3 font-bold text-light-text dark:text-dark-text bg-light-secondary dark:bg-dark-secondary text-center  "
                  >
                    Usage Limits
                  </td>
                </tr>
                {Object.entries(plans.limits).map(
                  ([limitKey, values], index) => (
                    <tr key={`limit-${index}`}>
                      <td className="p-3 text-left font-medium text-light-text dark:text-dark-text bg-light-primary dark:bg-dark-primary">
                        {limitKey.replace(/([A-Z])/g, " $1").trim()}
                      </td>
                      {planHeader?.map((plan, planIndex) => (
                        <td
                          key={plan.type}
                          className={`p-3 text-center rounded-sm bg-light-primary dark:bg-dark-primary ${getColumnStyle(
                            plan.type
                          )}`}
                        >
                          <span
                            style={{
                              color: subscriptionColors[plan.type]?.fourth,
                            }}
                          >
                            {Array.isArray(values)
                              ? values[3 - planIndex]
                              : values}
                          </span>
                        </td>
                      ))}
                    </tr>
                  )
                )}

                {/* Support Section */}
                <tr>
                  <td
                    colSpan={planHeader?.length + 1}
                    className="p-3 font-bold text-light-text dark:text-dark-text bg-light-secondary dark:bg-dark-secondary text-center "
                  >
                    Support Features
                  </td>
                </tr>
                {Object.entries(plans.support).map(
                  ([supportKey, values], index) => (
                    <tr key={`support-${index}`}>
                      <td className="p-3 text-left font-medium text-light-text dark:text-dark-text bg-light-primary dark:bg-dark-primary">
                        {supportKey.replace(/([A-Z])/g, " $1").trim()}
                      </td>
                      {planHeader?.map((plan, planIndex) => (
                        <td
                          key={plan.type}
                          className={`p-3 text-center rounded-sm bg-light-primary dark:bg-dark-primary ${getColumnStyle(
                            plan.type
                          )}`}
                        >
                          <span
                            style={{
                              color: subscriptionColors[plan.type]?.fourth,
                            }}
                          >
                            {Array.isArray(values)
                              ? values[3 - planIndex]
                              : values}
                          </span>
                        </td>
                      ))}
                    </tr>
                  )
                )}

                {/* Pricing Details Section */}
                <tr>
                  <td
                    colSpan={planHeader?.length + 1}
                    className="p-3 font-bold text-light-text dark:text-dark-text bg-light-secondary dark:bg-dark-secondary text-center"
                  >
                    Pricing Details
                  </td>
                </tr>

                {/* Duration Rows */}
                <tr>
                  <td className="p-3 text-left font-medium text-light-text dark:text-dark-text bg-light-primary dark:bg-dark-primary">
                    7-15 days
                  </td>
                  {planHeader?.map((header) => {
                    const planData = plans?.plans?.find(
                      (p) => p.type.toUpperCase() === header.type
                    );
                    const price = planData?.pricing[0]?.pricePerDay;

                    return (
                      <td
                        key={header.type}
                        className={`p-3 text-center rounded-sm bg-light-primary dark:bg-dark-primary ${getColumnStyle(
                          header.type
                        )}`}
                      >
                        <span
                          style={{
                            color: subscriptionColors[header.type]?.fourth,
                          }}
                        >
                          {header.type === "FREE"
                            ? "Free"
                            : price
                            ? `₹${price}/day`
                            : "-"}
                        </span>
                      </td>
                    );
                  })}
                </tr>

                <tr>
                  <td className="p-3 text-left font-medium text-light-text dark:text-dark-text bg-light-primary dark:bg-dark-primary">
                    16-30 days
                  </td>
                  {planHeader?.map((header) => {
                    const planData = plans?.plans?.find(
                      (p) => p.type.toUpperCase() === header.type
                    );
                    const price = planData?.pricing[1]?.pricePerDay;

                    return (
                      <td
                        key={header.type}
                        className={`p-3 text-center rounded-sm bg-light-primary dark:bg-dark-primary ${getColumnStyle(
                          header.type
                        )}`}
                      >
                        <span
                          style={{
                            color: subscriptionColors[header.type]?.fourth,
                          }}
                        >
                          {header.type === "FREE"
                            ? "Free"
                            : price
                            ? `₹${price}/day`
                            : "-"}
                        </span>
                      </td>
                    );
                  })}
                </tr>

                <tr>
                  <td className="p-3 text-left font-medium text-light-text dark:text-dark-text bg-light-primary dark:bg-dark-primary">
                    31-90 days
                  </td>
                  {planHeader?.map((header) => {
                    const planData = plans?.plans?.find(
                      (p) => p.type.toUpperCase() === header.type
                    );
                    const price = planData?.pricing[2]?.pricePerDay;

                    return (
                      <td
                        key={header.type}
                        className={`p-3 text-center rounded-sm bg-light-primary dark:bg-dark-primary ${getColumnStyle(
                          header.type
                        )}`}
                      >
                        <span
                          style={{
                            color: subscriptionColors[header.type]?.fourth,
                          }}
                        >
                          {header.type === "FREE"
                            ? "Free"
                            : price
                            ? `₹${price}/day`
                            : "-"}
                        </span>
                      </td>
                    );
                  })}
                </tr>

                <tr>
                  <td className="p-3 text-left font-medium text-light-text dark:text-dark-text bg-light-primary dark:bg-dark-primary">
                    91-180 days
                  </td>
                  {planHeader?.map((header) => {
                    const planData = plans?.plans?.find(
                      (p) => p.type.toUpperCase() === header.type
                    );
                    const price = planData?.pricing[3]?.pricePerDay;

                    return (
                      <td
                        key={header.type}
                        className={`p-3 text-center rounded-sm bg-light-primary dark:bg-dark-primary ${getColumnStyle(
                          header.type
                        )}`}
                      >
                        <span
                          style={{
                            color: subscriptionColors[header.type]?.fourth,
                          }}
                        >
                          {header.type === "FREE"
                            ? "Free"
                            : price
                            ? `₹${price}/day`
                            : "-"}
                        </span>
                      </td>
                    );
                  })}
                </tr>

                <tr>
                  <td className="p-3 text-left font-medium text-light-text dark:text-dark-text bg-light-primary dark:bg-dark-primary">
                    181-365 days
                  </td>
                  {planHeader?.map((header) => {
                    const planData = plans?.plans?.find(
                      (p) => p.type.toUpperCase() === header.type
                    );
                    const price = planData?.pricing[4]?.pricePerDay;

                    return (
                      <td
                        key={header.type}
                        className={`p-3 text-center rounded-sm bg-light-primary dark:bg-dark-primary ${getColumnStyle(
                          header.type
                        )}`}
                      >
                        <span
                          style={{
                            color: subscriptionColors[header.type]?.fourth,
                          }}
                        >
                          {header.type === "FREE"
                            ? "Free"
                            : price
                            ? `₹${price}/day`
                            : "-"}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              </>
            )}

            <tr>
              <td className="p-3 bg-light-primary dark:bg-dark-primary rounded-bl-xl"></td>
              {planHeader?.map((plan, index) => (
                <td
                  key={plan.type}
                  className={`p-6 bg-light-primary dark:bg-dark-primary
                  ${index === planHeader?.length - 1 ? "rounded-br-xl" : ""}
                  ${getColumnStyle(plan.type)}`}
                >
                  {plan.type !== "FREE" && (
                    <Button
                      variant="outlined"
                      onClick={() => handleSubscriptionSelect(plan.type)}
                      sx={{
                        width: "100%",
                        padding: "0.375rem 1rem",
                        borderRadius: "0.375rem",
                        fontWeight: 600,
                        fontSize: "1rem",
                        transition: "all",
                        color: plan.recommended ? "white" : "inherit",
                      }}
                      style={{
                        backgroundColor: plan.recommended
                          ? subscriptionColors[plan.type.toUpperCase()]?.fourth
                          : "transparent",
                        borderColor:
                          subscriptionColors[plan.type.toUpperCase()]?.fourth,
                        borderWidth: "2px",
                        color: plan.recommended
                          ? "white"
                          : subscriptionColors[plan.type.toUpperCase()]?.fourth,
                      }}
                    >
                      {plan.recommended ? "Recommended" : "Select Plan"}
                    </Button>
                  )}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      )}

      <div className="mt-12 grid grid-cols-3 gap-8">
        <div className="text-center p-6 bg-light-primary dark:bg-dark-primary rounded-xl shadow-md">
          <div className="text-4xl font-bold text-light-accent dark:text-dark-accent mb-2">
            98%
          </div>
          <h3 className="text-xl font-semibold mb-2 text-light-text dark:text-dark-text">
            Customer Satisfaction
          </h3>
          <p className="text-light-text/70 dark:text-dark-text/70">
            Our users consistently rate their experience as exceptional
          </p>
        </div>

        <div className="text-center p-6 bg-light-primary dark:bg-dark-primary rounded-xl shadow-md">
          <div className="text-4xl font-bold text-light-accent dark:text-dark-accent mb-2">
            2x
          </div>
          <h3 className="text-xl font-semibold mb-2 text-light-text dark:text-dark-text">
            Productivity Boost
          </h3>
          <p className="text-light-text/70 dark:text-dark-text/70">
            Users report doubled productivity after upgrading their plan
          </p>
        </div>

        <div className="text-center p-6 bg-light-primary dark:bg-dark-primary rounded-xl shadow-md">
          <div className="text-4xl font-bold text-light-accent dark:text-dark-accent mb-2">
            24/7
          </div>
          <h3 className="text-xl font-semibold mb-2 text-light-text dark:text-dark-text">
            Premium Support
          </h3>
          <p className="text-light-text/70 dark:text-dark-text/70">
            Round-the-clock support to ensure your success
          </p>
        </div>
      </div>

      {/* Testimonial Section */}
      <div className="mt-10 text-center p-6 bg-light-primary dark:bg-dark-primary rounded-xl shadow-md">
        <blockquote className="text-lg italic text-light-text/80 dark:text-dark-text/80 max-w-3xl mx-auto">
          "Upgrading to the premium plan was a game-changer for our team. The
          advanced features and dedicated support have significantly improved
          our workflow and communication."
        </blockquote>
        <div className="mt-4 font-semibold text-light-text dark:text-dark-text">
          - Mayank Soni, Project Manager
        </div>
      </div>

      {/* Call to Action */}
      <div className="mt-8 text-center">
        <p className="text-light-text/90 dark:text-dark-text/90 text-lg mb-2">
          Start your journey today with our{" "}
          <span className="font-bold text-light-accent dark:text-dark-accent">
            free 30-day trial
          </span>
        </p>
        <p className="text-light-text/70 dark:text-dark-text/70">
          No credit card required. Cancel anytime.
        </p>
      </div>

      {/* Payment Options Section */}
      <div className="mt-12 border-t border-light-text/10 dark:border-dark-text/10 pt-8">
        <h3 className="text-center text-xl font-semibold text-light-text dark:text-dark-text mb-6">
          Secure Payment Options
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {/* UPI Section */}
          <div className="h-full space-y-3 flex flex-col">
            <h4 className="font-medium text-light-text dark:text-dark-text">
              UPI Options
            </h4>
            <div className="flex-1 flex flex-col gap-2 items-center bg-light-primary dark:bg-dark-primary p-4 rounded-lg shadow-sm">
              <AccountBalanceWalletIcon
                className="text-light-accent dark:text-dark-accent"
                sx={{ fontSize: 28 }}
              />
              <div className="flex gap-4 mt-2">
                <div className="flex flex-col items-center">
                  <GooglePayIcon
                    className="text-blue-500"
                    sx={{ fontSize: 24 }}
                  />
                  <span className="text-xs mt-1">GPay</span>
                </div>
                <div className="flex flex-col items-center">
                  <PhoneIphoneIcon
                    className="text-purple-500"
                    sx={{ fontSize: 24 }}
                  />
                  <span className="text-xs mt-1">PhonePe</span>
                </div>
                <div className="flex flex-col items-center">
                  <AccountBalanceWalletIcon
                    className="text-blue-400"
                    sx={{ fontSize: 24 }}
                  />
                  <span className="text-xs mt-1">Paytm</span>
                </div>
              </div>
            </div>
          </div>

          {/* Bank Transfer */}
          <div className="h-full space-y-3 flex flex-col">
            <h4 className="font-medium text-light-text dark:text-dark-text">
              Bank Transfer
            </h4>
            <div className="flex-1 flex flex-col items-center justify-center bg-light-primary dark:bg-dark-primary p-4 rounded-lg shadow-sm">
              <AccountBalanceIcon
                className="text-light-accent dark:text-dark-accent mb-2"
                sx={{ fontSize: 32 }}
              />
              <div className="flex flex-col items-center gap-1">
                <span className="text-sm text-light-text/70 dark:text-dark-text/70">
                  NEFT/RTGS/IMPS
                </span>
                <span className="text-xs text-light-text/50 dark:text-dark-text/50">
                  All Indian Banks
                </span>
              </div>
            </div>
          </div>

          {/* Cards */}
          <div className="h-full space-y-3 flex flex-col">
            <h4 className="font-medium text-light-text dark:text-dark-text">
              Cards
            </h4>
            <div className="flex-1 flex flex-col items-center justify-center bg-light-primary dark:bg-dark-primary p-4 rounded-lg shadow-sm">
              <CreditCardIcon
                className="text-light-accent dark:text-dark-accent mb-2"
                sx={{ fontSize: 32 }}
              />
              <div className="flex flex-wrap justify-center gap-2">
                <div className="flex items-center gap-1 text-xs px-2 py-1 bg-light-secondary/20 dark:bg-dark-secondary/20 rounded">
                  <span>Visa</span>
                </div>
                <div className="flex items-center gap-1 text-xs px-2 py-1 bg-light-secondary/20 dark:bg-dark-secondary/20 rounded">
                  <span>Mastercard</span>
                </div>
                <div className="flex items-center gap-1 text-xs px-2 py-1 bg-light-secondary/20 dark:bg-dark-secondary/20 rounded">
                  <span>RuPay</span>
                </div>
              </div>
            </div>
          </div>

          {/* QR Code */}
          <div className="h-full space-y-3 flex flex-col">
            <h4 className="font-medium text-light-text dark:text-dark-text">
              QR Code
            </h4>
            <div className="flex-1 flex flex-col items-center justify-center bg-light-primary dark:bg-dark-primary p-4 rounded-lg shadow-sm">
              <QrCodeIcon
                className="text-light-accent dark:text-dark-accent mb-2"
                sx={{ fontSize: 32 }}
              />
              <div className="flex flex-col items-center gap-1">
                <span className="text-sm text-light-text/70 dark:text-dark-text/70">
                  Scan & Pay
                </span>
                <span className="text-xs text-light-text/50 dark:text-dark-text/50">
                  UPI QR Supported
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Security Badges */}
        <div className="mt-8 flex justify-center items-center gap-6 text-light-text/50 dark:text-dark-text/50">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 1.944a1 1 0 0 1 .993.883l.007.117v1.5a6.5 6.5 0 1 1-2 0v-1.5a1 1 0 0 1 1-1zm0 5.5a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9z"
              />
            </svg>
            <span className="text-sm">Secure Payments</span>
          </div>
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16zm0 14a6 6 0 1 1 0-12 6 6 0 0 1 0 12z"
              />
            </svg>
            <span className="text-sm">End-to-End Encrypted</span>
          </div>
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16zm3.707-9.293a1 1 0 0 0-1.414-1.414L9 10.586 7.707 9.293a1 1 0 0 0-1.414 1.414l2 2a1 1 0 0 0 1.414 0l4-4z"
              />
            </svg>
            <span className="text-sm">PCI DSS Compliant</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Subscriptions;
