import React, { useState } from "react";
import Image1 from '../../assets/image2.png';
import Image2 from '../../assets/image3.png';
import QRGenerator from "../QRGenerator/QRGenerator";

function Login() {
  const [activeTab, setActiveTab] = useState(1);

  const handleTabClick = (tabNumber) => {
    setActiveTab(tabNumber);
  };

  return (
    <div className="modal">
      <form className="flex flex-col h-full">
        <div className="banner"></div>
        <label className="title">Know Your Style</label>
        <div className=" h-48">
        {activeTab === 1 ?<img 
            src={Image1} 
            alt="Login background" 
            className={`w-full h-full object-contain animate__animated  ${activeTab === 1 ? "animate__flipInY" : "animate__flipInX"}`} 
          />:
          <img src={Image2} alt="Login background" className={`w-full h-full object-contain animate__animated ${activeTab === 1 ? "animate__flipInY" : "animate__flipInX"}`} />
          }
        </div>
        <div className="tab-container">
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

        {activeTab === 1 ? <div className="flex flex-col pt-12 gap-5 items-center justify-center h-56 bg-transparent p-6 z-50 animate__animated animate__fadeIn">
          <input 
            type="text" 
            placeholder="Enter your Phone Number" 
            className="w-[80%] px-6 py-2 text-lg font-medium bg-[#9BEC00]/10 rounded-xl
              border-b-2 outline-none text-[#059212] 
              focus:border-b-green-500 
              transition-all duration-300 ease-in-out
              placeholder:text-gray-400
              hover:border-b-green-500/50"
          />
          <button type="button" className="upgrade-btn">
            submit
          </button>
        </div>:<QRGenerator />}

      
      </form>
    </div>
  );
}

export default Login;
