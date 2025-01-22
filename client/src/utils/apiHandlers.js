import { createAxiosInstance, axiosDefaultInstance } from "../config/axios.js";
/**
 * Generic utility function to make HTTP requests
 * @param {string} method - HTTP method (GET, POST, PUT, PATCH, DELETE)
 * @param {string} url - API endpoint URL
 * @param {Object} [payload] - Data to be sent to the backend
 * @param {Object} [config] - Custom axios configuration
 * @param {Object} [config.headers] - Custom headers
 * @param {Object} [config.additionalConfig] - Any additional axios config options
 * @returns {Promise} API response
 */
export const makeRequest = async (
  method = "GET",
  url,
  payload = null,
  config = {}
) => {
  try {
    // Use custom instance if config is provided, otherwise use default
    const axiosInstance =
      Object.keys(config).length > 0
        ? createAxiosInstance(config)
        : axiosDefaultInstance;

    const upperMethod = method.toUpperCase();

    // For GET and DELETE requests, payload should be passed as params
    if (upperMethod === "GET" || upperMethod === "DELETE") {
      const response = await axiosInstance[method.toLowerCase()](url, payload ? {
        params: payload,
      } : undefined);
      return response.data;
    }

    // For POST, PUT, PATCH requests
    const response = await axiosInstance[method.toLowerCase()](url, payload);
    return response.data;
  } catch (error) {
    console.error("Error in api handler:", error);

    // Handle 401 Unauthorized errors specifically
    if (error.response?.status === 401) {
      const errorMessage =
        error.response.data?.message ||
        (error.response.data?.body &&
          JSON.parse(error.response.data.body)?.message) ||
        "Unauthorized access";
      throw new ApiError(errorMessage, 401, error.response.data);
    }

    // Handle other errors with stringified body
    if (
      error.response?.data?.body &&
      typeof error.response.data.body === "string"
    ) {
      try {
        const parsedError = JSON.parse(error.response.data.body);
        throw new ApiError(
          parsedError.message || "Request failed",
          error.response.status,
          parsedError
        );
      } catch (parseError) {
        console.warn("Failed to parse error body:", parseError);
      }
    }

    throw error;
  }
};
