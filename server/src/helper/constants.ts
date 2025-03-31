export const SUBSCRIPTION_TYPES = [
  "Platinum",
  "Gold",
  "Silver",
  "Free",
] as const;
export type SubscriptionTier = "Platinum" | "Gold" | "Silver" | "Free";

export const SUBSCRIPTION_CONFIG = {
  TIERS: {
    Platinum: {
      level: 3,
      dailyPricing: [
        { minDays: 7, maxDays: 15, pricePerDay: 24 },
        { minDays: 16, maxDays: 30, pricePerDay: 20 },
        { minDays: 31, maxDays: 90, pricePerDay: 13 },
        { minDays: 91, maxDays: 180, pricePerDay: 10 },
        { minDays: 181, maxDays: 365, pricePerDay: 8 },
      ],
      features: {
        aiStyleRecommendations: 3, // 3 = unlimited
        videoChatConsultations: 8, // 8 per month
        communityAccess: 3, // 3 = full access
        wardrobeTips: 3, // 3 = advanced tips
        digitalWardrobeTools: 3, // 3 = all tools
        emailSupport: 3, // 3 = priority
        styleWorkshops: 3, // 3 = unlimited access
        trendUpdates: 3, // 3 = daily updates
        colorAnalysis: 3, // 3 = advanced analysis
        outfitSuggestions: 3, // 3 = unlimited
        emergencyConsultations: 2, // 2 = available
        designerCollaborations: 2, // 2 = access
        personalShopping: 2, // 2 = available
        styleEvents: 2, // 2 = VIP access
        bodyShapeAnalysis: 2, // 2 = advanced
      },
      limits: {
        videoCallsPerMonth: -1, // unlimited
        aiCreditsPerMonth: -1, // unlimited
        styleReportsPerMonth: -1, // unlimited
        dailyOutfitSuggestions: -1, // unlimited
        wardrobeItemsLimit: 1000,
        priorityQueuePosition: 1,
      },
      support: {
        responseTime: 1, // 1 hour
        supportChannels: 3, // all channels
        priorityLevel: 3, // highest
        dedicatedStylist: 2, // yes
      },
    },
    Gold: {
      level: 2,
      dailyPricing: [
        { minDays: 7, maxDays: 15, pricePerDay: 14 },
        { minDays: 16, maxDays: 30, pricePerDay: 12 },
        { minDays: 31, maxDays: 90, pricePerDay: 8 },
        { minDays: 91, maxDays: 180, pricePerDay: 6 },
        { minDays: 181, maxDays: 365, pricePerDay: 5 },
      ],
      features: {
        aiStyleRecommendations: 2, // 2 = advanced
        videoChatConsultations: 4, // 4 per month
        communityAccess: 2, // 2 = enhanced access
        wardrobeTips: 2, // 2 = intermediate tips
        digitalWardrobeTools: 2, // 2 = enhanced tools
        emailSupport: 2, // 2 = priority
        styleWorkshops: 2, // 2 = limited access
        trendUpdates: 2, // 2 = weekly updates
        colorAnalysis: 2, // 2 = basic analysis
        outfitSuggestions: 2, // 2 = enhanced
        emergencyConsultations: 1, // 1 = limited
        designerCollaborations: 1, // 1 = limited
        personalShopping: 1, // 1 = basic
        styleEvents: 1, // 1 = basic access
        bodyShapeAnalysis: 1, // 1 = basic
      },
      limits: {
        videoCallsPerMonth: 10,
        aiCreditsPerMonth: 500,
        styleReportsPerMonth: 100,
        dailyOutfitSuggestions: 50,
        wardrobeItemsLimit: 500,
        priorityQueuePosition: 2,
      },
      support: {
        responseTime: 4, // 4 hours
        supportChannels: 2, // email + chat
        priorityLevel: 2, // medium
        dedicatedStylist: 1, // shared
      },
    },
    Silver: {
      level: 1,
      dailyPricing: [
        { minDays: 7, maxDays: 15, pricePerDay: 9 },
        { minDays: 16, maxDays: 30, pricePerDay: 7 },
        { minDays: 31, maxDays: 90, pricePerDay: 3 },
        { minDays: 91, maxDays: 180, pricePerDay: 2.5 },
        { minDays: 181, maxDays: 365, pricePerDay: 2 },
      ],
      features: {
        aiStyleRecommendations: 1, // 1 = basic
        videoChatConsultations: 2, // 2 per month
        communityAccess: 1, // 1 = basic access
        wardrobeTips: 1, // 1 = basic tips
        digitalWardrobeTools: 1, // 1 = basic tools
        emailSupport: 1, // 1 = standard
        styleWorkshops: 1, // 1 = basic access
        trendUpdates: 1, // 1 = monthly updates
        colorAnalysis: 1, // 1 = basic
        outfitSuggestions: 1, // 1 = basic
        emergencyConsultations: 0, // 0 = not available
        designerCollaborations: 0, // 0 = not available
        personalShopping: 0, // 0 = not available
        styleEvents: 0, // 0 = not available
        bodyShapeAnalysis: 0, // 0 = not available
      },
      limits: {
        videoCallsPerMonth: 5,
        aiCreditsPerMonth: 200,
        styleReportsPerMonth: 50,
        dailyOutfitSuggestions: 20,
        wardrobeItemsLimit: 200,
        priorityQueuePosition: 3,
      },
      support: {
        responseTime: 24, // 24 hours
        supportChannels: 1, // email only
        priorityLevel: 1, // low
        dedicatedStylist: 0, // no
      },
    },
    Free: {
      level: 0,
      features: {
        aiStyleRecommendations: 0, // 0 = trial
        videoChatConsultations: 1, // 1 per month
        communityAccess: 0, // 0 = limited
        wardrobeTips: 0, // 0 = basic
        digitalWardrobeTools: 0, // 0 = basic
        emailSupport: 0, // 0 = basic
        styleWorkshops: 0, // 0 = none
        trendUpdates: 0, // 0 = none
        colorAnalysis: 0, // 0 = none
        outfitSuggestions: 0, // 0 = limited
        emergencyConsultations: 0, // 0 = not available
        designerCollaborations: 0, // 0 = not available
        personalShopping: 0, // 0 = not available
        styleEvents: 0, // 0 = not available
        bodyShapeAnalysis: 0, // 0 = not available
      },
      limits: {
        videoCallsPerMonth: 1,
        aiCreditsPerMonth: 50,
        styleReportsPerMonth: 2,
        dailyOutfitSuggestions: 3,
        wardrobeItemsLimit: 50,
        priorityQueuePosition: 4,
      },
      support: {
        responseTime: 48, // 48 hours
        supportChannels: 0, // community only
        priorityLevel: 0, // lowest
        dedicatedStylist: 0, // no
      },
      duration: 7, // 7 days trial
    },
  },
  SUBSCRIPTION_RULES: {
    MINIMUM_DAYS: 7,
    MAXIMUM_DAYS: 365,
    MAXIMUM_REFERRAL_DISCOUNT: 25,
    MINIMUM_AMOUNT: 0,
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
