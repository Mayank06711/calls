import mongoose, { Document, Schema, model, Types } from "mongoose";

// Define the Attachment interface
interface IAttachment {
  key: string;
  url: string;
}

// Define the NewMessage interface (represents a single message)
interface INewMessage {
  text: string;
  sender: Types.ObjectId; // Use Types.ObjectId for sender (correct type)
  attachments?: IAttachment[];
  createdAt: Date;
}

// Define the NewMsg interface (represents a chat document)
interface INewMsg extends Document {
  sender: Types.ObjectId; // Use Types.ObjectId for sender (correct type)
  receiver: Types.ObjectId; // Use Types.ObjectId for receiver (correct type)
  messages: INewMessage[]; // Array of messages
  chatType: "userToUser" | "adminToUser" | "adminToExpert" | "userToExpert";
  messageIdCounter: number;
}

// Define the NewMsg Schema
const NewMsgSchema = new Schema<INewMsg>(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,  // Define it as an ObjectId
      ref: "User",
      required: true,
      index: true,
    },
    receiver: {
      type: mongoose.Schema.Types.ObjectId, // Define it as an ObjectId
      ref: "User",
      required: true,
      index: true,
    },
    messages: [
      {
        text: { type: String, required: true },
        sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        attachments: [
          {
            key: { type: String },
            url: { type: String },
          },
        ],
        createdAt: { type: Date, default: Date.now },
      },
    ],
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

export { NewMsgModel, INewMsg, INewMessage, IAttachment };
