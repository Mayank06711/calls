import { API_CONFIG } from '../constants/apiEndpoints';
import { handleApiError } from "../utils/globalErrorHandler";
import axios from 'axios';

/**
 * Creates a configured axios instance
 * @param {Object} options
 * @param {Object} [options.headers] - Custom headers
 * @param {boolean} [options.withCredentials] - Whether to include credentials
 * @param {Object} [options.additionalConfig] - Any additional axios config options
 * @returns {import('axios').AxiosInstance}
 */
const createAxiosInstance = ({
  headers = {},
  withCredentials = false,
  additionalConfig = {},
} = {}) => {
  // Merge default headers with custom headers
  const defaultHeaders = {
    "Content-Type": "application/json",
  };

  const mergedHeaders = {
    ...defaultHeaders,
    ...headers,
  };

  // Create instance with merged config
  const instance = axios.create({
    baseURL: API_CONFIG.BASE_URL,
    headers: mergedHeaders,
    withCredentials,
    ...additionalConfig,
  });

  // Response interceptor
  instance.interceptors.response.use(
    (response) => {
      // Parse stringified JSON in body if it exists
      if (response.data?.body && typeof response.data.body === "string") {
        try {
          response.data.parsedBody = JSON.parse(response.data.body);
        } catch (error) {
          console.warn("Failed to parse response body:", error);
        }
      }
      return response;
    },
    (error) => {
      return Promise.reject(handleApiError(error));
    }
  );

  return instance;
};

// Export default instance with standard JSON configuration
const axiosDefaultInstance = createAxiosInstance();

// Export the factory function for custom instances
export { axiosDefaultInstance, createAxiosInstance };
