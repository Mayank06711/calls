import { Schema, model } from "mongoose";
import { IExpertApplication, SPECIALIZATIONS } from "../interface/IExpertApplication";

const ReviewHistorySchema = new Schema(
  {
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    action: {
      type: String,
      enum: [
        "draft",
        "submitted",
        "under_review",
        "approved",
        "rejected",
        "revisions_requested",
        "withdrawn",
      ],
      required: true,
    },
    notes: { type: String, trim: true },
    reviewedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const ExpertApplicationSchema = new Schema<IExpertApplication>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Step 1: Personal Info
    personalInfo: {
      fullName: { type: String, required: true, trim: true },
      email: { type: String, required: true, trim: true },
      phone: { type: String, trim: true },
      city: { type: String, required: true, trim: true },
      country: { type: String, default: "India", trim: true },
      bio: {
        type: String,
        required: true,
        minlength: 50,
        maxlength: 500,
        trim: true,
      },
    },

    // Step 2: Professional Info
    professionalInfo: {
      experienceInYears: { type: Number, required: true, min: 0, max: 50 },
      qualification: { type: String, required: true, trim: true },
      specializations: {
        type: [
          {
            type: String,
            enum: [...SPECIALIZATIONS],
          },
        ],
        validate: [
          (v: string[]) => v.length >= 1 && v.length <= 5,
          "Must select 1 to 5 specializations",
        ],
      },
      portfolioUrls: {
        type: [String],
        validate: [
          (v: string[]) => v.length <= 5,
          "Maximum 5 portfolio items allowed",
        ],
      },
      socialLinks: {
        instagram: { type: String, trim: true },
        linkedin: { type: String, trim: true },
        website: { type: String, trim: true },
      },
      previousWork: { type: String, trim: true, maxlength: 1000 },
    },

    // Step 3: Verification
    verification: {
      degreeFileUrl: { type: String, required: true },
      idProofUrl: { type: String },
      agreedToTerms: { type: Boolean, required: true },
      agreedAt: { type: Date },
    },

    status: {
      type: String,
      enum: [
        "draft",
        "submitted",
        "under_review",
        "approved",
        "rejected",
        "revisions_requested",
        "withdrawn",
      ],
      default: "draft",
      index: true,
    },
    adminNotes: { type: String, trim: true },
    reviewHistory: [ReviewHistorySchema],
    submittedAt: { type: Date },
    reviewedAt: { type: Date },
  },
  { timestamps: true }
);

// Compound index for looking up a user's application by status
ExpertApplicationSchema.index({ user: 1, status: 1 });

export const ExpertApplicationModel = model<IExpertApplication>(
  "ExpertApplication",
  ExpertApplicationSchema
);
