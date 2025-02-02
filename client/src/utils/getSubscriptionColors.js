import { useSelector } from 'react-redux';
import { COLORS } from '../constants/colorPalettes';

export const SUBSCRIPTION_TYPES = {
  GOLD: 'GOLD',
  PLATINUM: 'PLATINUM',
  SILVER: 'SILVER',
  CASUAL: 'CASUAL',
};

// Selector to get subscription type from Redux state
export const selectSubscriptionType = (state) => state.subscription.type || 'CASUAL';

// Hook to get subscription colors from Redux state
export const useSubscriptionColors = () => {
  const subscriptionType = useSelector(selectSubscriptionType);
  
  // Convert to uppercase to match COLOR_PALETTES keys
  const type = subscriptionType?.toUpperCase();
  
  // Return the corresponding color palette or default to CASUAL
  return COLORS[type] || COLORS.CASUAL;
};