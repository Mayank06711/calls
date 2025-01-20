import React, { useState,useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { generateOtpThunk } from "../../redux/thunks/login.thunks";
import { decrementTimer,resetTimer,setTimerActive, showNotification } from "../../redux/actions";

function OTPInput({phoneNumber}) {
  const [otp, setOtp] = useState(new Array(6).fill("")); // State for 6 digits
  const timer = useSelector(state => state.auth.otpTimer); // Timer for resend functionality
  const isTimerActive = useSelector(state => state.auth.isTimerActive);
  const dispatch = useDispatch();

  // Handle OTP input
  const handleChange = (e, index) => {
    const value = e.target.value;
    if (/^\d$/.test(value)) {
      const newOtp = [...otp];
      newOtp[index] = value;
      setOtp(newOtp);

      // Move to the next input field
      if (e.target.nextSibling) {
        e.target.nextSibling.focus();
      }
    } else if (value === "") {
      const newOtp = [...otp];
      newOtp[index] = value;
      setOtp(newOtp);
    }
  };

  // Handle backspace navigation
  const handleKeyDown = (e, index) => {
    if (e.key === "Backspace" && otp[index] === "" && e.target.previousSibling) {
      e.target.previousSibling.focus();
    }
  };

  // Timer logic
  useEffect(() => {
    let interval = null;
    
    if (isTimerActive && timer > 0) {
      interval = setInterval(() => {
        dispatch(decrementTimer());
      }, 1000);
    } else if (timer === 0) {
      dispatch(setTimerActive(false));
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [timer, isTimerActive, dispatch]);

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds < 10 ? `0${remainingSeconds}` : remainingSeconds}`;
  };

  // handle resend OTP
  const handleResend = () => {
    try {
      dispatch(generateOtpThunk("+91"+phoneNumber));
      dispatch(resetTimer(60)); // Reset timer to 60 seconds
      dispatch(setTimerActive(true));
      dispatch(showNotification("OTP resent successfully!", 200));
    } catch (error) {
      console.log("error in generating otp", error);
      dispatch(showNotification("Failed to resend OTP. Please try again.", 400));
    }
  };

  const handleVerify =  () => {
    try {
      // Your verification logic here
      dispatch(showNotification("OTP verified successfully!", 200));
    } catch (error) {
      dispatch(showNotification("Invalid OTP. Please try again.", 400));
    }
    console.log("otp");
  };

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-md mx-auto bg-transparent  rounded-lg animate__animated animate__fadeIn">
      <div className="flex space-x-4 mb-4">
        {otp.map((value, index) => (
          <input
            key={index}
            type="text"
            value={value}
            maxLength="1"
            onChange={(e) => handleChange(e, index)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            className="w-10 h-10 text-lg font-semibold text-center text-green-700 border-2 border-green-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-300"
          />
        ))}
      </div>
      <div className="text-sm text-gray-600 mb-4">
        Resend OTP after:{" "}
        <span className="text-green-600 font-bold">{formatTime(timer)}</span>
      </div>
      {timer > 0 ? <button
        type="button"
        className="w-[80%] h-[30px] py-2 text-white flex items-center justify-center bg-green-500 rounded-lg hover:bg-green-600 transition-colors"
        disabled={otp.includes("") || timer ===0 }
        onClick={handleVerify}
      >
        Verify
      </button>:
      <button
      type="button"
      className="w-[80%] h-[30px] py-2 text-white flex items-center justify-center bg-green-500 rounded-lg hover:bg-green-600 transition-colors"
      onClick={handleResend}
    >
      Resend OTP
    </button>
      }
    </div>
  );
}

export default OTPInput;
