import React, { useState, useEffect } from "react";
import { useVideoCall } from "../../../hooks/useVideoCall";
import { useSelector } from "react-redux";
import { Phone, Close, HourglassEmpty, CheckCircle, Cancel } from "@mui/icons-material";

const PERMISSION_REQUEST_TIMEOUT = 65; // seconds — matches useVideoCall timeout

function ExpertPermissionStatus() {
  const {
    permissionState,
    permissionTarget,
    permissionWindowExpiry,
    permissionCooldownEnd,
    permissionDenyReason,
    initiateCall,
    cancelPermissionRequest,
    dismissPermissionStatus,
  } = useVideoCall();

  const isExpert = useSelector((state) => state.auth.userInfo?.isExpert);
  const [windowRemaining, setWindowRemaining] = useState(null);
  const [requestCountdown, setRequestCountdown] = useState(PERMISSION_REQUEST_TIMEOUT);

  // Countdown for granted window
  useEffect(() => {
    if (permissionState !== "granted" || !permissionWindowExpiry) {
      setWindowRemaining(null);
      return;
    }

    const tick = () => {
      const remaining = Math.max(
        0,
        Math.floor((permissionWindowExpiry - Date.now()) / 1000)
      );
      setWindowRemaining(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
      }
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [permissionState, permissionWindowExpiry]);

  // Countdown for denied cooldown
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  useEffect(() => {
    if (permissionState !== "denied" || !permissionCooldownEnd) {
      setCooldownRemaining(0);
      return;
    }
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((permissionCooldownEnd - Date.now()) / 1000));
      setCooldownRemaining(remaining);
      if (remaining <= 0) clearInterval(interval);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [permissionState, permissionCooldownEnd]);

  // Countdown for requesting state
  useEffect(() => {
    if (permissionState !== "requesting") {
      setRequestCountdown(PERMISSION_REQUEST_TIMEOUT);
      return;
    }
    setRequestCountdown(PERMISSION_REQUEST_TIMEOUT);
    const interval = setInterval(() => {
      setRequestCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [permissionState]);

  // Only show for experts with active permission state
  if (!isExpert || permissionState === "idle") {
    return null;
  }

  const formatRemaining = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const handleCallNow = () => {
    if (permissionTarget?.userId) {
      initiateCall(permissionTarget.userId, {
        name: permissionTarget.name,
        avatar: permissionTarget.avatar,
      });
    }
  };

  return (
    <div className="fixed top-4 right-4 z-[55] w-80 rounded-xl shadow-2xl overflow-hidden bg-gray-900/95 border border-gray-700 backdrop-blur-sm">
      {/* Requesting state */}
      {permissionState === "requesting" && (
        <div className="p-4 flex items-center gap-3">
          <HourglassEmpty className="text-yellow-400 animate-spin" sx={{ fontSize: 24 }} />
          <div className="flex-1">
            <p className="text-white text-sm font-medium">
              Requesting permission...
            </p>
            <p className="text-gray-400 text-xs mt-0.5">
              Waiting for {permissionTarget?.name || "user"} to respond ({requestCountdown}s)
            </p>
          </div>
          <button
            onClick={cancelPermissionRequest}
            className="p-1.5 rounded-full hover:bg-gray-700/50 transition-colors"
            title="Cancel request"
          >
            <Close className="text-gray-400 hover:text-white" sx={{ fontSize: 18 }} />
          </button>
        </div>
      )}

      {/* Granted state — can call now */}
      {permissionState === "granted" && (
        <div className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <CheckCircle className="text-green-400" sx={{ fontSize: 24 }} />
            <div className="flex-1">
              <p className="text-white text-sm font-medium">
                Permission granted
              </p>
              <p className="text-gray-400 text-xs mt-0.5">
                {permissionTarget?.name || "User"} accepted your request
              </p>
            </div>
            {windowRemaining !== null && (
              <span className="text-amber-400 text-xs font-mono">
                {formatRemaining(windowRemaining)}
              </span>
            )}
          </div>
          <button
            onClick={handleCallNow}
            disabled={windowRemaining !== null && windowRemaining <= 0}
            className="w-full py-2.5 rounded-lg bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm font-medium flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
          >
            <Phone sx={{ fontSize: 18 }} />
            {windowRemaining !== null && windowRemaining <= 0
              ? "Window expired"
              : "Call Now"}
          </button>
        </div>
      )}

      {/* Denied state */}
      {permissionState === "denied" && (
        <div className="p-4 flex items-center gap-3">
          <Cancel className={permissionDenyReason === "user_offline" ? "text-gray-400" : "text-red-400"} sx={{ fontSize: 24 }} />
          <div className="flex-1">
            <p className="text-white text-sm font-medium">
              {permissionDenyReason === "user_offline"
                ? "User went offline"
                : "Permission denied"}
            </p>
            <p className="text-gray-400 text-xs mt-0.5">
              {permissionDenyReason === "user_offline"
                ? `${permissionTarget?.name || "User"} disconnected`
                : cooldownRemaining > 0
                  ? `You can request again in ${cooldownRemaining}s`
                  : "User declined your call request"}
            </p>
          </div>
          {cooldownRemaining > 0 && (
            <span className="text-red-400 text-xs font-mono">{cooldownRemaining}s</span>
          )}
          <button
            onClick={dismissPermissionStatus}
            className="p-1.5 rounded-full hover:bg-gray-700/50 transition-colors"
            title="Dismiss"
          >
            <Close className="text-gray-400 hover:text-white" sx={{ fontSize: 18 }} />
          </button>
        </div>
      )}
    </div>
  );
}

export default ExpertPermissionStatus;
