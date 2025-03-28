import React, { useState } from "react";
import { IoMdLogOut } from "react-icons/io";
import { IoSettings } from "react-icons/io5";
import { BsChatLeftTextFill } from "react-icons/bs";
import { PiFilmReelFill } from "react-icons/pi";
import { BiSolidBadgeDollar } from "react-icons/bi";
import { IconButton } from "@mui/material";
import { useSubscriptionColors } from "../../../utils/getSubscriptionColors";
import { useDispatch, useSelector } from "react-redux";
import { logoutThunk } from "../../../redux/thunks/login.thunks";
import { CircularProgress } from "@mui/material";
import { useLocation, useNavigate } from "react-router-dom";
import { getSubscriptionPlansThunk } from "../../../redux/thunks/subscription.thunks";

const MENU_ITEMS = [
  { icon: <BsChatLeftTextFill />, label: "Chats", path: "/chats" },
  {
    icon: <BiSolidBadgeDollar />,
    label: "Subscriptions",
    path: "/subscriptions",
  },
  { icon: <PiFilmReelFill />, label: "Reels", path: "/reels" },
  { icon: <IoSettings />, label: "Settings", path: "/settings" },
];

function Sidebar({ isDarkMode }) {
  const dispatch = useDispatch();
  const [isSidebarExpanded, setSidebarExpanded] = useState(false);
  const colors = useSubscriptionColors();
  const isLoggingOut = useSelector((state) => state.auth.isLoggingOut);
  const subscriptionPlans = useSelector((state) => state.plans);

  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    dispatch(logoutThunk());
  };

  const handleNavigation = (path) => {
    navigate(path);
    if(path==="/subscriptions"){
      if(!subscriptionPlans.plans){
        dispatch(getSubscriptionPlansThunk());
      }  
    }
  };

  return (
    <nav
      className={`fixed left-0 top-16 h-[calc(100vh-4rem)] ${
        isDarkMode ? "bg-gray-800" : "bg-white"
      } shadow-lg 
        ${
          isSidebarExpanded ? "w-48" : "w-16"
        } transition-[width] duration-300 ease-in-out z-40`}
    >
      <div className="flex flex-col justify-between h-full">
        <div className="py-4">
          {MENU_ITEMS.map((item, index) => (
            <div
              key={index}
              className="flex items-center px-4 py-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              onMouseEnter={() => setSidebarExpanded(true)}
              onMouseLeave={() => setSidebarExpanded(false)}
              onClick={()=> handleNavigation(item.path)}
            >
              <span
                className=" dark:text-gray-300"
                style={{ color: colors.fourth }}
              >
                {item.icon}
              </span>
              <span
                className={`ml-4 whitespace-nowrap ${
                  isSidebarExpanded ? "opacity-100" : "opacity-0"
                } 
                transition-opacity duration-200`}
              >
                {item.label}
              </span>
            </div>
          ))}
        </div>

        <div className="ml-3 mb-5">
          <IconButton onClick={handleLogout} disabled={isLoggingOut}>
            {isLoggingOut ? (
              <CircularProgress size={24} style={{ color: colors.fourth }} />
            ) : (
              <IoMdLogOut style={{ color: colors.fourth }} />
            )}
          </IconButton>
        </div>
      </div>
    </nav>
  );
}

export default Sidebar;
