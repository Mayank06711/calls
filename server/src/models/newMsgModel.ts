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
  sender: Types.ObjectId; // Use Types.ObjectId for sender (correct type)
  receiver: Types.ObjectId; // Use Types.ObjectId for receiver (correct type)
  messages: INewMessage[]; // Array of messages
  chatType: "userToUser" | "adminToUser" | "adminToExpert" | "userToExpert";
  messageIdCounter: number;
  lastMessage?: INewMessage; // Track last message for preview
  isActive: boolean; // Track if chat is active/archived
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
  addMessage(text: string, sender: Types.ObjectId, attachments?: IAttachment[]): Promise<void>;
  markMessageAsRead(messageId: number): Promise<void>;
  markMessageAsDelivered(messageId: number): Promise<void>;
  updateParticipantStatus(userId: Types.ObjectId, isActive: boolean): Promise<void>;
}

// Define the NewMsg Schema
const NewMsgSchema = new Schema<INewMsg>(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId, // Define it as an ObjectId
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
        messageId: { type: Number, required: true },
        text: { type: String, required: true },
        sender: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
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
    ],
    lastMessage: {
      messageId: { type: Number },
      text: { type: String },
      sender: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      createdAt: { type: Date },
      isRead: { type: Boolean },
    },

    isActive: { type: Boolean, default: true },

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
NewMsgSchema.index({ "messages.createdAt": 1 });
NewMsgSchema.index({ isActive: 1 });
NewMsgSchema.index({ "participantsInfo.sender.lastSeen": 1 });
NewMsgSchema.index({ "participantsInfo.receiver.lastSeen": 1 });
// Create the NewMsg model

NewMsgSchema.methods.addMessage = async function(text: string, sender: Types.ObjectId, attachments?: IAttachment[]) {
  this.messageIdCounter += 1;
  const newMessage = {
    messageId: this.messageIdCounter,
    text,
    sender,
    attachments,
    createdAt: new Date(),
    isRead: false
  };
  
  this.messages.push(newMessage);
  this.lastMessage = newMessage;
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
NewMsgSchema.pre('save', function(next) {
  if (this.messages.length > 0) {
    const lastMsg = this.messages[this.messages.length - 1] as INewMessage;
    this.lastMessage = {
      messageId: lastMsg.messageId,
      text: lastMsg.text,
      sender: lastMsg.sender,
      createdAt: lastMsg.createdAt,
      isRead: lastMsg.isRead
    };
  }
  next();
});

const NewMsgModel = model<INewMsg>("NewMsg", NewMsgSchema);

export { NewMsgModel, INewMsg, INewMessage, IAttachment };
