import React, { useState } from "react";
import { Chip, IconButton, Stack } from "@mui/material";
import SettingsIcon from "@mui/icons-material/Settings";
import HistoryIcon from "@mui/icons-material/History";
import FavoriteIcon from "@mui/icons-material/Favorite";
import PostAddIcon from "@mui/icons-material/PostAdd";
import StyleIcon from "@mui/icons-material/Style";
import { useNavigate, useLocation, Outlet } from "react-router-dom";
import ReplyRoundedIcon from '@mui/icons-material/ReplyRounded';
import { useSubscriptionColors, toRgba } from "../../../../../utils/getSubscriptionColors";

function UserActivity() {
  const navigate = useNavigate();
  const location = useLocation();
  const colors = useSubscriptionColors();

  const tabs = [
    { id: "posts", label: "Posts", icon: <PostAddIcon fontSize="small" />, path: "posts" },
    { id: "likes", label: "Likes", icon: <FavoriteIcon fontSize="small" />, path: "likes" },
    { id: "history", label: "History", icon: <HistoryIcon fontSize="small" />, path: "history" },
    { id: "myStyle", label: "My Style", icon: <StyleIcon fontSize="small" />, path: "my-style" },
    {
      id: "settings", 
      label: "Settings",
      icon: <SettingsIcon fontSize="small" />,
      path: "settings"
    },
  ];

  const getCurrentTab = () => {
    const path = location.pathname.split("/").pop();
    return path || "posts";
  };

  return (
    <div className="flex-1 flex flex-col p-2 sm:p-4 gap-2 bg-gradient-to-br from-white/10 to-white/5 rounded-lg shadow-md border border-white/20 backdrop-blur-sm transition-all duration-300 dark:text-dark-text text-light-text min-h-[300px] lg:min-h-0 w-full min-w-0 overflow-hidden">
      <Stack
        direction="row"
        spacing={1}
        className="overflow-x-auto pb-2 flex-nowrap shrink-0"
        sx={{
          "::-webkit-scrollbar": { height: "4px" },
          "::-webkit-scrollbar-track": { background: "transparent" },
          "::-webkit-scrollbar-thumb": {
            background: "rgba(255,255,255,0.1)",
            borderRadius: "4px",
          },
        }}
      >
               
      <IconButton onClick={() => navigate(-1)}>
        <ReplyRoundedIcon fontSize="medium" className="dark:text-dark-text text-light-text" />
      </IconButton>
        {tabs.map((tab) => {
          const isActive = getCurrentTab() === tab.path || location.pathname.includes(tab.path);
          return (
            <Chip
              key={tab.id}
              icon={React.cloneElement(tab.icon, { 
                style: { color: isActive ? colors.fourth : colors.third } 
              })}
              label={tab.label}
              onClick={() => navigate(tab.path)}
              sx={{
                backgroundColor: isActive ? toRgba(colors.fourth, 0.2) : "transparent",
                border: `1px solid ${toRgba(isActive ? colors.fourth : colors.third, 0.4)}`,
                "&:hover": {
                  backgroundColor: toRgba(colors.fourth, 0.3),
                  borderColor: colors.fourth,
                },
                transition: "all 0.1s ease",
                minWidth: "fit-content",
                color: isActive ? colors.fourth : "inherit",
                cursor: "pointer",
                "& .MuiChip-label": {
                  color: isActive ? colors.fourth : "inherit",
                },
              }}
            />
          );
        })}
      </Stack>

      <div className="flex-1 min-w-0 overflow-auto">
        {/* Content for each tab will go here */}
        <Outlet />
      </div>
    </div>
  );
}

export default UserActivity;
