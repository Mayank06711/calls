import React, { useState } from "react";
import { Chip, IconButton, Stack } from "@mui/material";
import SettingsIcon from "@mui/icons-material/Settings";
import HistoryIcon from "@mui/icons-material/History";
import FavoriteIcon from "@mui/icons-material/Favorite";
import PostAddIcon from "@mui/icons-material/PostAdd";
import StyleIcon from "@mui/icons-material/Style";
import { useNavigate, useLocation, Outlet } from "react-router-dom";
import ReplyRoundedIcon from '@mui/icons-material/ReplyRounded';
function UserActivity() {
  const navigate = useNavigate();
  const location = useLocation();

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
    <div className=" ml-0 flex-1 flex flex-col p-4 gap-2 bg-gradient-to-br from-white/10 to-white/5 rounded-lg shadow-md border border-white/20 backdrop-blur-sm transition-all duration-300 dark:text-dark-text text-light-text">
      <Stack
        direction="row"
        spacing={1}
        className="overflow-x-auto pb-2 flex-nowrap"
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
        {tabs.map((tab) => (
          <Chip
            key={tab.id}
            icon={tab.icon}
            label={tab.label}
            onClick={() => navigate(tab.path)}
            sx={{
              backgroundColor:
              getCurrentTab === tab.id ? "rgba(255,255,255,0.1)" : "transparent",
              border: "1px solid rgba(255,255,255,0.2)",
              "&:hover": {
                backgroundColor: "rgba(255,255,255,0.15)",
              },
              transition: "all 0.1s ease",
              minWidth: "fit-content",
              color: "inherit",
              cursor: "pointer",
            }}
          />
        ))}
      </Stack>

      <div className="flex-1">
        {/* Content for each tab will go here */}
        <Outlet />
      </div>
    </div>
  );
}

export default UserActivity;
