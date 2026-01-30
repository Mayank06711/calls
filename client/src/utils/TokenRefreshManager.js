import { makeRequest } from "./apiHandlers";
import { HTTP_METHODS, ENDPOINTS } from "../constants/apiEndpoints";
import store from "../redux/store";
import { clearUserId, showNotification } from "../redux/actions";

class TokenRefreshManager {
  // Modern approach using static block
  //   static {
  //     this.instance = null;
  //   }

  constructor() {
    this.isRefreshing = false;
    this.refreshSubscribers = [];
  }

  //   singleton pattern to ensure single instance of class

  static getInstance() {
    if (!TokenRefreshManager.instance) {
      TokenRefreshManager.instance = new TokenRefreshManager();
    }
    return TokenRefreshManager.instance;
  }

  // Add a dedicated method for clearing auth data
  clearClientStorage() {
    try {
      localStorage.removeItem("token");
      localStorage.removeItem("userId");
      localStorage.removeItem("userInfo");
      this.refreshSubscribers = [];

      store.dispatch(clearUserId());
      store.dispatch(
        showNotification("Your Previus session expired, please login.", 401)
      );

      // Force redirect to login — Redux route guard may not trigger
      // if a component's error UI is already rendered
      setTimeout(() => {
        if (window.location.pathname !== "/login" && window.location.pathname !== "/") {
          window.location.href = "/login";
        }
      }, 500);
    } catch (error) {
      console.error("Error clearing client storage:", error);
    }
  }

  addSubscriber(callback) {
    this.refreshSubscribers.push(callback);
  }

  notifySubscribers(token) {
    this.refreshSubscribers.forEach((callback) => callback(token));
    this.refreshSubscribers = [];
  }

  // Network errors (server unreachable) should NOT trigger logout —
  // the session may still be valid, the server is just down.
  _isNetworkError(error) {
    // No response from server at all (ERR_CONNECTION_REFUSED, ERR_NETWORK, timeout, etc.)
    return !error.response && (error.request || error.code === "ERR_NETWORK" || error.message === "Network Error");
  }

  async refreshAccessToken() {
    try {
      // If refresh is already in progress, wait for it
      if (this.isRefreshing) {
        return new Promise((resolve) => this.addSubscriber(resolve));
      }

      this.isRefreshing = true;

      const response = await makeRequest(
        HTTP_METHODS.POST,
        ENDPOINTS.AUTH.REFRESH_TOKEN
      );

      // Check if the response has data and success is true
      if (response?.data?.success && response.data.data?.token) {
        const newAccessToken = response.data.data.token;

        if (localStorage.token) {
          localStorage.setItem("token", newAccessToken);
        }

        this.notifySubscribers(newAccessToken);
        return newAccessToken;
      }
      this.clearClientStorage();
      throw new Error("Invalid token refresh response");
    } catch (error) {
      if (this._isNetworkError(error)) {
        // Server is unreachable — don't logout, session may still be valid
        console.warn("[TokenRefresh] Network error during refresh, not clearing session:", error.message);
        this.refreshSubscribers = [];
        throw error;
      }

      // Actual server response (401, 500, etc.) — session is truly invalid
      this.clearClientStorage();
      this.refreshSubscribers = [];

      throw error;
    } finally {
      this.isRefreshing = false;
    }
  }
}
// This is tradinal method of declaring static varibles in js , suppproted by almost all browsers
TokenRefreshManager.instance = null;

// Create and export singleton instance
export const tokenRefreshManager = TokenRefreshManager.getInstance();
