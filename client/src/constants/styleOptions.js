/**
 * Style Options Constants for User Customization
 * These options are available ONLY for Gold and Platinum subscribers
 * This file mirrors the backend styleConstants.ts
 */

// Font Size Options
export const FONT_SIZE_OPTIONS = [
  { value: 'small', label: 'Small', cssValue: '14px', dbValue: 0.875 },
  { value: 'medium', label: 'Medium', cssValue: '16px', dbValue: 1 },
  { value: 'large', label: 'Large', cssValue: '18px', dbValue: 1.125 },
  { value: 'extra-large', label: 'Extra Large', cssValue: '20px', dbValue: 1.25 },
];

// Convert font size string to database number value
export const fontSizeToDbValue = (size) => {
  const option = FONT_SIZE_OPTIONS.find(opt => opt.value === size);
  return option?.dbValue ?? 1; // Default to medium (1)
};

// Convert database number to font size string
export const dbValueToFontSize = (dbValue) => {
  const option = FONT_SIZE_OPTIONS.find(opt => opt.dbValue === dbValue);
  return option?.value ?? 'medium'; // Default to medium
};

// Font Family Options - including stylish and cursive fonts
export const FONT_FAMILY_OPTIONS = [
  { value: 'inter', label: 'Inter', cssValue: "'Inter', sans-serif" },
  { value: 'roboto', label: 'Roboto', cssValue: "'Roboto', sans-serif" },
  { value: 'poppins', label: 'Poppins', cssValue: "'Poppins', sans-serif" },
  { value: 'montserrat', label: 'Montserrat', cssValue: "'Montserrat', sans-serif" },
  { value: 'playfair', label: 'Playfair Display', cssValue: "'Playfair Display', serif" },
  { value: 'dancing-script', label: 'Dancing Script (Cursive)', cssValue: "'Dancing Script', cursive" },
  { value: 'pacifico', label: 'Pacifico (Cursive)', cssValue: "'Pacifico', cursive" },
  { value: 'caveat', label: 'Caveat (Handwritten)', cssValue: "'Caveat', cursive" },
  { value: 'great-vibes', label: 'Great Vibes (Elegant)', cssValue: "'Great Vibes', cursive" },
  { value: 'lobster', label: 'Lobster (Bold Cursive)', cssValue: "'Lobster', cursive" },
  { value: 'comfortaa', label: 'Comfortaa (Rounded)', cssValue: "'Comfortaa', cursive" },
  { value: 'quicksand', label: 'Quicksand (Modern)', cssValue: "'Quicksand', sans-serif" },
];

// Subscription levels that have access to style customization
export const STYLE_ALLOWED_SUBSCRIPTIONS = ['Gold', 'Platinum'];

// Helper function to check if subscription has style access
export const hasStyleAccess = (subscriptionType) => {
  if (!subscriptionType) return false;
  return STYLE_ALLOWED_SUBSCRIPTIONS.includes(subscriptionType);
};

// Get CSS value for a font size
export const getFontSizeCssValue = (size) => {
  const option = FONT_SIZE_OPTIONS.find(opt => opt.value === size);
  return option?.cssValue || '16px'; // Default to medium
};

// Get CSS value for a font family
export const getFontFamilyCssValue = (family) => {
  const option = FONT_FAMILY_OPTIONS.find(opt => opt.value === family);
  return option?.cssValue || "'Inter', sans-serif"; // Default to Inter
};

// Apply font size to document root
export const applyFontSize = (size) => {
  const cssValue = getFontSizeCssValue(size);
  document.documentElement.style.setProperty('--app-font-size', cssValue);
  document.documentElement.style.fontSize = cssValue;
};

// Apply font family to document root
export const applyFontFamily = (family) => {
  const cssValue = getFontFamilyCssValue(family);
  document.documentElement.style.setProperty('--app-font-family', cssValue);
  document.documentElement.style.fontFamily = cssValue;
};

// Reset styles to default
export const resetStyles = () => {
  document.documentElement.style.removeProperty('--app-font-size');
  document.documentElement.style.removeProperty('--app-font-family');
  document.documentElement.style.fontSize = '16px';
  document.documentElement.style.fontFamily = "'Inter', sans-serif";
};
