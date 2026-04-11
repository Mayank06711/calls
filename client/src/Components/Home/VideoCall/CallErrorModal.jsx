import React from "react";
import { useVideoCall } from "../../../hooks/useVideoCall";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { Close, WorkspacePremium, ErrorOutline, WifiOff, PersonOff, PhoneLocked } from "@mui/icons-material";

// Map error codes to user-friendly messages, icons, and whether to show subscription CTA
const ERROR_CONFIG = {
  CALL_LIMIT_REACHED: {
    title: "Call Limit Reached",
    icon: WorkspacePremium,
    iconColor: "text-amber-400",
    showSubscriptionCTA: true,
  },
  CALLEE_OFFLINE: {
    title: "User Offline",
    message: "This user is currently offline. Try again later.",
    icon: PersonOff,
    iconColor: "text-gray-400",
    showSubscriptionCTA: false,
  },
  CALLEE_BUSY: {
    title: "User Busy",
    message: "This user is currently on another call.",
    icon: PhoneLocked,
    iconColor: "text-orange-400",
    showSubscriptionCTA: false,
  },
  CALLER_BUSY: {
    title: "Already in a Call",
    message: "You are already in an active call.",
    icon: PhoneLocked,
    iconColor: "text-orange-400",
    showSubscriptionCTA: false,
  },
  SELF_CALL: {
    title: "Cannot Call Yourself",
    message: "You cannot make a video call to yourself.",
    icon: ErrorOutline,
    iconColor: "text-gray-400",
    showSubscriptionCTA: false,
  },
  NETWORK_ERROR: {
    title: "Connection Error",
    message: "Could not connect to the server. Please check your internet connection.",
    icon: WifiOff,
    iconColor: "text-red-400",
    showSubscriptionCTA: false,
  },
};

function CallErrorModal() {
  const { callError, dismissCallError } = useVideoCall();
  const navigate = useNavigate();
  const isExpert = useSelector((state) => state.auth.userInfo?.isExpert);

  if (!callError) return null;

  const config = ERROR_CONFIG[callError.errorCode] || {
    title: "Call Failed",
    icon: ErrorOutline,
    iconColor: "text-red-400",
    showSubscriptionCTA: false,
  };

  const Icon = config.icon;
  const displayMessage = config.message || callError.message;

  const handleGetSubscription = () => {
    dismissCallError();
    navigate("/subscriptions");
  };

  const card = (
    <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden" onClick={(e) => e.stopPropagation()}>
      {/* Close button */}
      <button
        onClick={dismissCallError}
        className="absolute top-3 right-3 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors z-10"
      >
        <Close className="text-gray-400" sx={{ fontSize: 20 }} />
      </button>

      {/* Content */}
      <div className="flex flex-col items-center px-6 pt-8 pb-6">
        {/* Icon */}
        <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
          config.showSubscriptionCTA
            ? "bg-amber-500/10"
            : "bg-gray-100 dark:bg-gray-700"
        }`}>
          <Icon className={config.iconColor} sx={{ fontSize: 32 }} />
        </div>

        {/* Title */}
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          {config.title}
        </h3>

        {/* Message */}
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center leading-relaxed mb-6">
          {displayMessage}
        </p>

        {/* Buttons */}
        <div className="flex flex-col gap-3 w-full">
          {config.showSubscriptionCTA && !isExpert && (
            <button
              onClick={handleGetSubscription}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold text-sm shadow-lg transition-all active:scale-[0.98]"
            >
              Upgrade Subscription
            </button>
          )}
          <button
            onClick={dismissCallError}
            className={`w-full py-3 px-4 rounded-xl text-sm font-medium transition-all active:scale-[0.98] ${
              config.showSubscriptionCTA
                ? "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                : "bg-green-600 hover:bg-green-700 text-white"
            }`}
          >
            {config.showSubscriptionCTA ? "Maybe Later" : "OK"}
          </button>
        </div>
      </div>
    </div>
  );

  // Subscription CTA errors need a modal with backdrop for user attention
  if (config.showSubscriptionCTA) {
    return (
      <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={dismissCallError}>
        {card}
      </div>
    );
  }

  // Informational errors — floating card, no backdrop, doesn't block the app
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center pointer-events-none">
      <div className="pointer-events-auto mx-4">
        {card}
      </div>
    </div>
  );
}

export default CallErrorModal;
