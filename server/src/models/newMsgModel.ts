// For recent messages embedded in Chat document)

import mongoose, { Document, Schema, model } from "mongoose";

// Define the Attachment interface
interface IAttachment {
  key: string;
  url: string;
}

// Define the NewMessage interface
interface INewMessage {
  text: string;
  sender: mongoose.Schema.Types.ObjectId;
  attachments?: IAttachment[];
}

// Define the NewMsg interface extending Document
interface INewMsg extends Document {
  sender: mongoose.Schema.Types.ObjectId;
  receiver: mongoose.Schema.Types.ObjectId;
  messages: {
    [timestamp: string]: INewMessage;
  };
  chatType: "userToUser" | "adminToUser" | "adminToExpert" | "userToExpert";
  messageIdCounter: number;
}

// Define the NewMsg Schema
const NewMsgSchema = new Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    messages: {
      type: Object,
      default: {},
    },
    chatType: {
      type: String,
      enum: ["userToUser", "adminToUser", "adminToExpert", "userToExpert"],
      required: true,
      index: true,
    },
    messageIdCounter: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Create indexes
NewMsgSchema.index({ sender: 1, receiver: 1 }, { unique: true });

// Create the NewMsg model
const NewMsgModel = model<INewMsg>("NewMsg", NewMsgSchema);

export { NewMsgModel, INewMsg };
