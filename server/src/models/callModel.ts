import mongoose, { Schema, Document, Types } from "mongoose";

export interface ICall extends Document {
  caller: Types.ObjectId;
  callee: Types.ObjectId;
  status:
    | "initiated"
    | "ringing"
    | "accepted"
    | "rejected"
    | "missed"
    | "completed"
    | "failed";
  callType: "video";
  startedAt: Date;
  answeredAt?: Date;
  endedAt?: Date;
  duration?: number; // seconds
  endedBy?: Types.ObjectId;
  endReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CallSchema = new Schema<ICall>(
  {
    caller: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    callee: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: [
        "initiated",
        "ringing",
        "accepted",
        "rejected",
        "missed",
        "completed",
        "failed",
      ],
      default: "initiated",
      required: true,
    },
    callType: {
      type: String,
      enum: ["video"],
      default: "video",
      required: true,
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    answeredAt: {
      type: Date,
    },
    endedAt: {
      type: Date,
    },
    duration: {
      type: Number, // in seconds
    },
    endedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    endReason: {
      type: String,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(_doc, ret) {
        ret.callId = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      transform(_doc, ret) {
        ret.callId = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Indexes for common queries
CallSchema.index({ caller: 1, createdAt: -1 });
CallSchema.index({ callee: 1, createdAt: -1 });
CallSchema.index({ status: 1, createdAt: -1 });

export const CallModel = mongoose.model<ICall>("Call", CallSchema);
