import React, { useEffect, useState } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { ADMIN_SIDEBAR_ITEMS, ADMIN_TOKEN_KEY, ADMIN_POSITION_LABELS } from "../../constants/adminConstants";
import { restoreAdminSession } from "../../redux/thunks/admin.thunks";
import { IoMdArrowBack } from "react-icons/io";
import { HiMenuAlt2 } from "react-icons/hi";
import { IoClose } from "react-icons/io5";
import { CircularProgress } from "@mui/material";

function AdminSidebar({ adminInfo, mobileOpen, onClose }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [expanded, setExpanded] = useState(false);

  const hasPermission = (permission) => {
    if (!permission) return true;
    if (adminInfo?.position === "superadmin") return true;
    return adminInfo?.permissions?.[permission] === true;
  };

  const filteredItems = ADMIN_SIDEBAR_ITEMS.filter((item) => hasPermission(item.permission));

  const isActive = (path) => {
    if (path === "/admin") return location.pathname === "/admin";
    return location.pathname.startsWith(path);
  };

  const handleNavigate = (path) => {
    navigate(path);
    onClose();
  };

  return (
    <>
      {/* Mobile overlay backdrop */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={onClose} />
      )}

      {/* Sidebar — desktop: fixed icon bar, mobile: slide-in overlay with labels */}
      <nav
        className={`fixed top-16 h-[calc(100vh-4rem)] bg-slate-900 shadow-lg z-50
          transition-all duration-200 ease-in-out overflow-y-auto overflow-x-hidden
          md:left-16 md:block
          ${mobileOpen ? "left-0 w-56" : "-left-56 md:left-16"}
          ${expanded ? "md:w-52" : "md:w-14"}`}
      >
        <div className="flex flex-col justify-between h-full">
          <div className="py-2">
            {/* Close button — mobile only */}
            <div
              className="flex items-center justify-between px-3.5 py-2.5 md:hidden border-b border-slate-700/50 mb-1"
            >
              <span className="text-sm text-slate-300 font-medium">Admin Panel</span>
              <button onClick={onClose} className="text-slate-400 hover:text-white text-lg">
                <IoClose />
              </button>
            </div>

            {/* Back to app */}
            <div
              className="flex items-center px-3.5 py-2.5 cursor-pointer hover:bg-slate-800 transition-colors border-b border-slate-700/50 mb-1"
              onMouseEnter={() => setExpanded(true)}
              onMouseLeave={() => setExpanded(false)}
              onClick={() => handleNavigate("/chats")}
              title="Back to App"
            >
              <span className="flex-shrink-0 text-slate-400 text-lg">
                <IoMdArrowBack />
              </span>
              {/* Always show label on mobile, hover-expand on desktop */}
              <span className={`ml-3 text-sm text-slate-400 whitespace-nowrap ${expanded ? "md:block" : "md:hidden"} block`}>
                Back to App
              </span>
            </div>

            {filteredItems.map((item, index) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              return (
                <div
                  key={index}
                  className={`flex items-center px-3.5 py-2.5 cursor-pointer transition-colors
                    ${active
                      ? "bg-indigo-600/20 text-indigo-400 border-r-2 border-indigo-400"
                      : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                    }`}
                  onMouseEnter={() => setExpanded(true)}
                  onMouseLeave={() => setExpanded(false)}
                  onClick={() => handleNavigate(item.path)}
                  title={item.label}
                >
                  <span className="flex-shrink-0 text-lg">
                    <Icon />
                  </span>
                  <span className={`ml-3 text-sm whitespace-nowrap ${expanded ? "md:block" : "md:hidden"} block`}>
                    {item.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </nav>
    </>
  );
}

function AdminLoginGate({ children }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const adminInfo = useSelector((state) => state.admin.adminInfo);
  const isLoggingIn = useSelector((state) => state.admin.isAdminLoggingIn);
  const [adminKey, setAdminKey] = useState("");
  const [error, setError] = useState("");
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    dispatch(restoreAdminSession());
    setChecked(true);
  }, [dispatch]);

  // Listen for admin session expiry (fired by token refresh failure)
  useEffect(() => {
    const handleExpired = () => {
      dispatch({ type: "ADMIN_LOGOUT" });
    };
    window.addEventListener("admin-session-expired", handleExpired);
    return () => window.removeEventListener("admin-session-expired", handleExpired);
  }, [dispatch]);

  if (!checked) return null;

  if (adminInfo) {
    return children;
  }

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    const { adminLoginThunk } = await import("../../redux/thunks/admin.thunks");
    const result = await dispatch(adminLoginThunk(adminKey));
    if (!result.success) {
      setError(result.message);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100dvh-4rem)] bg-gray-50 dark:bg-gray-900 px-4 sm:ml-16">
      <div className="w-full max-w-md p-6 sm:p-8 bg-white dark:bg-gray-800 rounded-2xl shadow-xl">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
            <span className="text-3xl text-indigo-600">🛡</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Admin Access</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Enter your admin credentials to continue
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Admin Key
            </label>
            <input
              type="password"
              value={adminKey}
              onChange={(e) => setAdminKey(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
              placeholder="Enter your admin key"
              required
              autoFocus
            />
          </div>

          {error && (
            <p className="text-sm text-red-500 text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={isLoggingIn}
            className="w-full py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            {isLoggingIn ? (
              <>
                <CircularProgress size={18} color="inherit" />
                Authenticating...
              </>
            ) : (
              "Sign In as Admin"
            )}
          </button>
        </form>

        <button
          onClick={() => navigate("/chats")}
          className="mt-4 w-full py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
        >
          Back to App
        </button>
      </div>
    </div>
  );
}

export default function AdminLayout() {
  const adminInfo = useSelector((state) => state.admin.adminInfo);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <AdminLoginGate>
      <AdminSidebar adminInfo={adminInfo} mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />

      {/* Main content — no left margin on mobile, offset for sidebar on md+ */}
      <div className="px-3 pt-2 pb-4 md:ml-14 md:pl-16 md:pr-4 min-h-[calc(100vh-4rem)] bg-gray-50 dark:bg-gray-900">
        {/* Header bar */}
        <div className="flex items-center mb-4 gap-2">
          {/* Hamburger — mobile only */}
          <button
            onClick={() => setMobileOpen(true)}
            className="md:hidden p-1.5 rounded-lg text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            <HiMenuAlt2 className="text-xl" />
          </button>
          <span className="text-xs font-medium px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 rounded-full">
            {ADMIN_POSITION_LABELS[adminInfo?.position] || adminInfo?.position}
          </span>
          <span className="text-sm text-gray-500 dark:text-gray-400 hidden sm:inline">
            {adminInfo?.name}
          </span>
        </div>
        <Outlet />
      </div>
    </AdminLoginGate>
  );
}
