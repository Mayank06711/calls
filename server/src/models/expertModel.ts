import mongoose, { Document, Schema } from "mongoose";

// Define the Expert interface extending Document
interface IExpert extends Document {
  user: mongoose.Schema.Types.ObjectId;
  experienceInYears: number;
  bonus: number;
  totalCustomersHandled: number;
  degree: {
    key: string;
    isVerified: boolean;
  };
  qualification: string;
  bio?: string;
  specializations?: string[];
  portfolioUrls?: string[];
  socialLinks?: {
    instagram?: string;
    linkedin?: string;
    website?: string;
  };
  pricing?: {
    per15Min: number;
    per30Min: number;
    per60Min: number;
    currency: string;
  };
}

// Define the Expert Schema
const ExpertSchema: Schema<IExpert> = new Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // Reference to the User model
      required: true,
    },
    experienceInYears: {
      type: Number,
      required: true,
    },
    bonus: {
      type: Number,
      default: 0,
    },
    totalCustomersHandled: {
      type: Number,
      default: 0,
    },
    degree: {
      key: {
        // upload to s3
        type: String,
        required: true,
      }, // Name of the degree
      isVerified: {
        type: Boolean,
        default: false,
      }, // Degree verification status
    },
    qualification: {
      type: String,
      required: true,
    },
    bio: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    specializations: [{ type: String }],
    portfolioUrls: {
      type: [String],
      validate: [(v: string[]) => v.length <= 5, "Maximum 5 portfolio items"],
    },
    socialLinks: {
      instagram: { type: String, trim: true },
      linkedin: { type: String, trim: true },
      website: { type: String, trim: true },
    },
    pricing: {
      per15Min: { type: Number, default: 0, min: 0 },
      per30Min: { type: Number, default: 0, min: 0 },
      per60Min: { type: Number, default: 0, min: 0 },
      currency: { type: String, default: "credits" },
    },
  },
  { timestamps: true }
);

// Create the Expert model
const ExpertModel = mongoose.model<IExpert>("Expert", ExpertSchema);

export { ExpertModel, IExpert };