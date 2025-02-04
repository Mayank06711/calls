import React from "react";
import Searchbar from "./Searchbar/Searchbar";
import { DarkMode, LightMode } from "@mui/icons-material";
import { IconButton } from "@mui/material";
import UserProfileAvatar from "./UserProfile/UserProfileAvatar";
import Notification from "./Notifications/NotificationIcon";
import { useSubscriptionColors } from "../../../utils/getSubscriptionColors";
import { useNavigate } from "react-router-dom";

function Headers({ isDarkMode, setIsDarkMode }) {
  const colors = useSubscriptionColors();
  const navigate = useNavigate();

  const handleClick = (path) => {
    navigate(path);
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 h-16 ${
        isDarkMode ? "bg-gray-800" : "bg-white"
      } shadow-md z-50 px-4 flex items-center justify-between`}
    >
      <h1 
        className="text-xl font-bold cursor-pointer" 
        style={{ color: colors.third }}
        onClick={() => handleClick("/")}
      >
        Know Your Style
      </h1>
      <Searchbar isDarkMode={isDarkMode} />
      <div className="flex items-center gap-2">
        <Notification  />
        <UserProfileAvatar/>
        <IconButton
          onClick={() => setIsDarkMode(!isDarkMode)}
          sx={{ color: colors.fourth }}
        >
          {isDarkMode ? <LightMode /> : <DarkMode />}
        </IconButton>
      </div>
    </header>
  );
}

export default Headers;