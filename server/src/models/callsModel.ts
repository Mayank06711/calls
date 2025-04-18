import mongoose, { Schema, Document } from "mongoose";

// Feedback Type
interface Service extends Document {
  user: mongoose.Types.ObjectId; // Reference to User model
  expert?: mongoose.Types.ObjectId; // Reference to /
  duration: TimeRanges; //durtion of the service
  amount: number;   //total amount of the service
  references:[string];  // reference of items if procided by expert
  chat:[mongoose.Types.ObjectId];  //chats happended between user and expert during call
  message: string;
  resolved: boolean;
  forcedEnd : boolean;
  type: string; // e.g., "bug", "feature", "other"
  userRating: number; // rating of user by expert
  exepertRating: number; // rating of expret by user 
}

//Feedback Schema
const ServiceSchema: Schema = new Schema<Service>(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // Reference to the User model
      required: true,
    },
    expert: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Expert", // Reference to the User model
      },
    duration: {
        type: TimeRanges,
        required: true,
    },
    amount: {
        type: Number,
        required: true,
    },
    chat :{
        type: [mongoose.Schema.Types.ObjectId],
        ref: "Chat", // Reference to the Chat model
    },
    message: {
      type: String,
      required: true,
    },
    forcedEnd :{
        type: Boolean,
        required: true,
    },
    userRating: {
        type: Number,
        required: true,
        min: 1,
        max: 5,
    },
    exepertRating:{
        type: Number,
        required: true,
        min: 1,
        max: 5,
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
ServiceSchema.pre("find", async function (next) {
  const count = await this.model.countDocuments({ type: this.getQuery().type });
  this.setQuery({ ...this.getQuery(), count }); // Add count to the query result
  next();
});


// const feedbacks = await Feedback.find({ type: 'bug' });
// console.log(feedbacks[0]?.count); // Access count if available

// Create and export the Feedback model
const Feedback = mongoose.model<Service>("Service", ServiceSchema);
export default Feedback;
