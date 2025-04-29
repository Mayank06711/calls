import mongoose, { Schema, Document } from "mongoose";
import { IExpertFeedback, IExpertFeedbackModel } from "../interface/IFeedback";


const ExpertFeedbackSchema: Schema = new Schema<IExpertFeedback>(
  {
    // Core fields
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    expert: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      minlength: [10, 'Feedback message must be at least 10 characters long'],
    },
    
    // Rating
    stars: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    
    // Categories
    aspects: [{
      type: String,
      enum: ["Knowledge", "Communication", "Helpfulness", "Promptness", "Overall"],
    }],
    
    // Session information
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Session",
    },
    sessionDuration: {
      type: Number, // in minutes
    },
    
    // Response tracking
    expertResponse: {
      type: String,
      default: null,
    },
    responseDate: {
      type: Date,
      default: null,
    },
    
    // Verification
    verified: {
      type: Boolean,
      default: false,
    },
    
    // Attachment
    attachmentUrl: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Pre-update hook to set responseDate when expert responds
ExpertFeedbackSchema.pre("findOneAndUpdate", function (next) {
  const update = this.getUpdate() as {
    expertResponse?: string;
    responseDate?: Date;
  };

  if (update?.expertResponse && !update.responseDate) {
    update.responseDate = new Date();
  }
  next();
});

// Static Methods
ExpertFeedbackSchema.statics.findByExpert = async function (
  expertId: mongoose.Types.ObjectId
) {
  return this.find({ expert: expertId })
    .populate("user", "name email")
    .sort({ createdAt: "desc" });
};

ExpertFeedbackSchema.statics.getExpertRating = async function (
  expertId: mongoose.Types.ObjectId
) {
  const result = await this.aggregate([
    { $match: { expert: expertId } },
    { 
      $group: { 
        _id: null, 
        averageRating: { $avg: "$stars" },
        totalRatings: { $sum: 1 },
        fiveStarCount: { 
          $sum: { $cond: [{ $eq: ["$stars", 5] }, 1, 0] }
        },
        fourStarCount: { 
          $sum: { $cond: [{ $eq: ["$stars", 4] }, 1, 0] }
        },
        threeStarCount: { 
          $sum: { $cond: [{ $eq: ["$stars", 3] }, 1, 0] }
        },
        twoStarCount: { 
          $sum: { $cond: [{ $eq: ["$stars", 2] }, 1, 0] }
        },
        oneStarCount: { 
          $sum: { $cond: [{ $eq: ["$stars", 1] }, 1, 0] }
        }
      } 
    },
  ]);
  
  if (!result.length) {
    return {
      averageRating: 0,
      totalRatings: 0,
      fiveStarCount: 0,
      fourStarCount: 0,
      threeStarCount: 0,
      twoStarCount: 0,
      oneStarCount: 0
    };
  }
  
  return result[0];
};

ExpertFeedbackSchema.statics.getTopRatedExperts = async function (limit = 10) {
  return this.aggregate([
    { 
      $group: { 
        _id: "$expert",
        averageRating: { $avg: "$stars" },
        feedbackCount: { $sum: 1 } 
      } 
    },
    {
      $match: {
        feedbackCount: { $gte: 5 } // Minimum 5 ratings to qualify
      }
    },
    {
      $sort: { averageRating: -1, feedbackCount: -1 }
    },
    {
      $limit: limit
    },
    {
      $lookup: {
        from: "users",
        localField: "_id",
        foreignField: "_id",
        as: "expertDetails"
      }
    },
    {
      $unwind: "$expertDetails"
    },
    {
      $project: {
        _id: 1,
        expertName: "$expertDetails.name",
        expertEmail: "$expertDetails.email",
        averageRating: 1,
        feedbackCount: 1
      }
    }
  ]);
};

// Instance Methods
ExpertFeedbackSchema.methods.addExpertResponse = async function (
  response: string
) {
  this.expertResponse = response;
  this.responseDate = new Date();
  return this.save();
};

ExpertFeedbackSchema.methods.verifyFeedback = async function () {
  this.verified = true;
  return this.save();
};

// Create and export the ExpertFeedback model
const ExpertFeedback = mongoose.model<IExpertFeedback, IExpertFeedbackModel>(
  "ExpertFeedback",
  ExpertFeedbackSchema
);
export default ExpertFeedback;