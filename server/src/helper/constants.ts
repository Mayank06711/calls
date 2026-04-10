export const SUBSCRIPTION_TYPES = [
  "Platinum",
  "Gold",
  "Silver",
  "Free",
] as const;
export type SubscriptionTier = "Platinum" | "Gold" | "Silver" | "Free";

export const SUBSCRIPTION_CONFIG = {
  // ── Credits-based tiers (flat price, no duration) ─────────────────────────
  // Each paid tier is a one-time credit bundle purchase that also grants
  // tier-level feature access for `tierDurationDays` (30 days).
  TIERS: {
    Platinum: {
      level: 3,
      price: 899,              // flat INR price
      creditsGranted: 5000,
      tierDurationDays: 30,    // tier benefits last 30 days from purchase
      features: {
        "AI Style Recommendations": "Unlimited",
        'Video Chat Consultations': "7 Videos per day",
        "Community Access": "Unlimited",
        "Wardrobe Tips": "Premium Tips",
        "Digital Wardrobe Tools": "All Premium Tools",
        "Email Support": "24/7 Priority",
        "Style Workshops": "Unlimited Access",
        "Trend Updates": "3 Per day",
        "Color Analysis": "Advanced Analysis",
        "Outfit Suggestions": "Unlimited",
        "Emergency Consultations": "3 Per day",
        "Designer Collaborations": "VIP Access",
        "Personal Shopping": "Dedicated Service",
        "Style Events": "VIP Access (3/month)",
        "Body Shape Analysis": "Advanced Analysis",
      },
      limits: {
        "Video Calls Per Month": 210,
        "AI Credits Per Month": "Unlimited",
        "Style Reports Per Month": "Unlimited",
        "Daily Outfit Suggestions": "Unlimited",
        "Wardrobe Items Limit": 1000,
        "Priority Queue Position": "Top",
      },
      support: {
        "Response Time": "5 Minutes",
        "Support Channels": "3 Priority Channels",
        "Priority Level": "Top",
        "Dedicated Stylist": "1 Highest Rated",
      },
    },
    Gold: {
      level: 2,
      price: 499,              // flat INR price
      creditsGranted: 1500,
      tierDurationDays: 30,
      features: {
        "AI Style Recommendations": "50 per day",
        'Video Chat Consultations': "4 Videos per day",
        "Community Access": "Full Access",
        "Wardrobe Tips": "Advanced Tips",
        "Digital Wardrobe Tools": "Advanced Tools",
        "Email Support": "Priority",
        "Style Workshops": "15 per month",
        "Trend Updates": "2 Per day",
        "Color Analysis": "Advanced Analysis",
        "Outfit Suggestions": "50 per day",
        "Emergency Consultations": "1 Per day",
        "Designer Collaborations": "Basic Access",
        "Personal Shopping": "Available",
        "Style Events": "Priority Access (1/month)",
        "Body Shape Analysis": "Standard Analysis",
      },
      limits: {
        "Video Calls Per Month": 120,
        "AI Credits Per Month": 1500,
        "Style Reports Per Month": 50,
        "Daily Outfit Suggestions": 50,
        "Wardrobe Items Limit": 500,
        "Priority Queue Position": "High",
      },
      support: {
        "Response Time": "2 Hours",
        "Support Channels": "2 Priority Channels",
        "Priority Level": "High",
        "Dedicated Stylist": "Shared Pool",
      },
    },
    Silver: {
      level: 1,
      price: 249,              // flat INR price
      creditsGranted: 600,
      tierDurationDays: 30,
      features: {
        "AI Style Recommendations": "20 per day",
        'Video Chat Consultations': "2 Videos per day",
        "Community Access": "Basic Access",
        "Wardrobe Tips": "Basic Tips",
        "Digital Wardrobe Tools": "Basic Tools",
        "Email Support": "Standard",
        "Style Workshops": "5 per month",
        "Trend Updates": "1 Per day",
        "Color Analysis": "Basic Analysis",
        "Outfit Suggestions": "20 per day",
        "Emergency Consultations": "2 Per month",
        "Designer Collaborations": "View Only",
        "Personal Shopping": "Basic",
        "Style Events": "Regular Access",
        "Body Shape Analysis": "Basic Analysis",
      },
      limits: {
        "Video Calls Per Month": 60,
        "AI Credits Per Month": 600,
        "Style Reports Per Month": 20,
        "Daily Outfit Suggestions": 20,
        "Wardrobe Items Limit": 200,
        "Priority Queue Position": "Standard",
      },
      support: {
        "Response Time": "24 Hours",
        "Support Channels": "Email + Chat",
        "Priority Level": "Standard",
        "Dedicated Stylist": "No",
      },
    },
    Free: {
      level: 0,
      price: 0,
      creditsGranted: 90,      // signup grant
      tierDurationDays: null,   // permanent until upgrade
      features: {
        "AI Style Recommendations": "Trial (3/day)", // 0 = trial
        'Video Chat Consultations': "1 Trial Call", // 0 = trial
        "Community Access": "Read Only", // 0 = limited
        "Wardrobe Tips": "Basic Tips Only", // 0 = basic
        "Digital Wardrobe Tools": "Preview Only", // 0 = preview
        "Email Support": "Basic", // 0 = basic
        "Style Workshops": "Preview Only", // 0 = preview
        "Trend Updates": "Weekly Only", // 0 = limited
        "Color Analysis": "Basic Only", // 0 = basic
        "Outfit Suggestions": "3 per day", // 0 = trial
        "Emergency Consultations": "Not Available", // 0 = none
        "Designer Collaborations": "Not Available", // 0 = none
        "Personal Shopping": "Not Available", // 0 = none
        "Style Events": "Not Available", // 0 = none
        "Body Shape Analysis": "Basic Only", // 0 = basic
      },
      limits: {
        "Video Calls Per Month": 1,
        "AI Credits Per Month": 90, // 3 per day for 30 days
        "Style Reports Per Month": 3,
        "Daily Outfit Suggestions": 3,
        "Wardrobe Items Limit": 50,
        "Priority Queue Position": "Basic",
      },
      support: {
        "Response Time": "48 Hours",
        "Support Channels": "Email Only",
        "Priority Level": "Basic",
        "Dedicated Stylist": "No",
      },
    },
  },
  SUBSCRIPTION_RULES: {
    TIER_DURATION_DAYS: 30,           // paid tiers last 30 days
    MAXIMUM_REFERRAL_BONUS_CREDITS: 100,
    FEATURE_LEVELS: {
      0: "Not Available/Trial",
      1: "Basic",
      2: "Advanced",
      3: "Unlimited",
    },
    STATUS_TRANSITIONS: {
      Pending: ["Active", "Cancelled"],
      Active: ["Cancelled", "Expired"],
      Cancelled: [],
      Expired: [],
    },
  },
  PAYMENT_METHODS: {
    card: {
      enabled: true,
      supportedTypes: ["visa", "mastercard", "rupay", "amex"],
    },
    upi: {
      enabled: true,
      supportedApps: ["gpay", "phonepe", "paytm"],
    },
    netbanking: {
      enabled: true,
    },
    wallet: {
      enabled: true,
      supportedWallets: ["paytm", "phonepe", "amazonpay"],
    },
  },
  POLICIES: {
    CREDITS_NON_REFUNDABLE: true,
    TIER_PURCHASE_NOTE: "Credits are granted immediately. Tier benefits last 30 days from purchase date.",
  },
  VIDEO_CONSULTATION_RULES: {
    maxDuration: 45,
    rescheduleNotice: 24,
    cancellationNotice: 12,
    latePenalty: "counts as completed session",
    specialistTypes: [
      "Personal Stylist",
      "Fashion Consultant",
      "Color Analyst",
      "Wardrobe Organizer",
    ],
  },
  AI_FEATURES: {
    dailyRecommendations: {
      Platinum: "unlimited",
      Gold: 50,
      Silver: 20,
      Free: 5,
    },
    outfitAnalysis: {
      Platinum: "unlimited",
      Gold: 100,
      Silver: 40,
      Free: 10,
    },
    stylePreferences: {
      Platinum: "advanced",
      Gold: "intermediate",
      Silver: "basic",
      Free: "essential",
    },
  },
} as const;

// ── Call configuration ──────────────────────────────────────────
export const CALL_CONFIG = {
  /** Hard cap per single call (seconds). Server auto-hangs up. */
  MAX_CALL_DURATION_SECONDS: 30 * 60, // 30 minutes
  /** Seconds before auto-hangup at which warnings are sent to both parties. */
  WARNING_AT_SECONDS: [25 * 60, 29 * 60], // 5-min and 1-min warnings
  /** After user grants permission, expert has this many seconds to initiate the call. */
  EXPERT_PERMISSION_WINDOW_SECONDS: 5 * 60, // 5 minutes
  /** How long the phone rings before auto-miss. */
  RING_TIMEOUT_SECONDS: 30,
  /** Default expert billing rate (USD per minute). Overridable per expert later. */
  EXPERT_RATE_PER_MINUTE: 5,
  /** Whether monthly count limits apply to expert calls. */
  EXPERT_CALL_LIMITS_APPLY: true,
  /** Whether monthly count limits apply to user-to-user calls (false = unlimited for paid). */
  USER_CALL_LIMITS_APPLY: false,
} as const;
