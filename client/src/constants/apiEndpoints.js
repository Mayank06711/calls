import env from '../config/env.config';


// Base URLs and API Version
 
export const API_CONFIG = {
  BASE_URL: env.API_BASE_URL,
  VERSION: env.API_VERSION,
};


// HTTP Methods
 
export const HTTP_METHODS = {
  GET: "GET",
  POST: "POST",
  PUT: "PUT",
  PATCH: "PATCH",
  DELETE: "DELETE",
};


 //API Endpoints
 

export const ENDPOINTS = {
  AUTH: {
    LOGIN: `/api/${API_CONFIG.VERSION}/users/login`,
    SIGNUP: `/api/${API_CONFIG.VERSION}/users/signup`,
    GENERATE_OTP: `/api/${API_CONFIG.VERSION}/auth/generate_otp`,
    VERIFY_OTP: `/api/${API_CONFIG.VERSION}/auth/verify_otp`,
    REFRESH_TOKEN: `/api/${API_CONFIG.VERSION}/auth/refresh_token`,
  },
  USERS: {
    PROFILE: `/api/${API_CONFIG.VERSION}/users/profile`,
    UPDATE: `/api/${API_CONFIG.VERSION}/users/profile`,
    GET_USER_BY_ID: `/api/${API_CONFIG.VERSION}/users/get_user_by_id`,
    GET_USER_BY_MOBILE: `/api/${API_CONFIG.VERSION}/users/get_user_by_mobile`,
    LOGOUT: `/api/${API_CONFIG.VERSION}/users/logout`,
  },

  AI: {
    PROCESS_CHAT: `/api/${API_CONFIG.VERSION}/auth/process`,
  },
  // Add more endpoint categories as needed
};


