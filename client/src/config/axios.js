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
    xsrfCookieName: "XSRF-TOKEN", // If your backend uses CSRF protection
    xsrfHeaderName: "X-XSRF-TOKEN",
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
      // Handle successful responses
      if (response.headers["set-cookie"]) {
        // Cookies will be automatically handled by the browser
        console.debug("Cookies received from server");
      }

      // Parse stringified JSON in body if it exists
      if (response.data?.body && typeof response.data.body === "string") {
        try {
          const parsedBody = JSON.parse(response.data.body);
          response.data.parsedBody = parsedBody;

          // Store user data if available in successful response
          if (parsedBody.success && parsedBody.data) {
            const { userId, mobNum } = parsedBody.data;
            if (userId) localStorage.setItem("userId", userId);
            if (mobNum) localStorage.setItem("mobNum", mobNum);
          }
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

// Create default instance
const axiosDefaultInstance = createAxiosInstance();

export { axiosDefaultInstance, createAxiosInstance };
