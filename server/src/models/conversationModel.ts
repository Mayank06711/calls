import mongoose, { Document, Schema, model, Types } from "mongoose";
import {  INewMsg } from "./newMsgModel";

// Define the Attachment interface
interface IAttachment {
  key: string;
  url: string;
}

// Define the NewMessage interface (represents a single message)



// Define the NewMsg interface (represents a chat document)
interface IConversation extends Document {
    lastMessage?: INewMsg; // Track last message for preview
    isActive: boolean; 
    chatType: "userToUser" | "adminToUser" | "adminToExpert" | "userToExpert";
    messageIdCounter: number;
    unreadCount : number// Track if chat is active/archived
    participantsInfo: {
        // Track participant details
        sender: {
          isActive: boolean;
          lastSeen: Date;
        };
        receiver: {
          isActive: boolean;
          lastSeen: Date;
        };
  };
  //methods
  // Methods with proper typing
//   addMessage(text: string, sender: Types.ObjectId, attachments?: IAttachment[]): Promise<void>;
//   markMessageAsRead(messageId: number): Promise<void>;
//   markMessageAsDelivered(messageId: number): Promise<void>;
//   updateParticipantStatus(userId: Types.ObjectId, isActive: boolean): Promise<void>;
}

// Define the NewMsg Schema
const ConversationSchema = new Schema<IConversation>(
  {
    lastMessage: {
      messageId: { type: Number },
      text: { type: String },
      sender: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      createdAt: { type: Date },
      isRead: { type: Boolean },
    },
    participantsInfo: {
        sender: {
          isActive: { type: Boolean, default: true },
          lastSeen: { type: Date, default: Date.now },
        },
        receiver: {
          isActive: { type: Boolean, default: true },
          lastSeen: { type: Date, default: Date.now },
        },
      },
    isActive: { type: Boolean, default: true },
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
    unreadCount : { type : Number , default : 0}
  },
  {
    timestamps: true,
  }
);

// Create indexes
// NewMsgSchema.index({ sender: 1, receiver: 1 }, { unique: true });
// NewMsgSchema.index({ "messages.createdAt": 1 });
// NewMsgSchema.index({ isActive: 1 });
// NewMsgSchema.index({ "participantsInfo.sender.lastSeen": 1 });
// NewMsgSchema.index({ "participantsInfo.receiver.lastSeen": 1 });
// // Create the NewMsg model

// NewMsgSchema.methods.addMessage = async function(text: string, sender: Types.ObjectId, attachments?: IAttachment[]) {
//   this.messageIdCounter += 1;
//   const newMessage = {
//     messageId: this.messageIdCounter,
//     text,
//     sender,
//     attachments,
//     createdAt: new Date(),
//     isRead: false
//   };
  
//   this.messages.push(newMessage);
//   this.lastMessage = newMessage;
//   await this.save();
// };

// Update methods with proper typing
// NewMsgSchema.methods.markMessageAsRead = async function(messageId: number) {
//   const message = this.messages.find((m: INewMessage) => m.messageId === messageId);
//   if (message && !message.isRead) {
//     message.isRead = true;
//     message.readAt = new Date();
//     await this.save();
//   }
// };

// NewMsgSchema.methods.markMessageAsDelivered = async function(messageId: number) {
//   const message = this.messages.find((m: INewMessage) => m.messageId === messageId);
//   if (message && !message.deliveredAt) {
//     message.deliveredAt = new Date();
//     await this.save();
//   }
// };

// NewMsgSchema.methods.updateParticipantStatus = async function(userId: Types.ObjectId, isActive: boolean) {
//   const participant = userId.equals(this.sender) ? 'sender' : 'receiver';
//   this.participantsInfo[participant].isActive = isActive;
//   this.participantsInfo[participant].lastSeen = new Date();
//   await this.save();
// };

// // Pre-save hook to update lastMessage
// NewMsgSchema.pre('save', function(next) {
//   if (this.messages.length > 0) {
//     const lastMsg = this.messages[this.messages.length - 1] as INewMessage;
//     this.lastMessage = {
//       messageId: lastMsg.messageId,
//       text: lastMsg.text,
//       sender: lastMsg.sender,
//       createdAt: lastMsg.createdAt,
//       isRead: lastMsg.isRead
//     };
//   }
//   next();
// });

const ConverationModel = model<IConversation>("NewMsg", ConversationSchema);

export { ConversationSchema };
