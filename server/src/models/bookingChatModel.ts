import mongoose, { Schema, Document, Types } from "mongoose";

export interface IChatMessage {
  _id?: Types.ObjectId;
  sender: Types.ObjectId;
  text: string;
  sentAt: Date;
}

export interface IBookingChat extends Document {
  booking: Types.ObjectId;
  user: Types.ObjectId;
  expert: Types.ObjectId;
  messages: IChatMessage[];
  chatLockedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ChatMessageSchema = new Schema<IChatMessage>(
  {
    sender: { type: Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, required: true, maxlength: 2000 },
    sentAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const BookingChatSchema = new Schema<IBookingChat>(
  {
    booking: {
      type: Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
      unique: true,
    },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    expert: { type: Schema.Types.ObjectId, ref: "User", required: true },
    messages: [ChatMessageSchema],
    chatLockedAt: { type: Date },
  },
  { timestamps: true }
);

BookingChatSchema.index({ booking: 1 });

export const BookingChatModel = mongoose.model<IBookingChat>(
  "BookingChat",
  BookingChatSchema
);
