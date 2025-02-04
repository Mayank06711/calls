import React, { useEffect, useState } from "react";
import { IconButton } from "@mui/material";
import AIAssistant from "./AISidebar/AIAssistant/AIAssistant";
import Headers from "./Hearders/Headers";
import Sidebar from "./Sidebar/Sidebar";
import { useSubscriptionColors } from "../../utils/getSubscriptionColors";
import AISidebar from "./AISidebar/AISidebar";

function Home() {

  const [isDarkMode, setIsDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem("isDarkMode");
    return savedTheme ? JSON.parse(savedTheme) : false;
  });

  useEffect(() => {
    localStorage.setItem("isDarkMode", JSON.stringify(isDarkMode));
    // Optionally update document body/html class for global theme
    document.documentElement.classList.toggle("dark", isDarkMode);
  }, [isDarkMode]);
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
      <div className="p-20">hhhhhhhhhhhhhhhh</div>

      {/* AI Assistant Panel */}
      <AISidebar isDarkMode={isDarkMode} />
    </div>
  );
}

export default Home;
