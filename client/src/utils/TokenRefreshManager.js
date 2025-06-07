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
      this.refreshSubscribers = [];

      store.dispatch(clearUserId());
      store.dispatch(
        showNotification("Your Previus session expired, please login.", 401)
      );
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
      // Clear auth data on any refresh error
      this.clearClientStorage();
      this.refreshSubscribers = []; // Clear subscribers on error

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
