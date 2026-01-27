import React, { useState, useEffect } from "react";
import { useVideoCall } from "../../../hooks/useVideoCall";
import { useSelector } from "react-redux";
import { Phone, Close, HourglassEmpty, CheckCircle, Cancel } from "@mui/icons-material";

function ExpertPermissionStatus() {
  const {
    permissionState,
    permissionTarget,
    permissionWindowExpiry,
    initiateCall,
  } = useVideoCall();

  const isExpert = useSelector((state) => state.auth.userInfo?.isExpert);
  const [windowRemaining, setWindowRemaining] = useState(null);

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
              Waiting for {permissionTarget?.name || "user"} to respond
            </p>
          </div>
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
          <Cancel className="text-red-400" sx={{ fontSize: 24 }} />
          <div className="flex-1">
            <p className="text-white text-sm font-medium">
              Permission denied
            </p>
            <p className="text-gray-400 text-xs mt-0.5">
              User declined your call request
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default ExpertPermissionStatus;
