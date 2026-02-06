import React from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { useSubscriptionColors } from "../../../../../utils/getSubscriptionColors";
import { LockOutlined } from "@mui/icons-material";

const TIER_LEVEL = { Free: 0, Silver: 1, Gold: 2, Platinum: 3 };

function PremiumGate({ requiredTier = "Silver", children, message }) {
  const colors = useSubscriptionColors();
  const navigate = useNavigate();
  const subscriptionType = useSelector(
    (state) => state.auth.userInfo?.subscription?.type || "Free"
  );

  const currentLevel = TIER_LEVEL[subscriptionType] ?? 0;
  const requiredLevel = TIER_LEVEL[requiredTier] ?? 1;

  if (currentLevel >= requiredLevel) return children;

  return (
    <div className="relative rounded-xl overflow-hidden">
      {/* Blurred content preview */}
      <div className="pointer-events-none select-none blur-sm opacity-40">
        {children}
      </div>

      {/* Lock overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center backdrop-blur-sm bg-black/10 dark:bg-black/30 rounded-xl">
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center mb-3"
          style={{ backgroundColor: `${colors.fourth}20` }}
        >
          <LockOutlined style={{ color: colors.fourth, fontSize: 28 }} />
        </div>
        <p className="text-sm font-medium dark:text-dark-text/80 text-light-text/80 mb-1 text-center px-4">
          {message || `Requires ${requiredTier} or above`}
        </p>
        <button
          onClick={() => navigate("/subscriptions")}
          className="mt-2 px-4 py-1.5 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: colors.fourth }}
        >
          Upgrade Plan
        </button>
      </div>
    </div>
  );
}

export default PremiumGate;
