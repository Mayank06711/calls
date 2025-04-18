import { API_CONFIG } from "../constants/apiEndpoints";
import { handleApiError } from "../utils/globalErrorHandler";
import axios from "axios";

/**
 * Creates a configured axios instance
 * @param {Object} [config] - Configuration options
 * @param {Object} [config.headers] - Custom headers
 * @param {Object} [config.additionalConfig] - Any additional axios config options
 * @returns {import('axios').AxiosInstance}
 */
const createAxiosInstance = (config = {}) => {
  const { headers = {}, additionalConfig = {} } = config;

  // Default headers
  const defaultHeaders = {
    "Content-Type": "application/json",
    // Add any other default headers needed
  };

  // Create instance with merged config
  const instance = axios.create({
    baseURL: API_CONFIG.BASE_URL,
    headers: { ...defaultHeaders, ...headers },
    withCredentials: true, // Always true to handle HTTP-only cookies
    ...additionalConfig,
  });

  // Request interceptor
  instance.interceptors.request.use(
    (config) => {
      // Ensure withCredentials is always true
      config.withCredentials = true;
      return config;
    },
    (error) => Promise.reject(error)
  );

  // Response interceptor
  instance.interceptors.response.use(
    (response) => {
      // Parse stringified JSON in body if it exists
      if (response.data?.body && typeof response.data.body === "string") {
        try {
          const parsedBody = JSON.parse(response.data.body);
          response.data = {
            data: parsedBody,
            error: null,
            statusCode: response.data.statusCode || response.status,
          };
          // Store user data if available in successful response
          if (parsedBody.success && parsedBody.data) {
            const { userId } = parsedBody.data;
            if (userId) localStorage.setItem("userId", userId);
          }
        } catch (error) {
          console.warn("Failed to parse response body:", error);
        }
      } else {
        // Handle non-stringified responses
        response.data = {
          data: response.data,
          error: null,
          statusCode: response.status,
        };
      }
      return response;
    },
    (error) => {
      const processedError = handleApiError(error);
      return Promise.reject({
        data: null,
        error: {
          message: processedError.message || "Something went wrong",
          statusCode: error.response?.status || 500,
          errors: processedError.errors || [],
        },
      });
    }
  );

  return instance;
};

// Create default instance
const axiosDefaultInstance = createAxiosInstance();

export { axiosDefaultInstance, createAxiosInstance };
