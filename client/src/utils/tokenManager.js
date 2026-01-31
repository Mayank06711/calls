/**
 * Token Manager - Handles token storage and retrieval consistency
 * Ensures localStorage and cookie tokens are in sync
 */

const TOKEN_KEY = "token";
const USER_ID_KEY = "userId";

/**
 * Get the current access token
 * Prefers localStorage as single source of truth
 * @returns {string|null} The access token or null
 */
export const getAccessToken = () => {
  return localStorage.getItem(TOKEN_KEY);
};

/**
 * Set the access token in localStorage
 * @param {string} token - The access token to store
 */
export const setAccessToken = (token) => {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  }
};

/**
 * Remove the access token from localStorage
 */
export const removeAccessToken = () => {
  localStorage.removeItem(TOKEN_KEY);
};

/**
 * Get the current user ID
 * @returns {string|null} The user ID or null
 */
export const getUserId = () => {
  return localStorage.getItem(USER_ID_KEY);
};

/**
 * Set the user ID in localStorage
 * @param {string} userId - The user ID to store
 */
export const setUserId = (userId) => {
  if (userId) {
    localStorage.setItem(USER_ID_KEY, userId);
  }
};

/**
 * Remove the user ID from localStorage
 */
export const removeUserId = () => {
  localStorage.removeItem(USER_ID_KEY);
};

/**
 * Clear all auth-related data from localStorage
 */
export const clearAuthData = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_ID_KEY);
  localStorage.removeItem("mobNum");
  localStorage.removeItem("isAlreadyVerified");
  localStorage.removeItem("isEmailVerified");
  localStorage.removeItem("isTourCompleted");
  localStorage.removeItem("fullName");
};

/**
 * Check if user is authenticated (has token)
 * @returns {boolean} True if user has a token
 */
export const isAuthenticated = () => {
  return !!getAccessToken();
};

/**
 * Listen for storage changes (multi-tab sync)
 * @param {Function} callback - Called when auth state changes
 * @returns {Function} Cleanup function
 */
export const onAuthChange = (callback) => {
  const handler = (event) => {
    if (event.key === TOKEN_KEY || event.key === USER_ID_KEY) {
      callback({
        token: getAccessToken(),
        userId: getUserId(),
        isAuthenticated: isAuthenticated(),
      });
    }
  };

  window.addEventListener("storage", handler);
  return () => window.removeEventListener("storage", handler);
};

export default {
  getAccessToken,
  setAccessToken,
  removeAccessToken,
  getUserId,
  setUserId,
  removeUserId,
  clearAuthData,
  isAuthenticated,
  onAuthChange,
};
