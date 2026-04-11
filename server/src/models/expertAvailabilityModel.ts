import mongoose, { Schema, Document, Types } from "mongoose";

export interface IWeeklySlot {
  day: number; // 0=Sun, 1=Mon, ..., 6=Sat
  startTime: string; // "10:00"
  endTime: string; // "18:00"
  isActive: boolean;
}

export interface IExpertAvailability extends Document {
  expert: Types.ObjectId; // ref Expert._id (unique)
  timezone: string; // "Asia/Kolkata"
  weeklySlots: IWeeklySlot[];
  slotDurations: number[]; // [15, 30, 60]
  bufferMinutes: number; // gap between sessions
  createdAt: Date;
  updatedAt: Date;
}

const WeeklySlotSchema = new Schema(
  {
    day: { type: Number, required: true, min: 0, max: 6 },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    isActive: { type: Boolean, default: true },
  },
  { _id: false }
);

const ExpertAvailabilitySchema = new Schema<IExpertAvailability>(
  {
    expert: {
      type: Schema.Types.ObjectId,
      ref: "Expert",
      required: true,
      unique: true,
    },
    timezone: {
      type: String,
      default: "Asia/Kolkata",
    },
    weeklySlots: {
      type: [WeeklySlotSchema],
      default: [],
    },
    slotDurations: {
      type: [Number],
      default: [15, 30, 60],
      validate: [
        (v: number[]) => v.every((d) => [15, 30, 60].includes(d)),
        "Durations must be 15, 30, or 60",
      ],
    },
    bufferMinutes: {
      type: Number,
      default: 10,
      min: 0,
      max: 60,
    },
  },
  { timestamps: true }
);

ExpertAvailabilitySchema.index({ expert: 1 }, { unique: true });

export const ExpertAvailabilityModel = mongoose.model<IExpertAvailability>(
  "ExpertAvailability",
  ExpertAvailabilitySchema
);
