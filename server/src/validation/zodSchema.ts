import { z } from "zod";
import { Request, Response, NextFunction } from "express";
import { ApiError } from "../utils/apiError";

// ─── Validation Middleware ───────────────────────────────────────────────────

/**
 * Express middleware that validates req.body against a Zod schema.
 * On failure, throws ApiError(400) with the first validation error message.
 */
export const validate = (schema: z.ZodSchema) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const firstError = result.error.errors[0];
      throw new ApiError(400, firstError.message);
    }
    req.body = result.data;
    next();
  };
};

/**
 * Validates req.params against a Zod schema.
 */
export const validateParams = (schema: z.ZodSchema) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.params);
    if (!result.success) {
      const firstError = result.error.errors[0];
      throw new ApiError(400, firstError.message);
    }
    next();
  };
};

// ─── Reusable Primitives ────────────────────────────────────────────────────

const mongoId = z.string().min(1, "ID is required").regex(/^[a-f\d]{24}$/i, "Invalid ID format");
const phoneNumber = z.string().min(1, "Phone number is required");
const emailField = z.string().email("Invalid email address");

// ─── User Schema (existing, unchanged) ──────────────────────────────────────

const UserSchema = z.object({
  fullName: z.string().min(1, "Full name is required"),
  username: z.string().min(1, "Username is required"),
  email: emailField.min(11, "Email is required"),
  phoneNumber: phoneNumber,
  password: z.string().min(1, "Password is required"),
  gender: z.enum(["Male", "Female", "Other"], {
    required_error: "Gender is required",
  }),
  age: z.number().int().min(0, "Age must be a positive number").nonnegative("Age is required"),
  city: z.string().min(1, "City is required"),
  country: z.string().default("India"),
  refreshToken: z.string().optional(),
  photo: z
    .object({
      key: z.string(),
      url: z.string().url("Invalid URL format"),
    })
    .optional(),
  referral: z.string().optional(),
});

// ─── Auth Schemas ───────────────────────────────────────────────────────────

const GenerateOtpSchema = z.object({
  mobNum: phoneNumber,
  isTesting: z.boolean({ required_error: "isTesting must be a boolean" }),
  verifyOnly: z.boolean().optional(),
});

const VerifyOtpSchema = z.object({
  referenceId: z.string().min(1, "Reference ID is required"),
  mobNum: phoneNumber,
  otp: z.string().min(1, "OTP is required"),
  verifyOnly: z.boolean().optional(),
});

const GenerateEmailOtpSchema = z.object({
  email: z.string().email("Invalid email address").min(1, "Email is required"),
  isTesting: z.boolean({ required_error: "isTesting must be a boolean" }),
});

const VerifyEmailOtpSchema = z.object({
  referenceId: z.string().min(1, "Reference ID is required"),
  email: z.string().email("Invalid email address").min(1, "Email is required"),
  otp: z.string().length(6, "OTP must be 6 digits"),
  verifyOnly: z.boolean().optional(),
});

const GoogleAuthSchema = z.object({
  idToken: z.string().min(1, "Google ID token is required"),
});

// ─── User Endpoint Schemas ──────────────────────────────────────────────────

const SignUpSchema = z.object({
  username: z.string({ required_error: "Username is required" }).min(1, "Username is required"),
  fullName: z.string().optional(),
  password: z.string({ required_error: "Password is required" }).min(1, "Password is required"),
  email: z.string({ required_error: "Email is required" }).email("Invalid email address"),
});

const VerifyEmailSchema = z.object({
  email: emailField,
  final_path: z.string().optional(),
});

const GetUserByIdSchema = z.object({
  id: mongoId,
});

// ─── Feedback Schemas ───────────────────────────────────────────────────────

const BugFeedbackSchema = z.object({
  userId: z.string().optional(),
  email: emailField.optional(),
  message: z.string().min(10, "Message must be at least 10 characters long"),
  bugType: z.enum(
    ["UI Issue", "Crash", "Performance", "Suggestion", "Security", "Functionality", "Other"],
    { required_error: "Bug type is required" }
  ),
  customBugType: z.string().optional(),
  severity: z.enum(["Critical", "High", "Medium", "Low"]).default("Medium"),
  browserInfo: z.string().optional(),
  osInfo: z.string().optional(),
  screenResolution: z.string().optional(),
  appVersion: z.string().optional(),
  location: z.any().optional(),
  attachmentUrls: z.array(z.string().url()).optional(),
  stepsToReproduce: z.string().optional(),
}).refine(
  (data) => data.bugType !== "Other" || (data.bugType === "Other" && data.customBugType),
  { message: "Custom bug type is required when bug type is 'Other'", path: ["customBugType"] }
);

