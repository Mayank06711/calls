import mongoose, { Schema, Document } from "mongoose";

// Feedback Type
interface IFeedback extends Document {
  user: mongoose.Types.ObjectId; // Reference to User model
  expert?: mongoose.Types.ObjectId; // Reference to
  stars?:number; // Number of stars
  message: string;
  resolved: boolean;
  type: string; // e.g., "bug", "feature", "other"
}

//Feedback Schema
const FeedbackSchema: Schema = new Schema<IFeedback>(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // Reference to the User model
      required: true,
    },
    expert: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User", // Reference to the User model
      },
    message: {
      type: String,
      required: true,
    },
    stars:{
        type:Number,
        default: 0,
    },
    resolved: {
      type: Boolean,
      default: false,
    },
    type: {
      type: String,
      required: true,
      enum: ["bug", "feature", "expert"], // Define allowed types
    },
  },
  {
    timestamps: true, // Automatically manage createdAt and updatedAt fields
  }
);

// Middleware to count feedback by type
FeedbackSchema.pre("find", async function (next) {
  const count = await this.model.countDocuments({ type: this.getQuery().type });
  this.setQuery({ ...this.getQuery(), count }); // Add count to the query result
  next();
});


// const feedbacks = await Feedback.find({ type: 'bug' });
// console.log(feedbacks[0]?.count); // Access count if available

// Create and export the Feedback model
const Feedback = mongoose.model<IFeedback>("Feedback", FeedbackSchema);
export default Feedback;
