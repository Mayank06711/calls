/**
 * Style Constants for User Customization
 * These options are available ONLY for Gold and Platinum subscribers
 */

export interface StyleOption {
  value: string;
  label: string;
  cssValue: string;
}

export interface StyleOptions {
  fontSizes: StyleOption[];
  fontFamilies: StyleOption[];
}

// Font Size Options
export const FONT_SIZE_OPTIONS: StyleOption[] = [
  { value: 'small', label: 'Small', cssValue: '14px' },
  { value: 'medium', label: 'Medium', cssValue: '16px' },
  { value: 'large', label: 'Large', cssValue: '18px' },
  { value: 'extra-large', label: 'Extra Large', cssValue: '20px' },
];

// Font Family Options - including stylish and cursive fonts
export const FONT_FAMILY_OPTIONS: StyleOption[] = [
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
export const STYLE_ALLOWED_SUBSCRIPTIONS = ['Gold', 'Platinum'] as const;

// Helper function to check if subscription has style access
export const hasStyleAccess = (subscriptionType: string | undefined): boolean => {
  if (!subscriptionType) return false;
  return STYLE_ALLOWED_SUBSCRIPTIONS.includes(subscriptionType as any);
};

// Get all style options (for premium users)
export const getAllStyleOptions = (): StyleOptions => ({
  fontSizes: FONT_SIZE_OPTIONS,
  fontFamilies: FONT_FAMILY_OPTIONS,
});

// Get CSS value for a font size
export const getFontSizeCssValue = (size: string): string => {
  const option = FONT_SIZE_OPTIONS.find(opt => opt.value === size);
  return option?.cssValue || '16px'; // Default to medium
};

// Get CSS value for a font family
export const getFontFamilyCssValue = (family: string): string => {
  const option = FONT_FAMILY_OPTIONS.find(opt => opt.value === family);
  return option?.cssValue || "'Inter', sans-serif"; // Default to Inter
};
