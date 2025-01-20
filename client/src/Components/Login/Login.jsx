import React, { useState } from "react";
import Image1 from "../../assets/image2.png";
import Image2 from "../../assets/image3.png";
import QRGenerator from "../QRGenerator/QRGenerator";
import OTPInput from "./OTPInput";
import { generateOtpThunk } from "../../redux/thunks/login.thunks";
import { useDispatch } from 'react-redux';
import { resetTimer, setTimerActive, showNotification } from "../../redux/actions";


function Login() {
  const [activeTab, setActiveTab] = useState(1);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isButtonEnabled, setIsButtonEnabled] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  
  const dispatch = useDispatch();

  const handleTabClick = (tabNumber) => {
    setActiveTab(tabNumber);
  };

  const handlePhoneNumberChange = (e) => {
    const value = e.target.value;
    const numericValue = value.replace(/\D/g, "");
    setPhoneNumber(numericValue);
    setIsButtonEnabled(numericValue.length === 10);
  };

  const handleSubmit = () => {
    try {
      dispatch(generateOtpThunk("+91"+phoneNumber));
      dispatch(resetTimer(60)); // Set initial timer
      dispatch(setTimerActive(true)); // Activate the timer
      setOtpSent(true);
 // Show success notification
 dispatch(showNotification("OTP sent successfully!", 200));
    } catch (error) {
      console.log("error in generating otp", error);
      dispatch(showNotification("Failed to send OTP. Please try again.", 400));
    }
  };

  return (
    <div className="modal">
      <form className="flex flex-col h-full">
        <div className="banner"></div>
        <label className="title">Know Your Style</label>
        <div className="h-48">
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
            onClick={(e) => {
              e.preventDefault();
              handleTabClick(1);
            }}
          >
            Login
          </button>
          <button
            type="button"
            role="tab"
            className={`tab tab--2 ${activeTab === 2 ? "active" : ""}`}
            onClick={(e) => {
              e.preventDefault();
              handleTabClick(2);
            }}
          >
            QR
          </button>
          <div className="indicator"></div>
          
        </div>

        {activeTab === 1 ? (
          <div className="flex flex-col pt-20 gap-5 items-center justify-center bg-transparent p-6 z-50 animate__animated animate__fadeIn">
            {!otpSent ? (
              <>
                <input
                  type="text"
                  placeholder="Enter your Phone Number"
                  value={phoneNumber}
                  onChange={handlePhoneNumberChange}
                  maxLength={10} // Restrict input length to 10 characters
                  className="w-[80%] px-6 py-2 text-lg font-medium bg-[#9BEC00]/10 rounded-xl
                    border-b-2 outline-none text-[#059212] 
                    focus:border-b-green-500 
                    transition-all duration-300 ease-in-out
                    placeholder:text-gray-400
                    hover:border-b-green-500/50"
                />
                <button
                  type="button"
                  className={`upgrade-btn ${
                    isButtonEnabled ? "enabled" : "disabled"
                  }`}
                  disabled={!isButtonEnabled}
                  onClick={handleSubmit}
                >
                  Submit
                </button>
              </>
            ) : (
              <OTPInput phoneNumber={phoneNumber} />
            )}
          </div>
        ) : (
          <QRGenerator />
        )}
      </form>
    </div>
  );
}

export default Login;
