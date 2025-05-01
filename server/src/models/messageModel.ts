import { Schema, model, Types } from "mongoose";
import {
  IAttachment,
  INewMessage,
  INewMsg,
  MessageType,
  IMessageMedia,
} from "../interface/IMessage";

const mediaItemSchema = {
  public_id: String,
  url: String,
  thumbnail_url: String,
  title: String,
  description: String,
  tags: [String],
  createdAt: { type: Date, default: Date.now },
};

const NewMsgSchema = new Schema<INewMsg>(
  {
    sender: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    receiver: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    messages: [
      {
        messageId: { type: Number, required: true },
        text: { type: String, default: "" },
        sender: {
          type: Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        messageType: {
          type: String,
          enum: ["text", "image", "video", "audio", "document"],
          default: "text",
        },
        media: {
          photos: [mediaItemSchema],
          videos: [mediaItemSchema],
        },
        attachments: [
          {
            ...mediaItemSchema,
            type: { type: String, required: true },
            name: String,
            size: Number,
          },
        ],
        status: {
          isRead: { type: Boolean, default: false },
          readAt: Date,
          deliveredAt: Date,
        },
        createdAt: { type: Date, default: Date.now },
        replyTo: {
          messageId: Number,
          text: String,
        },
        deletedFor: [
          {
            type: Schema.Types.ObjectId,
            ref: "User",
          },
        ],
      },
    ],
    lastMessage: {
      messageId: Number,
      text: String,
      sender: { type: Schema.Types.ObjectId, ref: "User" },
      messageType: String,
      media: {
        photos: [
          {
            public_id: String,
            url: String,
            thumbnail_url: String,
          },
        ],
        videos: [
          {
            public_id: String,
            url: String,
            thumbnail_url: String,
          },
        ],
      },
      status: {
        isRead: Boolean,
        deliveredAt: Date,
      },
      createdAt: Date,
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
NewMsgSchema.index({ "messages.media.photos.public_id": 1 });
NewMsgSchema.index({ "messages.media.videos.public_id": 1 });

// Methods
NewMsgSchema.methods.addMessageWithMedia = async function (
  text: string,
  sender: Types.ObjectId,
  messageType: MessageType = "text",
  media?: IMessageMedia,
  attachments?: IAttachment[],
  replyTo?: { messageId: number; text: string }
) {
  this.messageIdCounter += 1;
  const newMessage = {
    messageId: this.messageIdCounter,
    text,
    sender,
    messageType,
    media,
    attachments,
    status: {
      isRead: false,
    },
    createdAt: new Date(),
    replyTo,
  };

  this.messages.push(newMessage);
  this.lastMessage = {
    messageId: newMessage.messageId,
    text: newMessage.text,
    sender: newMessage.sender,
    messageType: newMessage.messageType,
    media: {
      photos: media?.photos?.map((photo) => ({
        public_id: photo.public_id,
        url: photo.url,
        thumbnail_url: photo.thumbnail_url,
      })),
      videos: media?.videos?.map((video) => ({
        public_id: video.public_id,
        url: video.url,
        thumbnail_url: video.thumbnail_url,
      })),
    },
    status: newMessage.status,
    createdAt: newMessage.createdAt,
  };
  await this.save();
};

NewMsgSchema.methods.addMessage = async function (
  text: string,
  sender: Types.ObjectId,
  messageType: MessageType = "text",
  attachments?: IAttachment[],
  replyTo?: { messageId: number; text: string }
) {
  return this.addMessageWithMedia(
    text,
    sender,
    messageType,
    undefined,
    attachments,
    replyTo
  );
};

NewMsgSchema.methods.markMessageAsRead = async function (messageId: number) {
  const message = this.messages.find(
    (m: INewMessage) => m.messageId === messageId
  );
  if (message && !message.status.isRead) {
    message.status.isRead = true;
    message.status.readAt = new Date();

    if (this.lastMessage?.messageId === messageId) {
      this.lastMessage.status.isRead = true;
    }

    await this.save();
  }
};

NewMsgSchema.methods.markMessageAsDelivered = async function (
  messageId: number
) {
  const message = this.messages.find(
    (m: INewMessage) => m.messageId === messageId
  );
  if (message && !message.status.deliveredAt) {
    message.status.deliveredAt = new Date();

    if (this.lastMessage?.messageId === messageId) {
      this.lastMessage.status.deliveredAt = new Date();
    }

    await this.save();
  }
};

NewMsgSchema.methods.updateParticipantStatus = async function (
  userId: Types.ObjectId,
  isActive: boolean
) {
  const participant = userId.equals(this.sender) ? "sender" : "receiver";
  this.participantsInfo[participant].isActive = isActive;
  this.participantsInfo[participant].lastSeen = new Date();
  await this.save();
};

NewMsgSchema.methods.deleteMessage = async function (
  messageId: number,
  userId: Types.ObjectId
) {
  const message = this.messages.find(
    (m: INewMessage) => m.messageId === messageId
  );
  if (message && !message.deletedFor?.includes(userId)) {
    if (!message.deletedFor) {
      message.deletedFor = [];
    }
    message.deletedFor.push(userId);
    await this.save();
  }
};

// Pre-save middleware
NewMsgSchema.pre("save", function (next) {
  if (this.messages.length > 0 && !this.lastMessage) {
    const lastMsg = this.messages[this.messages.length - 1] as INewMessage;
    this.lastMessage = {
      messageId: lastMsg.messageId,
      text: lastMsg.text,
      sender: lastMsg.sender,
      messageType: lastMsg.messageType,
      media: lastMsg.media,
      status: lastMsg.status,
      createdAt: lastMsg.createdAt,
    };
  }
  next();
});

const NewMsgModel = model<INewMsg>("NewMsg", NewMsgSchema);

export { NewMsgModel };
