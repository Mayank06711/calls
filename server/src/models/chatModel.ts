import mongoose, { Document, Schema } from "mongoose";

// Define the Attachment interface
interface IAttachment {
  key: string; // Key of the attachment (e.g., photoKey, videoKey)
  url: string; // URL of the attachment (photo/video)
}

// Define the Chat interface extending Document
interface IChat extends Document {
  sender: mongoose.Schema.Types.ObjectId; // Reference to User model (sender)
  receiver: mongoose.Schema.Types.ObjectId; // Reference to User model (receiver)
  message: string; // The message content
  attachments?: IAttachment[]; // Array of attachment objects
  chatType: "userToUser" | "adminToUser" | "adminToExpert" | "userToExpert"; // Type of chat
}

// Define the Chat Schema
const ChatSchema: Schema<IChat> = new Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // Reference to the User model for the sender
      required: true,
    },
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // Reference to the User model for the receiver
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    attachments: {
      type: [
        {
          key: { type: String }, // Key for the attachment
          url: { type: String }, // URL of the attachment
        },
      ],
      default: [],
    },
    chatType: {
      type: String,
      enum: ["userToUser", "adminToUser", "adminToExpert", "userToExpert"],
      required: true,
    },
  },
  { timestamps: true } // Automatically manage createdAt and updatedAt fields
);

// Create the Chat model
const ChatModel = mongoose.model<IChat>("Chat", ChatSchema);

// Export the Chat model and the IChat interface
export { ChatModel, IChat };
