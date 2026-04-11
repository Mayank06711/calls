import React from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { useSubscriptionColors, toRgba } from "../../../../../utils/getSubscriptionColors";
import { LockOutlined } from "@mui/icons-material";

const TIER_LEVEL = { Free: 0, Silver: 1, Gold: 2, Platinum: 3 };

function PremiumGate({ requiredTier = "Silver", children, message, fullPage = false }) {
  const colors = useSubscriptionColors();
  const navigate = useNavigate();
  const subscriptionType = useSelector(
    (state) => state.auth.userInfo?.subscription?.type || "Free"
  );

  const currentLevel = TIER_LEVEL[subscriptionType] ?? 0;
  const requiredLevel = TIER_LEVEL[requiredTier] ?? 1;

  if (currentLevel >= requiredLevel) return children;

  /* ── Full-page lock screen (for route-level gates like OutfitBuilder) ── */
  if (fullPage) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-4 p-6">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{ background: `linear-gradient(135deg, rgba(245,158,11,0.15), rgba(249,115,22,0.1))` }}
        >
          <LockOutlined className="text-amber-500" style={{ fontSize: 32 }} />
        </div>
        <div className="text-center">
          <h3 className="text-base font-bold dark:text-dark-text text-light-text mb-1">
            {message || `${requiredTier} Plan Required`}
          </h3>
          <p className="text-xs dark:text-dark-text/50 text-light-text/50 max-w-xs">
            Upgrade your plan to unlock this feature and get the most out of your wardrobe.
          </p>
        </div>
        <button
          onClick={() => navigate("/subscriptions")}
          className="px-5 py-2 rounded-lg text-sm font-medium text-white
            bg-gradient-to-r from-amber-500 to-orange-500
            hover:from-amber-600 hover:to-orange-600 transition-all
            shadow-md hover:shadow-lg"
        >
          Upgrade Now
        </button>
      </div>
    );
  }

  /* ── Card-level lock overlay (for hub cards, collection pills) ── */
  return (
    <div className="relative rounded-xl overflow-hidden">
      {/* Dimmed content preview — keeps card shape */}
      <div className="pointer-events-none select-none blur-[2px] opacity-20 grayscale">
        {children}
      </div>

      {/* Premium overlay — matches settings-page style */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center rounded-xl p-4 cursor-pointer group/gate"
        onClick={() => navigate("/subscriptions")}
      >
        <div className="flex items-center gap-1.5 mb-1.5">
          <LockOutlined className="text-amber-500" style={{ fontSize: 16 }} />
          <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
            {message || `${requiredTier} Plan`}
          </span>
        </div>
        <button
          className="px-3 py-1 rounded-lg text-[10px] font-medium text-white
            bg-gradient-to-r from-amber-500 to-orange-500
            hover:from-amber-600 hover:to-orange-600 transition-all
            shadow-sm hover:shadow-md"
        >
          Upgrade
        </button>
      </div>
    </div>
  );
}

export default PremiumGate;
