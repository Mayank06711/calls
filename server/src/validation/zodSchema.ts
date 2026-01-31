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
});

const VerifyOtpSchema = z.object({
  referenceId: z.string().min(1, "Reference ID is required"),
  mobNum: phoneNumber,
  otp: z.string().min(1, "OTP is required"),
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
  userId: mongoId,
  adminKey: z.string().min(1, "Admin key is required"),
  position: z.string().optional(),
});

const AdminLoginSchema = z.object({
  adminId: z.string().min(1, "Admin ID is required"),
  adminKey: z.string().min(1, "Admin key is required"),
});

const UserIdParamSchema = z.object({
  userId: mongoId,
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

// ─── Exports ────────────────────────────────────────────────────────────────

export {
  UserSchema,
  // Auth
  GenerateOtpSchema,
  VerifyOtpSchema,
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
};
