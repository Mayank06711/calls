import React, { useState } from "react";
import Searchbar from "./Searchbar/Searchbar";
import { DarkMode, LightMode, MoreVert, Search, Close, Notifications } from "@mui/icons-material";
import { IconButton, Tooltip, Menu, MenuItem, ListItemIcon, ListItemText, Divider } from "@mui/material";
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
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  
  const handleClick = (path) => {
    navigate(path);
  };
  
  const handleFeedbackClick = () => {
    dispatch(feedbackClick(true));
    setMenuAnchor(null);
  };

  const handleMenuOpen = (event) => {
    setMenuAnchor(event.currentTarget);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
  };

  const handleThemeToggle = () => {
    setIsDarkMode(!isDarkMode);
    setMenuAnchor(null);
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 h-16 ${
        isDarkMode ? "bg-gray-800" : "bg-white"
      } shadow-md z-50 px-4 flex items-center justify-between`}
    >
      {/* Logo - Always visible */}
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
          className="text-base sm:text-xl font-bold" 
          style={{ color: colors.third }}
        >
          Know Your Fashion
        </h1>
      </div>

      {/* Desktop Search - Hidden on mobile */}
      <div className="hidden md:block">
        <Searchbar isDarkMode={isDarkMode} />
      </div>

      {/* Desktop Icons - Hidden on mobile */}
      <div className="hidden md:flex items-center gap-2 step1 tour9">
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
        
        {/* Notification Button */}
        <Tooltip title="Notifications" arrow placement="bottom">
          <span>
            <Notification />
          </span>
        </Tooltip>
        
        {/* User Profile */}
        <Tooltip title="User Profile" arrow placement="bottom">
          <span>
            <UserProfileAvatar />
          </span>
        </Tooltip>
        
        {/* Theme Toggle Button */}
        <Tooltip title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"} arrow placement="bottom">
          <IconButton
            onClick={() => setIsDarkMode(!isDarkMode)}
            sx={{ color: colors.fourth }}
          >
            {isDarkMode ? <LightMode /> : <DarkMode />}
          </IconButton>
        </Tooltip>
      </div>

      {/* Mobile Icons - Visible only on mobile */}
      <div className="flex md:hidden items-center gap-1">
        {/* User Profile - Always visible on mobile */}
        <UserProfileAvatar />
        
        {/* Three Dots Menu */}
        <IconButton
          onClick={handleMenuOpen}
          sx={{ color: colors.fourth }}
        >
          <MoreVert />
        </IconButton>

        {/* Mobile Dropdown Menu */}
        <Menu
          anchorEl={menuAnchor}
          open={Boolean(menuAnchor)}
          onClose={handleMenuClose}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          PaperProps={{
            sx: {
              backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
              color: isDarkMode ? '#ffffff' : '#000000',
              minWidth: 200,
              '& .MuiMenuItem-root': {
                '&:hover': {
                  backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
                }
              }
            }
          }}
        >
          {/* Search */}
          <MenuItem onClick={() => { setMobileSearchOpen(true); handleMenuClose(); }}>
            <ListItemIcon>
              <Search sx={{ color: colors.fourth }} />
            </ListItemIcon>
            <ListItemText>Search</ListItemText>
          </MenuItem>

          <Divider sx={{ borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }} />

          {/* Feedback */}
          <MenuItem onClick={handleFeedbackClick}>
            <ListItemIcon>
              <FeedbackIcon sx={{ color: colors.fourth }} />
            </ListItemIcon>
            <ListItemText>Feedback</ListItemText>
          </MenuItem>

          {/* Notifications */}
          <MenuItem onClick={() => { navigate('/notifications'); handleMenuClose(); }}>
            <ListItemIcon>
              <Notifications sx={{ color: colors.fourth }} />
            </ListItemIcon>
            <ListItemText>Notifications</ListItemText>
          </MenuItem>

          <Divider sx={{ borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }} />

          {/* Theme Toggle */}
          <MenuItem onClick={handleThemeToggle}>
            <ListItemIcon>
              {isDarkMode ? <LightMode sx={{ color: colors.fourth }} /> : <DarkMode sx={{ color: colors.fourth }} />}
            </ListItemIcon>
            <ListItemText>{isDarkMode ? 'Light Mode' : 'Dark Mode'}</ListItemText>
          </MenuItem>
        </Menu>
      </div>

      {/* Mobile Search Overlay */}
      {mobileSearchOpen && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-start pt-4 px-4 md:hidden">
          <div className={`w-full rounded-lg p-3 ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg flex items-center gap-2`}>
            <div className="flex-1">
              <Searchbar isDarkMode={isDarkMode} />
            </div>
            <IconButton onClick={() => setMobileSearchOpen(false)} sx={{ color: colors.fourth }}>
              <Close />
            </IconButton>
          </div>
        </div>
      )}
    </header>
  );
}

export default Headers;