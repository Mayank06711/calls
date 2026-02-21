import React, { Suspense } from "react";
import { Chip, IconButton, CircularProgress } from "@mui/material";
import SettingsIcon from "@mui/icons-material/Settings";
import HistoryIcon from "@mui/icons-material/History";
// import FavoriteIcon from "@mui/icons-material/Favorite";
// import PostAddIcon from "@mui/icons-material/PostAdd";
import { useNavigate, useLocation, Outlet } from "react-router-dom";
import ReplyRoundedIcon from '@mui/icons-material/ReplyRounded';
import { useSubscriptionColors, toRgba } from "../../../../../utils/getSubscriptionColors";

function UserActivity() {
  const navigate = useNavigate();
  const location = useLocation();
  const colors = useSubscriptionColors();

  const tabs = [
    // { id: "posts", label: "Posts", icon: <PostAddIcon fontSize="small" />, path: "posts" },
    // { id: "likes", label: "Likes", icon: <FavoriteIcon fontSize="small" />, path: "likes" },
    { id: "history", label: "History", icon: <HistoryIcon fontSize="small" />, path: "history" },
    {
      id: "settings",
      label: "Settings",
      icon: <SettingsIcon fontSize="small" />,
      path: "settings"
    },
  ];

  const getCurrentTab = () => {
    const path = location.pathname.split("/").pop();
    return path || "history";
  };

  return (
    <div className="flex-1 flex flex-col p-2 sm:p-4 gap-2 bg-gradient-to-br from-white/10 to-white/5 rounded-lg shadow-md border border-white/20 backdrop-blur-sm transition-all duration-300 dark:text-dark-text text-light-text min-h-[300px] lg:min-h-0 w-full min-w-0 overflow-hidden">
      <div className="flex items-center gap-2 pb-2 shrink-0">
        <IconButton onClick={() => navigate(-1)} size="small">
          <ReplyRoundedIcon fontSize="medium" className="dark:text-dark-text text-light-text" />
        </IconButton>
        <div className="flex flex-1 gap-2">
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
                  flex: 1,
                  backgroundColor: isActive ? toRgba(colors.fourth, 0.2) : "transparent",
                  border: `1px solid ${toRgba(isActive ? colors.fourth : colors.third, 0.4)}`,
                  "&:hover": {
                    backgroundColor: toRgba(colors.fourth, 0.3),
                    borderColor: colors.fourth,
                  },
                  transition: "all 0.1s ease",
                  color: isActive ? colors.fourth : "inherit",
                  cursor: "pointer",
                  "& .MuiChip-label": {
                    color: isActive ? colors.fourth : "inherit",
                  },
                }}
              />
            );
          })}
        </div>
      </div>

      <div className="flex-1 min-w-0 overflow-auto custom-scrollbar">
        <Suspense
          fallback={
            <div className="flex items-center justify-center h-32">
              <CircularProgress size={24} style={{ color: colors.fourth }} />
            </div>
          }
        >
          <Outlet />
        </Suspense>
      </div>
    </div>
  );
}

export default UserActivity;
