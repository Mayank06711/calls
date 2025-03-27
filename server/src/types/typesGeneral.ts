import { SUBSCRIPTION_TYPES, SUBSCRIPTION_CONFIG } from "../helper/constants";
export type Gender = "Male" | "Female" | "Not to say";

export type PaymentStatus = "Pending" | "Completed" | "Failed";

// Types for subscription history
export type ConsultationStatus = "Completed" | "Cancelled" | "NoShow";
export type StylePreferenceLevel =
  | "advanced"
  | "intermediate"
  | "basic"
  | "essential";

export type SubscriptionType = (typeof SUBSCRIPTION_TYPES)[number];
export type SubscriptionConfigType = typeof SUBSCRIPTION_CONFIG;
export type SubscriptionStatus =
  | "Active"
  | "Expired"
  | "Cancelled"
  | "Pending"
  | "Requested"
  | "N/A";
