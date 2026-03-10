import { Avatar, Chip } from "@mui/material";
import React, { useEffect, useRef, useState } from "react";
import PersonIcon from "@mui/icons-material/Person";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import { useSubscriptionColors, toRgba } from "../../../../utils/getSubscriptionColors";
import { useSelector, useDispatch } from "react-redux";
import "ldrs/ripples";
import { uploadImage } from "../../../../socket/handleImageUpload";
import { setUserInfo } from "../../../../redux/actions/userInfo.actions";
import { TextField, Button } from "@mui/material";
import EmailIcon from "@mui/icons-material/Email";
import PhoneIcon from "@mui/icons-material/Phone";
import { motion } from "framer-motion";
import { sendEmailOtpThunk, verifyEmailOtpThunk, sendPhoneOtpThunk, verifyPhoneOtpThunk } from "../../../../redux/thunks/userInfo.thunks";
import { showNotification } from "../../../../redux/actions/notification.actions";

function UserInfo() {
  const dispatch = useDispatch();
  const userInfo = useSelector((state) => state.userInfo);
  const colors = useSubscriptionColors();
  const fileInputRef = useRef(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [avatarImage, setAvatarImage] = useState(null);
  const [isImageLoading, setIsImageLoading] = useState(true);
  const [showEmailVerification, setShowEmailVerification] = useState(false);
  const [email, setEmail] = useState(userInfo?.data?.email || "");
  const [emailError, setEmailError] = useState("");
  const [emailOtp, setEmailOtp] = useState("");
  const [emailOtpSent, setEmailOtpSent] = useState(false);
  const [emailOtpRef, setEmailOtpRef] = useState(null); // { referenceId, email }
  const [sendingEmailOtp, setSendingEmailOtp] = useState(false);
  const [verifyingEmailOtp, setVerifyingEmailOtp] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  // Phone verification state
  const [showPhoneVerification, setShowPhoneVerification] = useState(false);
  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpRef, setOtpRef] = useState(null); // { referenceId, mobNum }
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);

  const userData = userInfo?.data || {};
  // First try to get thumbnail (for faster loading), then fallback to full URL
  const userThumbnailUrl = userData?.photo?.thumbnailUrl || null;
  const userFullImageUrl = userData?.photo?.url || null;
  const isDarkMode = document.documentElement.classList.contains('dark');

  const [currentDisplayUrl, setCurrentDisplayUrl] = useState(userThumbnailUrl);

  // If we have both a thumbnail and full image, preload the full image
  useEffect(() => {
    if (
      userThumbnailUrl &&
      userFullImageUrl &&
      userThumbnailUrl !== userFullImageUrl
    ) {
      setIsImageLoading(true);
      setCurrentDisplayUrl(userThumbnailUrl);

      const fullImg = new Image();
      fullImg.onload = () => {
        setCurrentDisplayUrl(userFullImageUrl);
        setIsImageLoading(false);
      };
      fullImg.onerror = () => {
        // Keep using thumbnail if full image fails to load
        setIsImageLoading(false);
      };
      fullImg.src = userFullImageUrl;
    } else if (userFullImageUrl) {
      setCurrentDisplayUrl(userFullImageUrl);
      setIsImageLoading(false);
    } else if (userThumbnailUrl) {
      setCurrentDisplayUrl(userThumbnailUrl);
      setIsImageLoading(false);
    } else {
      setCurrentDisplayUrl(null);
      setIsImageLoading(false);
    }
  }, [userThumbnailUrl, userFullImageUrl]);

  const handleFileUpload = async (file) => {
    if (!file) return;
    let animationInterval;
    try {
      setIsUploading(true);
      setUploadProgress(0);

      // Create a FileReader to preview the image
      const reader = new FileReader();
      reader.onload = (e) => {
        setAvatarImage(e.target.result);
      };
      reader.readAsDataURL(file);

      // Start the animation to smoothly increase progress
      let targetProgress = 0;

      // Function to smoothly animate progress
      const animateProgress = () => {
        animationInterval = setInterval(() => {
          setUploadProgress((prev) => {
            // If we've reached the target, don't increment further
            if (prev >= targetProgress) return prev;
            // If we're getting close to target, slow down
            if (prev >= targetProgress - 5) return prev + 0.5;
            // Normal increment
            return prev + 1;
          });
        }, 100);
      };

      // Start initial animation to 10%
      targetProgress = 10;
      animateProgress();

      // Use the uploadImage function with the progress callback
      const uploadedResponse = await uploadImage(file, (progress) => {
        // Clear existing interval
        clearInterval(animationInterval);

        if (progress === 10) {
          // When upload has started, animate to 99%
          targetProgress = 99;
          animateProgress();
        } else if (progress === 100) {
          // When complete, jump to 100%
          setUploadProgress(100);
          setTimeout(() => {
            setIsUploading(false);
          }, 500); // Short delay to show 100% before hiding
        }
      });

      // Update Redux store with the new photo URLs
      if (uploadedResponse && uploadedResponse.status === "success") {
        const { url, thumbnail_url } = uploadedResponse.data.currentPhoto;

        // Create a new userData object with updated photo
        const updatedUserData = {
          ...userData,
          photo: {
            ...userData.photo,
            url: url,
            thumbnailUrl: thumbnail_url,
          },
        };

        // Update Redux store + localStorage so photo persists across refresh
        dispatch(setUserInfo(updatedUserData));
        localStorage.setItem("userInfo", JSON.stringify(updatedUserData));

        // Set the current display URL to the thumbnail for faster display
        setCurrentDisplayUrl(thumbnail_url);

        // Start the process to load the full image
        if (url !== thumbnail_url) {
          setIsImageLoading(true);
          const fullImg = new Image();
          fullImg.onload = () => {
            setCurrentDisplayUrl(url);
            setIsImageLoading(false);
          };
          fullImg.src = url;
        }

        // Clear the temporary avatar preview since we're now using the uploaded image
        setAvatarImage(null);

        console.log("Avatar updated successfully", uploadedResponse);
      }
    } catch (error) {
      console.error("Upload failed:", error);
      setIsUploading(false);
      setUploadProgress(0);
      clearInterval(animationInterval);
    }
  };

  const renderStatusChip = (label, status, color = "default") => (
    <Chip
      label={`${label}: ${status}`}
      size="small"
      color={color}
      variant="outlined"
      sx={{
        borderColor: colors.fourth,
        color: colors.fourth,
        "& .MuiChip-label": {
          fontSize: "0.75rem",
        },
      }}
    />
  );


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
  
  const handleEmailChange = (e) => {
    setEmail(e.target.value);
    if (emailError) validateEmail(e.target.value);
  };

  const handleSendEmailOtp = async () => {
    if (!validateEmail(email)) return;
    setSendingEmailOtp(true);
    try {
      const result = await dispatch(sendEmailOtpThunk(email));
      if (result.success) {
        setEmailOtpRef({ referenceId: result.referenceId, email: result.email });
        setEmailOtpSent(true);
      }
    } finally {
      setSendingEmailOtp(false);
    }
  };

  const handleVerifyEmailOtp = async () => {
    if (!emailOtpRef) return;
    setVerifyingEmailOtp(true);
    try {
      const result = await dispatch(verifyEmailOtpThunk({
        referenceId: emailOtpRef.referenceId,
        email: emailOtpRef.email,
        otp: emailOtp,
      }));
      if (result.success) {
        setShowEmailVerification(false);
        setEmail(userData.email || "");
        setEmailOtp("");
        setEmailOtpSent(false);
        setEmailOtpRef(null);
      }
    } finally {
      setVerifyingEmailOtp(false);
    }
  };

  const validatePhone = (val) => {
    const digits = val.replace(/\D/g, "");
    if (!digits) { setPhoneError("Phone number is required"); return false; }
    if (digits.length < 10) { setPhoneError("Enter a valid 10-digit phone number"); return false; }
    setPhoneError("");
    return true;
  };

  const handlePhoneChange = (e) => {
    const val = e.target.value.replace(/[^\d+\s-]/g, "");
    setPhone(val);
    if (phoneError) validatePhone(val);
  };

  const handleSendOtp = async () => {
    if (!validatePhone(phone)) return;
    setSendingOtp(true);
    try {
      const result = await dispatch(sendPhoneOtpThunk(phone));
      if (result.success) {
        setOtpRef({ referenceId: result.referenceId, mobNum: result.mobNum });
        setOtpSent(true);
      }
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerifyPhone = async () => {
    if (!otpRef) return;
    setVerifyingOtp(true);
    try {
      const result = await dispatch(verifyPhoneOtpThunk({
        referenceId: otpRef.referenceId,
        mobNum: otpRef.mobNum,
        otp,
      }));
      if (result.success) {
        setShowPhoneVerification(false);
        setPhone("");
        setOtp("");
        setOtpSent(false);
        setOtpRef(null);
      }
    } finally {
      setVerifyingOtp(false);
    }
  };


  // Determine which verification section to show
  const needsEmailVerification = !userData.isEmailVerified;
  const needsPhoneVerification = !userData.isPhoneVerified;

  return (
    <div className="flex flex-col bg-transparent dark:text-dark-text text-light-text h-auto w-full lg:w-[600px] lg:min-w-[400px] rounded-md">
      {/* Desktop: always show full card */}
      <div className="hidden lg:flex lg:flex-col">
        {/* --- Full Profile Card (inlined to prevent focus loss) --- */}
        <div className="w-full flex flex-col justify-center items-start p-4 gap-2 bg-gradient-to-br from-white/10 to-white/5 rounded-lg shadow-md border border-white/20">
          <div className="flex flex-col sm:flex-row justify-start items-center w-full sm:w-auto p-2 gap-4 ">
            <div className="relative w-fit h-fit group">
              {userData.isActive && (
                <div className="absolute top-2 right-2 z-10">
                  <l-ripples size="30" speed="4" color="rgba(34,197,94,1)"></l-ripples>
                </div>
              )}
              <div className="relative">
                <Avatar
                  sx={{
                    width: { xs: 100, sm: 120, md: 150 },
                    height: { xs: 100, sm: 120, md: 150 },
                    margin: "0 auto",
                    background:
                      avatarImage || currentDisplayUrl
                        ? "none"
                        : `linear-gradient(135deg, ${colors.first} 0%, ${colors.second} 50%, ${colors.third} 100%)`,
                    boxShadow: "0 8px 25px 0 rgba(31, 38, 135, 0.20)",
                    filter: isImageLoading ? "blur(5px)" : "none",
                    transition: "filter 0.3s ease-out",
                  }}
                  src={avatarImage || currentDisplayUrl}
                >
                  {!avatarImage && !currentDisplayUrl && (
                    <PersonIcon sx={{ fontSize: { xs: 60, sm: 80, md: 100 }, color: colors.fourth }} />
                  )}
                </Avatar>
                {isImageLoading && !isUploading && currentDisplayUrl && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
                  </div>
                )}
              </div>
              <div
                className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 rounded-full transition-all duration-300 cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <PhotoCameraIcon
                  className="text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  sx={{ fontSize: { xs: 30, sm: 40, md: 50 }, color: colors.first, filter: "drop-shadow(0 0 8px rgba(255,255,255,0.5))" }}
                />
              </div>
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e.target.files?.[0])} />
              {isUploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
                  <div className="text-white font-bold text-lg drop-shadow-glow">{uploadProgress}%</div>
                </div>
              )}
            </div>
            <div className="flex flex-col items-center sm:items-start">
              <h2 className="text-xl sm:text-2xl font-semibold" style={{ color: colors.fourth }}>
                {userData.fullName || "No Name"}
              </h2>
              <div className="mt-2 flex gap-2">
                <Chip
                  label={`Email ${userData.isEmailVerified ? "✓" : "✗"}`}
                  size="small"
                  color={userData.isEmailVerified ? "success" : "default"}
                  variant="filled"
                  sx={{ height: "20px", backgroundColor: userData.isEmailVerified ? undefined : "#6B7280", "& .MuiChip-label": { fontSize: "0.60rem", padding: "0 10px" } }}
                />
                <Chip
                  label={`Phone ${userData.isPhoneVerified ? "✓" : "✗"}`}
                  size="small"
                  color={userData.isPhoneVerified ? "success" : "default"}
                  variant="filled"
                  sx={{ height: "20px", backgroundColor: userData.isPhoneVerified ? undefined : "#6B7280", "& .MuiChip-label": { fontSize: "0.60rem", padding: "0 10px" } }}
                />
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 items-center m-auto">
            <div className="flex items-center">
              {userData.isActive ? (
                <div className="flex items-center gap-1">
                  <l-ripples size="30" speed="4" color="rgba(34,197,94,1)"></l-ripples>
                  <span className="text-green-500 font-medium">Active</span>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-red-500"></div>
                  <span className="text-red-500 font-medium">Inactive</span>
                </div>
              )}
            </div>
            {!userData.isExpert && renderStatusChip("Subscription", userData.subscription?.type || "Free")}
            {renderStatusChip("MFA", userData.isMFAEnabled ? "Enabled" : "Disabled")}
          </div>
        </div>

        {/* Verification section — email or phone */}
        {needsEmailVerification && (
          <div className="mt-2 bg-white/5 backdrop-blur-sm rounded-lg p-2 border border-white/10 shadow-md">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <EmailIcon sx={{ color: colors.fourth }} />
                <h3 className="text-sm font-semibold">Email Verification</h3>
              </div>
              {!showEmailVerification && (
                <Button variant="outlined" size="small" onClick={() => setShowEmailVerification(true)} sx={{ borderColor: colors.fourth, color: colors.fourth, "&:hover": { borderColor: colors.fourth, backgroundColor: toRgba(colors.fourth, 0.1) } }}>
                  Verify Email
                </Button>
              )}
            </div>
            {showEmailVerification && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                {!emailOtpSent ? (
                  <>
                    <TextField
                      fullWidth size="small" variant="outlined" placeholder="Enter your email address"
                      value={email} onChange={handleEmailChange} error={!!emailError} helperText={emailError}
                      InputProps={{ readOnly: !!userData.email }}
                      sx={{
                        "& .MuiOutlinedInput-root": { "& fieldset": { borderColor: toRgba(colors.fourth, 0.5) }, "&:hover fieldset": { borderColor: colors.fourth }, "&.Mui-focused fieldset": { borderColor: colors.fourth }, "& input": { color: isDarkMode ? "#ffffff" : "#000000" } },
                        "& .MuiFormHelperText-root": { color: "error.main" },
                      }}
                    />
                    <div className="flex justify-end gap-2">
                      <Button size="small" onClick={() => { setShowEmailVerification(false); setEmail(userData.email || ""); setEmailError(""); }} sx={{ color: "gray", "&:hover": { backgroundColor: "rgba(0, 0, 0, 0.04)" } }}>Cancel</Button>
                      <Button variant="contained" size="small" onClick={handleSendEmailOtp} disabled={!email || !!emailError || sendingEmailOtp} sx={{ backgroundColor: colors.fourth, "&:hover": { backgroundColor: toRgba(colors.fourth, 0.87) }, "&.Mui-disabled": { backgroundColor: toRgba(colors.fourth, 0.5) } }}>
                        {sendingEmailOtp ? "Sending..." : "Send OTP"}
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-xs dark:text-gray-400 text-gray-500">OTP sent to {email}</p>
                    <TextField
                      fullWidth size="small" variant="outlined" placeholder="Enter 6-digit OTP"
                      value={emailOtp} onChange={(e) => setEmailOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      sx={{
                        "& .MuiOutlinedInput-root": { "& fieldset": { borderColor: toRgba(colors.fourth, 0.5) }, "&:hover fieldset": { borderColor: colors.fourth }, "&.Mui-focused fieldset": { borderColor: colors.fourth }, "& input": { color: isDarkMode ? "#ffffff" : "#000000" } },
                      }}
                    />
                    <div className="flex justify-end gap-2">
                      <Button size="small" onClick={() => { setEmailOtpSent(false); setEmailOtp(""); }} sx={{ color: "gray", "&:hover": { backgroundColor: "rgba(0, 0, 0, 0.04)" } }}>Back</Button>
                      <Button variant="contained" size="small" onClick={handleVerifyEmailOtp} disabled={emailOtp.length !== 6 || verifyingEmailOtp} sx={{ backgroundColor: colors.fourth, "&:hover": { backgroundColor: toRgba(colors.fourth, 0.87) }, "&.Mui-disabled": { backgroundColor: toRgba(colors.fourth, 0.5) } }}>
                        {verifyingEmailOtp ? "Verifying..." : "Verify"}
                      </Button>
                    </div>
                  </>
                )}
              </motion.div>
            )}
          </div>
        )}
        {!needsEmailVerification && needsPhoneVerification && (
          <div className="mt-2 bg-white/5 backdrop-blur-sm rounded-lg p-2 border border-white/10 shadow-md">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <PhoneIcon sx={{ color: colors.fourth }} />
                <h3 className="text-sm font-semibold">Phone Verification</h3>
              </div>
              {!showPhoneVerification && (
                <Button variant="outlined" size="small" onClick={() => setShowPhoneVerification(true)} sx={{ borderColor: colors.fourth, color: colors.fourth, "&:hover": { borderColor: colors.fourth, backgroundColor: toRgba(colors.fourth, 0.1) } }}>
                  Verify Phone
                </Button>
              )}
            </div>
            {showPhoneVerification && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                {!otpSent ? (
                  <>
                    <TextField
                      fullWidth size="small" variant="outlined" placeholder="Enter your phone number (e.g. 9876543210)"
                      value={phone} onChange={handlePhoneChange} error={!!phoneError} helperText={phoneError}
                      sx={{
                        "& .MuiOutlinedInput-root": { "& fieldset": { borderColor: toRgba(colors.fourth, 0.5) }, "&:hover fieldset": { borderColor: colors.fourth }, "&.Mui-focused fieldset": { borderColor: colors.fourth }, "& input": { color: isDarkMode ? "#ffffff" : "#000000" } },
                        "& .MuiFormHelperText-root": { color: "error.main" },
                      }}
                    />
                    <div className="flex justify-end gap-2">
                      <Button size="small" onClick={() => { setShowPhoneVerification(false); setPhone(""); setPhoneError(""); }} sx={{ color: "gray", "&:hover": { backgroundColor: "rgba(0, 0, 0, 0.04)" } }}>Cancel</Button>
                      <Button variant="contained" size="small" onClick={handleSendOtp} disabled={!phone || !!phoneError || sendingOtp} sx={{ backgroundColor: colors.fourth, "&:hover": { backgroundColor: toRgba(colors.fourth, 0.87) }, "&.Mui-disabled": { backgroundColor: toRgba(colors.fourth, 0.5) } }}>
                        {sendingOtp ? "Sending..." : "Send OTP"}
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-xs dark:text-gray-400 text-gray-500">OTP sent to {phone}</p>
                    <TextField
                      fullWidth size="small" variant="outlined" placeholder="Enter 6-digit OTP"
                      value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      sx={{
                        "& .MuiOutlinedInput-root": { "& fieldset": { borderColor: toRgba(colors.fourth, 0.5) }, "&:hover fieldset": { borderColor: colors.fourth }, "&.Mui-focused fieldset": { borderColor: colors.fourth }, "& input": { color: isDarkMode ? "#ffffff" : "#000000" } },
                      }}
                    />
                    <div className="flex justify-end gap-2">
                      <Button size="small" onClick={() => { setOtpSent(false); setOtp(""); }} sx={{ color: "gray", "&:hover": { backgroundColor: "rgba(0, 0, 0, 0.04)" } }}>Back</Button>
                      <Button variant="contained" size="small" onClick={handleVerifyPhone} disabled={otp.length !== 6 || verifyingOtp} sx={{ backgroundColor: colors.fourth, "&:hover": { backgroundColor: toRgba(colors.fourth, 0.87) }, "&.Mui-disabled": { backgroundColor: toRgba(colors.fourth, 0.5) } }}>
                        {verifyingOtp ? "Verifying..." : "Verify"}
                      </Button>
                    </div>
                  </>
                )}
              </motion.div>
            )}
          </div>
        )}

        {/* User Information section */}
        <div className="flex-1 pt-2">
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-white/5 backdrop-blur-sm rounded-lg p-3 hover:bg-white/10 transition-all duration-100 border border-white/10 shadow-md">
              <div className="flex flex-col">
                <span className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Username</span>
                <span className="font-medium text-xs truncate">{userData.username || "N/A"}</span>
              </div>
            </div>
            <div className="bg-white/5 backdrop-blur-sm rounded-lg p-3 hover:bg-white/10 transition-all duration-100 border border-white/10 shadow-md">
              <div className="flex flex-col">
                <span className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Location</span>
                <span className="font-medium text-xs truncate">{userData.city && userData.country ? `${userData.city}, ${userData.country}` : "N/A"}</span>
              </div>
            </div>
            <div className="bg-white/5 backdrop-blur-sm rounded-lg p-3 hover:bg-white/10 transition-all duration-100 border border-white/10 shadow-md">
              <div className="flex flex-col">
                <span className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Contact</span>
                <span className="font-medium text-xs truncate">{userData.phoneNumber || "N/A"}</span>
              </div>
            </div>
            <div className="bg-white/5 backdrop-blur-sm rounded-lg p-3 hover:bg-white/10 transition-all duration-100 border border-white/10 shadow-md">
              <div className="flex flex-col">
                <span className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Member Since</span>
                <span className="font-medium text-xs truncate">{userData.createdAt ? new Date(userData.createdAt).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" }) : "N/A"}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile: compact strip (collapsed) or full card (expanded) */}
      <div className="lg:hidden">
        {isExpanded ? (
          <>
            {/* --- Full Profile Card (mobile expanded, inlined) --- */}
            <div className="w-full flex flex-col justify-center items-start p-4 gap-2 bg-gradient-to-br from-white/10 to-white/5 rounded-lg shadow-md border border-white/20">
              <div className="lg:hidden flex justify-start w-full -mb-2">
                <button onClick={() => setIsExpanded(false)} className="p-1 rounded-full hover:bg-white/10 transition-colors text-gray-400">
                  <KeyboardArrowUpIcon sx={{ fontSize: 20 }} />
                </button>
              </div>
              <div className="flex flex-col sm:flex-row justify-start items-center w-full sm:w-auto p-2 gap-4 ">
                <div className="relative w-fit h-fit group">
                  {userData.isActive && (
                    <div className="absolute top-2 right-2 z-10">
                      <l-ripples size="30" speed="4" color="rgba(34,197,94,1)"></l-ripples>
                    </div>
                  )}
                  <div className="relative">
                    <Avatar
                      sx={{
                        width: { xs: 100, sm: 120, md: 150 },
                        height: { xs: 100, sm: 120, md: 150 },
                        margin: "0 auto",
                        background: avatarImage || currentDisplayUrl ? "none" : `linear-gradient(135deg, ${colors.first} 0%, ${colors.second} 50%, ${colors.third} 100%)`,
                        boxShadow: "0 8px 25px 0 rgba(31, 38, 135, 0.20)",
                        filter: isImageLoading ? "blur(5px)" : "none",
                        transition: "filter 0.3s ease-out",
                      }}
                      src={avatarImage || currentDisplayUrl}
                    >
                      {!avatarImage && !currentDisplayUrl && <PersonIcon sx={{ fontSize: { xs: 60, sm: 80, md: 100 }, color: colors.fourth }} />}
                    </Avatar>
                    {isImageLoading && !isUploading && currentDisplayUrl && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
                      </div>
                    )}
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 rounded-full transition-all duration-300 cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                    <PhotoCameraIcon className="text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" sx={{ fontSize: { xs: 30, sm: 40, md: 50 }, color: colors.first, filter: "drop-shadow(0 0 8px rgba(255,255,255,0.5))" }} />
                  </div>
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e.target.files?.[0])} />
                  {isUploading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
                      <div className="text-white font-bold text-lg drop-shadow-glow">{uploadProgress}%</div>
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-center sm:items-start">
                  <h2 className="text-xl sm:text-2xl font-semibold" style={{ color: colors.fourth }}>
                    {userData.fullName || "No Name"}
                  </h2>
                  <div className="mt-2 flex gap-2">
                    <Chip label={`Email ${userData.isEmailVerified ? "✓" : "✗"}`} size="small" color={userData.isEmailVerified ? "success" : "default"} variant="filled" sx={{ height: "20px", backgroundColor: userData.isEmailVerified ? undefined : "#6B7280", "& .MuiChip-label": { fontSize: "0.60rem", padding: "0 10px" } }} />
                    <Chip label={`Phone ${userData.isPhoneVerified ? "✓" : "✗"}`} size="small" color={userData.isPhoneVerified ? "success" : "default"} variant="filled" sx={{ height: "20px", backgroundColor: userData.isPhoneVerified ? undefined : "#6B7280", "& .MuiChip-label": { fontSize: "0.60rem", padding: "0 10px" } }} />
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 items-center m-auto">
                <div className="flex items-center">
                  {userData.isActive ? (
                    <div className="flex items-center gap-1">
                      <l-ripples size="30" speed="4" color="rgba(34,197,94,1)"></l-ripples>
                      <span className="text-green-500 font-medium">Active</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-red-500"></div>
                      <span className="text-red-500 font-medium">Inactive</span>
                    </div>
                  )}
                </div>
                {!userData.isExpert && renderStatusChip("Subscription", userData.subscription?.type || "Free")}
                {renderStatusChip("MFA", userData.isMFAEnabled ? "Enabled" : "Disabled")}
              </div>
            </div>

            {/* Verification section — email or phone (mobile) */}
            {needsEmailVerification && (
              <div className="mt-2 bg-white/5 backdrop-blur-sm rounded-lg p-2 border border-white/10 shadow-md">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <EmailIcon sx={{ color: colors.fourth }} />
                    <h3 className="text-sm font-semibold">Email Verification</h3>
                  </div>
                  {!showEmailVerification && (
                    <Button variant="outlined" size="small" onClick={() => setShowEmailVerification(true)} sx={{ borderColor: colors.fourth, color: colors.fourth, "&:hover": { borderColor: colors.fourth, backgroundColor: toRgba(colors.fourth, 0.1) } }}>
                      Verify Email
                    </Button>
                  )}
                </div>
                {showEmailVerification && (
                  <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                    {!emailOtpSent ? (
                      <>
                        <TextField
                          fullWidth size="small" variant="outlined" placeholder="Enter your email address"
                          value={email} onChange={handleEmailChange} error={!!emailError} helperText={emailError}
                          sx={{
                            "& .MuiOutlinedInput-root": { "& fieldset": { borderColor: toRgba(colors.fourth, 0.5) }, "&:hover fieldset": { borderColor: colors.fourth }, "&.Mui-focused fieldset": { borderColor: colors.fourth }, "& input": { color: isDarkMode ? "#ffffff" : "#000000" } },
                            "& .MuiFormHelperText-root": { color: "error.main" },
                          }}
                        />
                        <div className="flex justify-end gap-2">
                          <Button size="small" onClick={() => { setShowEmailVerification(false); setEmail(userData.email || ""); setEmailError(""); }} sx={{ color: "gray", "&:hover": { backgroundColor: "rgba(0, 0, 0, 0.04)" } }}>Cancel</Button>
                          <Button variant="contained" size="small" onClick={handleSendEmailOtp} disabled={!email || !!emailError || sendingEmailOtp} sx={{ backgroundColor: colors.fourth, "&:hover": { backgroundColor: toRgba(colors.fourth, 0.87) }, "&.Mui-disabled": { backgroundColor: toRgba(colors.fourth, 0.5) } }}>
                            {sendingEmailOtp ? "Sending..." : "Send OTP"}
                          </Button>
                        </div>
                      </>
                    ) : (
                      <>
                        <p className="text-xs dark:text-gray-400 text-gray-500">OTP sent to {email}</p>
                        <TextField
                          fullWidth size="small" variant="outlined" placeholder="Enter 6-digit OTP"
                          value={emailOtp} onChange={(e) => setEmailOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                          sx={{
                            "& .MuiOutlinedInput-root": { "& fieldset": { borderColor: toRgba(colors.fourth, 0.5) }, "&:hover fieldset": { borderColor: colors.fourth }, "&.Mui-focused fieldset": { borderColor: colors.fourth }, "& input": { color: isDarkMode ? "#ffffff" : "#000000" } },
                          }}
                        />
                        <div className="flex justify-end gap-2">
                          <Button size="small" onClick={() => { setEmailOtpSent(false); setEmailOtp(""); }} sx={{ color: "gray", "&:hover": { backgroundColor: "rgba(0, 0, 0, 0.04)" } }}>Back</Button>
                          <Button variant="contained" size="small" onClick={handleVerifyEmailOtp} disabled={emailOtp.length !== 6 || verifyingEmailOtp} sx={{ backgroundColor: colors.fourth, "&:hover": { backgroundColor: toRgba(colors.fourth, 0.87) }, "&.Mui-disabled": { backgroundColor: toRgba(colors.fourth, 0.5) } }}>
                            {verifyingEmailOtp ? "Verifying..." : "Verify"}
                          </Button>
                        </div>
                      </>
                    )}
                  </motion.div>
                )}
              </div>
            )}
            {!needsEmailVerification && needsPhoneVerification && (
              <div className="mt-2 bg-white/5 backdrop-blur-sm rounded-lg p-2 border border-white/10 shadow-md">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <PhoneIcon sx={{ color: colors.fourth }} />
                    <h3 className="text-sm font-semibold">Phone Verification</h3>
                  </div>
                  {!showPhoneVerification && (
                    <Button variant="outlined" size="small" onClick={() => setShowPhoneVerification(true)} sx={{ borderColor: colors.fourth, color: colors.fourth, "&:hover": { borderColor: colors.fourth, backgroundColor: toRgba(colors.fourth, 0.1) } }}>
                      Verify Phone
                    </Button>
                  )}
                </div>
                {showPhoneVerification && (
                  <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                    {!otpSent ? (
                      <>
                        <TextField
                          fullWidth size="small" variant="outlined" placeholder="Enter your phone number (e.g. 9876543210)"
                          value={phone} onChange={handlePhoneChange} error={!!phoneError} helperText={phoneError}
                          sx={{
                            "& .MuiOutlinedInput-root": { "& fieldset": { borderColor: toRgba(colors.fourth, 0.5) }, "&:hover fieldset": { borderColor: colors.fourth }, "&.Mui-focused fieldset": { borderColor: colors.fourth }, "& input": { color: isDarkMode ? "#ffffff" : "#000000" } },
                            "& .MuiFormHelperText-root": { color: "error.main" },
                          }}
                        />
                        <div className="flex justify-end gap-2">
                          <Button size="small" onClick={() => { setShowPhoneVerification(false); setPhone(""); setPhoneError(""); }} sx={{ color: "gray", "&:hover": { backgroundColor: "rgba(0, 0, 0, 0.04)" } }}>Cancel</Button>
                          <Button variant="contained" size="small" onClick={handleSendOtp} disabled={!phone || !!phoneError || sendingOtp} sx={{ backgroundColor: colors.fourth, "&:hover": { backgroundColor: toRgba(colors.fourth, 0.87) }, "&.Mui-disabled": { backgroundColor: toRgba(colors.fourth, 0.5) } }}>
                            {sendingOtp ? "Sending..." : "Send OTP"}
                          </Button>
                        </div>
                      </>
                    ) : (
                      <>
                        <p className="text-xs dark:text-gray-400 text-gray-500">OTP sent to {phone}</p>
                        <TextField
                          fullWidth size="small" variant="outlined" placeholder="Enter 6-digit OTP"
                          value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                          sx={{
                            "& .MuiOutlinedInput-root": { "& fieldset": { borderColor: toRgba(colors.fourth, 0.5) }, "&:hover fieldset": { borderColor: colors.fourth }, "&.Mui-focused fieldset": { borderColor: colors.fourth }, "& input": { color: isDarkMode ? "#ffffff" : "#000000" } },
                          }}
                        />
                        <div className="flex justify-end gap-2">
                          <Button size="small" onClick={() => { setOtpSent(false); setOtp(""); }} sx={{ color: "gray", "&:hover": { backgroundColor: "rgba(0, 0, 0, 0.04)" } }}>Back</Button>
                          <Button variant="contained" size="small" onClick={handleVerifyPhone} disabled={otp.length !== 6 || verifyingOtp} sx={{ backgroundColor: colors.fourth, "&:hover": { backgroundColor: toRgba(colors.fourth, 0.87) }, "&.Mui-disabled": { backgroundColor: toRgba(colors.fourth, 0.5) } }}>
                            {verifyingOtp ? "Verifying..." : "Verify"}
                          </Button>
                        </div>
                      </>
                    )}
                  </motion.div>
                )}
              </div>
            )}

            {/* User Information section (mobile) */}
            <div className="flex-1 pt-2">
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-white/5 backdrop-blur-sm rounded-lg p-3 hover:bg-white/10 transition-all duration-100 border border-white/10 shadow-md">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Username</span>
                    <span className="font-medium text-xs truncate">{userData.username || "N/A"}</span>
                  </div>
                </div>
                <div className="bg-white/5 backdrop-blur-sm rounded-lg p-3 hover:bg-white/10 transition-all duration-100 border border-white/10 shadow-md">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Location</span>
                    <span className="font-medium text-xs truncate">{userData.city && userData.country ? `${userData.city}, ${userData.country}` : "N/A"}</span>
                  </div>
                </div>
                <div className="bg-white/5 backdrop-blur-sm rounded-lg p-3 hover:bg-white/10 transition-all duration-100 border border-white/10 shadow-md">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Contact</span>
                    <span className="font-medium text-xs truncate">{userData.phoneNumber || "N/A"}</span>
                  </div>
                </div>
                <div className="bg-white/5 backdrop-blur-sm rounded-lg p-3 hover:bg-white/10 transition-all duration-100 border border-white/10 shadow-md">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Member Since</span>
                    <span className="font-medium text-xs truncate">{userData.createdAt ? new Date(userData.createdAt).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" }) : "N/A"}</span>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          /* --- Compact Profile Strip (mobile collapsed, inlined) --- */
          <div
            className="lg:hidden flex items-center gap-3 p-3 bg-gradient-to-br from-white/10 to-white/5 rounded-lg shadow-md border border-white/20 cursor-pointer"
            onClick={() => setIsExpanded(true)}
          >
            <KeyboardArrowDownIcon className="text-gray-400" sx={{ fontSize: 20 }} />
            <Avatar
              sx={{ width: 40, height: 40, background: avatarImage || currentDisplayUrl ? "none" : `linear-gradient(135deg, ${colors.first} 0%, ${colors.second} 50%, ${colors.third} 100%)` }}
              src={avatarImage || currentDisplayUrl}
            >
              {!avatarImage && !currentDisplayUrl && <PersonIcon sx={{ fontSize: 24, color: colors.fourth }} />}
            </Avatar>
            <div className="flex-1 min-w-0">
              <h2 className="text-sm font-semibold truncate" style={{ color: colors.fourth }}>{userData.fullName || "No Name"}</h2>
              <div className="flex items-center gap-2 mt-0.5">
                {userData.isActive ? (
                  <span className="text-[10px] text-green-500 font-medium flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block"></span>Active</span>
                ) : (
                  <span className="text-[10px] text-red-500 font-medium flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block"></span>Inactive</span>
                )}
                <span className="text-[10px] text-gray-400">{userData.isExpert ? "Expert" : "User"}</span>
                {!userData.isExpert && <span className="text-[10px] text-gray-400">{userData.subscription?.type || "Free"}</span>}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default UserInfo;
