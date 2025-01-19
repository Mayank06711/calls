import mongoose, { Document, Schema } from "mongoose";

// Define the Expert interface extending Document
interface IExpert extends Document {
  user: mongoose.Schema.Types.ObjectId; // Link to User model
  experienceInYears: number;
  bonus: number;
  totalCustomersHandled: number;
  degree: {
    key: string; // Degree Key (name of the degree)
    isVerified: boolean; // Degree verification status
  };
  qualification: string; // Qualification of the expert
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
  },
  { timestamps: true } // Automatically add createdAt and updatedAt timestamps
);

// Create the Expert model
const ExpertModel = mongoose.model<IExpert>("Expert", ExpertSchema);

export { ExpertModel, IExpert };