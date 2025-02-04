import mongoose, { Document, Schema, model, Types } from "mongoose";


// Define the Attachment interface
interface IAttachment {
  key: string;
  url: string;
}

// Define the NewMessage interface (represents a single message)
interface INewMessage {
  messageId: number;  // Add this field
  text: string;
  sender: Types.ObjectId; // Use Types.ObjectId for sender (correct type)
  attachments?: IAttachment[];
  createdAt: Date;
  isRead: boolean;
  readAt?: Date;
  deliveredAt?: Date;
}

// Define the NewMsg interface (represents a chat document)
interface INewMsg extends Document {
  message: INewMessage; // Array of messages
  messageIdCounter: number;
  conversationId: Types.ObjectId;
  isActive: boolean;

  //methods
  // Methods with proper typing
  addMessage(text: string, sender: Types.ObjectId,receiver: Types.ObjectId ,  attachments?: IAttachment[] , ): Promise<void>;
  markMessageAsRead(messageId: number): Promise<void>;
  markMessageAsDelivered(messageId: number): Promise<void>;
  updateParticipantStatus(userId: Types.ObjectId, isActive: boolean): Promise<void>;
}

// Define the NewMsg Schema
const NewMsgSchema = new Schema<INewMsg>(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
      index: true,
    },
    message: 
      {
        messageId: { type: Number, required: true },
        text: { type: String, required: true },
        attachments: [
          {
            key: { type: String },
            url: { type: String },
          },
        ],
        createdAt: { type: Date, default: Date.now },
        isRead: { type: Boolean, default: false },
        readAt: { type: Date },
        deliveredAt: { type: Date },
      },
    isActive: { type: Boolean, default: true },
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
NewMsgSchema.index({ "messages.createdAt": 1 });
NewMsgSchema.index({ isActive: 1 });
NewMsgSchema.index({ "participantsInfo.sender.lastSeen": 1 });
NewMsgSchema.index({ "participantsInfo.receiver.lastSeen": 1 });
// Create the NewMsg model

NewMsgSchema.methods.addMessage = async function(text: string, sender: Types.ObjectId,  receiver: Types.ObjectId ,  attachments?: IAttachment[] ) {
  this.messageIdCounter += 1;
  const newMessage = {
    messageId: this.messageIdCounter,
    text,
    sender,
    receiver,
    attachments,
    createdAt: new Date(),
    isRead: false
  };
  
 
  await this.save();
};

// Update methods with proper typing
NewMsgSchema.methods.markMessageAsRead = async function(messageId: number) {
  const message = this.messages.find((m: INewMessage) => m.messageId === messageId);
  if (message && !message.isRead) {
    message.isRead = true;
    message.readAt = new Date();
    await this.save();
  }
};

NewMsgSchema.methods.markMessageAsDelivered = async function(messageId: number) {
  const message = this.messages.find((m: INewMessage) => m.messageId === messageId);
  if (message && !message.deliveredAt) {
    message.deliveredAt = new Date();
    await this.save();
  }
};

NewMsgSchema.methods.updateParticipantStatus = async function(userId: Types.ObjectId, isActive: boolean) {
  const participant = userId.equals(this.sender) ? 'sender' : 'receiver';
  this.participantsInfo[participant].isActive = isActive;
  this.participantsInfo[participant].lastSeen = new Date();
  await this.save();
};

// Pre-save hook to update lastMessage
// NewMsgSchema.pre('save', function(next) {
//   if (this.message.length > 0) {
//     const lastMsg = this.message[this.message.length - 1] as INewMessage;
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

const NewMsgModel = model<INewMsg>("NewMsg", NewMsgSchema);

export { NewMsgModel, INewMsg, INewMessage, IAttachment };
