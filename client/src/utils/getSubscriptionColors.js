import { useSelector } from 'react-redux';
import { COLORS } from '../constants/colorPalettes';

/**
 * Convert an "rgb(r, g, b)" string to "rgba(r, g, b, alpha)".
 * Needed because appending hex like `${rgb}30` produces invalid CSS.
 */
export const toRgba = (rgbStr, alpha) => {
  const m = rgbStr.match(/(\d+),\s*(\d+),\s*(\d+)/);
  return m ? `rgba(${m[1]}, ${m[2]}, ${m[3]}, ${alpha})` : rgbStr;
};

export const SUBSCRIPTION_TYPES = {
  GOLD: 'GOLD',
  PLATINUM: 'PLATINUM',
  SILVER: 'SILVER',
  CASUAL: 'CASUAL',
};

// Selector to get subscription type from Redux state
export const selectSubscriptionType = (state) => state.subscription.type || 'CASUAL';

// Selector to check if user is an expert
export const selectIsExpert = (state) => !!state.auth.userInfo?.isExpert;

// Selector to check if user is an admin
export const selectIsAdmin = (state) => !!state.auth.userInfo?.isAdmin;

// Hook to get subscription colors from Redux state
// Priority: Admin > Expert > Subscription type > Casual
export const useSubscriptionColors = () => {
  const subscriptionType = useSelector(selectSubscriptionType);
  const isExpert = useSelector(selectIsExpert);
  const isAdmin = useSelector(selectIsAdmin);

  if (isAdmin) return COLORS.ADMIN;
  if (isExpert) return COLORS.EXPERT;

  // Convert to uppercase to match COLOR_PALETTES keys
  const type = subscriptionType?.toUpperCase();

  // Return the corresponding color palette or default to CASUAL
  return COLORS[type] || COLORS.CASUAL;
};