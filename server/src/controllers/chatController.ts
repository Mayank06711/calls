import { ChatModel, IChat } from "../models/newMsgModel"; // Adjust the import path accordingly
import { ChatMessageModel, IChatMessage } from "../models/messageModel"; // Adjust the import path accordingly
import mongoose, { ObjectId } from "mongoose";
import { ApiError } from "../utils/apiError";

// Function to create a chat message using arrow function syntax
const createChatMessage = async (
  senderId: string,
  receiverId: string,
  message: string,
  attachments: { key: string; url: string }[],
  chatType: "userToUser" | "adminToUser" | "adminToExpert" | "userToExpert"
): Promise<IChat | null> => {
  try {
    // Validate sender and receiver IDs
    const senderObjectId = new mongoose.Types.ObjectId(senderId);
    const receiverObjectId = new mongoose.Types.ObjectId(receiverId);

    // Create a new chat message
    const newChatMessage = new ChatMessageModel({
      message,
      attachments,
    });

    // Save the chat message to the database
    const savedMessage = await newChatMessage.save();

    // Find or create a chat document for this sender and receiver
    let chat = await ChatModel.findOne({
      sender: senderObjectId,
      receiver: receiverObjectId,
    });

    // If the chat does not exist, create it
    if (!chat) {
      chat = new ChatModel({
        sender: senderObjectId,
        receiver: receiverObjectId,
        messages: [], // Initialize with an empty array
        chatType,
      });
      await chat.save();
    }

    // Push the new message reference into the chat's messages array
    chat.messages.push(savedMessage._id as ObjectId);
    await chat.save();

    return chat; // Return the updated chat document
  } catch (error) {
    console.error("Error creating chat message:", error);
    throw new ApiError(500, "Failed to create chat message");
  }
};

export const getChatMessages = async (
  senderObjectId: ObjectId,
  receiverObjectId: ObjectId
): Promise<void> => {
  try {
    // Find the chat between the sender and receiver
    const chat = await ChatModel.findOne({
      $or: [
        { sender: senderObjectId, receiver: receiverObjectId },
        { sender: receiverObjectId, receiver: senderObjectId },
      ],
    }).populate("messages"); // Populate the chat messages

    // If no chat exists, return an empty array
    if (!chat) {
      console.error("");
    }
    else if(chat.messages.length === 0) {
        console.error("");
    }
    
    const sender = chat?.sender;
    const receiver = chat?.receiver;

    // Cast the messages to the correct type (IChatMessage[])
    const messages = chat.messages as unknown as IChatMessage[];

    // Format and return the messages
    const formattedMessages = messages.map((message) => ({
      message: message.message,
      attachments: message.attachments || [],
      createdAt: message.createdAt,
    }));

    // Send the formatted messages as a response
  } catch (error) {
    console.error("Error retrieving chat messages:", error);
  }
};


