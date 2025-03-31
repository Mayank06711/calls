export const SUBSCRIPTION_TYPES = ["Platinum", "Gold", "Silver", "Free"] as const;
export type SubscriptionTier = "Platinum" | "Gold" | "Silver" | "Free";

export const SUBSCRIPTION_CONFIG = {
  TIERS: {
    Platinum: {
      level: 3,
      duration: 365, // 1 year
      price: 999,
      features: [
        // Common Features (Available in all plans)
        "Basic AI style recommendations",
        "Community chat access",
        "Basic wardrobe tips",
        "Digital wardrobe management",
        
        // Silver+ Features
        "Email style support",
        "Weekly style tips",
        "Basic wardrobe organization tools",
        "Limited outfit suggestions",
        
        // Gold+ Features
        "Advanced AI style suggestions",
        "Priority support during business hours",
        "Access to style workshops",
        "Monthly trend updates",
        "Basic color analysis",
        "AI-powered outfit combinations",
        
        // Platinum Exclusive Features
        "Unlimited AI style recommendations",
        "8 one-on-one video consultations monthly",
        "Priority booking for emergency consultations",
        "Personalized wardrobe planning with AI",
        "Exclusive designer collaborations",
        "Virtual closet organization tools",
        "Trend forecasting reports",
        "Personal shopping assistance",
        "Style event invitations",
        "24/7 style emergency support",
        "Seasonal color analysis",
        "Body shape analysis with AI",
        "Outfit planning for special events"
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
        // Common Features
        "Basic AI style recommendations",
        "Community chat access",
        "Basic wardrobe tips",
        "Digital wardrobe management",
        
        // Silver+ Features
        "Email style support",
        "Weekly style tips",
        "Basic wardrobe organization tools",
        "Limited outfit suggestions",
        
        // Gold Features
        "Advanced AI style suggestions",
        "4 video consultations monthly",
        "Priority support during business hours",
        "Access to style workshops",
        "Monthly trend updates",
        "Basic color analysis",
        "AI-powered outfit combinations"
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
        // Common Features
        "Basic AI style recommendations",
        "Community chat access",
        "Basic wardrobe tips",
        "Digital wardrobe management",
        
        // Silver Features
        "2 video consultations monthly",
        "Email style support",
        "Weekly style tips",
        "Basic wardrobe organization tools",
        "Limited outfit suggestions"
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
        // Basic Features Only
        "Basic AI style recommendations",
        "1 video consultation per month",
        "Community chat access",
        "Basic wardrobe tips",
        "Limited AI features trial"
      ],
      limits: {
        videoConsultations: 1,
        aiCredits: 50,
        styleReports: 2,
        dailyRecommendations: 3,
        outfitAnalysis: 5,
        stylePreferences: "basic",
      },
      trialFeatures: {
        extraVideoCallPrice: 29.99,
        extraAiCreditsPrice: 9.99,
        extraAnalysisPrice: 4.99,
        validityPeriod: 30,
        maxExtraVideoCalls: 2,
        maxExtraAiCredits: 100,
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
      allowedUntil: 7,
      refundPolicy: "pro-rata",
      cooldownPeriod: 24,
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
      eligibilityPeriod: 7,
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