import React, { useEffect, useState, useRef } from "react";
import { DateRange } from "react-date-range";
import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";
import { addDays } from "date-fns";
import { enGB } from "date-fns/locale";
import { format } from "date-fns";
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
import { showNotification } from "../../../../../redux/actions/notification.actions";
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
//   numberOfDays    (number)  — duration selected by user
//   planColor       (string)  — hex color for this plan tier
//   subscriptionType (string) — "Silver" | "Gold" | "Platinum"
const Payment = ({ numberOfDays, planColor, subscriptionType }) => {
  const dispatch = useDispatch();
  const userInfo = useSelector((state) => state.userInfo?.data || {});

  const [activeStep, setActiveStep] = useState(0);
  const [dateRange, setDateRange] = useState([
    {
      startDate: new Date(),
      endDate: addDays(new Date(), numberOfDays || 7),
      key: "selection",
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [referralCode, setReferralCode] = useState("");

  // Email verification state (checks redux for verified status)
  const isEmailVerified = !!userInfo.isEmailVerified;

  // Payment state
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const [paymentSuccess, setPaymentSuccess] = useState(null); // { providerPaymentId, subscriptionId }

  // Persist subscriptionId across steps (created once, used for order creation)
  const subscriptionIdRef = useRef(null);

  useEffect(() => {
    setDateRange([
      {
        startDate: dateRange[0].startDate,
        endDate: addDays(dateRange[0].startDate, numberOfDays || 7),
        key: "selection",
      },
    ]);
  }, [numberOfDays]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const steps = [
    {
      label: `Select Start Date (${numberOfDays} days)`,
      description: "Select the date you want your subscription to start.",
    },
    ...(!isEmailVerified
      ? [
          {
            label: "Email Verification",
            description: "Verify your email to continue",
            required: true,
          },
        ]
      : []),
    {
      label: "Referral Code (Optional)",
      description: "Enter a referral code if you have one",
      optional: true,
    },
    {
      label: "Payment",
      description: `Pay for your ${subscriptionType || ""} subscription`,
    },
    {
      label: "Confirmation",
      description: "Your subscription is active!",
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

  // ── Date range ──────────────────────────────────────────────────────────────
  const formatDateDisplay = (date) => (date ? format(date, "dd/MM/yyyy") : "");
  const formatDateCustom = (date) => {
    if (!date) return "";
    return `${format(date, "dd")} ${format(date, "MMM")} ${format(date, "yyyy")}`;
  };

  const handleDateRangeChange = (item) => {
    const newStartDate = item.selection.startDate;
    setDateRange([
      {
        startDate: newStartDate,
        endDate: addDays(newStartDate, numberOfDays),
        key: "selection",
      },
    ]);
  };

  const dateRangeProps = {
    editableDateInputs: false,
    onChange: handleDateRangeChange,
    moveRangeOnFirstSelection: true,
    ranges: dateRange,
    minDate: today,
    maxDate: addDays(today, 365),
    className:
      "date-range-custom dark:bg-dark-secondary bg-white border dark:border-gray-700 border-gray-200 rounded-lg shadow-lg",
    rangeColors: [planColor],
    showDateDisplay: true,
    direction: "vertical",
    scroll: { enabled: false },
    color: planColor,
    showPreview: true,
    calendarFocus: "forwards",
    preventSnapRefocus: true,
    locale: enGB,
    dateDisplayFormat: "dd/MM/yyyy",
    formatDisplayDate: formatDateDisplay,
    inputRanges: [],
    staticRanges: [],
    monthDisplayFormat: "MMM yyyy",
    weekdayDisplayFormat: "E",
    dayDisplayFormat: "d",
    weekStartsOn: 1,
    dragSelectionEnabled: false,
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
            numberOfDays,
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

      // Step 2: Create payment order (server returns Razorpay order details)
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

      setPaymentLoading(false); // Popup is taking over — hide our spinner

      // Step 4: Open Razorpay checkout popup
      const rzp = new window.Razorpay({
        key: order.keyId,
        amount: order.amount,           // in paise — display only, not trusted by backend
        currency: order.currency || "INR",
        name: "Know Your Fashion",
        description: `${subscriptionType} Subscription — ${numberOfDays} days`,
        order_id: order.providerOrderId,
        prefill: {
          email: userInfo.email || "",
          contact: userInfo.phone || userInfo.mobNum || "",
          name: userInfo.fullName || "",
        },
        theme: { color: planColor },
        modal: {
          backdropclose: false, // prevent accidental closes
          ondismiss: () => {
            setPaymentError("Payment was cancelled. You can try again.");
            setPaymentLoading(false);
          },
        },
        handler: async (response) => {
          // Razorpay calls this on successful payment
          // response = { razorpay_order_id, razorpay_payment_id, razorpay_signature }
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
            // Advance to confirmation step
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

  // ── Date Summary Card ───────────────────────────────────────────────────────
  const DateSummaryCard = ({ compact = false }) => (
    <div
      className={`${compact ? "w-full" : "w-64"} bg-white dark:bg-gray-800 rounded-lg p-4 border`}
      style={{ borderColor: `${planColor}33` }}
    >
      <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3 pb-2 border-b border-gray-100 dark:border-gray-700">
        Selected Period ({numberOfDays} days)
      </h4>
      <div className="space-y-5">
        {[
          { label: "From", date: dateRange[0].startDate, color: "text-blue-500 dark:text-blue-400" },
          { label: "To", date: dateRange[0].endDate, color: "text-indigo-500 dark:text-indigo-400" },
        ].map(({ label, date, color }) => (
          <div key={label} className="flex items-center">
            <div className="w-2 h-10 rounded-full mr-2" style={{ backgroundColor: planColor }} />
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
              <p className="font-bold text-gray-800 dark:text-gray-200">
                {format(date, "dd")}
                <span className={color}> {format(date, "MMM")} </span>
                {format(date, "yyyy")}
              </p>
            </div>
          </div>
        ))}
        <div className="flex justify-center">
          <span
            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
            style={{ backgroundColor: `${planColor}15`, color: planColor }}
          >
            {numberOfDays} days subscription
          </span>
        </div>
      </div>
    </div>
  );

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

                {/* ── Step 0: Date Picker ── */}
                {index === 0 && (
                  <div
                    className={`mt-4 flex flex-col md:flex-row ${
                      activeStep !== index
                        ? "opacity-30 transition-opacity duration-300 cursor-not-allowed pointer-events-none"
                        : ""
                    }`}
                  >
                    <div className="overflow-x-auto">
                      <DateRange {...dateRangeProps} />
                      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                        {`Select start date for your ${numberOfDays}-day subscription`}
                      </p>
                      {/* Mobile date summary */}
                      <div className="flex flex-col mt-4 md:hidden" style={{ maxWidth: "252px" }}>
                        <DateSummaryCard compact />
                        <Button
                          variant="outlined"
                          fullWidth
                          onClick={handleStepComplete}
                          startIcon={isLoading ? <CircularProgress size={16} color="inherit" /> : <CheckCircleOutline fontSize="small" />}
                          sx={{ mt: 1, borderColor: planColor, color: planColor, "&:hover": { borderColor: `${planColor}dd`, backgroundColor: `${planColor}0a` }, borderRadius: "6px", borderWidth: "1.5px", textTransform: "none", fontWeight: 600, fontSize: "0.875rem" }}
                        >
                          {isLoading ? "Processing..." : "Confirm"}
                        </Button>
                      </div>
                    </div>
                    {/* Desktop date summary */}
                    <div className="hidden md:flex flex-col mt-0 ml-4">
                      <DateSummaryCard />
                      <Button
                        variant="outlined"
                        onClick={handleStepComplete}
                        startIcon={isLoading ? <CircularProgress size={16} color="inherit" /> : <CheckCircleOutline fontSize="small" />}
                        sx={{ mt: 1, borderColor: planColor, color: planColor, "&:hover": { borderColor: `${planColor}dd`, backgroundColor: `${planColor}0a` }, borderRadius: "6px", borderWidth: "1.5px", textTransform: "none", fontWeight: 600, fontSize: "0.875rem" }}
                      >
                        {isLoading ? "Processing..." : "Confirm"}
                      </Button>
                    </div>
                  </div>
                )}

                {/* ── Step: Email Verification (if needed) ── */}
                {!isEmailVerified && steps[index]?.required && (
                  <div
                    className={`mt-4 ${activeStep !== index ? "opacity-30 transition-opacity duration-300 cursor-not-allowed pointer-events-none" : ""}`}
                    style={{ maxWidth: "252px" }}
                  >
                    <div className="md:max-w-sm rounded-lg shadow-md p-4 border" style={{ borderColor: `${planColor}33` }}>
                      <div className="flex items-center gap-2 mb-3">
                        <EmailIcon sx={{ color: planColor }} />
                        <h3 className="font-medium">Email Verified Required</h3>
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

                {/* ── Step: Referral Code ── */}
                {steps[index]?.optional && (
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
                            Enter a referral code to get special benefits
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

                {/* ── Step: Payment ── */}
                {step.label === "Payment" && (
                  <div
                    className={`mt-4 ${activeStep !== index ? "opacity-30 transition-opacity duration-300 cursor-not-allowed pointer-events-none" : ""}`}
                    style={{ maxWidth: "320px" }}
                  >
                    <div className="rounded-lg shadow-md p-4 border" style={{ borderColor: `${planColor}33` }}>
                      {/* Summary */}
                      <div className="mb-4 p-3 rounded-lg" style={{ backgroundColor: `${planColor}10` }}>
                        <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                          {subscriptionType} Subscription
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {numberOfDays} days · starts{" "}
                          {format(dateRange[0].startDate, "dd MMM yyyy")}
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
                        {paymentLoading ? "Processing..." : "Pay Securely"}
                      </Button>
                    </div>
                  </div>
                )}

                {/* ── Step: Confirmation ── */}
                {step.label === "Confirmation" && activeStep === index && (
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
                          <span className="font-medium">Duration:</span> {numberOfDays} days
                        </p>
                        <p>
                          <span className="font-medium">Starts:</span>{" "}
                          {format(dateRange[0].startDate, "dd MMM yyyy")}
                        </p>
                        <p>
                          <span className="font-medium">Ends:</span>{" "}
                          {format(dateRange[0].endDate, "dd MMM yyyy")}
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
