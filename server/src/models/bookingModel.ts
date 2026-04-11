import mongoose, { Schema, Document, Types } from "mongoose";

export type BookingStatus = "confirmed" | "completed" | "cancelled" | "no_show";

export interface ISharedCatalogItem {
  catalogItem: Types.ObjectId;
  sharedAt: Date;
  note?: string;
}

export type TryOnStatus = "pending" | "generating" | "completed" | "failed";

export interface ITryOnResult {
  _id?: Types.ObjectId;
  catalogItem: Types.ObjectId;
  category: "clothing" | "hair" | "makeup";
  personPhotos: string[];
  styleImages: string[];
  prompt: string;
  taskId?: string;
  status: TryOnStatus;
  resultImageUrl?: string;
  error?: string;
  requestedBy: Types.ObjectId;
  requestedAt: Date;
  completedAt?: Date;
}

export interface ISessionExtension {
  minutes: number;
  creditsCharged: number;
  previousEndTime: string;
  newEndTime: string;
  extendedAt: Date;
}

export interface IBooking extends Document {
  user: Types.ObjectId;
  expert: Types.ObjectId; // Expert doc _id
  expertUser: Types.ObjectId; // Expert's User _id (for chat)
  date: Date; // calendar date (start of day UTC)
  startTime: string; // "14:00"
  endTime: string; // "14:30"
  duration: number; // 15 | 30 | 60 (can grow beyond 60 via extensions)
  timezone: string;
  status: BookingStatus;
  creditsCharged: number;
  cancelledBy?: "user" | "expert" | "admin";
  cancellationReason?: string;
  cancelledAt?: Date;
  completedAt?: Date;
  connectedAt?: Date;
  isInstant?: boolean;
  startedAt?: Date;
  notes?: string;
  extensions: ISessionExtension[];
  sharedCatalogItems: ISharedCatalogItem[];
  tryOnResults: ITryOnResult[];
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
      min: 15,
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
    isInstant: { type: Boolean, default: false },
    startedAt: { type: Date },
    notes: { type: String, maxlength: 500 },
    extensions: [
      {
        minutes: { type: Number, required: true },
        creditsCharged: { type: Number, required: true },
        previousEndTime: { type: String, required: true },
        newEndTime: { type: String, required: true },
        extendedAt: { type: Date, default: Date.now },
      },
    ],
    sharedCatalogItems: [
      {
        catalogItem: {
          type: Schema.Types.ObjectId,
          ref: "CatalogItem",
          required: true,
        },
        sharedAt: { type: Date, default: Date.now },
        note: { type: String, maxlength: 300 },
      },
    ],
    tryOnResults: [
      {
        catalogItem: {
          type: Schema.Types.ObjectId,
          ref: "CatalogItem",
          required: true,
        },
        category: {
          type: String,
          enum: ["clothing", "hair", "makeup"],
          required: true,
        },
        personPhotos: [{ type: String, required: true }],
        styleImages: [{ type: String, required: true }],
        prompt: { type: String, required: true },
        taskId: { type: String },
        status: {
          type: String,
          enum: ["pending", "generating", "completed", "failed"],
          default: "pending",
        },
        resultImageUrl: { type: String },
        error: { type: String },
        requestedBy: {
          type: Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        requestedAt: { type: Date, default: Date.now },
        completedAt: { type: Date },
      },
    ],
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
