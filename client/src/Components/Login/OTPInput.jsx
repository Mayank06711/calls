import React, { useState } from "react";

function OTPInput() {
  const [otp, setOtp] = useState(new Array(6).fill("")); // State for 6 digits
  const [timer, setTimer] = useState(90); // Timer for resend functionality

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
  React.useEffect(() => {
    if (timer > 0) {
      const countdown = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(countdown);
    }
  }, [timer]);

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds < 10 ? `0${remainingSeconds}` : remainingSeconds}`;
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
      <button
        type="button"
        className="w-[80%] h-[30px] py-2 text-white flex items-center justify-center bg-green-500 rounded-lg hover:bg-green-600 transition-colors"
        disabled={otp.includes("") || timer > 0}
      >
        Verify
      </button>
    </div>
  );
}

export default OTPInput;