const ExpertFeedbackSchema = z.object({
  userId: mongoId,
  expertId: mongoId,
  message: z.string().min(10, "Message must be at least 10 characters long"),
  stars: z.number().int().min(1, "Stars must be between 1 and 5").max(5, "Stars must be between 1 and 5"),
  aspects: z.any().optional(),
  sessionId: z.string().optional(),
  sessionDuration: z.number().optional(),
  attachmentUrl: z.string().url().optional(),
});

// ─── Admin Schemas ──────────────────────────────────────────────────────────

const UpgradeToAdminSchema = z.object({
  targetUserId: mongoId,
  adminKey: z.string().min(8, "Admin key must be at least 8 characters"),
  position: z.enum(["superadmin", "operationshead", "agent"]).optional(),
});

const AdminLoginSchema = z.object({
  adminKey: z.string().min(1, "Admin key is required"),
});

const UserIdParamSchema = z.object({
  userId: mongoId,
});

const AdminBulkSessionRevokeSchema = z.object({
  sessionIds: z.array(z.string().min(1)).min(1, "At least one session ID required").max(100, "Maximum 100 sessions per batch"),
  reason: z.string().optional(),
});

const AdminSubscriptionExtendSchema = z.object({
  days: z.number().int().min(1, "Must extend by at least 1 day").max(365, "Maximum 365 days"),
  reason: z.string().min(1, "Reason is required"),
});

const SendNotificationSchema = z.object({
  type: z.string().min(1, "Notification type is required"),
  title: z.string().optional(),
  message: z.string().min(1, "Message is required"),
  product: z.any().optional(),
  severity: z.string().optional(),
  extLink: z.string().optional(),
  stickyTime: z.number().optional(),
});

const SendUserNotificationSchema = z.object({
  recipientId: z.string().min(1, "Recipient ID is required"),
  type: z.string().min(1, "Notification type is required"),
  title: z.string().optional(),
  message: z.string().min(1, "Message is required"),
  product: z.any().optional(),
  severity: z.string().optional(),
  extLink: z.string().optional(),
  stickyTime: z.number().optional(),
});

// ─── Wardrobe Schemas ──────────────────────────────────────────────────────

const AddClothSchema = z.object({
  type: z.enum(["Top", "Bottom", "Shoes", "Accessory", "Outerwear", "Full Body"], {
    required_error: "Clothing type is required",
  }),
  subcategory: z.string().min(1, "Subcategory is required").trim(),
  photoUrl: z.string().url("Invalid photo URL"),
  thumbnailUrl: z.string().url("Invalid thumbnail URL").optional(),
  color: z.string().trim().optional(),
  pattern: z.enum(["Solid", "Striped", "Checked", "Floral", "Embroidered", "Polka Dot", "Abstract", "Printed"]).optional(),
  fabric: z.enum(["Cotton", "Silk", "Linen", "Denim", "Wool", "Polyester", "Chiffon", "Velvet", "Satin", "Leather", "Georgette", "Crepe", "Khadi", "Other"]).optional(),
  brand: z.string().trim().optional(),
  notes: z.string().trim().max(500, "Notes must be under 500 characters").optional(),
  season: z.enum(["Summer", "Winter", "Monsoon", "All"]).default("All"),
  occasions: z.array(z.enum(["Wedding", "Office", "Casual", "Party", "Travel", "Festive", "Date Night", "Sports", "Lounge"])).optional(),
  price: z.number().min(0).optional(),
  purchaseDate: z.string().datetime().optional(),

  // ─── Phase 7: Python AI Service (all optional) ───────────────────────
  hasPersonInPhoto: z.boolean().default(false),
  processingStatus: z.enum(["pending", "completed", "failed"]).optional(),
  nobgUrl: z.string().url("Invalid nobg URL").optional(),
  dominantColors: z.array(z.object({
    hex: z.string(),
    rgb: z.tuple([z.number(), z.number(), z.number()]),
    name: z.string(),
    colorFamily: z.string().optional(),
    colorType: z.string().optional(),
    percentage: z.number()
  })).optional(),
  processingMeta: z.object({
    method: z.string(),
    originalDimensions: z.object({ width: z.number(), height: z.number() }),
    croppedDimensions: z.object({ width: z.number(), height: z.number() }),
    skinDetected: z.object({
      toneHex: z.string(),
      ratio: z.number()
    }).optional(),
    processedAt: z.string().datetime()
  }).optional(),
});

