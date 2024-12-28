import { NewMsgModel, INewMsg, INewMessage } from "../models/newMsgModel";
import mongoose, { ObjectId } from "mongoose";
import { ApiError } from "../utils/apiError";

const createChatMessage = async (
  senderId: string,
  receiverId: string,
  text: string,
  attachments: { key: string; url: string }[],
  chatType: "userToUser" | "adminToUser" | "adminToExpert" | "userToExpert"
): Promise<INewMsg | null> => {
  try {
    const senderObjectId = new mongoose.Types.ObjectId(senderId);
    const receiverObjectId = new mongoose.Types.ObjectId(receiverId);

    // Find or create a chat document
    let chat = await NewMsgModel.findOne({
      sender: senderObjectId,
      receiver: receiverObjectId,
    });

    if (!chat) {
      chat = new NewMsgModel({
        sender: senderObjectId,
        receiver: receiverObjectId,
        chatType,
        messages: [],
      });
    }

    // Create the new message
    const newMessage: INewMessage = {
      text,
      sender: senderObjectId,
      attachments,
      createdAt: new Date(),
    };

    // Add the message to the chat and increment the messageIdCounter
    chat.messages.push(newMessage);
    chat.messageIdCounter += 1;

    // Save the updated chat document
    const updatedChat = await chat.save();

    return updatedChat;
  } catch (error) {
    console.error("Error creating chat message:", error);
    throw new ApiError(500, "Failed to create chat message");
  }
};
