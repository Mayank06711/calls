/**
 * Formats a mobile number to E.164 format for India.
 * @param phoneNumber - The mobile number in any of the valid Indian formats (e.g., 9876543210, 919876543210, +919876543210).
 * @returns A properly formatted number starting with +91, or an error message if the input is invalid.
 */
const formatIndianNumber = (phoneNumber: string): string | null => {
  // Remove all non-digit characters
  const digitsOnly = phoneNumber.replace(/\D/g, "");

  // If the number is already valid E.164 format for India
  if (/^\+91\d{10}$/.test(phoneNumber)) {
    return phoneNumber;
  }

  // If the number starts with '91' but doesn't have '+'
  if (/^91\d{10}$/.test(digitsOnly)) {
    return `+${digitsOnly}`;
  }

  // If the number is exactly 10 digits long, prepend '+91'
  if (/^\d{10}$/.test(digitsOnly)) {
    return `+91${digitsOnly}`;
  }

  // If none of the conditions are met, return null (invalid number)
  return null;
};


/**
 * Validates and formats a mobile number to E.164 format.
 * @param phoneNumber - The input mobile number (e.g., "9876543210", "919876543210", "+919876543210").
 * @param countryCode - The default country code (e.g., "91" for India) to be added if missing.
 * @returns The formatted number in E.164 format (e.g., "+919876543210"), or null if invalid.
 */
const toE164Format = (phoneNumber: string, countryCode: string = "+91"): string | null => {
  // Remove all non-digit characters
  const digitsOnly = phoneNumber.replace(/\D/g, '');
  
  // Remove '+' from countryCode for internal comparison
  const strippedCountryCode = countryCode.replace(/\D/g, '');
  
  // If the number starts with the country code (without '+') and has correct length
  if (digitsOnly.startsWith(strippedCountryCode) && digitsOnly.length === strippedCountryCode.length + 10) {
      return `${countryCode}${digitsOnly.slice(strippedCountryCode.length)}`;
  }

  // If the number is exactly 10 digits long, assume it's a local number
  if (digitsOnly.length === 10) {
      return `${countryCode}${digitsOnly}`;
  }

  // If the number is already in E.164 format, return as-is
  if (/^\+\d{1,3}\d{10}$/.test(phoneNumber)) {
      return phoneNumber;
  }

  // If none of the conditions are met, return null (invalid number)
  return null;
};

  
export { formatIndianNumber, toE164Format };
