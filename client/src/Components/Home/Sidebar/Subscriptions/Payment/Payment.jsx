import React, { useState, useRef } from "react";
import { Button, Chip, CircularProgress } from "@mui/material";
import { CheckCircleOutline } from "@mui/icons-material";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import EmailIcon from "@mui/icons-material/Email";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import PaymentIcon from "@mui/icons-material/Payment";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import { useDispatch, useSelector } from "react-redux";
import { makeRequest } from "../../../../../utils/apiHandlers";
import { HTTP_METHODS, ENDPOINTS } from "../../../../../constants/apiEndpoints";
import {
  createPaymentOrderThunk,
  verifyPaymentThunk,
} from "../../../../../redux/thunks/payment.thunks";

// ─── Load Razorpay checkout script dynamically ────────────────────────────────
const loadRazorpayScript = () =>
  new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

// ─── Payment Component ────────────────────────────────────────────────────────
// Props:
//   planColor         (string) — hex color for this plan tier
//   subscriptionType  (string) — "Silver" | "Gold" | "Platinum"
//   creditsGranted    (number) — credits included in the plan
//   tierDurationDays  (number) — days of tier benefits (e.g. 30)
//   price             (number) — flat price in INR (e.g. 499)
const Payment = ({ planColor, subscriptionType, creditsGranted, tierDurationDays, price }) => {
  const dispatch = useDispatch();
  const userInfo = useSelector((state) => state.userInfo?.data || {});

  const [activeStep, setActiveStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [referralCode, setReferralCode] = useState("");

  // Email verification state
  const isEmailVerified = !!userInfo.isEmailVerified;

  // Payment state
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const [paymentSuccess, setPaymentSuccess] = useState(null);

  // Persist subscriptionId across steps
  const subscriptionIdRef = useRef(null);

  const steps = [
    ...(!isEmailVerified
      ? [
          {
            label: "Email Verification",
            description: "Verify your email to continue",
            stepType: "email",
          },
        ]
      : []),
    {
      label: "Referral Code (Optional)",
      description: "Enter a referral code for bonus credits",
      stepType: "referral",
    },
    {
      label: "Payment",
      description: `Pay ₹${price} for ${subscriptionType} plan`,
      stepType: "payment",
    },
    {
      label: "Confirmation",
      description: "Your subscription is active!",
      stepType: "confirmation",
    },
  ];

  // ── Step navigation ─────────────────────────────────────────────────────────
  const handleStepComplete = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setActiveStep((prev) => (prev < steps.length - 1 ? prev + 1 : prev));
    }, 400);
  };

  const handleSkipStep = () => {
    setActiveStep((prev) => (prev < steps.length - 1 ? prev + 1 : prev));
  };

  const handleGoBack = () => {
    if (activeStep > 0) setActiveStep(activeStep - 1);
  };

  // ── Payment: create subscription + order + open Razorpay ───────────────────
  const handlePay = async () => {
    setPaymentError("");
    setPaymentLoading(true);

    try {
      // Step 1: Create subscription (if not already created)
      let subscriptionId = subscriptionIdRef.current;

      if (!subscriptionId) {
        const subRes = await makeRequest(
          HTTP_METHODS.POST,
          ENDPOINTS.SUBCRIPTIONS.CREATE_SUBSCRIPTION,
          {
            type: subscriptionType,
            ...(referralCode && { referralCode }),
          }
        );

        if (subRes.error) {
          setPaymentError(subRes.error.message || "Failed to create subscription");
          setPaymentLoading(false);
          return;
        }

        subscriptionId = subRes.data?.data?._id;
        subscriptionIdRef.current = subscriptionId;

        if (!subscriptionId) {
          setPaymentError("Subscription creation failed — no ID returned");
          setPaymentLoading(false);
          return;
        }
      }

      // Step 2: Create payment order
      const orderRes = await dispatch(createPaymentOrderThunk(subscriptionId));
      if (!orderRes.success) {
        setPaymentError(orderRes.error || "Failed to create payment order");
        setPaymentLoading(false);
        return;
      }

      const order = orderRes.order;

      // Step 3: Load Razorpay checkout script
      const loaded = await loadRazorpayScript();
      if (!loaded) {
        setPaymentError("Failed to load payment gateway. Check your connection and try again.");
        setPaymentLoading(false);
        return;
      }

      setPaymentLoading(false);

      // Step 4: Open Razorpay checkout popup
      const rzp = new window.Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency || "INR",
        name: "Know Your Fashion",
        description: `${subscriptionType} — ${creditsGranted?.toLocaleString()} credits`,
        order_id: order.providerOrderId,
        prefill: {
          email: userInfo.email || "",
          contact: userInfo.phone || userInfo.mobNum || "",
          name: userInfo.fullName || "",
        },
        theme: { color: planColor },
        modal: {
          backdropclose: false,
          ondismiss: () => {
            setPaymentError("Payment was cancelled. You can try again.");
            setPaymentLoading(false);
          },
        },
        handler: async (response) => {
          setPaymentLoading(true);
          setPaymentError("");

          const verifyRes = await dispatch(
            verifyPaymentThunk({
              providerOrderId: response.razorpay_order_id,
              providerPaymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature,
            })
          );

          setPaymentLoading(false);

          if (verifyRes.success) {
            setPaymentSuccess({
              providerPaymentId: response.razorpay_payment_id,
              subscriptionId: verifyRes.result?.subscriptionId,
            });
            setActiveStep(steps.length - 1);
          } else {
            setPaymentError(
              verifyRes.error ||
                "Payment recorded but verification failed. Contact support with your payment ID: " +
                  response.razorpay_payment_id
            );
          }
        },
      });

      rzp.open();
    } catch (err) {
      setPaymentError(err.message || "Payment failed. Please try again.");
      setPaymentLoading(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 bg-transparent rounded-lg flex flex-col items-center">
      <div className="relative w-full max-w-md mx-auto">
        {steps.map((step, index) => (
          <div key={step.label} className="mb-8 relative">
            {/* Vertical connector line */}
            {index !== steps.length - 1 && (
              <div
                className="absolute left-4 top-10 w-0.5 h-full"
                style={{
                  backgroundColor:
                    index < activeStep ? planColor : "rgb(229, 231, 235)",
                }}
              />
            )}

            {/* Step circle */}
            <div className="flex items-start">
              <div className="relative">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center relative z-10"
                  style={{
                    backgroundColor:
                      index <= activeStep ? planColor : "rgb(229, 231, 235)",
                    color:
                      index <= activeStep ? "white" : "rgb(107, 114, 128)",
                  }}
                >
                  {index + 1}
                </div>
                {index === activeStep && activeStep !== 0 && (
                  <div
                    className="absolute top-0 right-12 cursor-pointer"
                    onClick={handleGoBack}
                  >
                    <ArrowUpwardIcon
                      sx={{
                        color: planColor,
                        "&:hover": { color: `${planColor}dd` },
                        transition: "colors 0.2s",
                      }}
                    />
                  </div>
                )}
                {index === activeStep && (
                  <div className="absolute top-5 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-0">
                    <l-ripples size="70" speed="4" color={`${planColor}b3`} />
                  </div>
                )}
              </div>

              {/* Step content */}
              <div className="ml-4 w-full">
                <h3 className="font-medium text-gray-900 dark:text-dark-text">
                  {step.label}
                </h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {step.description}
                </p>

                {/* ── Email Verification ── */}
                {step.stepType === "email" && (
                  <div
                    className={`mt-4 ${activeStep !== index ? "opacity-30 transition-opacity duration-300 cursor-not-allowed pointer-events-none" : ""}`}
                    style={{ maxWidth: "252px" }}
                  >
                    <div className="md:max-w-sm rounded-lg shadow-md p-4 border" style={{ borderColor: `${planColor}33` }}>
                      <div className="flex items-center gap-2 mb-3">
                        <EmailIcon sx={{ color: planColor }} />
                        <h3 className="font-medium">Email Verification Required</h3>
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                        Please verify your email from your profile before making a payment.
                      </p>
                      <Button
                        variant="contained"
                        fullWidth
                        onClick={handleStepComplete}
                        sx={{ backgroundColor: planColor, "&:hover": { backgroundColor: `${planColor}dd` }, textTransform: "none" }}
                      >
                        I've Verified My Email
                      </Button>
                    </div>
                  </div>
                )}

                {/* ── Referral Code ── */}
                {step.stepType === "referral" && (
                  <div
                    className={`mt-4 ${activeStep !== index ? "opacity-30 transition-opacity duration-300 cursor-not-allowed pointer-events-none" : ""}`}
                    style={{ maxWidth: "252px" }}
                  >
                    <div className="md:max-w-sm rounded-lg shadow-md p-4 border" style={{ borderColor: `${planColor}33` }}>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Have a referral code?
                          </label>
                          <input
                            type="text"
                            value={referralCode}
                            onChange={(e) => setReferralCode(e.target.value)}
                            placeholder="Enter code (if any)"
                            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-md shadow-sm dark:bg-gray-700 text-slate-500 dark:text-slate-300 text-sm focus:outline-none focus:border-2"
                          />
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            Get bonus credits with a valid referral code
                          </p>
                        </div>
                        <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
                          <p className="text-xs text-blue-600 dark:text-blue-400 mb-3">
                            This step is optional. You can skip if you don't have a code.
                          </p>
                          <div className="flex space-x-3">
                            <Button
                              variant="text"
                              onClick={handleSkipStep}
                              sx={{ color: "rgb(107, 114, 128)", "&:hover": { backgroundColor: "rgba(107, 114, 128, 0.04)" }, textTransform: "none", fontSize: "0.875rem" }}
                            >
                              Skip
                            </Button>
                            <Button
                              variant="contained"
                              onClick={handleStepComplete}
                              sx={{ backgroundColor: planColor, "&:hover": { backgroundColor: `${planColor}dd` }, textTransform: "none", fontSize: "0.875rem" }}
                            >
                              Confirm
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Payment ── */}
                {step.stepType === "payment" && (
                  <div
                    className={`mt-4 ${activeStep !== index ? "opacity-30 transition-opacity duration-300 cursor-not-allowed pointer-events-none" : ""}`}
                    style={{ maxWidth: "320px" }}
                  >
                    <div className="rounded-lg shadow-md p-4 border" style={{ borderColor: `${planColor}33` }}>
                      {/* Summary */}
                      <div className="mb-4 p-3 rounded-lg" style={{ backgroundColor: `${planColor}10` }}>
                        <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                          {subscriptionType} Plan
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          ₹{price} · {creditsGranted?.toLocaleString()} credits · {tierDurationDays} days premium
                        </p>
                        {referralCode && (
                          <Chip
                            label={`Referral: ${referralCode}`}
                            size="small"
                            sx={{ mt: 1, backgroundColor: `${planColor}20`, color: planColor }}
                          />
                        )}
                      </div>

                      {/* Error message */}
                      {paymentError && (
                        <div className="mb-3 flex items-start gap-2 p-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                          <ErrorOutlineIcon sx={{ color: "rgb(239 68 68)", fontSize: 18, mt: 0.2 }} />
                          <p className="text-xs text-red-600 dark:text-red-400">{paymentError}</p>
                        </div>
                      )}

                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                        Secure payment powered by Razorpay. Your card details are never stored on our servers.
                      </p>

                      <Button
                        variant="contained"
                        fullWidth
                        onClick={handlePay}
                        disabled={paymentLoading}
                        startIcon={
                          paymentLoading ? (
                            <CircularProgress size={16} color="inherit" />
                          ) : (
                            <PaymentIcon />
                          )
                        }
                        sx={{
                          backgroundColor: planColor,
                          "&:hover": { backgroundColor: `${planColor}dd` },
                          "&.Mui-disabled": { backgroundColor: `${planColor}80` },
                          textTransform: "none",
                          fontWeight: 600,
                          fontSize: "0.9rem",
                          py: 1.2,
                        }}
                      >
                        {paymentLoading ? "Processing..." : `Pay ₹${price}`}
                      </Button>
                    </div>
                  </div>
                )}

                {/* ── Confirmation ── */}
                {step.stepType === "confirmation" && activeStep === index && (
                  <div className="mt-4" style={{ maxWidth: "320px" }}>
                    <div className="rounded-lg shadow-md p-4 border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20">
                      <div className="flex items-center gap-3 mb-3">
                        <CheckCircleIcon sx={{ color: "rgb(34 197 94)", fontSize: 32 }} />
                        <div>
                          <p className="font-bold text-green-700 dark:text-green-400">
                            Payment Successful!
                          </p>
                          <p className="text-xs text-green-600 dark:text-green-500">
                            Your subscription is now active
                          </p>
                        </div>
                      </div>
                      <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
                        <p>
                          <span className="font-medium">Plan:</span> {subscriptionType}
                        </p>
                        <p>
                          <span className="font-medium">Credits Added:</span> {creditsGranted?.toLocaleString()}
                        </p>
                        <p>
                          <span className="font-medium">Premium Until:</span>{" "}
                          {new Date(Date.now() + (tierDurationDays || 30) * 86400000).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                        </p>
                        {paymentSuccess?.providerPaymentId && (
                          <p className="font-mono text-gray-400 break-all">
                            <span className="font-medium not-italic">Ref:</span>{" "}
                            {paymentSuccess.providerPaymentId}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Processing dots */}
                {activeStep === index && isLoading && (
                  <div className="mt-4 flex items-center">
                    <div className="flex space-x-1">
                      {[1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className={`w-2 h-2 rounded-full animate-pulse-dot-${i}`}
                          style={{ backgroundColor: planColor }}
                        />
                      ))}
                    </div>
                    <span className="ml-3 text-sm text-gray-500 dark:text-gray-400">
                      Processing...
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Payment;