const UpdateClothSchema = AddClothSchema.partial();

const CreateOutfitSchema = z.object({
  name: z.string().trim().nullable().optional(),
  itemIds: z.array(mongoId).min(2, "An outfit needs at least 2 items"),
  occasion: z.string().trim().nullable().optional(),
  season: z.string().trim().nullable().optional(),
  tags: z.array(z.string().trim()).default([]),
  notes: z.string().trim().nullable().optional(),
  source: z.enum(["manual", "ai_suggested", "engine_suggested", "builder", "builder-slots"]).default("manual"),

  // ─── Phase 7: Python AI Service (all optional) ───────────────────────
  flatlayUrl: z.string().url("Invalid flatlay URL").nullable().optional(),
  colorPalette: z.array(z.object({
    hex: z.string(),
    rgb: z.tuple([z.number(), z.number(), z.number()]),
    name: z.string(),
    colorFamily: z.string().nullable().optional(),
    colorType: z.string().nullable().optional(),
    slot: z.string()
  })).nullable().optional(),
  generatedAt: z.string().datetime().nullable().optional(),
});

const UpdateOutfitSchema = CreateOutfitSchema.partial();

const MeasurementsSchema = z.object({
  bust: z.number().min(0).optional(),
  waist: z.number().min(0).optional(),
  hips: z.number().min(0).optional(),
  inseam: z.number().min(0).optional(),
  shoulderWidth: z.number().min(0).optional(),
}).optional();

const StyleProfileSchema = z.object({
  // ── Required (engine core — unchanged) ───────────────────────────────
  bodyShape: z.enum(["Trapezoid", "Rectangle", "Triangle", "Inverted_Triangle", "Oval", "Hourglass", "Pear", "Apple"], {
    required_error: "Body shape is required",
  }),
  height: z.enum(["Short", "Medium", "Tall"], { required_error: "Height is required" }),
  skinTone: z.enum(["Fair", "Wheatish", "Dusky", "Dark Brown"], { required_error: "Skin tone is required" }),
  undertone: z.enum(["Warm", "Cool", "Olive", "Neutral"], { required_error: "Undertone is required" }),
  ageGroup: z.enum(["GenZ (16-25)", "Young Adult (26-35)", "Mid-Aged (36-50)", "Senior (50+)"], {
    required_error: "Age group is required",
  }),
  fitPreference: z.enum(["Slim Fit", "Regular Fit", "Oversized"], { required_error: "Fit preference is required" }),
  styleVibe: z.enum(["Classic", "Trendy", "Desi", "Fusion", "Old Money"], { required_error: "Style vibe is required" }),

  // ── Optional Tier 1 (onboarding, skippable) ─────────────────────────
  faceShape: z.enum(["Oval", "Round", "Square", "Heart", "Diamond", "Oblong", "Triangle"]).optional(),
  hairType: z.enum([
    "Straight Fine", "Straight Medium", "Straight Coarse",
    "Wavy Fine", "Wavy Medium", "Wavy Coarse",
    "Curly Loose", "Curly Springy", "Curly Tight",
    "Coily Soft", "Coily Zigzag", "Coily Dense",
  ]).optional(),
  hairLength: z.enum(["Bald", "Very Short", "Short", "Medium", "Long", "Very Long"]).optional(),
  hairColor: z.enum([
    "Black", "Dark Brown", "Medium Brown", "Light Brown", "Blonde",
    "Red", "Gray/Silver", "White", "Highlighted", "Colored/Dyed",
  ]).optional(),
  eyeShape: z.enum(["Almond", "Round", "Hooded", "Upturned", "Downturned", "Monolid", "Deep Set"]).optional(),
  lipShape: z.enum(["Full", "Thin", "Cupids Bow", "Heart", "Wide", "Round", "Bottom Heavy", "Top Heavy"]).optional(),
  colorPaletteSeason: z.enum(["Spring", "Summer", "Autumn", "Winter"]).optional(),

  // ── Optional Tier 2 (progressive disclosure) ────────────────────────
  measurements: MeasurementsSchema,
  heightExact: z.number().min(50).max(250).optional(),
  weight: z.number().min(20).max(300).optional(),
  fabricPreferences: z.array(z.enum(["Natural & Breathable", "Luxury", "Easy Care", "Performance", "Sustainable"])).optional(),
  fabricSensitivities: z.array(z.enum(["Wool", "Synthetic", "Chemical Dye", "Rough Texture", "None"])).optional(),
  colorPreferences: z.array(z.enum(["Neutrals", "Earth Tones", "Pastels", "Jewel Tones", "Brights", "Metallics"])).optional(),
  budgetRange: z.enum(["Ultra Budget", "Budget", "Moderate", "Mid Luxury", "Luxury"]).optional(),
  lifestyleTypes: z.array(z.enum(["Office Formal", "Office Casual", "Work From Home", "Casual", "Athletic", "Social Events", "Parent Life"])).optional(),
  fashionChallenges: z.array(z.enum(["Finding Fit", "Body Confidence", "Color Confusion", "Budget", "Time"])).optional(),
  favoritePatterns: z.array(z.enum(["Solid", "Striped", "Checked", "Floral", "Embroidered", "Polka Dot", "Abstract", "Printed"])).optional(),
  necklinePreferences: z.array(z.enum(["V-Neck", "Scoop", "Crew", "Boat", "Off-Shoulder", "Turtleneck", "Mandarin", "Sweetheart"])).optional(),
  modestyCoverage: z.enum(["Very Modest", "Moderate", "Standard", "Less Coverage"]).optional(),
  favoriteBrands: z.string().trim().optional(),
  styleInspiration: z.string().trim().optional(),
});

