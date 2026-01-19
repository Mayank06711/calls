import env from "../config/env.config";

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
    EMAIL_VERIFICATION: `/api/${API_CONFIG.VERSION}/users/email_verification`,
    ALL_USERS: `/api/${API_CONFIG.VERSION}/users/all-users`,
  },

  AI: {
    PROCESS_CHAT: `/api/${API_CONFIG.VERSION}/auth/process`,
  },

  SUBCRIPTIONS: {
    CREATE_SUBSCRIPTION: `/api/${API_CONFIG.VERSION}/subscriptions/create`, //post
    CURRENT_SUBSCRIPTION: `/api/${API_CONFIG.VERSION}/subscriptions/current`, //get
    CANCEL_SUBSCRIPTION: `/api/${API_CONFIG.VERSION}/subscriptions/cancel`, //post
    // POST /api/subscriptions/cancel/:subscriptionId
    UPDATE_SUBSCRIPTION: `/api/${API_CONFIG.VERSION}/subscriptions/`, //post
    // POST /api/subscriptions/payment-status/:subscriptionId
    PLANS_SUBSCRIPTION: `/api/${API_CONFIG.VERSION}/subscriptions/plans`, //get
    HISTORY_SUBSCRIPTION: `/api/${API_CONFIG.VERSION}/subscriptions/history`, //get
    DETAILS_SUBSCRIPTION: `/api/${API_CONFIG.VERSION}/subscriptions/delails`, //get
    // GET /api/subscriptions/details/:subscriptionId
    CONFIG_SUBSCRIPTION: `/api/${API_CONFIG.VERSION}/subscriptions/config`, //get
  },

  SETTINGS: {
    INITIALIZE: `/api/${API_CONFIG.VERSION}/settings/initialize`, //POST
    FETCH: `/api/${API_CONFIG.VERSION}/settings/fetch`, //GET
    STYLE_OPTIONS: `/api/${API_CONFIG.VERSION}/settings/style-options`, //GET - returns available style options based on subscription

    // Category-specific endpoints, ALL Patch-specific endpoints
    THEME: `/api/${API_CONFIG.VERSION}/settings/theme`,
    NOTIFICATIONS: `/api/${API_CONFIG.VERSION}/settings/notifications`,
    PRIVACY: `/api/${API_CONFIG.VERSION}/settings/privacy`,
    PREFERENCES: `/api/${API_CONFIG.VERSION}/settings/preferences`,
    LAYOUT: `/api/${API_CONFIG.VERSION}/settings/layout`,
    ACCESSIBILITY: `/api/${API_CONFIG.VERSION}/settings/accessibility`,
  },

  SESSIONS: {
    GET_ALL: `/api/${API_CONFIG.VERSION}/sessions`, // GET - get all active sessions
    STATS: `/api/${API_CONFIG.VERSION}/sessions/stats`, // GET - get session statistics
    REVOKE: `/api/${API_CONFIG.VERSION}/sessions`, // DELETE /:sessionId - revoke specific session
    REVOKE_ALL: `/api/${API_CONFIG.VERSION}/sessions/revoke-all`, // POST - revoke all sessions
  },

  FEEDBACK: {
    // Public routes (no auth required)
    SUBMIT_BUG: `/api/${API_CONFIG.VERSION}/feedback/bug`, // POST
    SUBMIT_GENERAL: `/api/${API_CONFIG.VERSION}/feedback/general`, // POST

    // Protected routes (auth required)
    SUBMIT_EXPERT: `/api/${API_CONFIG.VERSION}/feedback/expert`, // POST
    GET_USER_FEEDBACK: `/api/${API_CONFIG.VERSION}/feedback/my-feedback`, // GET

    // Admin/Developer routes (auth + admin required)
    GET_ALL_FEEDBACK: `/api/${API_CONFIG.VERSION}/feedback/all`, // GET
    GET_FEEDBACK_STATS: `/api/${API_CONFIG.VERSION}/feedback/stats`, // GET
    UPDATE_FEEDBACK: `/api/${API_CONFIG.VERSION}/feedback`, // PUT
    ASSIGN_FEEDBACK: `/api/${API_CONFIG.VERSION}/feedback`, // PUT
    MARK_AS_FIXED: `/api/${API_CONFIG.VERSION}/feedback`, // PUT
    DELETE_FEEDBACK: `/api/${API_CONFIG.VERSION}/feedback`, // DELETE

    // Developer routes
    GET_ASSIGNED_FEEDBACK: `/api/${API_CONFIG.VERSION}/feedback/assigned`, // GET
  },
  // Add more endpoint categories as needed
};
