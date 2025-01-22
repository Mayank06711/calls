import React, { useState, useEffect } from "react";
import { useDispatch } from "react-redux";
import { verifyOtpThunk } from "../../redux/thunks/login.thunks";
import { decrementTimer, setTimerActive } from "../../redux/actions/login.actions";
import { useNavigate } from 'react-router-dom';

function OTPInput({ 
  phoneNumber, 
  referenceId, 
  smsId, 
  setShowUserInfo,
  timer,
  isTimerActive,
  onResend 
}) {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  useEffect(() => {
    let intervalId;
    
    if (isTimerActive && timer > 0) {
      intervalId = setInterval(() => {
        dispatch(decrementTimer());
      }, 1000);
    }

    if (timer === 0) {
      dispatch(setTimerActive(false));
      clearInterval(intervalId);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [timer, isTimerActive, dispatch]);

  const handleChange = (e, index) => {
    const value = e.target.value;
    if (/^\d*$/.test(value) && value.length <= 1) {
      const newOtp = [...otp];
      newOtp[index] = value;
      setOtp(newOtp);

      // Move to next input if value is entered
      if (value && index < 5) {
        const nextInput = e.target.nextElementSibling;
        if (nextInput) {
          nextInput.focus();
        }
      }
    }
  };

  const handleKeyDown = (e, index) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const prevInput = e.target.previousElementSibling;
      if (prevInput) {
        prevInput.focus();
      }
    }
  };

  const handleVerify = async () => {
    try {
      const verificationData = {
        referenceId,
        mobNum: phoneNumber,
        otp: otp.join('')
      };

       dispatch(verifyOtpThunk(verificationData));
    } catch (error) {
      console.error('Error verifying OTP:', error);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      <div className="flex gap-2">
        {otp.map((digit, index) => (
          <input
            key={index}
            type="text"
            value={digit}
            onChange={(e) => handleChange(e, index)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            maxLength={1}
            className="w-12 h-12 text-center text-xl border-2 border-green-500 rounded-lg focus:outline-none focus:border-green-600"
          />
        ))}
      </div>
      
      <div className="text-sm text-gray-600">
        {timer > 0 ? (
          <span>Resend OTP in: {formatTime(timer)}</span>
        ) : (
          <span>You can now resend OTP</span>
        )}
      </div>

      {timer > 0 ? (
        <button
          type="button"
          onClick={handleVerify}
          disabled={otp.join('').length !== 6}
          className={`w-full py-2 rounded-lg ${
            otp.join('').length === 6
              ? 'bg-green-500 hover:bg-green-600 text-white'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          Verify OTP
        </button>
      ) : (
        <button
          type="button"
          onClick={onResend}
          className="w-full py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg"
        >
          Resend OTP
        </button>
      )}
    </div>
  );
}

export default OTPInput;
