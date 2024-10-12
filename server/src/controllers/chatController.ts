import { ChatModel, IChat } from "../models/chatModel"; // Adjust the import path accordingly
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

const getChatMessages = async (
  user1Id: string,
  user2Id: string
): Promise<IChatMessage[]> => {
  try {
    // Validate user IDs
    const user1ObjectId = new mongoose.Types.ObjectId(user1Id);
    const user2ObjectId = new mongoose.Types.ObjectId(user2Id);

    // Find the chat between the two users and populate the messages
    const chat = await ChatModel.findOne({
      $or: [
        { sender: user1ObjectId, receiver: user2ObjectId },
        { sender: user2ObjectId, receiver: user1ObjectId },
      ],
    }).populate("messages"); // Ensure that messages are populated

    if (!chat) {
      return []; // Return an empty array if no chat is found
    }

    // Ensure messages are of type IChatMessage[]
    const messages = chat.messages as unknown as IChatMessage[]; // Use unknown for safe casting

    // Map the results to return the required structure
    return messages.map((message) => ({
      message: message.message,
      attachments: (message.attachments || []).map((attachment) => ({
        key: attachment.key,
        url: attachment.url,
      })),
      sender: message.sender.toString(), // Convert sender ObjectId to string if needed
      createdAt: message.createdAt, // Assuming you want to include createdAt
    }));
  } catch (error) {
    console.error("Error retrieving chat messages:", error);
    throw new ApiError(500, "Failed to retrieve chat messages");
  }
};

// Example usage function
const exampleUsage = async () => {
  const senderId = "603dcd2c30f1c60d78df2361"; // Replace with actual user IDs
  const receiverId = "603dcd2c30f1c60d78df2362"; // Replace with actual user IDs

  try {
    // Sending a chat message
    const newChat = await createChatMessage(
      senderId,
      receiverId,
      "Hello, how are you?",
      [{ key: "photo1", url: "http://example.com/photo1.jpg" }],
      "userToUser"
    );
    console.log("Chat message sent:", newChat);

    // Retrieving chat messages
    const chatMessages = await getChatMessages(senderId, receiverId);
    console.log("Chat messages:", chatMessages);
  } catch (error) {
    console.error("Error:", error);
  }
};

// Call the example usage function to test
exampleUsage();
