export const SUBSCRIPTION_TYPES = ["Platinum", "Silver", "Gold"] as const;
export type SubscriptionTier = "Silver" | "Gold" | "Platinum" | "Free";

export const SUBSCRIPTION_CONFIG = {
  TIERS: {
    Platinum: {
      level: 3,
      duration: 365, // 1 year
      price: 999,
      features: [
        "Unlimited AI style recommendations",
        "8 one-on-one video consultations with top stylists monthly",
        "Priority booking for emergency style consultations",
        "Personalized wardrobe planning with AI",
        "Exclusive access to designer collaborations",
        "Virtual closet organization tools",
        "Trend forecasting reports",
        "Personal shopping assistance",
        "Style event invitations",
        "24/7 style emergency support",
        "Seasonal color analysis",
        "Body shape analysis with AI",
        "Outfit planning for special events",
      ],
      limits: {
        videoConsultations: -1, // unlimited
        aiCredits: -1, // unlimited
        styleReports: -1, // unlimited
        dailyRecommendations: "unlimited",
        outfitAnalysis: "unlimited",
        stylePreferences: "advanced",
      },
    },
    Gold: {
      level: 2,
      duration: 180, // 6 months
      price: 599,
      features: [
        "Advanced AI style suggestions",
        "4 video consultations with professional stylists monthly",
        "Priority support during business hours",
        "Digital wardrobe management",
        "Personalized shopping recommendations",
        "Access to style workshops",
        "Monthly trend updates",
        "Basic color analysis",
        "AI-powered outfit combinations",
      ],
      limits: {
        videoConsultations: 10,
        aiCredits: 500,
        styleReports: 100,
        dailyRecommendations: 50,
        outfitAnalysis: 100,
        stylePreferences: "intermediate",
      },
    },
    Silver: {
      level: 1,
      duration: 120, // 3 months
      price: 299,
      features: [
        "Basic AI style recommendations",
        "2 video consultations with stylists monthly",
        "Email style support",
        "Basic wardrobe organization tools",
        "Weekly style tips",
        "Access to style community",
        "Limited outfit suggestions",
      ],
      limits: {
        videoConsultations: 5,
        aiCredits: 200,
        styleReports: 50,
        dailyRecommendations: 20,
        outfitAnalysis: 40,
        stylePreferences: "basic",
      },
    },
    Free: {
      level: 0,
      duration: 30, // 30 days free trial
      price: 0,
      features: [
        "Basic AI style recommendations",
        "1 video consultation per month",
        "Community chat access",
        "Basic wardrobe tips",
        "Limited AI features trial",
      ],
      limits: {
        videoConsultations: 1, // 1 per month
        aiCredits: 50, // 50 credits for trial
        styleReports: 2, // 2 reports per month
        dailyRecommendations: 3, // 3 recommendations per day
        outfitAnalysis: 5, // 5 analyses per month
        stylePreferences: "basic",
      },
      trialFeatures: {
        extraVideoCallPrice: 29.99, // Price for additional video calls
        extraAiCreditsPrice: 9.99, // Price for 50 additional AI credits
        extraAnalysisPrice: 4.99, // Price per additional outfit analysis
        validityPeriod: 30, // Days before needing to upgrade
        maxExtraVideoCalls: 2, // Maximum additional video calls purchasable
        maxExtraAiCredits: 100, // Maximum additional AI credits purchasable
        restrictions: [
          "Must upgrade to paid tier after trial period",
          "Extra purchases do not extend trial period",
          "Unused credits expire after trial period",
        ],
      },
    },
  },
  PAYMENT_METHODS: [
    {
      id: "card",
      name: "Credit/Debit Card",
      enabled: true,
      supportedCards: ["visa", "mastercard", "rupay", "amex"],
    },
    {
      id: "upi",
      name: "UPI",
      enabled: true,
      supportedApps: ["gpay", "phonepe", "paytm"],
    },
    {
      id: "netbanking",
      name: "Net Banking",
      enabled: true,
    },
    {
      id: "wallet",
      name: "Digital Wallet",
      enabled: true,
      supportedWallets: ["paytm", "phonepe", "amazonpay"],
    },
  ],
  SUBSCRIPTION_RULES: {
    MINIMUM_DAYS_FOR_UPGRADE: 1,
    MAXIMUM_REFERRAL_DISCOUNT: 25,
    MINIMUM_AMOUNT: 0,
    STATUS_TRANSITIONS: {
      Pending: ["Active", "Cancelled"],
      Active: ["Cancelled", "Expired"],
      Cancelled: [],
      Expired: [],
    },
  },
  POLICIES: {
    CANCELLATION_POLICY: {
      allowedUntil: 7, // days after subscription start
      refundPolicy: "pro-rata",
      cooldownPeriod: 24, // hours to revert cancellation
      restrictions: [
        "Unused video consultations are non-refundable",
        "AI-generated recommendations will be archived",
        "Must cancel 7 days before next billing cycle",
        "Saved wardrobe data will be retained for 30 days",
      ],
      immediateEffects: [
        "Video consultation credits freeze immediately",
        "AI style recommendations limited to basic tier",
        "Platinum features access ends",
        "Scheduled consultations must be completed within 7 days",
      ],
    },
    REFUND_POLICY: {
      eligibilityPeriod: 7, // days
      processingTime: "5-7 business days",
      conditions: [
        "Technical issues affecting video consultations",
        "Stylist unavailability for scheduled sessions",
        "AI service downtime exceeding 24 hours",
        "Billing errors or unauthorized charges",
      ],
      exclusions: [
        "Completed video consultations",
        "Used AI recommendations",
        "Downloaded style guides",
        "Attended virtual events",
        "Special promotional subscriptions",
      ],
      refundMethods: [
        "Original payment method",
        "Style credits for future use",
        "Bank transfer (special cases)",
      ],
    },
    UPGRADE_POLICY: {
      allowedFrequency: "once per billing cycle",
      effectiveTime: "immediate",
      proratedBilling: true,
      benefits: [
        "Immediate access to additional video consultations",
        "Enhanced AI features unlock instantly",
        "Retained style history and preferences",
        "Priority booking status upgrade",
        "Access to Platinum style tools",
      ],
    },
    DOWNGRADE_POLICY: {
      allowedFrequency: "once per billing cycle",
      effectiveTime: "next billing cycle",
      restrictions: [
        "Must complete scheduled Platinum consultations",
        "AI recommendations history archived",
        "Platinum wardrobe features limited",
        "Style event registrations may be cancelled",
      ],
    },
  },
  VIDEO_CONSULTATION_RULES: {
    maxDuration: 45, // minutes
    rescheduleNotice: 24, // hours
    cancellationNotice: 12, // hours
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

export type HttpStatusCode = (typeof HTTP_STATUS)[keyof typeof HTTP_STATUS];

export const HTTP_STATUS = {
  OK: 200,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER: 500,
  NOT_IMPLEMENTED: 501,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
} as const;

export const DEFAULT_ERROR_MESSAGES = {
  400: "Invalid request. Please check your input.",
  401: "Authentication required. Please login.",
  403: "You don't have permission to access this resource.",
  404: "The requested resource was not found.",
  405: "This operation is not allowed.",
  409: "This operation caused a conflict.",
  422: "Unable to process the request.",
  429: "Too many requests. Please try again later.",
  500: "Something went wrong. Please try again later.",
  501: "This feature is not implemented yet.",
  502: "Bad gateway. Please try again later.",
  503: "Service temporarily unavailable.",
} as const;
