import React, { useEffect, useState } from "react";
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

const Payment = ({ numberOfDays, planColor }) => {
  const [activeStep, setActiveStep] = useState(0);
  const [dateRange, setDateRange] = useState([
    {
      startDate: new Date(),
      endDate: addDays(new Date(), 7),
      key: "selection",
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [referralCode, setReferralCode] = useState("");
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    setDateRange([
      {
        startDate: dateRange[0].startDate,
        endDate: addDays(dateRange[0].startDate, numberOfDays || 7),
        key: "selection",
      },
    ]);
  }, [numberOfDays]);

  // Add this useEffect to check email verification status
  useEffect(() => {
    const verified = localStorage.getItem("isEmailVerified") === "true";
    setIsEmailVerified(verified);
  }, []);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  // Example steps data
  const steps = [
    {
      label: `Select Start Date of (${numberOfDays} days)`,
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
      label: "Payment Details",
      description: "Enter your payment information",
    },
    {
      label: "Confirmation",
      description: "Review and confirm your subscription",
    },
  ];

  // Handle step completion
  const handleStepComplete = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setActiveStep((prevStep) =>
        prevStep < steps.length - 1 ? prevStep + 1 : prevStep
      );
    }, 2000);
  };

  const formatDateDisplay = (date) => {
    if (!date) return "";
    return format(date, "dd/MM/yyyy");
  };

  const formatDateCustom = (date) => {
    if (!date) return "";
    const day = format(date, "dd");
    const month = format(date, "MMM");
    const year = format(date, "yyyy");
    return `${day} ${month} ${year}`;
  };

  const handleSkipStep = () => {
    setActiveStep((prevStep) =>
      prevStep < steps.length - 1 ? prevStep + 1 : prevStep
    );
  };

  const handleGoBack = () => {
    if (activeStep > 0) {
      setActiveStep(activeStep - 1);
    }
  };

  const validateDateRange = (range) => {
    const daysDiff = Math.ceil(
      (range.endDate - range.startDate) / (1000 * 60 * 60 * 24)
    );
    return daysDiff === numberOfDays;
  };

  const handleDateRangeChange = (item) => {
    const newStartDate = item.selection.startDate;
    const newEndDate = addDays(newStartDate, numberOfDays);

    setDateRange([
      {
        startDate: newStartDate,
        endDate: newEndDate,
        key: "selection",
      },
    ]);
  };

  const dateRangeProps = {
    editableDateInputs: false, // Disable manual editing
    onChange: handleDateRangeChange,
    moveRangeOnFirstSelection: true,
    ranges: dateRange,
    minDate: today,
    maxDate: addDays(today, 365), // Optional: limit maximum date
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

  //email validation function
  const validateEmail = (email) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
      setEmailError("Email is required");
      return false;
    }
    if (!regex.test(email)) {
      setEmailError("Please enter a valid email address");
      return false;
    }
    setEmailError("");
    return true;
  };

  // Add handle email change function
  const handleEmailChange = (e) => {
    setEmail(e.target.value);
    if (emailError) validateEmail(e.target.value);
  };

  // Add verify email function
  const handleVerifyEmail = () => {
    if (!validateEmail(email)) return;

    setIsVerifying(true);
    // Simulate email verification process
    setTimeout(() => {
      setIsVerifying(false);
      setIsEmailVerified(true);
      // localStorage.setItem("isEmailVerified", "true");
      // Move to next step after verification
      handleStepComplete();
    }, 2000);
  };

  return (
    <div className="p-6 bg-transparent rounded-lg  flex flex-col items-center">
      {/* Stepper */}
      <div className="relative w-full max-w-md mx-auto">
        {steps.map((step, index) => (
          <div key={step.label} className="mb-8 relative">
            {/* Vertical line */}
            {index !== steps.length - 1 && (
              <div
                className={`absolute left-4 top-10 w-0.5 h-full`}
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
                  className={`w-8 h-8 rounded-full flex items-center justify-center relative z-10`}
                  style={{
                    backgroundColor:
                      index <= activeStep ? planColor : "rgb(229, 231, 235)",
                    color: index <= activeStep ? "white" : "rgb(107, 114, 128)",
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
                        "&:hover": {
                          color: `${planColor}dd`,
                        },
                        transition: "colors 0.2s",
                      }}
                    />
                  </div>
                )}
                {/* L-ripples effect for active step */}
                {index === activeStep && (
                  <div className="absolute top-5 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-0  ">
                    <l-ripples
                      size="70"
                      speed="4"
                      color={`${planColor}b3`}
                      target=".ripple-target"
                      className="pointer-events-none"
                    ></l-ripples>
                  </div>
                )}
              </div>

              {/* Step content */}
              <div className="ml-4">
                <h3 className="font-medium text-gray-900 dark:text-dark-text">
                  {step.label}
                </h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {step.description}
                </p>

                {/* Date Range Picker for first step */}
                {index === 0 && (
                  <div
                    className={`mt-4 flex ${
                      activeStep !== index
                        ? "opacity-30 transition-opacity duration-300 cursor-not-allowed pointer-events-none"
                        : ""
                    } `}
                  >
                    <div>
                      <DateRange {...dateRangeProps} />
                      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                        {`Select start date for your ${numberOfDays}-day subscription`}
                      </p>
                    </div>

                    <div className="flex flex-col ml-4">
                      {/* Date range confirmation section - compact and modern */}
                      <div
                        className=" w-64 bg-white dark:bg-gray-800 rounded-lg   p-4 border border-blue-100 dark:border-gray-700"
                        style={{ borderColor: `${planColor}33` }}
                      >
                        <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3 pb-2 border-b border-gray-100 dark:border-gray-700">
                          Selected Period ({numberOfDays} days)
                        </h4>

                        <div className="space-y-5">
                          {/* Date Cards - Compact */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <div
                                className="w-2 h-10  rounded-full mr-2"
                                style={{ backgroundColor: planColor }}
                              ></div>
                              <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  From
                                </p>
                                <p className="font-bold text-gray-800 dark:text-gray-200">
                                  {format(dateRange[0].startDate, "dd")}
                                  <span className="text-blue-500 dark:text-blue-400">
                                    {" "}
                                    {format(dateRange[0].startDate, "MMM")}{" "}
                                  </span>
                                  {format(dateRange[0].startDate, "yyyy")}
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <div
                                className="w-2 h-10  rounded-full mr-2"
                                style={{ backgroundColor: planColor }}
                              ></div>
                              <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  To
                                </p>
                                <p className="font-bold text-gray-800 dark:text-gray-200">
                                  {format(dateRange[0].endDate, "dd")}
                                  <span className="text-indigo-500 dark:text-indigo-400">
                                    {" "}
                                    {format(dateRange[0].endDate, "MMM")}{" "}
                                  </span>
                                  {format(dateRange[0].endDate, "yyyy")}
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Duration Badge */}
                          <div className="flex justify-center">
                            <span
                              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                              style={{
                                backgroundColor: `${planColor}15`,
                                color: planColor,
                              }}
                            >
                              {numberOfDays} days subscription
                            </span>
                          </div>

                          {/* Confirm Button - Compact */}
                        </div>
                      </div>
                      <Button
                        variant="outlined"
                        onClick={handleStepComplete}
                        startIcon={
                          isLoading ? (
                            <CircularProgress size={16} color="inherit" />
                          ) : (
                            <CheckCircleOutline fontSize="small" />
                          )
                        }
                        sx={{
                          mt: 1,
                          borderColor: planColor,
                          color: planColor,
                          "&:hover": {
                            borderColor: `${planColor}dd`,
                            backgroundColor: `${planColor}0a`,
                          },
                          padding: "6px 12px",
                          borderRadius: "6px",
                          borderWidth: "1.5px",
                          textTransform: "none",
                          fontWeight: 600,
                          fontSize: "0.875rem",
                        }}
                      >
                        {isLoading ? "Processing..." : "Confirm"}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Email Verification Section */}
                {!isEmailVerified && index === 1 && (
                  <div
                    className={`mt-4 max-w-sm ${
                      activeStep !== index
                        ? "opacity-30 transition-opacity duration-300 cursor-not-allowed pointer-events-none"
                        : ""
                    }`}
                  >
                    <div
                      className="rounded-lg shadow-md p-4 border border-blue-100 dark:border-gray-700"
                      style={{ borderColor: `${planColor}33` }}
                    >
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-3">
                          <EmailIcon sx={{ color: planColor }} />
                          <h3 className="font-medium">Verify Your Email</h3>
                        </div>

                        <div>
                          <label
                            htmlFor="email"
                            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                          >
                            Email Address
                          </label>
                          <input
                            type="email"
                            id="email"
                            value={email}
                            onChange={handleEmailChange}
                            onBlur={() => validateEmail(email)}
                            placeholder="Enter your email"
                            className={`w-full px-3 py-2 border rounded-md shadow-sm text-sm focus:outline-none focus:border-2 ${
                              emailError
                                ? "border-red-300 dark:border-red-700 focus:border-red-500"
                                : "border-slate-300 dark:border-slate-700 dark:bg-gray-700 text-slate-500 dark:text-slate-300"
                            }`}
                          />
                          {emailError && (
                            <p className="mt-1 text-xs text-red-500">
                              {emailError}
                            </p>
                          )}
                        </div>

                        <Button
                          variant="contained"
                          fullWidth
                          onClick={handleVerifyEmail}
                          disabled={isVerifying || !!emailError}
                          startIcon={
                            isVerifying ? (
                              <CircularProgress size={16} color="inherit" />
                            ) : (
                              <EmailIcon />
                            )
                          }
                          sx={{
                            backgroundColor: planColor,
                            "&:hover": {
                              backgroundColor: `${planColor}dd`,
                            },
                            "&.Mui-disabled": {
                              backgroundColor: `${planColor}80`,
                            },
                            textTransform: "none",
                            fontWeight: 500,
                            fontSize: "0.875rem",
                          }}
                        >
                          {isVerifying ? "Verifying..." : "Verify Email"}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Referral code input for second step */}
                {((isEmailVerified && index === 1) || (!isEmailVerified && index === 2)) && (
                  <div
                    className={`mt-4 max-w-sm ${
                      activeStep !== index
                        ? "opacity-30 transition-opacity duration-300 cursor-not-allowed pointer-events-none"
                        : ""
                    }`}
                  >
                    <div
                      className=" rounded-lg shadow-md p-4 border border-blue-100 dark:border-gray-700"
                      style={{ borderColor: `${planColor}33` }}
                    >
                      <div className="space-y-4">
                        <div>
                          <label
                            htmlFor="referralCode"
                            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                          >
                            Have a referral code?
                          </label>
                          <input
                            type="text"
                            id="referralCode"
                            value={referralCode}
                            onChange={(e) => setReferralCode(e.target.value)}
                            placeholder="Enter code (if any)"
                            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-md shadow-sm dark:bg-gray-700 text-slate-500 dark:text-slate-300 text-sm focus:outline-none focus:border-2 "
                          />
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            Enter a referral code to get special benefits
                          </p>
                        </div>

                        <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
                          <p className="text-xs text-blue-600 dark:text-blue-400 mb-3">
                            This step is optional. You can skip if you don't
                            have a code.
                          </p>
                          <div className="flex space-x-3">
                            <Button
                              variant="text"
                              onClick={handleSkipStep}
                              sx={{
                                color: "rgb(107, 114, 128)",
                                "&:hover": {
                                  backgroundColor: "rgba(107, 114, 128, 0.04)",
                                },
                                textTransform: "none",
                                fontWeight: 500,
                                fontSize: "0.875rem",
                              }}
                            >
                              Skip
                            </Button>
                            <Button
                              variant="contained"
                              onClick={handleStepComplete}
                              startIcon={
                                isLoading ? (
                                  <CircularProgress size={16} color="inherit" />
                                ) : null
                              }
                              sx={{
                                backgroundColor: planColor,
                                "&:hover": {
                                  backgroundColor: `${planColor}dd`,
                                },
                                textTransform: "none",
                                fontWeight: 500,
                                fontSize: "0.875rem",
                              }}
                            >
                              {isLoading ? "Processing..." : "Confirm"}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Loading indicator for active step */}
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

// Payment.propTypes = {
//   numberOfDays: PropTypes.number.isRequired
// };
export default Payment;
