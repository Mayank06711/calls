import React, { useState, useEffect } from "react";
import { useVideoCall } from "../../../hooks/useVideoCall";
import { Phone, PhoneDisabled } from "@mui/icons-material";

const AUTO_DECLINE_SECONDS = 60;

function ExpertPermissionRequest() {
  const { permissionState, permissionExpert, respondToPermission } =
    useVideoCall();
  const [countdown, setCountdown] = useState(AUTO_DECLINE_SECONDS);

  // Auto-decline countdown
  useEffect(() => {
    if (permissionState !== "incoming_request") {
      setCountdown(AUTO_DECLINE_SECONDS);
      return;
    }

    setCountdown(AUTO_DECLINE_SECONDS);
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          // Auto-decline
          if (permissionExpert?.expertId) {
            respondToPermission(permissionExpert.expertId, false);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [permissionState, permissionExpert, respondToPermission]);

  if (permissionState !== "incoming_request" || !permissionExpert) {
    return null;
  }

  const expertName = permissionExpert.name || "Expert";
  const expertAvatar = permissionExpert.avatar;
  const qualification = permissionExpert.qualification;

  return (
    <div className="fixed inset-0 z-[55] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-5 p-8 rounded-2xl bg-gray-900/90 shadow-2xl max-w-sm w-full mx-4">
        {/* Expert avatar */}
        <div className="relative">
          <div className="absolute -inset-2 rounded-full animate-pulse bg-blue-500/20" />
          <div className="relative w-24 h-24 rounded-full overflow-hidden bg-gray-700 flex items-center justify-center border-4 border-blue-500">
            {expertAvatar ? (
              <img
                src={expertAvatar}
                alt={expertName}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-3xl font-bold text-white">
                {expertName.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
        </div>

        {/* Expert info */}
        <div className="text-center">
          <h2 className="text-xl font-semibold text-white">{expertName}</h2>
          {qualification && (
            <p className="text-sm text-blue-400 mt-1">{qualification}</p>
          )}
          <p className="text-sm text-gray-400 mt-2">
            Requests a video consultation
          </p>
        </div>

        {/* Countdown */}
        <div className="text-xs text-gray-500">
          Auto-declines in {countdown}s
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-8 mt-2">
          {/* Decline */}
          <button
            onClick={() => respondToPermission(permissionExpert.expertId, false)}
            className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center shadow-lg transition-all active:scale-95"
          >
            <PhoneDisabled className="text-white" sx={{ fontSize: 28 }} />
          </button>

          {/* Accept */}
          <button
            onClick={() => respondToPermission(permissionExpert.expertId, true)}
            className="w-16 h-16 rounded-full bg-green-600 hover:bg-green-700 flex items-center justify-center shadow-lg transition-all active:scale-95"
          >
            <Phone className="text-white" sx={{ fontSize: 28 }} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default ExpertPermissionRequest;
