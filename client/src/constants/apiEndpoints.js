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
    GENERATE_EMAIL_OTP: `/api/${API_CONFIG.VERSION}/auth/generate_email_otp`,
    VERIFY_EMAIL_OTP: `/api/${API_CONFIG.VERSION}/auth/verify_email_otp`,
    GOOGLE_AUTH: `/api/${API_CONFIG.VERSION}/auth/google`,
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
    USAGE_TRACKING: `/api/${API_CONFIG.VERSION}/settings/usage-tracking`,
    ANALYTICS_PREFERENCES: `/api/${API_CONFIG.VERSION}/settings/analytics-preferences`,
    REELS_PREFERENCES: `/api/${API_CONFIG.VERSION}/settings/reels-preferences`,
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
  LEGAL: {
    TERMS: `/api/${API_CONFIG.VERSION}/legal/terms`, // GET
    PRIVACY: `/api/${API_CONFIG.VERSION}/legal/privacy`, // GET
  },
  CHAT: {
    REQUEST_STATUS: `/api/${API_CONFIG.VERSION}/chat/request-status`, // GET /:otherUserId
  },
  HISTORY: {
    // User endpoints
    CALLS: `/api/${API_CONFIG.VERSION}/history/calls`, // GET ?page=&limit=&status=
    SUBSCRIPTIONS: `/api/${API_CONFIG.VERSION}/history/subscriptions`, // GET
    PAYMENTS: `/api/${API_CONFIG.VERSION}/history/payments`, // GET ?page=&limit=
    SESSIONS: `/api/${API_CONFIG.VERSION}/history/sessions`, // GET ?page=&limit=&active=
    RATINGS: `/api/${API_CONFIG.VERSION}/history/ratings`, // GET ?page=&limit=
    // Expert endpoints
    EXPERT_PERFORMANCE: `/api/${API_CONFIG.VERSION}/history/expert/performance`, // GET
    EXPERT_EARNINGS: `/api/${API_CONFIG.VERSION}/history/expert/earnings`, // GET
    EXPERT_COMPLAINTS: `/api/${API_CONFIG.VERSION}/history/expert/complaints`, // GET ?page=&limit=
    EXPERT_SUMMARY: `/api/${API_CONFIG.VERSION}/history/expert/summary`, // GET
  },

  WARDROBE: {
    // Style Profile
    STYLE_PROFILE: `/api/${API_CONFIG.VERSION}/wardrobe/style-profile`, // PUT (upsert) / GET (fetch)
    PROFILE_OPTIONS: `/api/${API_CONFIG.VERSION}/wardrobe/profile-options`, // GET

    // Clothing Items
    CLOTHS: `/api/${API_CONFIG.VERSION}/wardrobe/cloths`, // GET (list) / POST (add)
    CLOTH_BY_ID: `/api/${API_CONFIG.VERSION}/wardrobe/cloths`, // GET /:id / PUT /:id / DELETE /:id
    CLOTH_OPTIONS: `/api/${API_CONFIG.VERSION}/wardrobe/cloth-options`, // GET

    // Outfits
    OUTFITS: `/api/${API_CONFIG.VERSION}/wardrobe/outfits`, // GET (list) / POST (create)
    OUTFIT_BY_ID: `/api/${API_CONFIG.VERSION}/wardrobe/outfits`, // GET /:id / PUT /:id / DELETE /:id

    // Suggestions
    SUGGEST_FULL_OUTFIT: `/api/${API_CONFIG.VERSION}/wardrobe/suggest/full-outfit`, // POST
    SUGGEST_FROM_ITEM: `/api/${API_CONFIG.VERSION}/wardrobe/suggest/from-item`, // POST
    SUGGEST_TOP: `/api/${API_CONFIG.VERSION}/wardrobe/suggest/top`, // POST
    SUGGEST_LAYER: `/api/${API_CONFIG.VERSION}/wardrobe/suggest/layer`, // POST
    SUGGEST_FOOTWEAR: `/api/${API_CONFIG.VERSION}/wardrobe/suggest/footwear`, // POST

    // Pairings
    GENERATE_PAIRINGS: `/api/${API_CONFIG.VERSION}/wardrobe/generate-pairings`, // POST
    SAVE_PAIRING: `/api/${API_CONFIG.VERSION}/wardrobe/save-pairing`, // POST

    // Wear Tracking
    WEAR_LOG: `/api/${API_CONFIG.VERSION}/wardrobe/wear-log`, // POST (log) / GET (history)
    WEAR_STATS: `/api/${API_CONFIG.VERSION}/wardrobe/wear-stats`, // GET
    PLANNED_WEARS: `/api/${API_CONFIG.VERSION}/wardrobe/planned-wears`, // GET / PATCH /:id/worn / PUT /:id / DELETE /:id

    // Upload
    GENERATE_UPLOAD_URL: `/api/${API_CONFIG.VERSION}/wardrobe/generate-upload-url`, // POST
    GENERATE_UPLOAD_URLS: `/api/${API_CONFIG.VERSION}/wardrobe/generate-upload-urls`, // POST (batch)

    // Batch
    CLOTHS_BATCH: `/api/${API_CONFIG.VERSION}/wardrobe/cloths/batch`, // POST (batch add)

    // Python AI Service (proxied)
    PROCESS_ITEM: `/api/${API_CONFIG.VERSION}/wardrobe/process-item`, // POST
    GENERATE_FLATLAY: `/api/${API_CONFIG.VERSION}/wardrobe/generate-flatlay`, // POST

    // Style DNA (AI Photo Analysis)
    STYLE_DNA_ANALYZE: `/api/${API_CONFIG.VERSION}/wardrobe/style-dna/analyze`, // POST
    STYLE_DNA: `/api/${API_CONFIG.VERSION}/wardrobe/style-dna`, // GET
    STYLE_DNA_AUTO_FILL: `/api/${API_CONFIG.VERSION}/wardrobe/style-dna/auto-fill-applied`, // PATCH

    // Product Catalog
    PRODUCT_CATALOG: `/api/${API_CONFIG.VERSION}/wardrobe/product-catalog`, // GET

    // Collections
    COLLECTIONS: `/api/${API_CONFIG.VERSION}/wardrobe/collections`, // GET (list) / POST (create)

    // Sharing
    SHARED_OUTFIT: `/api/${API_CONFIG.VERSION}/public/outfits`, // GET /:shareToken (public, no auth)
    LIKE_SHARED_OUTFIT: `/api/${API_CONFIG.VERSION}/public/outfits`, // POST /:shareToken/like (public, no auth)
    SAVE_SHARED_OUTFIT: `/api/${API_CONFIG.VERSION}/public/outfits`, // POST /:shareToken/save (auth required)
    SAVED_OUTFITS: `/api/${API_CONFIG.VERSION}/wardrobe/saved-outfits`, // GET (auth required)
  },

  EXPERT_APPLICATION: {
    SUBMIT: `/api/${API_CONFIG.VERSION}/expert-applications`, // POST
    MINE: `/api/${API_CONFIG.VERSION}/expert-applications/mine`, // GET / PUT
    WITHDRAW: `/api/${API_CONFIG.VERSION}/expert-applications/mine/withdraw`, // POST
  },

  EXPERT: {
    PROFILE: `/api/${API_CONFIG.VERSION}/expert/profile`, // GET / PUT
  },

  // ─── Admin Panel ──────────────────────────────────────────────────────────
  ADMIN: {
    LOGIN: `/api/${API_CONFIG.VERSION}/admins/login`, // POST
    REFRESH_TOKEN: `/api/${API_CONFIG.VERSION}/admins/refresh-token`, // POST

    // Dashboard
    DASHBOARD_OVERVIEW: `/api/${API_CONFIG.VERSION}/admins/dashboard/overview`,
    DASHBOARD_USER_GROWTH: `/api/${API_CONFIG.VERSION}/admins/dashboard/user-growth`,
    DASHBOARD_SUBSCRIPTION_REVENUE: `/api/${API_CONFIG.VERSION}/admins/dashboard/subscription-revenue`,
    DASHBOARD_EXPERT_STATS: `/api/${API_CONFIG.VERSION}/admins/dashboard/expert-stats`,
    DASHBOARD_PLATFORM_ACTIVITY: `/api/${API_CONFIG.VERSION}/admins/dashboard/platform-activity`,
    DASHBOARD_RECENT_ACTIVITY: `/api/${API_CONFIG.VERSION}/admins/dashboard/recent-activity`,

    // User Management
    USERS: `/api/${API_CONFIG.VERSION}/admins/manage-users`,
    USERS_SEARCH: `/api/${API_CONFIG.VERSION}/admins/manage-users/search`,
    USER_DETAIL: `/api/${API_CONFIG.VERSION}/admins/manage-users`, // /:userId
    USER_SESSIONS: `/api/${API_CONFIG.VERSION}/admins/manage-users`, // /:userId/sessions
    USER_FORCE_LOGOUT: `/api/${API_CONFIG.VERSION}/admins/manage-users`, // /:userId/force-logout
    USER_REACTIVATE: `/api/${API_CONFIG.VERSION}/admins/manage-users`, // /:userId/reactivate
    USER_SESSION_REVOKE: `/api/${API_CONFIG.VERSION}/admins/manage-users`, // /:userId/sessions/:sessionId/revoke
    USER_DELETE: `/api/${API_CONFIG.VERSION}/admins/manage-users`, // DELETE /:userId

    // Subscription Management
    SUBSCRIPTIONS: `/api/${API_CONFIG.VERSION}/admins/manage-subscriptions`,
    SUBSCRIPTIONS_STATS: `/api/${API_CONFIG.VERSION}/admins/manage-subscriptions/stats`,
    SUBSCRIPTION_DETAIL: `/api/${API_CONFIG.VERSION}/admins/manage-subscriptions`, // /:subscriptionId
    SUBSCRIPTION_USER: `/api/${API_CONFIG.VERSION}/admins/manage-subscriptions/user`, // /:userId
    SUBSCRIPTION_EXTEND: `/api/${API_CONFIG.VERSION}/admins/manage-subscriptions`, // /:subscriptionId/extend

    // Feedback Management
    BUG_REPORTS: `/api/${API_CONFIG.VERSION}/admins/manage-feedback/bug-reports`, // GET (list) / GET /:bugId (detail)
    FEEDBACK_EXPERT_REVIEWS: `/api/${API_CONFIG.VERSION}/admins/manage-feedback/expert-reviews`,
    FEEDBACK_EXPERT_REVIEWS_STATS: `/api/${API_CONFIG.VERSION}/admins/manage-feedback/expert-reviews/stats`,
    FEEDBACK_DELETE_REVIEW: `/api/${API_CONFIG.VERSION}/admins/manage-feedback/expert-reviews`, // DELETE /:feedbackId

    // Complaint Management
    COMPLAINTS: `/api/${API_CONFIG.VERSION}/admins/manage-complaints/list`,
    COMPLAINTS_STATS: `/api/${API_CONFIG.VERSION}/admins/manage-complaints/stats`,
    COMPLAINT_DETAIL: `/api/${API_CONFIG.VERSION}/admins/manage-complaints`, // /:complaintId
    COMPLAINTS_BY_EXPERT: `/api/${API_CONFIG.VERSION}/admins/manage-complaints/expert`, // /:expertId

    // Session Management
    SESSIONS: `/api/${API_CONFIG.VERSION}/admins/manage-sessions`,
    SESSIONS_STATS: `/api/${API_CONFIG.VERSION}/admins/manage-sessions/stats`,
    SESSION_REVOKE: `/api/${API_CONFIG.VERSION}/admins/manage-sessions`, // /:sessionId/revoke
    SESSIONS_REVOKE_BULK: `/api/${API_CONFIG.VERSION}/admins/manage-sessions/revoke-bulk`,

    // Wardrobe Analytics
    WARDROBE_STATS: `/api/${API_CONFIG.VERSION}/admins/wardrobe-analytics/stats`,
    WARDROBE_TRENDS: `/api/${API_CONFIG.VERSION}/admins/wardrobe-analytics/trends`,
    WARDROBE_AI_USAGE: `/api/${API_CONFIG.VERSION}/admins/wardrobe-analytics/ai-usage`,
    WARDROBE_USER: `/api/${API_CONFIG.VERSION}/admins/wardrobe-analytics/user`, // /:userId

    // Notification Management
    NOTIFICATIONS: `/api/${API_CONFIG.VERSION}/admins/manage-notifications`,
    NOTIFICATIONS_STATS: `/api/${API_CONFIG.VERSION}/admins/manage-notifications/stats`,
    NOTIFICATION_DETAIL: `/api/${API_CONFIG.VERSION}/admins/manage-notifications`, // /:notificationId

    // Existing admin endpoints (from adminController)
    SEND_NOTIFICATION: `/api/${API_CONFIG.VERSION}/admins/notifications/send`,
    SEND_USER_NOTIFICATION: `/api/${API_CONFIG.VERSION}/admins/notifications/send/user`,
    ALL_ADMINS: `/api/${API_CONFIG.VERSION}/admins/all`,
    UPGRADE_TO_ADMIN: `/api/${API_CONFIG.VERSION}/admins/upgrade`,
    DEACTIVATE_ADMIN: `/api/${API_CONFIG.VERSION}/admins`, // POST /:targetAdminId/deactivate
    REACTIVATE_ADMIN: `/api/${API_CONFIG.VERSION}/admins`, // POST /:targetAdminId/reactivate
    RESET_ADMIN_KEY: `/api/${API_CONFIG.VERSION}/admins`, // POST /:targetAdminId/reset-key
    BLOCK_USER: `/api/${API_CONFIG.VERSION}/admins/users`, // POST /:userId/block
    UNBLOCK_USER: `/api/${API_CONFIG.VERSION}/admins/users`, // POST /:userId/unblock
    BLOCKED_USERS: `/api/${API_CONFIG.VERSION}/admins/users/blocked`,
    EXPERT_APPLICATIONS: `/api/${API_CONFIG.VERSION}/admins/expert-applications`,
    EXPERT_BLOCK_REQUESTS: `/api/${API_CONFIG.VERSION}/admins/expert-block-requests`,
    BLOCK_EXPERT: `/api/${API_CONFIG.VERSION}/admins/block-expert`,

    // Bug feedback (existing)
    ALL_FEEDBACK: `/api/${API_CONFIG.VERSION}/feedback/all`,
    FEEDBACK_STATS: `/api/${API_CONFIG.VERSION}/feedback/stats`,
  },
};
