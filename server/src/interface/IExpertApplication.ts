import { Document, Types } from "mongoose";

export type ApplicationStatus =
  | "draft"
  | "submitted"
  | "under_review"
  | "approved"
  | "rejected"
  | "revisions_requested"
  | "withdrawn";

export const SPECIALIZATIONS = [
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

export type Specialization = (typeof SPECIALIZATIONS)[number];

export interface IReviewHistoryEntry {
  reviewedBy: Types.ObjectId;
  action: ApplicationStatus;
  notes?: string;
  reviewedAt: Date;
}

export interface IExpertApplication extends Document {
  user: Types.ObjectId;

  personalInfo: {
    fullName: string;
    email: string;
    phone?: string;
    city: string;
    country: string;
    bio: string;
  };

  professionalInfo: {
    experienceInYears: number;
    qualification: string;
    specializations: Specialization[];
    portfolioUrls?: string[];
    socialLinks?: {
      instagram?: string;
      linkedin?: string;
      website?: string;
    };
    previousWork?: string;
  };

  verification: {
    degreeFileUrl: string;
    idProofUrl?: string;
    agreedToTerms: boolean;
    agreedAt?: Date;
  };

  status: ApplicationStatus;
  adminNotes?: string;
  reviewHistory: IReviewHistoryEntry[];
  submittedAt?: Date;
  reviewedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}
