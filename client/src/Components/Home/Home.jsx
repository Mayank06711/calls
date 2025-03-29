import React, { useEffect, useRef, useState } from "react";
import Headers from "./Hearders/Headers";
import Sidebar from "./Sidebar/Sidebar";
import { useSubscriptionColors } from "../../utils/getSubscriptionColors";
import AISidebar from "./AISidebar/AISidebar";
import { Outlet } from "react-router-dom";
import introJs from "intro.js";
import "intro.js/introjs.css";

function Home() {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem("isDarkMode");
    return savedTheme ? JSON.parse(savedTheme) : false;
  });

  const colors = useSubscriptionColors();
  const isAlreadyVerified =
    localStorage.getItem("isAlreadyVerified") === "true";
  const isTourCompleted = localStorage.getItem("isTourCompleted") === "true";
  console.log("object1", isAlreadyVerified);
  console.log("object2", isTourCompleted);

  useEffect(() => {
    localStorage.setItem("isDarkMode", JSON.stringify(isDarkMode));
    // Optionally update document body/html class for global theme
    document.documentElement.classList.toggle("dark", isDarkMode);
  }, [isDarkMode]);

  useEffect(() => {
    if (!isTourCompleted && !isAlreadyVerified) {
      startTour();
    }
  }, [isAlreadyVerified, isTourCompleted]);

  const startTour = () => {
    const intro = introJs();
    intro.setOptions({
      steps: [
        {
          element: document.querySelector(".tour1"),
          intro:
            "Use the search bar to quickly find contacts, conversations, or specific content within the application.",
          position: "bottom",
          title: "Search",
        },
        {
          element: document.querySelector(".tour2"),
          intro:
            "Meet your AI assistant! It can help answer questions, summarize information, and provide intelligent suggestions to boost your productivity.",
          position: "left",
          title: "AI Assistant",
        },
        {
          element: document.querySelector(".tour3"),
          intro:
            "This is your sidebar navigation menu. It provides quick access to all main sections of the application.",
          position: "right",
          title: "Navigation Menu",
        },
        {
          element: document.querySelector(".tour4"),
          intro:
            "This is your chat section where you can communicate with contacts. Send messages, share files, and keep conversations organized.",
          position: "right",
          title: "Chat",
        },
        {
          element: document.querySelector(".tour5"),
          intro:
            "Manage your subscription here. Upgrade to access premium features or check your current plan details.",
          position: "right",
          title: "Subscription",
        },
        {
          element: document.querySelector(".tour6"),
          intro:
            "Browse through reels to discover short-form content from your network and industry influencers.",
          position: "right",
          title: "Reels",
        },
        {
          element: document.querySelector(".tour7"),
          intro:
            "Customize your experience through the settings panel. Adjust notifications, privacy controls, and application preferences.",
          position: "right",
          title: "Settings",
        },
        {
          element: document.querySelector(".tour8"),
          intro:
            "Use this button to securely log out of your account when you're finished.",
          position: "top",
          title: "Logout",
        },
        {
          element: document.querySelector(".tour9"),
          intro:
            "View and edit your profile information. Keep your details up-to-date to make the most of our networking features.",
          position: "bottom",
          title: "Profile",
        },
        {
          element: document.querySelector(".tour10"),
          intro:
            "View and edit your profile information. Keep your details up-to-date to make the most of our networking features.",
          position: "bottom",
          title: "Account",
        },
        {
          element: document.querySelector(".tour11"),
          intro:
            "Welcome to your dashboard! Here you can view recent activities, upcoming calls, and key statistics at a glance.",
          position: "left",
          title: "Dashboard",
        },
      ],
      showProgress: false, // Hide progress dots
      showBullets: false, // Hide bullets
      exitOnOverlayClick: false, // Prevent closing on overlay click
      disableInteraction: true, // Prevent user interaction during the tour
      nextLabel: "Next →",
      prevLabel: "← Back",
      doneLabel: "Finish",
      tooltipClass: isDarkMode
        ? "introjs-tooltip-dark"
        : "introjs-tooltip-light",
      highlightClass: isDarkMode
        ? "introjs-highlight-dark"
        : "introjs-highlight-light",
    });

    const style = document.createElement("style");
    style.textContent = `
      .introjs-tooltip-dark {
        color: white; 
        border: 1px solid #e5e7eb;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
         background-color: rgba(255, 255, 255, 0.1) !important;
        backdrop-filter: blur(8px) !important;
        -webkit-backdrop-filter: blur(8px) !important;
      }
      
      .introjs-tooltip-light {
       
        color: var(--introjs-tooltip-color);
        border: 1px solid #e5e7eb;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
         background-color: rgba(255, 255, 255, 0.3) !important;
        backdrop-filter: blur(8px) !important;
        -webkit-backdrop-filter: blur(8px) !important;
      }
      
      .introjs-button {
        background-color: var(--introjs-button-bg) !important;
        color: ${isDarkMode ? colors.second : colors.fourth}!important;
        text-shadow: none !important;
        border-radius: 4px !important;
        font-weight: 500 !important;
        transition: background-color 0.3s ease, color 0.3s ease;
      }
      
      .introjs-button:hover {
        background-color: ${colors.fourth} !important;
        color: ${isDarkMode ? "#fff" : "#000"}!important;
      }
      
      .introjs-highlight-dark {
        background-color: #ffffff !important;
        box-shadow: 0 0 0 100000px rgba(0, 0, 0, 0.6) !important;
        border: 1px solid white !important;
      }
      
      .introjs-highlight-light {
        box-shadow: 0 0 0 100000px rgba(0, 0, 0, 0.5) !important;
        border: 1px solid #6366f1 !important;
        background-color: rgba()
      }
      
      .introjs-helperLayer {
        background-color: transparent !important;
        border:1px solid rgba(255,255,255,0.3) !important;
      }
      
      .introjs-tooltiptext {
        padding: 12px !important;
      }  
      .introjs-tooltip-title{
      color:${isDarkMode ? colors.second : colors.fourth} !important;
      }
        
    `;
    document.head.appendChild(style);

    intro.start();
    intro.oncomplete(() => {
      localStorage.setItem("isTourCompleted", "true"); // Mark tour as completed
    });
  };

  return (
    <div
      className={`min-h-screen w-full ${
        isDarkMode ? "bg-gray-900 text-white" : "bg-gray-50 text-gray-900"
      }`}
    >
      {/* Header */}
      <Headers isDarkMode={isDarkMode} setIsDarkMode={setIsDarkMode} />

      {/* Sidebar */}
      <Sidebar isDarkMode={isDarkMode} />

      {/* Main Content */}
      <div className="h-[calc(100vh-64px)] w-[calc(100vw-64px)] ml-16 mt-16 overflow-y-scroll scrollbar-hide">
        <Outlet />
      </div>

      {/* AI Assistant Panel */}
      <AISidebar isDarkMode={isDarkMode} />
    </div>
  );
}

export default Home;