const SuggestFullOutfitSchema = z.object({
  occasion: z.string().min(1, "Occasion is required"),
  season: z.enum(["Summer", "Winter", "Monsoon", "auto"], { required_error: "Season is required" }),
});

const SuggestFromItemSchema = z.object({
  clothingItemId: mongoId,
  occasion: z.string().min(1, "Occasion is required"),
  season: z.enum(["Summer", "Winter", "Monsoon", "auto"], { required_error: "Season is required" }),
});

const SuggestLayerSchema = z.object({
  clothingItemId: mongoId,
  occasion: z.string().min(1, "Occasion is required"),
  season: z.enum(["Summer", "Winter", "Monsoon", "auto"], { required_error: "Season is required" }),
});

const SuggestFootwearSchema = z.object({
  topItemId: mongoId,
  bottomItemId: mongoId,
  occasion: z.string().min(1, "Occasion is required"),
  season: z.enum(["Summer", "Winter", "Monsoon", "auto"], { required_error: "Season is required" }),
  layerColor: z.string().trim().optional(),
});

const GeneratePairingsSchema = z.object({
  occasion: z.string().min(1, "Occasion is required"),
  season: z.enum(["Summer", "Winter", "Monsoon", "auto"], { required_error: "Season is required" }),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
});

const SavePairingSchema = z.object({
  itemIds: z.array(mongoId).min(2, "At least 2 items required for a pairing"),
  occasion: z.string().trim().optional(),
  season: z.string().trim().optional(),
  name: z.string().trim().optional(),
  tags: z.array(z.string().trim()).default([]),
  notes: z.string().trim().optional(),
  flatlayUrl: z.string().url().optional(),
  colorPalette: z.array(z.object({
    hex: z.string(),
    rgb: z.tuple([z.number(), z.number(), z.number()]),
    name: z.string(),
    colorFamily: z.string().optional(),
    colorType: z.string().optional(),
    slot: z.string(),
  })).optional(),
});

const LogWearSchema = z.object({
  outfitId: mongoId,
  wornAt: z.string().datetime().optional(),
  occasion: z.string().trim().optional(),
  notes: z.string().trim().optional(),
  weather: z.string().trim().optional(),
  status: z.enum(['worn', 'planned']).optional(),
  plannedFor: z.string().datetime().optional(),
});

const UpdatePlannedWearSchema = z.object({
  status: z.enum(['worn', 'planned']).optional(),
  plannedFor: z.string().datetime().optional(),
  occasion: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});

// ─── Batch Schemas ──────────────────────────────────────────────────────────

