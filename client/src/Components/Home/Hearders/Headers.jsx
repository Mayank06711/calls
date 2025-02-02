import React from "react";
import Searchbar from "./Searchbar/Searchbar";
import { DarkMode, LightMode } from "@mui/icons-material";
import { IconButton } from "@mui/material";
import UserProfile from "./UserProfile/UserProfile";
import Notification from "./Notifications/Notification";
import { useSubscriptionColors } from "../../../utils/getSubscriptionColors";

function Headers({ isDarkMode, setIsDarkMode }) {
    const colors=useSubscriptionColors();
  return (
    <header
      className={`fixed top-0 left-0 right-0 h-16 ${
        isDarkMode ? "bg-gray-800" : "bg-white"
      } shadow-md z-50 px-4 flex items-center justify-between`}
    >
      <h1 className="text-xl font-bold" style={{color:colors.third}}>Know Your Style</h1>
      <Searchbar isDarkMode={isDarkMode} />
      <Notification />
      <UserProfile />
      <IconButton onClick={() => setIsDarkMode(!isDarkMode)} sx={{color:colors.fourth}}>
        {isDarkMode ? <LightMode /> : <DarkMode />}
      </IconButton>
    </header>
  );
}

export default Headers;
