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
      dailyPricing: [
        { minDays: 7, maxDays: 15, pricePerDay: 14 },
        { minDays: 16, maxDays: 30, pricePerDay: 12 },
        { minDays: 31, maxDays: 90, pricePerDay: 8 },
        { minDays: 91, maxDays: 180, pricePerDay: 6 },
        { minDays: 181, maxDays: 365, pricePerDay: 5 },
      ],
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
      dailyPricing: [
        { minDays: 7, maxDays: 15, pricePerDay: 9 },
        { minDays: 16, maxDays: 30, pricePerDay: 7 },
        { minDays: 31, maxDays: 90, pricePerDay: 3 },
        { minDays: 91, maxDays: 180, pricePerDay: 2.5 },
        { minDays: 181, maxDays: 365, pricePerDay: 2 },
      ],
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
      duration: 7, // 7 days trial
      dailyPricing: [
        { minDays: 7, maxDays: 15, pricePerDay: 24 },
        { minDays: 16, maxDays: 30, pricePerDay: 20 },
        { minDays: 31, maxDays: 90, pricePerDay: 13 },
        { minDays: 91, maxDays: 180, pricePerDay: 10 },
        { minDays: 181, maxDays: 365, pricePerDay: 8 },
      ],
      features: {
        "AI Style Recommendations": "Trial (3/day)", // 0 = trial
        'Video Chat Consultations': "1 Trial Call", // 0 = trial
        "Community Access": "Read Only", // 0 = limited
        "Wardrobe Tips": "Basic Tips Only", // 0 = basic
        "Digital Wardrobe Tools": "Preview Only", // 0 = preview
        "Email Support": "Basic", // 0 = basic
        "Style Workshops": "Preview Only", // 0 = preview
        "Tend Updates": "Weekly Only", // 0 = limited
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
