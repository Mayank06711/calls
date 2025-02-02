import React, { useEffect, useState } from "react";
import { IconButton } from "@mui/material";
import AIAssistant from "./AIAssistant/AIAssistant";
import Headers from "./Hearders/Headers";
import CycloneIcon from "@mui/icons-material/Cyclone";
import Sidebar from "./Sidebar/Sidebar";
import { useSubscriptionColors } from "../../utils/getSubscriptionColors";

function Home() {
  const [isAIOpen, setIsAIOpen] = useState(false);
  const colors = useSubscriptionColors();
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
      className={`min-h-screen ${
        isDarkMode ? "bg-gray-900 text-white" : "bg-gray-50 text-gray-900"
      }`}
    >
      {/* Header */}
      <Headers isDarkMode={isDarkMode} setIsDarkMode={setIsDarkMode} />

      {/* Sidebar */}
      <Sidebar isDarkMode={isDarkMode} />

      {/* Main Content */}
      <main></main>

      {/* AI Assistant Panel */}
      <aside
        className={`fixed right-0 top-16 h-[calc(100vh-4rem)] ${
          isDarkMode ? "bg-gray-800" : "bg-white"
        } shadow-lg 
        ${isAIOpen ? "w-96" : "w-0"} transition-all duration-200 ease-in-out`}
      >
        <IconButton
          className={`absolute ${
            !isAIOpen ? "-left-10" : "left-0"
          } top-6 transform -translate-y-1/2 dark:bg-gray-800 shadow-md`}
          onClick={() => setIsAIOpen(!isAIOpen)}
        >
          <CycloneIcon sx={{ color: colors.fourth }} />
        </IconButton>
        <div
          className={`p-4 ${
            isAIOpen ? "opacity-100" : "opacity-0"
          } transition-opacity duration-300`}
        >
          <AIAssistant />
        </div>
      </aside>
    </div>
  );
}

export default Home;
