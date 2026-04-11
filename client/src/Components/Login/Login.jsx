import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Image1 from "../../assets/image2.png";
import Image2 from "../../assets/image3.png";
import QRGenerator from "../QRGenerator/QRGenerator";
import OTPInput from "./OTPInput";
import { generateOtpThunk, generateEmailOtpThunk, googleAuthThunk } from "../../redux/thunks/login.thunks";
import { useDispatch, useSelector } from "react-redux";
import { resetTimer, setTimerActive } from "../../redux/actions/login.actions";
import { resetOtpStates } from "../../redux/actions/auth.actions";
import { Tooltip, IconButton } from "@mui/material";
import FeedbackIcon from "@mui/icons-material/Feedback";
import { feedbackClick } from "../../redux/actions";
import SessionLimitModal from "./SessionLimitModal";
import { PhoneInput } from "react-international-phone";
import "react-international-phone/style.css";
import KYFLogo from "../../assets/KYF_Logo.png";

// Google SVG icon
const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 48 48">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
  </svg>
);

function Login({ asModal = false, onClose }) {
  const [activeTab, setActiveTab] = useState(1);
  const [loginMethod, setLoginMethod] = useState("phone"); // "phone" or "email"
  const [phone, setPhone] = useState("");
  const [dialCode, setDialCode] = useState("");
  const [defaultCountry, setDefaultCountry] = useState("in");
  const [emailInput, setEmailInput] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [referenceId, setReferenceId] = useState(null);
  const [smsId, setSmsId] = useState(null);
  const [showUserInfo, setShowUserInfo] = useState(false);

  const dispatch = useDispatch();
  const {
    otpGenerated,
    otpVerified,
    isAlreadyVerified,
    otpVerificationInProgress,
    timer,
    isTimerActive,
  } = useSelector((state) => state.auth);

  // Auto-detect country from IP on mount
  useEffect(() => {
    fetch("https://ipapi.co/json/")
      .then((r) => r.json())
      .then((data) => {
        if (data?.country_code) {
          const detected = data.country_code.toLowerCase();
          if (detected !== defaultCountry) {
            setPhone(""); // Reset so re-mounted PhoneInput starts with correct dial code
            setDialCode("");
          }
          setDefaultCountry(detected);
          console.log("[Login] Auto-detected country:", data.country_code);
        }
      })
      .catch(() => {
        console.log("[Login] Country detection failed, using default: IN");
      });
  }, []);

  // Reset all OTP state on unmount so reopening gives a fresh start
  useEffect(() => {
    return () => {
      dispatch(resetOtpStates());
      dispatch(resetTimer());
      dispatch(setTimerActive(false));
    };
  }, [dispatch]);

  // Validate local digits (after country dial code) — exactly 10 for most countries
  const digitsOnly = phone.replace(/\D/g, "");
  const localDigits = dialCode ? digitsOnly.slice(dialCode.length) : digitsOnly;
  const isPhoneValid = localDigits.length >= 10 && localDigits.length <= 12;

  // Email validation
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput);

  const isInputValid = loginMethod === "phone" ? isPhoneValid : isEmailValid;

  const handleTabClick = (tabNumber) => {
    setActiveTab(tabNumber);
  };

  const handleSubmit = async () => {
    if (!isInputValid) return;
    try {
      let result;
      if (loginMethod === "email") {
        result = await dispatch(generateEmailOtpThunk(emailInput));
      } else {
        result = await dispatch(generateOtpThunk(phone));
      }
      if (result?.success) {
        setReferenceId(result.data?.reference_id);
        setSmsId(result.data?.sms_id);
        setOtpSent(true);
      }
    } catch (error) {
      console.log("error in generating otp", error);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && isInputValid) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Google Sign-In
  const handleGoogleLogin = () => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) {
      console.error("[Login] VITE_GOOGLE_CLIENT_ID not set");
      return;
    }
    if (window.google?.accounts?.id) {
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (response) => {
          if (response.credential) {
            dispatch(googleAuthThunk(response.credential));
          }
        },
      });
      window.google.accounts.id.prompt();
    }
  };

  // Load Google Sign-In SDK
  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) return;
    if (document.getElementById("google-signin-script")) return;
    const script = document.createElement("script");
    script.id = "google-signin-script";
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
  }, []);

  const handleFeedbackClick = () => {
    if (asModal && onClose) {
      onClose();
      // Delay opening feedback so login exit animation plays first
      setTimeout(() => dispatch(feedbackClick(true)), 350);
    } else {
      dispatch(feedbackClick(true));
    }
  };

  const loginContent = (
    <div className={asModal ? "login-card" : "modal"} style={{ position: "relative" }}>
      <SessionLimitModal />
      <form className="flex flex-col h-full overflow-y-auto overflow-x-hidden" onSubmit={(e) => e.preventDefault()}>
        {/* Close button — top-left in modal mode so it doesn't clash with feedback */}
        {asModal && onClose && (
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3 left-3 z-[60] w-8 h-8 rounded-full flex items-center justify-center bg-black/20 hover:bg-black/30 transition-colors"
            aria-label="Close"
          >
            <span className="text-white text-lg font-bold leading-none">&times;</span>
          </button>
        )}

        <div className="banner"></div>
        <div className="flex items-center justify-center gap-2 mb-3">
          <img src={KYFLogo} alt="KYF" className="w-8 h-8 rounded-lg shadow-sm" />
          <label className="title" style={{ color: "#059212", marginBottom: 0 }}>Know Your Fashion</label>
        </div>
        <div className="h-40 sm:h-48">
          <img
            src={activeTab === 1 ? Image1 : Image2}
            alt="Login background"
            className={`w-full h-full object-contain animate__animated ${
              activeTab === 1 ? "animate__flipInY" : "animate__flipInX"
            }`}
          />
        </div>
        <div className="tab-container relative">
          <button
            type="button"
            role="tab"
            className={`tab tab--1 ${activeTab === 1 ? "active" : ""}`}
            onClick={(e) => { e.preventDefault(); handleTabClick(1); }}
          >
            Login
          </button>
          <button
            type="button"
            role="tab"
            className={`tab tab--2 ${activeTab === 2 ? "active" : ""}`}
            onClick={(e) => { e.preventDefault(); handleTabClick(2); }}
          >
            QR
          </button>
          <div className="indicator"></div>
        </div>

        {activeTab === 1 ? (
          <div className="flex flex-col pt-6 sm:pt-10 gap-3 items-center justify-center bg-transparent px-5 sm:px-6 pb-6 z-10 animate__animated animate__fadeIn">
            {!otpGenerated ? (
              <>
                {/* Phone Input */}
                {loginMethod === "phone" && (
                  <div className="w-full max-w-[340px]" onKeyDown={handleKeyDown}>
                    <PhoneInput
                      key={defaultCountry}
                      defaultCountry={defaultCountry}
                      value={phone}
                      forceDialCode
                      onChange={(ph, meta) => {
                        setPhone(ph);
                        if (meta?.country?.dialCode) setDialCode(meta.country.dialCode);
                      }}
                      inputStyle={{ width: "100%", color: "#059212", fontSize: "16px" }}
                      countrySelectorStyleProps={{
                        buttonStyle: {
                          borderRadius: "12px 0 0 12px",
                          borderColor: "rgba(5, 146, 18, 0.3)",
                          backgroundColor: "rgba(155, 236, 0, 0.08)",
                        },
                        dropdownStyleProps: {
                          style: { zIndex: 9999 },
                        },
                      }}
                      style={{
                        "--react-international-phone-border-radius": "12px",
                        "--react-international-phone-border-color": "rgba(5, 146, 18, 0.3)",
                        "--react-international-phone-background-color": "rgba(155, 236, 0, 0.08)",
                        "--react-international-phone-text-color": "#059212",
                        "--react-international-phone-font-size": "16px",
                        "--react-international-phone-height": "46px",
                        "--react-international-phone-country-selector-background-color-hover": "rgba(5, 146, 18, 0.1)",
                        width: "100%",
                      }}
                    />
                    {localDigits.length > 0 && localDigits.length < 10 && (
                      <p className="text-[11px] text-red-500 mt-1 ml-1">
                        Enter at least 10 digits
                      </p>
                    )}
                  </div>
                )}

                {/* Email Input */}
                {loginMethod === "email" && (
                  <div className="w-full max-w-[340px]" onKeyDown={handleKeyDown}>
                    <input
                      type="email"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      placeholder="Enter your email"
                      className="w-full h-[46px] px-4 text-[16px] rounded-xl border border-[rgba(5,146,18,0.3)] bg-[rgba(155,236,0,0.08)] text-[#059212] placeholder-gray-400 focus:outline-none focus:border-[#059212] focus:ring-1 focus:ring-[#059212] transition-colors"
                    />
                    {emailInput.length > 0 && !isEmailValid && (
                      <p className="text-[11px] text-red-500 mt-1 ml-1">
                        Enter a valid email address
                      </p>
                    )}
                  </div>
                )}

                <button
                  type="button"
                  className={`w-full max-w-[340px] py-2.5 rounded-xl text-sm font-bold text-white transition-all ${
                    isInputValid
                      ? "bg-[#059212] hover:bg-[#047a0d] cursor-pointer shadow-md"
                      : "bg-gray-400 cursor-not-allowed"
                  }`}
                  disabled={!isInputValid}
                  onClick={handleSubmit}
                >
                  Submit
                </button>

                {/* Phone/Email toggle */}
                <button
                  type="button"
                  className="text-xs text-[#059212] hover:underline font-medium"
                  onClick={() => {
                    setLoginMethod(loginMethod === "phone" ? "email" : "phone");
                    dispatch(resetOtpStates());
                  }}
                >
                  {loginMethod === "phone" ? "Use email instead" : "Use phone instead"}
                </button>

                {/* Divider */}
                <div className="flex items-center gap-3 w-full max-w-[340px]">
                  <div className="flex-1 h-px bg-gray-300"></div>
                  <span className="text-[10px] text-gray-400 font-medium">OR</span>
                  <div className="flex-1 h-px bg-gray-300"></div>
                </div>

                {/* Google Login */}
                <button
                  type="button"
                  className="w-full max-w-[340px] flex items-center justify-center gap-2.5 py-2.5 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 transition-colors shadow-sm"
                  onClick={handleGoogleLogin}
                >
                  <GoogleIcon />
                  <span className="text-sm font-medium text-gray-700">
                    Continue with Google
                  </span>
                </button>
              </>
            ) : (
              !otpVerified && (
                <OTPInput
                  identifier={loginMethod === "email" ? emailInput : phone}
                  identifierType={loginMethod}
                  referenceId={referenceId}
                  smsId={smsId}
                  setShowUserInfo={setShowUserInfo}
                  timer={timer}
                  isTimerActive={isTimerActive}
                  onResend={handleSubmit}
                />
              )
            )}
          </div>
        ) : (
          <QRGenerator />
        )}

        {/* Feedback Button — top-right, styled like close button for visibility on green banner */}
        <div className="absolute top-3 right-3 z-[60]">
          <Tooltip title="Submit Feedback" arrow>
            <IconButton
              onClick={handleFeedbackClick}
              size="small"
              sx={{
                color: '#fff',
                backgroundColor: 'rgba(0,0,0,0.2)',
                '&:hover': { backgroundColor: 'rgba(0,0,0,0.3)' },
                width: 32,
                height: 32,
              }}
            >
              <FeedbackIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
        </div>
      </form>
    </div>
  );

  if (asModal) {
    return (
      <motion.div
        className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        style={{ backgroundColor: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
      >
        <motion.div
          className="w-full sm:w-auto"
          initial={{ y: 60, opacity: 0, scale: 0.97 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 40, opacity: 0, scale: 0.97 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        >
          {loginContent}
        </motion.div>
      </motion.div>
    );
  }

  return loginContent;
}

export default Login;