const BatchUploadSchema = z.object({
  files: z.array(
    z.object({
      fileName: z.string().min(1, "fileName is required"),
      contentType: z.string().min(1, "contentType is required"),
    })
  ).min(1, "At least one file is required").max(10, "Maximum 10 files per batch"),
});

const AddClothBatchSchema = z.object({
  items: z.array(
    z.object({
      type: z.enum(["Top", "Bottom", "Shoes", "Accessory", "Outerwear", "Full Body"], {
        required_error: "Clothing type is required",
      }),
      subcategory: z.string().min(1, "Subcategory is required").trim(),
      photoUrl: z.string().url("Invalid photo URL"),
      thumbnailUrl: z.string().url("Invalid thumbnail URL").optional(),
      color: z.string().trim().optional(),
      pattern: z.enum(["Solid", "Striped", "Checked", "Floral", "Embroidered", "Polka Dot", "Abstract", "Printed"]).optional(),
      fabric: z.enum(["Cotton", "Silk", "Linen", "Denim", "Wool", "Polyester", "Chiffon", "Velvet", "Satin", "Leather", "Georgette", "Crepe", "Khadi", "Other"]).optional(),
      brand: z.string().trim().optional(),
      notes: z.string().trim().max(500, "Notes must be under 500 characters").optional(),
      season: z.enum(["Summer", "Winter", "Monsoon", "All"]).default("All"),
      occasions: z.array(z.enum(["Wedding", "Office", "Casual", "Party", "Travel", "Festive", "Date Night", "Sports", "Lounge"])).optional(),
      price: z.number().min(0).optional(),
      purchaseDate: z.string().datetime().optional(),
      hasPersonInPhoto: z.boolean().optional(),
    })
  ).min(1, "At least one item is required").max(10, "Maximum 10 items per batch"),
});

// ─── Collections ─────────────────────────────────────────────────────────────

const CreateCollectionSchema = z.object({
  name: z.string().min(1, "Collection name is required").max(50, "Name must be under 50 characters").trim(),
  description: z.string().max(200, "Description must be under 200 characters").trim().optional(),
  emoji: z.string().trim().optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Invalid hex color").optional(),
});

const UpdateCollectionSchema = z.object({
  name: z.string().min(1, "Collection name is required").max(50, "Name must be under 50 characters").trim().optional(),
  description: z.string().max(200, "Description must be under 200 characters").trim().optional(),
  emoji: z.string().trim().optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Invalid hex color").optional(),
});

const CollectionItemsSchema = z.object({
  itemIds: z.array(mongoId).min(1, "At least one item is required"),
});

// ─── Sharing ────────────────────────────────────────────────────────────────

const SendOutfitSchema = z.object({
  recipientUsername: z.string().min(1, "Recipient username is required").trim(),
  skipNotification: z.boolean().optional(),
});

// ─── Expert Application ─────────────────────────────────────────────────────

const EXPERT_SPECIALIZATIONS = [
  "Personal Styling",
  "Bridal & Wedding",
  "Corporate & Workwear",
  "Ethnic & Traditional",
  "Wardrobe Consulting",
  "Color & Image Analysis",
  "Men's Fashion",
  "Occasion & Event Styling",
  "Sustainable Fashion",
  "Streetwear & Trends",
] as const;

const socialLinksSchema = z.object({
  instagram: z.string().url().optional().or(z.literal("")),
  linkedin: z.string().url().optional().or(z.literal("")),
  website: z.string().url().optional().or(z.literal("")),
}).optional();

const ExpertApplicationSubmitSchema = z.object({
  personalInfo: z.object({
    fullName: z.string().min(1, "Full name is required").max(100).trim(),
    email: z.string().email("Invalid email address"),
    phone: z.string().optional(),
    city: z.string().min(1, "City is required").trim(),
    country: z.string().trim().default("India"),
    bio: z.string().min(50, "Bio must be at least 50 characters").max(500, "Bio must be under 500 characters").trim(),
  }),
  professionalInfo: z.object({
    experienceInYears: z.number().int().min(0, "Experience cannot be negative").max(50),
    qualification: z.string().min(1, "Qualification is required").trim(),
    specializations: z.array(z.enum(EXPERT_SPECIALIZATIONS)).min(1, "Select at least 1 specialization").max(5, "Maximum 5 specializations"),
    portfolioUrls: z.array(z.string().url()).max(5, "Maximum 5 portfolio items").optional(),
    socialLinks: socialLinksSchema,
    previousWork: z.string().max(1000).trim().optional(),
  }),
  verification: z.object({
    degreeFileUrl: z.string().min(1, "Degree/certificate file is required"),
    idProofUrl: z.string().optional(),
    agreedToTerms: z.literal(true, { errorMap: () => ({ message: "You must agree to the terms" }) }),
  }),
});

