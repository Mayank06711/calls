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

    // Only handle 401 errors for token refresh
    if (
      error.response.status === 401 &&
      error.config &&
      !error.config._retry &&
      error.config.url !== ENDPOINTS.AUTH.REFRESH_TOKEN
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
        // Only clear storage on refresh token failure
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
