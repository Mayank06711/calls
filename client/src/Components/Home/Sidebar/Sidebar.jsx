import React, { useState } from "react";
import { IoMdLogOut } from "react-icons/io";
import { IoShirtOutline } from "react-icons/io5";
import { BsChatLeftTextFill } from "react-icons/bs";
// import { PiFilmReelFill } from "react-icons/pi";
import { BiSolidBadgeDollar } from "react-icons/bi";
import { MdAdminPanelSettings } from "react-icons/md";
import { IconButton } from "@mui/material";
import { useSubscriptionColors } from "../../../utils/getSubscriptionColors";
import { useDispatch, useSelector } from "react-redux";
import { logoutThunk } from "../../../redux/thunks/login.thunks";
import { CircularProgress } from "@mui/material";
import { useLocation, useNavigate } from "react-router-dom";
import { getSubscriptionPlansThunk } from "../../../redux/thunks/subscription.thunks";

const MENU_ITEMS = [
  { icon: <BsChatLeftTextFill />, label: "Chats", path: "/chats" },
  { icon: <IoShirtOutline />, label: "Wardrobe", path: "/wardrobe" },
  // { icon: <PiFilmReelFill />, label: "Reels", path: "/reels" },
  {
    icon: <BiSolidBadgeDollar />,
    label: "Subscriptions",
    path: "/subscriptions",
    hideForExpert: true,
  },
  {
    icon: <MdAdminPanelSettings />,
    label: "Admin",
    path: "/admin",
    adminOnly: true,
  },
];

function Sidebar({ isDarkMode }) {
  const dispatch = useDispatch();
  const [isSidebarExpanded, setSidebarExpanded] = useState(false);
  const colors = useSubscriptionColors();
  const isLoggingOut = useSelector((state) => state.auth.isLoggingOut);
  const isExpert = useSelector((state) => state.auth.userInfo?.isExpert);
  const isAdmin = useSelector((state) => state.auth.userInfo?.isAdmin);
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
      className={` fixed left-0 top-16 bottom-0 ${
        isDarkMode ? "bg-gray-800" : "bg-white"
      } shadow-lg
        ${
          isSidebarExpanded ? "w-48" : "w-16"
        } transition-[width] duration-200 ease-in-out z-40`}
    >
      <div className="flex flex-col justify-between h-full  tour3">
        <div className="py-4 ">
          {MENU_ITEMS.filter((item) => !(item.hideForExpert && isExpert) && !(item.adminOnly && !isAdmin)).map((item, index) => (
            <div
              key={index}
              className={`flex items-center px-4  py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors tour${index+4}`}
              onMouseEnter={() => setSidebarExpanded(true)}
              onMouseLeave={() => setSidebarExpanded(false)}
              onClick={()=> handleNavigation(item.path)}
            >
              <span
                className="flex-shrink-0 dark:text-gray-300 py-2 "
                style={{ color: colors.fourth }}
              >
                {item.icon}
              </span>
              {isSidebarExpanded && (
                <span className="ml-4 whitespace-nowrap transition-opacity opacity-50 duration-600">
                  {item.label}
                </span>
              )}
            </div>
          ))}
        </div>

        <div className="mb-3">
          <div
            className={`flex flex-col ${isSidebarExpanded ? "px-4" : "px-2"} mb-2`}
            onMouseEnter={() => setSidebarExpanded(true)}
            onMouseLeave={() => setSidebarExpanded(false)}
          >
            {isSidebarExpanded ? (
              <>
                <span
                  className="text-[10px] cursor-pointer hover:underline mb-0.5"
                  style={{ color: colors.third }}
                  onClick={() => navigate("/terms")}
                >
                  Terms
                </span>
                <span
                  className="text-[10px] cursor-pointer hover:underline"
                  style={{ color: colors.third }}
                  onClick={() => navigate("/privacy")}
                >
                  Privacy
                </span>
              </>
            ) : (
              <span
                className="text-[10px] text-center cursor-pointer"
                style={{ color: colors.third }}
                title="Terms & Privacy"
                onClick={() => setSidebarExpanded(true)}
              >
                T&P
              </span>
            )}
          </div>
          <div className="ml-3 tour8">
            <IconButton onClick={handleLogout} disabled={isLoggingOut}>
              {isLoggingOut ? (
                <CircularProgress size={24} style={{ color: colors.fourth }} />
              ) : (
                <IoMdLogOut style={{ color: colors.fourth }} />
              )}
            </IconButton>
          </div>
        </div>
      </div>
    </nav>
  );
}

export default Sidebar;