const ExpertApplicationUpdateSchema = z.object({
  personalInfo: z.object({
    fullName: z.string().min(1).max(100).trim(),
    email: z.string().email(),
    phone: z.string().optional(),
    city: z.string().min(1).trim(),
    country: z.string().trim(),
    bio: z.string().min(50).max(500).trim(),
  }).partial().optional(),
  professionalInfo: z.object({
    experienceInYears: z.number().int().min(0).max(50),
    qualification: z.string().min(1).trim(),
    specializations: z.array(z.enum(EXPERT_SPECIALIZATIONS)).min(1).max(5),
    portfolioUrls: z.array(z.string().url()).max(5),
    socialLinks: socialLinksSchema,
    previousWork: z.string().max(1000).trim(),
  }).partial().optional(),
  verification: z.object({
    degreeFileUrl: z.string().min(1),
    idProofUrl: z.string(),
    agreedToTerms: z.literal(true),
  }).partial().optional(),
});

const ExpertApplicationReviewSchema = z.object({
  status: z.enum(["under_review", "approved", "rejected", "revisions_requested"]),
  notes: z.string().max(1000).trim().optional(),
});

const ExpertProfileUpdateSchema = z.object({
  bio: z.string().min(50).max(500).trim().optional(),
  specializations: z.array(z.enum(EXPERT_SPECIALIZATIONS)).min(1).max(5).optional(),
  portfolioUrls: z.array(z.string().url()).max(5).optional(),
  socialLinks: socialLinksSchema,
});

// ─── Payment Schemas ─────────────────────────────────────────────────────────

const CreatePaymentOrderSchema = z.object({
  subscriptionId: z.string().min(1, "subscriptionId is required"),
});

const VerifyPaymentSchema = z.object({
  providerOrderId: z.string().min(1, "providerOrderId is required"),
  providerPaymentId: z.string().min(1, "providerPaymentId is required"),
  signature: z.string().min(1, "signature is required"),
});

const RefundPaymentSchema = z.object({
  paymentOrderId: z.string().min(1, "paymentOrderId is required"),
  reason: z.string().min(3, "reason must be at least 3 characters").max(200),
});

// ─── Exports ────────────────────────────────────────────────────────────────

export {
  UserSchema,
  // Auth
  GenerateOtpSchema,
  VerifyOtpSchema,
  GenerateEmailOtpSchema,
  VerifyEmailOtpSchema,
  GoogleAuthSchema,
  // User
  SignUpSchema,
  VerifyEmailSchema,
  GetUserByIdSchema,
  // Feedback
  BugFeedbackSchema,
  ExpertFeedbackSchema,
  // Admin
  UpgradeToAdminSchema,
  AdminLoginSchema,
  UserIdParamSchema,
  SendNotificationSchema,
  SendUserNotificationSchema,
  // Wardrobe
  AddClothSchema,
  UpdateClothSchema,
  CreateOutfitSchema,
  UpdateOutfitSchema,
  StyleProfileSchema,
  SuggestFullOutfitSchema,
  SuggestFromItemSchema,
  SuggestLayerSchema,
  SuggestFootwearSchema,
  GeneratePairingsSchema,
  SavePairingSchema,
  LogWearSchema,
  UpdatePlannedWearSchema,
  // Batch
  BatchUploadSchema,
  AddClothBatchSchema,
  // Collections
  CreateCollectionSchema,
  UpdateCollectionSchema,
  CollectionItemsSchema,
  // Sharing
  SendOutfitSchema,
  // Expert Application
  ExpertApplicationSubmitSchema,
  ExpertApplicationUpdateSchema,
  ExpertApplicationReviewSchema,
  ExpertProfileUpdateSchema,
  // Admin Management
  AdminBulkSessionRevokeSchema,
  AdminSubscriptionExtendSchema,
  // Payment
  CreatePaymentOrderSchema,
  VerifyPaymentSchema,
  RefundPaymentSchema,
};
