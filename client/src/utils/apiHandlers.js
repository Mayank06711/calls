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
      const response = await axiosInstance[method.toLowerCase()](
        url,
        payload
          ? {
              params: payload,
            }
          : undefined
      );
      return response.data;
    }

    // For POST, PUT, PATCH requests
    const response = await axiosInstance[method.toLowerCase()](url, payload);
    console.log("response from makereuest", response);
    return response.data;
  } catch (error) {
    console.error("Error in api handler:", error);
    // If error is already in our format, return it directly
    if (error.data !== undefined && error.error !== undefined) {
      return error;
    }
    // Otherwise, format the error
    return {
      data: null,
      error: {
        message: error.message || "Something went wrong",
        statusCode: error.response?.status || 500,
        errors: error.errors || [],
      },
    };
  }
};
