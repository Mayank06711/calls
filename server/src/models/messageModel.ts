import mongoose, { Document, Schema } from "mongoose";

// Define the Attachment interface
interface IAttachment {
  key: string; // Key of the attachment (e.g., photoKey, videoKey)
  url: string; // URL of the attachment (photo/video)
}

// Define the ChatMessage interface extending Document
interface IChatMessage extends Document {
  message: string; // The message content
  attachments?: IAttachment[]; // Array of attachment objects
  createdAt: Date; // Timestamp for when the message was created
}

// Define the ChatMessage Schema
const ChatMessageSchema: Schema<IChatMessage> = new Schema(
  {
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
  },
  { timestamps: { createdAt: true, updatedAt: false } } // Automatically manage createdAt field
);

// Create the ChatMessage model
const ChatMessageModel = mongoose.model<IChatMessage>("ChatMessage", ChatMessageSchema);

// Export the ChatMessage model and the IChatMessage interface
export { ChatMessageModel, IChatMessage };
