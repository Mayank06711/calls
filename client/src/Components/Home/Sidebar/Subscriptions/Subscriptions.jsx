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
import {useNavigate } from "react-router-dom";

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
    CASUAL: COLORS.CASUAL,
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

  const transformedPlanHeaders = plans
    ?.map((plan) => ({
      type: plan.type.toUpperCase(),
      name: plan.type,
      price: `₹${plan.price}`,
      recommended: plan.type === "Gold", // Keep the same recommendation logic
      duration: plan.duration,
      features: plan.features,
      limits: plan.limits,
    }))
    .sort((a, b) => {
      const planOrder = {
        PLATINUM: 4,
        GOLD: 3,
        SILVER: 2,
        FREE: 1,
      };
      return planOrder[a.type] - planOrder[b.type];
    });

  const getAllFeatures = () => {
    if (!plans) return []; // Return empty array if no plans

    const sortedPlans = [...plans].sort((a, b) => {
      const planOrder = {
        Platinum: 4,
        Gold: 3,
        Silver: 2,
        Free: 1,
      };
      return planOrder[a.type] - planOrder[b.type];
    });

    // Get all unique features
    const allFeatures = new Set();
    sortedPlans.forEach((plan) => {
      plan.features.forEach((feature) => allFeatures.add(feature));
    });

    // Transform to required format
    return Array.from(allFeatures).map((feature) => ({
      name: feature,
      platinum:
        sortedPlans
          .find((p) => p.type === "Platinum")
          ?.features.includes(feature) || false,
      gold:
        sortedPlans
          .find((p) => p.type === "Gold")
          ?.features.includes(feature) || false,
      silver:
        sortedPlans
          .find((p) => p.type === "Silver")
          ?.features.includes(feature) || false,
      free:
        sortedPlans
          .find((p) => p.type === "Free")
          ?.features.includes(feature) || false,
    }));
  };

  const dynamicFeatures = getAllFeatures();

  const handleSubscriptionSelect = (planType) => {
    console.log("plaaaaaaaaaaaaan type", planType);
    const routeMap = {
      'PLATINUM': 'platinum',
      'GOLD': 'gold',
      'SILVER': 'silver',
    };

    const route = routeMap[planType];
    if (route) {
      navigate(`/subscriptions/${route}`, { replace: true });
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
      {loaders[LOADER_TYPES.SUBSCRIPTION_GET_PLANS] && !plans ? (
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
              {transformedPlanHeaders.map((plan, index) => (
                <th
                  key={plan.type}
                  className={`p-3 text-center text-light-text dark:text-dark-text 
                  font-bold bg-slate-200 dark:bg-slate-700
                  ${
                    index === transformedPlanHeaders.length - 1
                      ? "rounded-tr-xl"
                      : ""
                  }
                  ${getColumnStyle(plan.type)}`}
                >
                  <div className="flex flex-col gap-1 py-2">
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
                      <span className="text-xs opacity-75">
                        {plan.duration} days
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dynamicFeatures.map((feature, index) => (
              <tr key={index}>
                <td
                  className="p-3 text-left font-medium text-light-text dark:text-dark-text
                bg-light-primary dark:bg-dark-primary"
                >
                  {feature.name}
                </td>
                {transformedPlanHeaders.map((plan) => (
                  <td
                    key={plan.type}
                    className={`p-3 text-center rounded-sm bg-light-primary dark:bg-dark-primary
                    ${getColumnStyle(plan.type)}`}
                  >
                    {feature[plan.type.toLowerCase()] ? (
                      <CheckIcon
                        sx={{ fontSize: "2rem", fontWeight: "bold" }}
                        style={{
                          color: subscriptionColors[plan.type]?.fourth,
                        }}
                      />
                    ) : (
                      <CloseIcon
                        sx={{
                          fontSize: "1.25rem",
                          opacity: 0.3,
                          color: "var(--light-text)",
                          ".dark &": { color: "var(--dark-text)" },
                        }}
                      />
                    )}
                  </td>
                ))}
              </tr>
            ))}
            {/* Limits Section */}
            {plans && (
              <>
                <tr>
                  <td
                    colSpan={transformedPlanHeaders.length + 1}
                    className="p-3 font-bold text-light-text dark:text-dark-text
                    bg-light-primary dark:bg-dark-primary"
                  >
                    Usage Limits
                  </td>
                </tr>
                {Object.keys(plans[0].limits).map((limitKey, index) => (
                  <tr key={`limit-${index}`}>
                    <td
                      className="p-3 text-left font-medium text-light-text dark:text-dark-text
                      bg-light-primary dark:bg-dark-primary"
                    >
                      {limitKey.replace(/([A-Z])/g, " $1").trim()}{" "}
                      {/* Format camelCase to spaces */}
                    </td>
                    {transformedPlanHeaders.map((plan) => {
                      const planData = plans.find((p) => p.type === plan.name);
                      const limitValue = planData?.limits[limitKey];
                      return (
                        <td
                          key={plan.type}
                          className={`p-3 text-center rounded-sm bg-light-primary dark:bg-dark-primary
                            ${getColumnStyle(plan.type)}`}
                        >
                          <span
                            style={{
                              color: subscriptionColors[plan.type]?.fourth,
                            }}
                          >
                            {limitValue === -1 ? "Unlimited" : limitValue}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </>
            )}
            <tr>
              <td className="p-3 bg-light-primary dark:bg-dark-primary rounded-bl-xl"></td>
              {transformedPlanHeaders.map((plan, index) => (
                <td
                  key={plan.type}
                  className={`p-6 bg-light-primary dark:bg-dark-primary
                  ${
                    index === transformedPlanHeaders.length - 1
                      ? "rounded-br-xl"
                      : ""
                  }
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

// const planHeaders = [
//   {
//     type: "CASUAL",
//     name: "Available for everyone",
//     price: "Free",
//     recommended: false,
//   },
//   { type: "GOLD", name: "Gold", price: "$29", recommended: false },
//   { type: "SILVER", name: "Silver", price: "$49", recommended: true },
//   { type: "PLATINUM", name: "Platinum", price: "$99", recommended: false },
// ];

// const subscriptionFeatures = [
//   {
//     name: "Unlimited Access",
//     casual: false,
//     gold: true,
//     silver: true,
//     platinum: true,
//   },
//   {
//     name: "24/7 Support",
//     casual: false,
//     gold: false,
//     silver: true,
//     platinum: true,
//   },
//   {
//     name: "Analytics",
//     casual: false,
//     gold: true,
//     silver: true,
//     platinum: true,
//   },
//   {
//     name: "Custom Integration",
//     casual: false,
//     gold: false,
//     silver: true,
//     platinum: true,
//   },
//   {
//     name: "100GB Cloud Storage",
//     casual: true,
//     gold: true,
//     silver: true,
//     platinum: true,
//   },
//   {
//     name: "Full API Access",
//     casual: false,
//     gold: false,
//     silver: false,
//     platinum: true,
//   },
//   {
//     name: "Team Management",
//     casual: false,
//     gold: true,
//     silver: true,
//     platinum: true,
//   },
//   {
//     name: "Custom Reports",
//     casual: false,
//     gold: false,
//     silver: true,
//     platinum: true,
//   },
//   {
//     name: "Automated Backups",
//     casual: true,
//     gold: true,
//     silver: true,
//     platinum: true,
//   },
//   {
//     name: "Premium Templates",
//     casual: false,
//     gold: true,
//     silver: true,
//     platinum: true,
//   },
//   {
//     name: "Advanced Security",
//     casual: false,
//     gold: false,
//     silver: true,
//     platinum: true,
//   },
// ];
export default Subscriptions;
