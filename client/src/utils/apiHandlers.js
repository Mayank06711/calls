
import { createAxiosInstance,axiosDefaultInstance } from "../config/axios.js";
/**
 * Generic utility function to make HTTP requests
 * @param {string} method - HTTP method (GET, POST, PUT, PATCH, DELETE)
 * @param {string} url - API endpoint URL
 * @param {Object} [payload] - Data to be sent to the backend (not used in GET/DELETE)
 * @param {boolean} [useCustomConfig=false] - Whether to use custom configuration (true) or default (false)
 * @param {Object} [config] - Custom axios configuration
 * @param {Object} [config.headers] - Custom headers
 * @param {boolean} [config.withCredentials] - Whether to include credentials
 * @param {Object} [config.additionalConfig] - Any additional axios config options
 * @returns {Promise} API response
 */
export const makeRequest = async (
  method = "GET",
  url,
  payload = null,
  useCustomConfig = false,
  config = {}
) => {
  try {
    const axiosInstance = useCustomConfig
      ? createAxiosInstance(config)
      : axiosDefaultInstance;

    const upperMethod = method.toUpperCase();

    // For GET and DELETE requests, payload should be passed as params
    if (upperMethod === "GET" || upperMethod === "DELETE") {
      const requestConfig = payload ? { params: payload } : {};
      const response = await axiosInstance[method.toLowerCase()](
        url,
        requestConfig
      );
      return response.data;
    }

    // For POST, PUT, PATCH requests
    const response = await axiosInstance[method.toLowerCase()](url, payload);
    return response.data;
  } catch (error) {
    throw error;
  }
};
