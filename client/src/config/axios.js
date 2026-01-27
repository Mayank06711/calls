import { API_CONFIG } from "../constants/apiEndpoints";
import { handleApiError } from "../utils/globalErrorHandler";
import axios from "axios";
import { getAccessToken } from "../utils/tokenManager";

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
  };

  // Create instance with merged config
  const instance = axios.create({
    baseURL: API_CONFIG.BASE_URL,
    headers: { ...defaultHeaders, ...headers },
    withCredentials: true, // Also send cookies for backward compatibility
    ...additionalConfig,
  });

  // Request interceptor - Always include Authorization header from localStorage
  // This ensures consistency between HTTP requests and socket connections
  instance.interceptors.request.use(
    (config) => {
      config.withCredentials = true;

      // Always include token from localStorage in Authorization header
      // This is the single source of truth for auth
      const token = getAccessToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }

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
    async (error) => {
      try {
        const processedError = await handleApiError(error, (failedConfig) => {
          return instance(failedConfig);
        });

        // If processedError is actually a successful response only for refreshToken case it would work
        if (processedError?.status === 200) {
          return processedError;
        }

        // Otherwise handle as error, names as normalErro means that its
        const normalErros = Promise.reject({
          data: processedError.data || null,
          error: {
            message: processedError.message || "Something went wrong",
            statusCode: processedError.status || 500,
            errors: processedError.errors || [],
          },
        });
        console.log("i am retry error", normalErros);
        return normalErros;
      } catch (handlingError) {
        // Handle any errors that occurred during error handling
        return Promise.reject({
          data: null,
          error: {
            message: handlingError.message || "Something went wrong",
            statusCode: handlingError.status || 500,
            errors: handlingError.errors || [],
          },
        });
      }
    }
  );

  return instance;
};

// Create default instance
const axiosDefaultInstance = createAxiosInstance();

export { axiosDefaultInstance, createAxiosInstance };
