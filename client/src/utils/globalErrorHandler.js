// client/src/utils/globalErrorHandler.js
import { tokenRefreshManager } from "./TokenRefreshManager";
import { ENDPOINTS } from "../constants/apiEndpoints";

export class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

export const handleApiError = async (error, retryRequest = null) => {
  // If it's already an ApiError instance, return it
  if (error instanceof ApiError) {
    return error;
  }

  if (error.response) {
    let errorMessage;
    let errorData = error.response.data;

    // Skip token refresh for auth routes — user isn't logged in yet
    const isAuthRoute = error.config?.url && (
      error.config.url.includes("/auth/verify_otp") ||
      error.config.url.includes("/auth/generate_otp") ||
      error.config.url.includes("/auth/verify_email_otp") ||
      error.config.url.includes("/auth/generate_email_otp") ||
      error.config.url.includes("/auth/google") ||
      error.config.url.includes("/auth/refresh_token")
    );

    // Only handle 401 errors for token refresh
    if (
      error.response.status === 401 &&
      error.config &&
      !error.config._retry &&
      !isAuthRoute
    ) {
      error.config._retry = true;

      try {
        const newToken = await tokenRefreshManager.refreshAccessToken();

        if (newToken && typeof retryRequest === "function") {
          try {
            // Retry the request with new token
            const retryResponse = await retryRequest(error.config);
            return retryResponse;
          } catch (retryError) {
            // Network error on retry — server went down between refresh and retry
            if (tokenRefreshManager._isNetworkError(retryError)) {
              return new ApiError("Server is unreachable. Please check your connection.", 503, {
                errors: ["Network error"],
                isNetworkError: true,
              });
            }
            // If retry fails with non-401 error, return that error without logging out
            if (retryError.response?.status !== 401) {
              return new ApiError(
                retryError.response?.data?.message ||
                  "Request failed after token refresh",
                retryError.response?.status || 500,
                retryError.response?.data
              );
            }
            // Only clear storage if retry fails with 401
            tokenRefreshManager.clearClientStorage();
            return new ApiError("Session expired. Please login again.", 401, {
              errors: ["Authentication failed"],
            });
          }
        }
      } catch (refreshError) {
        // Network error (server down) — don't logout, just report the error
        if (tokenRefreshManager._isNetworkError(refreshError)) {
          console.warn("[handleApiError] Refresh failed due to network error, keeping session");
          return new ApiError("Server is unreachable. Please check your connection.", 503, {
            errors: ["Network error"],
            isNetworkError: true,
          });
        }
        // Actual auth failure — clear storage and redirect to login
        tokenRefreshManager.clearClientStorage();
        console.log(refreshError, "refreshError");
        return new ApiError(`Session expired. Please login again.`, 401, {
          errors: [`Authentication failed ${refreshError}`],
        });
      }
    }

    // For non-401 errors, just return the error without clearing storage
    errorMessage =
      errorMessage ||
      error.response.data?.message ||
      error.response.data?.error ||
      "Server error occurred";

    return new ApiError(errorMessage, error.response.status, errorData);
  } else if (error.request) {
    return new ApiError("No response from server", 503, error.request);
  } else {
    return new ApiError(error.message || "Request failed", 500);
  }
};
