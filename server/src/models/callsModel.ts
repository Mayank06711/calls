import mongoose, { Schema, Document } from "mongoose";

// Service interface — tracks expert-user consultation calls for billing/ratings
interface Service extends Document {
  user: mongoose.Types.ObjectId; // Reference to User model
  expert?: mongoose.Types.ObjectId; // Reference to Expert model
  callId?: mongoose.Types.ObjectId; // Reference to the Call document (P2P video call)
  duration: number; // duration of the service in seconds
  amount: number; // total amount of the service
  references: [string]; // reference of items if provided by expert
  chat: [mongoose.Types.ObjectId]; // chats happened between user and expert during call
  message?: string; // optional — filled post-call
  resolved?: boolean;
  forcedEnd: boolean;
  type: string; // e.g., "bug", "feature", "expert"
  userRating?: number; // rating of user by expert — filled post-call
  expertRating?: number; // rating of expert by user — filled post-call
}

// Service Schema
const ServiceSchema: Schema = new Schema<Service>(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    expert: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Expert",
    },
    callId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Call",
    },
    duration: {
      type: Number, // seconds
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    chat: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "Chat",
    },
    message: {
      type: String, // optional — user can add post-call
    },
    forcedEnd: {
      type: Boolean,
      default: false,
    },
    userRating: {
      type: Number,
      min: 1,
      max: 5,
    },
    expertRating: {
      type: Number,
      min: 1,
      max: 5,
    },
    resolved: {
      type: Boolean,
    },
    type: {
      type: String,
      required: true,
      enum: ["bug", "feature", "expert"],
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(_doc, ret) {
        ret.serviceId = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      transform(_doc, ret) {
        ret.serviceId = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Index for querying services by user or expert
ServiceSchema.index({ user: 1, createdAt: -1 });
ServiceSchema.index({ expert: 1, createdAt: -1 });
ServiceSchema.index({ callId: 1 });

const ServiceModel = mongoose.model<Service>("Service", ServiceSchema);
export { ServiceModel };
