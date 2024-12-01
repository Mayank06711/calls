import mongoose, { Document, Schema, model } from "mongoose";

// Define the Attachment interface
interface IAttachment {
  key: string;
  url: string;
}

// Define the OldMessage interface
interface IOldMessage extends Document {
  chatId: mongoose.Schema.Types.ObjectId;
  messageId: number;
  text: string;
  sender: mongoose.Schema.Types.ObjectId;
  attachments?: IAttachment[];
  timestamp: Date;
}

// Define the OldMsg Schema
const OldMsgSchema = new Schema(
  {
    chatId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "NewMsg",
      required: true,
      index: true,
    },
    messageId: {
      type: Number,
      required: true,
      index: true,
    },
    text: {
      type: String,
      required: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    receiver:{
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    attachments: {
      type: [
        {
          key: { type: String },
          url: { type: String },
        },
      ],
    },
    timestamp: {
      type: Date,
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Create indexes
OldMsgSchema.index({ chatId: 1, messageId: 1 }, { unique: true });

// Create the OldMsg model
const OldMsgModel = model<IOldMessage>("OldMsg", OldMsgSchema);

export { OldMsgModel, IOldMessage };
