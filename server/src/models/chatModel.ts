import mongoose, { Document, Schema } from "mongoose";
import { IChatMessage } from "./messageModel"; // Adjust the import path as necessary

// Define the Chat interface extending Document
interface IChat extends Document {
  sender: mongoose.Schema.Types.ObjectId; // Reference to User model (sender)
  receiver: mongoose.Schema.Types.ObjectId; // Reference to User model (receiver)
  messages: mongoose.Schema.Types.ObjectId[]; // Array of references to ChatMessage model
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
    messages: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "ChatMessage", // Reference to the ChatMessage model
    }],
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
