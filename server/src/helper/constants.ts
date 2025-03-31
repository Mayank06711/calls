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
        aiStyleRecommendations: "Unlimited",
        videoChatConsultations: "7 Videos per day",
        communityAccess: "Unlimited",
        wardrobeTips: "Unlimited",
        digitalWardrobeTools: "All",
        emailSupport: "Unlimited",
        styleWorkshops: "Unlimited",
        trendUpdates: "3 Per day",
        colorAnalysis: "Unlimited",
        outfitSuggestions: "Unlimited",
        emergencyConsultations: "3 Per day",
        designerCollaborations: "Unlimited",
        personalShopping: "Unlimited",
        styleEvents: "3 Per month",
        bodyShapeAnalysis: "Unlimited",
      },
      limits: {
        videoCallsPerMonth: 210,
        aiCreditsPerMonth: "Unlimited",
        styleReportsPerMonth: "Unlimited",
        dailyOutfitSuggestions: "Unlimited",
        wardrobeItemsLimit: 1000,
        priorityQueuePosition: "Top",
      },
      support: {
        responseTime: "Max 5 Minutes", // 1 hour
        supportChannels: "3 Priority Channels", // all channels
        priorityLevel: "Top", // highest
        dedicatedStylist: "1 Highest Rated", // yes
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
        aiStyleRecommendations: "Limited to 50/day",
        videoChatConsultations: "4 Videos per day",
        communityAccess: "Full Access",
        wardrobeTips: "Advanced",
        digitalWardrobeTools: "Standard Set",
        emailSupport: "Priority",
        styleWorkshops: "15 per month",
        trendUpdates: "2 Per day",
        colorAnalysis: "Advanced",
        outfitSuggestions: "50 per day",
        emergencyConsultations: "1 Per day",
        designerCollaborations: "Basic Access",
        personalShopping: "Available",
        styleEvents: "1 Per month",
        bodyShapeAnalysis: "Standard",
      },
      limits: {
        videoCallsPerMonth: 120,
        aiCreditsPerMonth: 1500,
        styleReportsPerMonth: 50,
        dailyOutfitSuggestions: 50,
        wardrobeItemsLimit: 500,
        priorityQueuePosition: "High",
      },
      support: {
        responseTime: "2 Hours",
        supportChannels: "2 Priority Channels",
        priorityLevel: "High",
        dedicatedStylist: "Shared Pool",
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
        aiStyleRecommendations: "Limited to 20/day",
        videoChatConsultations: "2 Videos per day",
        communityAccess: "Basic Access",
        wardrobeTips: "Basic",
        digitalWardrobeTools: "Basic Set",
        emailSupport: "Standard",
        styleWorkshops: "5 per month",
        trendUpdates: "1 Per day",
        colorAnalysis: "Basic",
        outfitSuggestions: "20 per day",
        emergencyConsultations: "2 Per month",
        designerCollaborations: "View Only",
        personalShopping: "Basic",
        styleEvents: "Regular Access",
        bodyShapeAnalysis: "Basic",
      },
      limits: {
        videoCallsPerMonth: 60,
        aiCreditsPerMonth: 600,
        styleReportsPerMonth: 20,
        dailyOutfitSuggestions: 20,
        wardrobeItemsLimit: 200,
        priorityQueuePosition: "Standard",
      },
      support: {
        responseTime: "24 Hours",
        supportChannels: "Email + Chat",
        priorityLevel: "Standard",
        dedicatedStylist: "No",
      },
    },
    Free: {
      level: 0,
      duration: 7, // 7 days trial
      dailyPricing: [
        { minDays: 7, maxDays: 15, pricePerDay: 24 },
        { minDays: 16, maxDays: 30, pricePerDay: 20 },
        { minDays: 31, maxDays: 90, pricePerDay: 13 },
        { minDays: 91, maxDays: 180, pricePerDay: 10 },
        { minDays: 181, maxDays: 365, pricePerDay: 8 },
      ],
      features: {
        aiStyleRecommendations: "Trial (3/day)", // 0 = trial
        videoChatConsultations: "1 Trial Call", // 0 = trial
        communityAccess: "Read Only", // 0 = limited
        wardrobeTips: "Basic Tips Only", // 0 = basic
        digitalWardrobeTools: "Preview Only", // 0 = preview
        emailSupport: "Basic", // 0 = basic
        styleWorkshops: "Preview Only", // 0 = preview
        trendUpdates: "Weekly Only", // 0 = limited
        colorAnalysis: "Basic Only", // 0 = basic
        outfitSuggestions: "3 per day", // 0 = trial
        emergencyConsultations: "Not Available", // 0 = none
        designerCollaborations: "Not Available", // 0 = none
        personalShopping: "Not Available", // 0 = none
        styleEvents: "Not Available", // 0 = none
        bodyShapeAnalysis: "Basic Only", // 0 = basic
      },
      limits: {
        videoCallsPerMonth: 1,
        aiCreditsPerMonth: 90, // 3 per day for 30 days
        styleReportsPerMonth: 3,
        dailyOutfitSuggestions: 3,
        wardrobeItemsLimit: 50,
        priorityQueuePosition: "Basic",
      },
      support: {
        responseTime: "48 Hours",
        supportChannels: "Email Only",
        priorityLevel: "Basic",
        dedicatedStylist: "No",
      },
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
