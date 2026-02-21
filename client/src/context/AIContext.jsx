import React, { createContext, useContext, useState, useCallback, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { useSelector } from "react-redux";

const AIContext = createContext(null);

// Route-to-description mapping for automatic page context
const ROUTE_DESCRIPTIONS = {
  "/chats": "User is on the chat list, browsing conversations",
  "/reels": "User is browsing the reels section",
  "/subscriptions": "User is viewing subscription plans",
  "/subscriptions/gold": "User is viewing the Gold subscription plan",
  "/subscriptions/silver": "User is viewing the Silver subscription plan",
  "/subscriptions/platinum": "User is viewing the Platinum subscription plan",
  "/settings": "User is in app settings",
  "/notifications": "User is viewing notifications",
  "/profile/posts": "User is viewing their posts",
  "/profile/likes": "User is viewing their liked content",
  "/profile/history": "User is viewing their history (calls, payments, subscriptions)",
  "/profile/my-style": "User is viewing their style preferences",
  "/profile/settings": "User is in profile settings",
  "/profile/settings/overview": "User is in settings overview",
  "/profile/settings/theme": "User is configuring theme settings",
  "/profile/settings/notifications": "User is configuring notification settings",
  "/profile/settings/privacy": "User is configuring privacy settings",
  "/profile/settings/preferences": "User is configuring preference settings",
  "/profile/settings/layout": "User is configuring layout settings",
  "/profile/settings/accessibility": "User is configuring accessibility settings",
  "/profile/settings/sessions": "User is managing active sessions",
  "/profile/settings/usage": "User is viewing usage tracking settings",
  "/profile/settings/reels": "User is configuring reels settings",
  "/profile/settings/analytics": "User is configuring analytics preferences",
  "/wardrobe": "User is on the wardrobe hub",
  "/wardrobe/style-profile": "User is setting up their style DNA",
  "/wardrobe/my-closet": "User is managing their closet",
  "/wardrobe/suggest": "User is viewing suggestion options",
  "/wardrobe/suggest/full-outfit": "User is getting AI outfit suggestions",
  "/wardrobe/suggest/from-item": "User is doing mix & match suggestions",
  "/wardrobe/pairings": "User is viewing outfit pairings",
  "/wardrobe/outfit-builder": "User is building an outfit",
  "/wardrobe/outfits": "User is viewing saved outfits",
  "/wardrobe/outfit-log": "User is viewing their wear log",
  "/wardrobe/shop": "User is browsing product recommendations",
};

function getPageFromPath(pathname) {
  // Check exact match first
  if (ROUTE_DESCRIPTIONS[pathname]) {
    return { page: pathname.split("/").filter(Boolean)[0] || "home", description: ROUTE_DESCRIPTIONS[pathname] };
  }
  // Check if user is in a specific chat (/chats/:userId)
  if (pathname.match(/^\/chats\/.+/)) {
    return { page: "chat", description: "User is in a chat conversation" };
  }
  // Check if user is viewing a specific outfit (/wardrobe/outfits/:outfitId)
  if (pathname.match(/^\/wardrobe\/outfits\/.+/)) {
    return { page: "wardrobe/outfits/detail", description: "User is viewing a specific outfit" };
  }
  // Fallback: derive from path
  const segments = pathname.split("/").filter(Boolean);
  const page = segments[0] || "home";
  return { page, description: `User is on the ${page} page` };
}

/**
 * Provides page-level context to Strut AI.
 *
 * Automatically detects the current page from the route.
 * Components can override with richer context via setAIPageContext()
 * (e.g., ChatArea adds receiver info and messages).
 */
export function AIContextProvider({ children }) {
  const [overrideContext, setOverrideContext] = useState(null);
  const location = useLocation();

  // Current user info — always available to AI
  const userData = useSelector((state) => state.userInfo?.data);
  const subscriptionType = useSelector((state) => state.subscription?.type);

  const userInfo = useMemo(() => {
    if (!userData) return null;
    return {
      name: userData.fullName || userData.username || "Unknown",
      username: userData.username,
      gender: userData.gender,
      age: userData.age,
      city: userData.city,
      country: userData.country,
      role: userData.isExpert ? "expert" : "user",
      subscription: userData.subscription?.type || subscriptionType || "Free",
      isEmailVerified: userData.isEmailVerified,
      isPhoneVerified: userData.isPhoneVerified,
      memberSince: userData.createdAt,
    };
  }, [userData, subscriptionType]);

  // Auto-detected page context from route
  const autoContext = useMemo(() => {
    return getPageFromPath(location.pathname);
  }, [location.pathname]);

  // Final context: override (from ChatArea etc.) takes priority, else auto-detected
  const pageContext = useMemo(() => {
    const base = overrideContext || autoContext;
    return { ...base, userInfo };
  }, [overrideContext, autoContext, userInfo]);

  const setAIPageContext = useCallback((ctx) => {
    setOverrideContext(ctx);
  }, []);

  const clearAIPageContext = useCallback(() => {
    setOverrideContext(null);
  }, []);

  return (
    <AIContext.Provider value={{ pageContext, setAIPageContext, clearAIPageContext }}>
      {children}
    </AIContext.Provider>
  );
}

export function useAIContext() {
  const ctx = useContext(AIContext);
  if (!ctx) {
    throw new Error("useAIContext must be used within an AIContextProvider");
  }
  return ctx;
}
