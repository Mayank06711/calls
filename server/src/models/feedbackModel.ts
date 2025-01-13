import mongoose, { Schema, Document } from "mongoose";

// Feedback Type
interface IFeedback extends Document {
  user: mongoose.Types.ObjectId;
  expert?: mongoose.Types.ObjectId;
  stars: number;
  message: string;
  resolved: boolean;
  type: string;
  response?: string;
  reviewDate?: Date;
  createdAt: Date;
}

interface IFeedbackModel extends mongoose.Model<IFeedback> {
  countByType(type: string): Promise<number>;
  findPendingFeedback(): Promise<IFeedback[]>;
  findExpertFeedback(expertId: mongoose.Types.ObjectId): Promise<IFeedback[]>;
  getAverageRating(): Promise<number>;
}

const FeedbackSchema: Schema = new Schema<IFeedback>(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    expert: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    stars: {
      type: Number,
      default: 1,
      min: 1,
      max: 5,
    },
    resolved: {
      type: Boolean,
      default: false,
    },
    type: {
      type: String,
      required: true,
      enum: ["bug", "feature", "expert"],
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

// Pre-save hook to validate message length
FeedbackSchema.pre('save', function(next) {
  if (typeof this.message === 'string' && this.message.length < 10) {
    next(new Error('Feedback message must be at least 10 characters long'));
  }
  next();
});

// Pre-update hook to set reviewDate when response is added
FeedbackSchema.pre('findOneAndUpdate', function(next) {
  const update = this.getUpdate() as { 
    response?: string; 
    reviewDate?: Date 
  };
  
  if (update?.response && !update.reviewDate) {
    update.reviewDate = new Date();
  }
  next();
});

// Static Methods
FeedbackSchema.statics.countByType = async function (type: string) {
  return this.countDocuments({ type });
};

FeedbackSchema.statics.findPendingFeedback = async function () {
  return this.find({ resolved: false })
    .populate("user", "name email")
    .sort({ createdAt: "asc" });
};

FeedbackSchema.statics.findExpertFeedback = async function (
  expertId: mongoose.Types.ObjectId
) {
  return this.find({ expert: expertId })
    .populate("user", "name email")
    .sort({ createdAt: "desc" });
};

FeedbackSchema.statics.getAverageRating = async function () {
  const result = await this.aggregate([
    { $match: { type: "expert" } },
    { $group: { _id: null, averageRating: { $avg: "$stars" } } },
  ]);
  return result[0]?.averageRating || 0;
};

FeedbackSchema.statics.findUrgentBugs = async function () {
  return this.find({ // 'this' refers to model, refers to the entire Feedback model
    type: "bug",
    resolved: false,
    createdAt: {
      $lt: new Date(Date.now() - 24 * 60 * 60 * 1000), // older than 24h
    },
  }).populate("user");
};

// 2. Get feedback statistics
FeedbackSchema.statics.getFeedbackStats = async function () {
  return this.aggregate([
    {
      $group: {
        _id: "$type",
        count: { $sum: 1 },
        averageStars: { $avg: "$stars" },
      },
    },
  ]);
};

// Instance Methods
FeedbackSchema.methods.markAsResolved = async function () {
  this.resolved = true;
  return this.save();
};

FeedbackSchema.methods.addResponse = async function (
  expertId: mongoose.Types.ObjectId,
  response: string
) {
  this.expert = expertId;
  this.response = response;
  this.reviewDate = new Date();
  this.resolved = true;
  return this.save();
};

// Virtual for response time in hours
FeedbackSchema.virtual('responseTime').get(function(this: IFeedback) {
  if (!this.reviewDate || !this.createdAt) return null;
  
  // Type guard to ensure we have Date objects
  const reviewDate = this.reviewDate instanceof Date 
    ? this.reviewDate 
    : new Date(this.reviewDate);
    
  const createdAt = this.createdAt instanceof Date 
    ? this.createdAt 
    : new Date(this.createdAt);
  
  const diff = reviewDate.getTime() - createdAt.getTime();
  return Math.round(diff / (1000 * 60 * 60)); // Convert to hours
});

// Create and export the Feedback model
const Feedback = mongoose.model<IFeedback, IFeedbackModel>(
  "Feedback",
  FeedbackSchema
);
export default Feedback;
