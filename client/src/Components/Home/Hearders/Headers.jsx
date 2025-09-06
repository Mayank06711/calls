import React, { useRef } from "react";
import Searchbar from "./Searchbar/Searchbar";
import { DarkMode, LightMode } from "@mui/icons-material";
import { IconButton, Tooltip } from "@mui/material";
import UserProfileAvatar from "./UserProfile/UserProfileAvatar";
import Notification from "./Notifications/NotificationIcon";
import { useSubscriptionColors } from "../../../utils/getSubscriptionColors";
import { useNavigate } from "react-router-dom";
import FeedbackIcon from "@mui/icons-material/Feedback";
import { useDispatch } from "react-redux";
import { feedbackClick } from "../../../redux/actions";
import KYFLogo from "../../../assets/KYF_Logo1.png";

function Headers({ isDarkMode, setIsDarkMode }) {
  const colors = useSubscriptionColors();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
  const handleClick = (path) => {
    navigate(path);
  };
  
  const handleFeedbackClick = () => {
    dispatch(feedbackClick(true));
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 h-16 ${
        isDarkMode ? "bg-gray-800" : "bg-white"
      } shadow-md z-50 px-4 flex items-center justify-between`}
    >
       <div 
        className="flex items-center cursor-pointer" 
        onClick={() => handleClick("/")}
      >
        <img 
          src={KYFLogo} 
          alt="KYF Logo" 
          className="h-14 w-auto"
        />
        <h1 
          className="text-xl font-bold" 
          style={{ color: colors.third }}
        >
          Know Your Style
        </h1>
      </div>
      <Searchbar isDarkMode={isDarkMode} />
      <div className="flex items-center gap-2 step1 tour9">
        {/* Feedback Button */}
        <Tooltip title="Submit Feedback" arrow placement="bottom">
          <IconButton
            onClick={handleFeedbackClick}
            sx={{
              color: colors.fourth,
              '&:hover': {
                backgroundColor: isDarkMode 
                  ? 'rgba(255, 255, 255, 0.08)' 
                  : 'rgba(0, 0, 0, 0.04)',
              }
            }}
          >
            <FeedbackIcon />
          </IconButton>
        </Tooltip>
        
        {/* Notification Button - Wrapped with Tooltip */}
        <Tooltip title="Notifications" arrow placement="bottom">
          <span> {/* Using span as wrapper because Notification might already be an IconButton */}
            <Notification />
          </span>
        </Tooltip>
        
        {/* User Profile - Wrapped with Tooltip */}
        <Tooltip title="User Profile" arrow placement="bottom">
          <span>
            <UserProfileAvatar />
          </span>
        </Tooltip>
        
        {/* Theme Toggle Button - Wrapped with Tooltip */}
        <Tooltip title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"} arrow placement="bottom">
          <IconButton
            onClick={() => setIsDarkMode(!isDarkMode)}
            sx={{ color: colors.fourth }}
          >
            {isDarkMode ? <LightMode /> : <DarkMode />}
          </IconButton>
        </Tooltip>
      </div>
    </header>
  );
}

export default Headers;