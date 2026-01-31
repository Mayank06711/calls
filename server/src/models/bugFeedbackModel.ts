import mongoose, { Schema, Document } from "mongoose";
import { IBugFeedback, IBugFeedbackModel } from "../interface/IFeedback";

const BugFeedbackSchema: Schema = new Schema<IBugFeedback>(
  {
    // Core fields
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false, // Optional to support anonymous feedback
    },
    email: {
      type: String,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
      required: false,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      minlength: [10, 'Feedback message must be at least 10 characters long'],
    },
    
    // Bug specific categorization
    bugType: {
      type: String,
      required: true,
      enum: ["UI Issue", "Crash", "Performance","Suggestion", "Security", "Functionality", "Other"],
    },
    customBugType: {
      type: String,
      trim: true,
      // Only required when bugType is "Other"
    },
    severity: {
      type: String,
      required: false,
      enum: ["Critical", "High", "Medium", "Low"],
      default: "Medium",
    },
    
    // System information
    browserInfo: {
      type: String,
      trim: true,
    },
    osInfo: {
      type: String,
      trim: true,
    },
    screenResolution: {
      type: String,
      trim: true,
    },
    appVersion: {
      type: String,
      trim: true,
    },
    
    // Location data
    location: {
      city: { type: String, trim: true },
      country: { type: String, trim: true },
      region: { type: String, trim: true },
      ip:{ type: String, trim: true },
      latitude:{ type: String, trim: true },
      longitude:{ type: String, trim: true },
    },
    
    
    
    // Attachments
    attachmentUrls: [{
      type: String,
      trim: true,
    }],
    
    // Steps to reproduce
    stepsToReproduce: {
      type: String,
      trim: true,
    },
    
    // Response tracking
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    status: {
      type: String,
      enum: ["New", "In Progress", "Fixed", "Won't Fix", "Duplicate", "Cannot Reproduce"],
      default: "New",
    },
    response: {
      type: String,
      default: null,
    },
    reviewDate: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Custom validation
BugFeedbackSchema.pre("validate", function(next) {
  // If bugType is "Other", customBugType is required
  if (this.bugType === "Other" && !this.customBugType) {
    this.invalidate("customBugType", "Custom bug type is required when bug type is 'Other'");
  }
  
  // Either user ID or email must be provided
  // if (!this.user && !this.email) {
  //   this.invalidate("email", "Either user ID or email must be provided");
  // }
  
  next();
});

// Pre-update hook to set reviewDate when response is added
BugFeedbackSchema.pre("findOneAndUpdate", function (next) {
  const update = this.getUpdate() as {
    response?: string;
    reviewDate?: Date;
    status?: string;
  };

  if (update?.response && !update.reviewDate) {
    update.reviewDate = new Date();
  }
  
  // Automatically update status if fixed
  if (update?.status === "Fixed" && !update.reviewDate) {
    update.reviewDate = new Date();
  }
  
  next();
});

// Static Methods
BugFeedbackSchema.statics.findPendingBugs = async function () {
  return this.find({ status: { $in: ["New", "In Progress"] } })
    .populate("user", "name email")
    .sort({ createdAt: "asc" });
};

BugFeedbackSchema.statics.findBugsByDeveloper = async function (
  developerId: mongoose.Types.ObjectId
) {
  return this.find({ assignedTo: developerId })
    .populate("user", "name email")
    .sort({ createdAt: "desc" });
};

BugFeedbackSchema.statics.findUrgentBugs = async function () {
  return this.find({
    status: { $in: ["New", "In Progress"] },
    severity: { $in: ["Critical", "High"] },
    createdAt: {
      $lt: new Date(Date.now() - 24 * 60 * 60 * 1000), // older than 24h
    },
  }).populate("user");
};

BugFeedbackSchema.statics.getBugStats = async function () {
  return this.aggregate([
    {
      $group: {
        _id: {
          bugType: "$bugType",
          severity: "$severity",
          status: "$status",
        },
        count: { $sum: 1 },
        avgResponseTime: {
          $avg: {
            $cond: [
              { $and: [{ $ne: ["$reviewDate", null] }, { $ne: ["$createdAt", null] }] },
              {
                $divide: [
                  { $subtract: ["$reviewDate", "$createdAt"] },
                  1000 * 60 * 60, // milliseconds to hours
                ],
              },
              null,
            ],
          },
        },
      },
    },
  ]);
};

// Instance Methods
BugFeedbackSchema.methods.assignToDeveloper = async function (
  developerId: mongoose.Types.ObjectId
) {
  this.assignedTo = developerId;
  this.status = "In Progress";
  return this.save();
};

BugFeedbackSchema.methods.markAsFixed = async function (
  response: string
) {
  this.status = "Fixed";
  this.response = response;
  this.reviewDate = new Date();
  return this.save();
};

// Virtual for response time in hours
BugFeedbackSchema.virtual("responseTime").get(function (this: IBugFeedback) {
  if (!this.reviewDate || !this.createdAt) return null;

  const reviewDate =
    this.reviewDate instanceof Date
      ? this.reviewDate
      : new Date(this.reviewDate);

  const createdAt =
    this.createdAt instanceof Date ? this.createdAt : new Date(this.createdAt);

  const diff = reviewDate.getTime() - createdAt.getTime();
  return Math.round(diff / (1000 * 60 * 60)); // Convert to hours
});

// Create and export the BugFeedback model
const BugFeedback = mongoose.model<IBugFeedback, IBugFeedbackModel>(
  "BugFeedback",
  BugFeedbackSchema
);
export default BugFeedback;