import React from "react";
import { useVideoCall, CALL_STATES } from "../../../hooks/useVideoCall";
import { useSelector } from "react-redux";
import { Phone, PhoneDisabled } from "@mui/icons-material";

function IncomingCall() {
  const { callState, isCaller, callerInfo, acceptCall, rejectCall } =
    useVideoCall();

  // Only show for callee when ringing
  if (callState !== CALL_STATES.RINGING || isCaller) {
    return null;
  }

  const callerName = callerInfo?.callerName || "Unknown Caller";
  const callerAvatar = callerInfo?.callerAvatar;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-6 p-8 rounded-2xl bg-gray-900/90 shadow-2xl max-w-sm w-full mx-4">
        {/* Avatar with pulse ring */}
        <div className="relative">
          <div className="absolute inset-0 rounded-full animate-ping bg-green-500/30" />
          <div className="absolute -inset-2 rounded-full animate-pulse bg-green-500/20" />
          <div className="relative w-24 h-24 rounded-full overflow-hidden bg-gray-700 flex items-center justify-center border-4 border-green-500">
            {callerAvatar ? (
              <img
                src={callerAvatar}
                alt={callerName}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-3xl font-bold text-white">
                {callerName.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
        </div>

        {/* Caller info */}
        <div className="text-center">
          <h2 className="text-xl font-semibold text-white">{callerName}</h2>
          <p className="text-sm text-gray-400 mt-1 animate-pulse">
            Incoming Video Call...
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-8 mt-4">
          {/* Decline */}
          <button
            onClick={rejectCall}
            className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center shadow-lg transition-all active:scale-95"
          >
            <PhoneDisabled className="text-white" sx={{ fontSize: 28 }} />
          </button>

          {/* Accept */}
          <button
            onClick={acceptCall}
            className="w-16 h-16 rounded-full bg-green-600 hover:bg-green-700 flex items-center justify-center shadow-lg transition-all active:scale-95 animate-bounce"
          >
            <Phone className="text-white" sx={{ fontSize: 28 }} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default IncomingCall;
