import React, { useState } from "react";
import { DateRange } from "react-date-range";
import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";
import { addDays } from "date-fns";
import { enGB } from "date-fns/locale";
import { format } from "date-fns";
import { Button, Chip, CircularProgress } from "@mui/material";
import { CheckCircleOutline } from "@mui/icons-material";
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';

const GoldSubscription = () => {
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

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  // Example steps data
  const steps = [
    {
      label: "Select Date Range",
      description: "Choose your subscription period",
    },
    {
      label: "Referral Code (Optional)",
      description: "Enter a referral code if you have one",
      optional: true
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


  return (
    <div className="p-6 dark:bg-dark-primary bg-light-primary rounded-lg shadow-lg flex flex-col items-center">
      {/* Stepper */}
      <div className="relative w-full max-w-md mx-auto">
        {steps.map((step, index) => (
          <div key={step.label} className="mb-8 relative">
            {/* Vertical line */}
            {index !== steps.length - 1 && (
              <div
                className={`absolute left-4 top-10 w-0.5 h-full 
                  ${
                    index < activeStep
                      ? "bg-blue-500 dark:bg-dark-accent"
                      : "bg-gray-200 dark:bg-gray-700"
                  }`}
              />
            )}

            {/* Step circle */}
            <div className="flex items-start">
              <div className="relative">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center relative z-10
                    ${
                      index <= activeStep
                        ? "bg-blue-500 dark:bg-dark-accent text-white"
                        : "bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                    }`}
                >
                  {index + 1}
                </div>
                  
                  {index === activeStep && activeStep!==0 && (
                    <div className="absolute top-0 right-12 cursor-pointer" onClick={handleGoBack}>
                    <ArrowUpwardIcon sx={{
                      color: "rgb(59, 130, 246)",
                      "&:hover": {
                        color: "rgb(29, 78, 216)"
                      },
                      transition: "colors 0.2s"
                    }} />
                   </div>

                  )}
                {/* L-ripples effect for active step */}
                {index === activeStep && (
                  <div className="absolute top-5 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-0  ">
                    <l-ripples
                      size="70"
                      speed="4"
                      color={`rgba(59, 130, 246, ${
                        index === activeStep ? "0.7" : "0"
                      })`}
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
                  <div className={`mt-4 flex ${activeStep!==index ? 'opacity-30 transition-opacity duration-300 cursor-not-allowed pointer-events-none': ''} `}>
                    <div>
                      <DateRange
                        editableDateInputs={true}
                        onChange={(item) => setDateRange([item.selection])}
                        moveRangeOnFirstSelection={false}
                        ranges={dateRange}
                        minDate={today}
                        showDisabledDates={true}
                        className="date-range-custom dark:bg-dark-secondary bg-white 
                        border dark:border-gray-700 border-gray-200 rounded-lg shadow-lg"
                        rangeColors={["#3b82f6"]}
                        showDateDisplay={true}
                        direction="vertical"
                        scroll={{ enabled: false }}
                        color="#3b82f6"
                        showPreview={true}
                        calendarFocus="forwards"
                        preventSnapRefocus={true}
                        locale={enGB} // Using UK English locale (day/month/year format)
                        dateDisplayFormat="dd/MM/yyyy" // Format for the date display
                        formatDisplayDate={formatDateDisplay} // Custom formatter function
                        inputRanges={[]} // Remove the predefined ranges
                        staticRanges={[]}
                      />
                      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                        Select dates starting from today onwards
                      </p>
                    </div>

                   <div className="flex flex-col ml-4">

                     {/* Date range confirmation section - compact and modern */}
                     <div className=" w-64 bg-white dark:bg-gray-800 rounded-lg  shadow-lg p-4 border border-blue-100 dark:border-gray-700">
                      <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3 pb-2 border-b border-gray-100 dark:border-gray-700">
                        Selected Period
                      </h4>

                      <div className="space-y-5">
                        {/* Date Cards - Compact */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div className="w-2 h-10 bg-blue-500 dark:bg-blue-400 rounded-full mr-2"></div>
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
                            <div className="w-2 h-10 bg-indigo-500 dark:bg-indigo-400 rounded-full mr-2"></div>
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
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                            {Math.ceil(
                              (dateRange[0].endDate - dateRange[0].startDate) /
                                (1000 * 60 * 60 * 24)
                            )}{" "}
                            days
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
                        borderColor: "rgb(59, 130, 246)",
                        color: "rgb(59, 130, 246)",
                        "&:hover": {
                          borderColor: "rgb(37, 99, 235)",
                          backgroundColor: "rgba(59, 130, 246, 0.04)",
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

                {/* Referral code input for second step */}
                {index === 1  && (
                  <div className={`mt-4 max-w-sm ${activeStep!==index ? 'opacity-30 transition-opacity duration-300 cursor-not-allowed pointer-events-none': ''}`}>
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 border border-blue-100 dark:border-gray-700">
                      <div className="space-y-4">
                        <div>
                          <label htmlFor="referralCode" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
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
                            This step is optional. You can skip if you don't have a code.
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
                                backgroundColor: "rgb(59, 130, 246)",
                                "&:hover": {
                                  backgroundColor: "rgb(37, 99, 235)",
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
                      <div className="w-2 h-2 rounded-full bg-blue-500 dark:bg-dark-accent animate-pulse-dot-1" />
                      <div className="w-2 h-2 rounded-full bg-blue-500 dark:bg-dark-accent animate-pulse-dot-2" />
                      <div className="w-2 h-2 rounded-full bg-blue-500 dark:bg-dark-accent animate-pulse-dot-3" />
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

export default GoldSubscription;
