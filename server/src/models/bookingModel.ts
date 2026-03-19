import mongoose, { Schema, Document, Types } from "mongoose";

export type BookingStatus = "confirmed" | "completed" | "cancelled" | "no_show";

export interface IBooking extends Document {
  user: Types.ObjectId;
  expert: Types.ObjectId; // Expert doc _id
  expertUser: Types.ObjectId; // Expert's User _id (for chat)
  date: Date; // calendar date (start of day UTC)
  startTime: string; // "14:00"
  endTime: string; // "14:30"
  duration: number; // 15 | 30 | 60
  timezone: string;
  status: BookingStatus;
  creditsCharged: number;
  cancelledBy?: "user" | "expert" | "admin";
  cancellationReason?: string;
  cancelledAt?: Date;
  completedAt?: Date;
  connectedAt?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const BookingSchema = new Schema<IBooking>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    expert: {
      type: Schema.Types.ObjectId,
      ref: "Expert",
      required: true,
    },
    expertUser: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    startTime: {
      type: String,
      required: true,
    },
    endTime: {
      type: String,
      required: true,
    },
    duration: {
      type: Number,
      required: true,
      enum: [15, 30, 60],
    },
    timezone: {
      type: String,
      default: "Asia/Kolkata",
    },
    status: {
      type: String,
      enum: ["confirmed", "completed", "cancelled", "no_show"],
      default: "confirmed",
    },
    creditsCharged: {
      type: Number,
      required: true,
      min: 0,
    },
    cancelledBy: {
      type: String,
      enum: ["user", "expert", "admin"],
    },
    cancellationReason: { type: String },
    cancelledAt: { type: Date },
    completedAt: { type: Date },
    connectedAt: { type: Date },
    notes: { type: String, maxlength: 500 },
  },
  { timestamps: true }
);

// Conflict detection — no double-booking same expert at same time
BookingSchema.index(
  { expert: 1, date: 1, startTime: 1 },
  { unique: true, partialFilterExpression: { status: "confirmed" } }
);

// User's bookings list
BookingSchema.index({ user: 1, status: 1, date: -1 });

// Expert's bookings list
BookingSchema.index({ expertUser: 1, status: 1, date: -1 });

export const BookingModel = mongoose.model<IBooking>("Booking", BookingSchema);
