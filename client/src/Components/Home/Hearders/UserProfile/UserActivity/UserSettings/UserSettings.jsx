import React from "react";
import { 
  ColorLensOutlined, 
  NotificationsOutlined,
  LockOutlined,
  TuneOutlined,
  ViewQuiltOutlined,
  AccessibilityNewOutlined,
  AccessTimeOutlined,
  TimelineOutlined,
  VideoLibraryOutlined,
  BarChartOutlined
} from "@mui/icons-material";
import { Outlet, useLocation, useNavigate } from "react-router-dom";

function UserSettings() {

  const navigate = useNavigate();
  const location = useLocation();
   // Check if we're at the overview page
   const isOverview = location.pathname === "/profile/settings" || location.pathname === "/profile/settings/overview";


   const settingsCards = [
    { 
      icon: <ColorLensOutlined />, 
      title: 'Theme', 
      description: 'Customize your app appearance',
      path: 'theme'
    },
    { 
      icon: <NotificationsOutlined />, 
      title: 'Notifications', 
      description: 'Manage your alerts',
      path: 'notifications'
    },
    { 
      icon: <LockOutlined />, 
      title: 'Privacy', 
      description: 'Control your account privacy',
      path: 'privacy'
    },
    { 
      icon: <TuneOutlined />, 
      title: 'Preferences', 
      description: 'Set your app preferences',
      path: 'preferences'
    },
    { 
      icon: <ViewQuiltOutlined />, 
      title: 'Layout', 
      description: 'Customize your view',
      path: 'layout'
    },
    { 
      icon: <AccessibilityNewOutlined />, 
      title: 'Accessibility', 
      description: 'Adjust accessibility options',
      path: 'accessibility'
    },
    { 
      icon: <AccessTimeOutlined />, 
      title: 'Session Information', 
      description: 'View active sessions',
      path: 'sessions'
    },
    { 
      icon: <TimelineOutlined />, 
      title: 'Usage Tracking', 
      description: 'Monitor your activity',
      path: 'usage'
    },
    { 
      icon: <VideoLibraryOutlined />, 
      title: 'Reels', 
      description: 'Manage reel preferences',
      path: 'reels'
    },
    { 
      icon: <BarChartOutlined />, 
      title: 'Analytics', 
      description: 'View your statistics',
      path: 'analytics'
    }
  ];

   // Navigate to specific setting page
   const handleSettingClick = (path) => {
    navigate(`/profile/settings/${path}`);
  };

  return (
    <>
      {isOverview ? (
        // Settings overview grid
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4">
          {settingsCards.map((card, index) => (
            <div
              key={index}
              className="group relative overflow-hidden rounded-xl backdrop-blur-md 
                dark:bg-dark-primary bg-light-secondary
                border dark:border-dark-primary/20 border-light-primary/20 
                dark:hover:border-dark-primary/40 hover:border-light-primary/40
                ease-in-out
                cursor-pointer hover:shadow-lg"
              onClick={() => handleSettingClick(card.path)}
            >
              {/* Background gradient overlay */}
              <div className="absolute inset-0 
                dark:bg-gradient-to-br dark:from-dark-accent/10 dark:to-dark-accent/5 
                bg-gradient-to-br from-light-accent/10 to-light-accent/5 
                opacity-0 group-hover:opacity-100 transition-opacity duration-300" 
              />
              
              {/* Card content */}
              <div className="relative p-4 flex flex-col gap-2">
                {/* Icon container */}
                <div className="w-10 h-10 rounded-full 
                  dark:bg-dark-primary/20 bg-light-primary/20
                  dark:group-hover:bg-dark-primary/30 group-hover:bg-light-primary/30 
                  flex items-center justify-center mb-2 transition-all duration-300"
                >
                  {React.cloneElement(card.icon, { 
                    className: `
                      dark:text-dark-text/70 text-light-text/70 
                      dark:group-hover:text-dark-text group-hover:text-light-text 
                      transition-colors duration-300
                    `
                  })}
                </div>
                
                {/* Text content */}
                <h3 className="text-base font-semibold 
                  dark:text-dark-text/90 text-light-text/90
                  dark:group-hover:text-dark-text group-hover:text-light-text"
                >
                  {card.title}
                </h3>
                <p className="text-sm 
                  dark:text-dark-text/60 text-light-text/60
                  dark:group-hover:text-dark-text/80 group-hover:text-light-text/80"
                >
                  {card.description}
                </p>
              </div>

              {/* Hover effect corner decoration */}
              <div className="absolute -bottom-1 -right-1 w-12 h-12 
                dark:bg-gradient-to-br dark:from-dark-accent/20 dark:to-dark-accent/10
                bg-gradient-to-br from-light-accent/20 to-light-accent/10
                rounded-tl-xl opacity-0 group-hover:opacity-100 transition-all duration-300 
                transform rotate-45 translate-x-2 translate-y-2" 
              />
            </div>
          ))}
        </div>
      ) : (
        // Render specific setting component via Outlet
        <Outlet />
      )}
    </>
  );
}

export default UserSettings;