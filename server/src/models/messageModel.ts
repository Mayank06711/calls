import { Schema, model, Model, Types } from "mongoose";
import {
  IAttachment,
  INewMessage,
  INewMsg,
  MessageType,
  IMessageMedia,
} from "../interface/IMessage";
import { FileHandler } from "../helper/fileHandler";

interface IMsgModelStatics extends Model<INewMsg> {
  deleteMessagesForMe(
    chatId: Types.ObjectId,
    messageIds: number[],
    userId: Types.ObjectId
  ): Promise<void>;
  deleteMessagesForEveryoneAtomic(
    chatId: Types.ObjectId,
    messageIds: number[],
    senderId: Types.ObjectId
  ): Promise<{ deletedIds: number[]; skippedIds: number[] }>;
}

const mediaItemSchema = {
  public_id: String,
  url: String,
  thumbnail_url: String,
  title: String,
  description: String,
  tags: [String],
  createdAt: { type: Date, default: Date.now },
};

const MsgSchema = new Schema<INewMsg>(
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
    bookingId: {
      type: Schema.Types.ObjectId,
      ref: "Booking",
      default: null,
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
            type: { type: String },
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
        isActive: { type: Boolean, default: false },
        lastSeen: { type: Date, default: Date.now },
      },
    },
    chatType: {
      type: String,
      enum: ["userToUser", "adminToUser", "adminToExpert", "userToExpert", "booking"],
      required: true,
      index: true,
    },
    messageIdCounter: {
      type: Number,
      default: 0,
    },
    chatHiddenFor: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    chatDeletedFor: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Create indexes
MsgSchema.index({ sender: 1, receiver: 1, bookingId: 1 }, { unique: true });
MsgSchema.index({ "messages.createdAt": 1 });
MsgSchema.index({ isActive: 1 });
MsgSchema.index({ chatHiddenFor: 1 });
MsgSchema.index({ chatDeletedFor: 1 });
MsgSchema.index({ "participantsInfo.sender.lastSeen": 1 });
MsgSchema.index({ "participantsInfo.receiver.lastSeen": 1 });
MsgSchema.index({ "messages.media.photos.public_id": 1 });
MsgSchema.index({ "messages.media.videos.public_id": 1 });

// Methods
MsgSchema.methods.addMessageWithMedia = async function (
  text: string,
  sender: Types.ObjectId,
  messageType: MessageType = "text",
  media?: IMessageMedia,
  attachments?: IAttachment[],
  replyTo?: { messageId: number; text: string }
): Promise<INewMessage> {
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
  return this.messages[this.messages.length - 1] as INewMessage;  //return this.messages[this.messages.length - 1]; // Return the newly added message
};

MsgSchema.methods.addMessage = async function (
  text: string,
  sender: Types.ObjectId,
  messageType: MessageType = "text",
  attachments?: IAttachment[],
  replyTo?: { messageId: number; text: string }
): Promise<INewMessage> {
  return this.addMessageWithMedia(
    text,
    sender,
    messageType,
    undefined,
    attachments,
    replyTo
  );
};

MsgSchema.methods.markMessageAsRead = async function (messageId: number) {
  const maxRetries = 3;
  let attempt = 0;
  
  while (attempt < maxRetries) {
    try {
      // Fetch fresh document to avoid version conflicts
      const freshDoc = await MsgModel.findById(this._id);
      if (!freshDoc) throw new Error('Chat not found');
      
      const message = freshDoc.messages.find(
        (m: INewMessage) => m.messageId === messageId
      );
      
      if (message && !message.status.isRead) {
        message.status.isRead = true;
        message.status.readAt = new Date();

        if (freshDoc.lastMessage?.messageId === messageId) {
          freshDoc.lastMessage.status.isRead = true;
        }

        await freshDoc.save();
        console.log(`✅ Successfully marked message ${messageId} as read (attempt ${attempt + 1})`);
        return;
      } else {
        // Message already read, no need to retry
        return;
      }
    } catch (error: any) {
      attempt++;
      if (error.name === 'VersionError' && attempt < maxRetries) {
        console.log(`⚠️ Version conflict marking message ${messageId} as read, retrying (${attempt}/${maxRetries})...`);
        await new Promise(resolve => setTimeout(resolve, 50 * attempt)); // Exponential backoff
      } else {
        console.error(`❌ Failed to mark message ${messageId} as read after ${attempt} attempts:`, error);
        throw error;
      }
    }
  }
};

MsgSchema.methods.markMessageAsDelivered = async function (
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

MsgSchema.methods.updateParticipantStatus = async function (
  userId: Types.ObjectId,
  isActive: boolean
) {
  const participant = userId.equals(this.sender) ? "sender" : "receiver";
  this.participantsInfo[participant].isActive = isActive;
  this.participantsInfo[participant].lastSeen = new Date();
  await this.save();
};

/**
 * Atomic soft-delete: adds userId to deletedFor for multiple messages at once.
 * Uses arrayFilters so no version conflict is possible.
 */
MsgSchema.statics.deleteMessagesForMe = async function (
  chatId: Types.ObjectId,
  messageIds: number[],
  userId: Types.ObjectId
): Promise<void> {
  await this.updateOne(
    { _id: chatId },
    { $addToSet: { "messages.$[elem].deletedFor": userId } },
    { arrayFilters: [{ "elem.messageId": { $in: messageIds } }] }
  );
};

/**
 * Atomic hard-delete for multiple messages. Only deletes messages where:
 * - sender matches senderId
 * - message was created today (calendar day)
 * Returns which IDs were deleted vs skipped.
 */
MsgSchema.statics.deleteMessagesForEveryoneAtomic = async function (
  chatId: Types.ObjectId,
  messageIds: number[],
  senderId: Types.ObjectId
): Promise<{ deletedIds: number[]; skippedIds: number[] }> {
  // Step 1: Fetch the chat with only the requested messages
  const chat = await this.findOne(
    { _id: chatId },
    { messages: 1, lastMessage: 1 }
  ).lean();

  if (!chat) return { deletedIds: [], skippedIds: messageIds };

  const requestedSet = new Set(messageIds);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Filter: only sender's own messages created today
  const validIds: number[] = [];
  const skippedIds: number[] = [];
  const mediaToDelete: IMessageMedia[] = [];

  for (const msg of chat.messages as INewMessage[]) {
    if (!requestedSet.has(msg.messageId)) continue;
    const isSender = msg.sender.toString() === senderId.toString();
    const isToday = new Date(msg.createdAt) >= today;
    if (isSender && isToday) {
      validIds.push(msg.messageId);
      if (msg.media) mediaToDelete.push(msg.media);
    } else {
      skippedIds.push(msg.messageId);
    }
  }

  if (validIds.length === 0) return { deletedIds: [], skippedIds };

  // Step 2: Delete media files
  await Promise.all(
    mediaToDelete.map((media) => FileHandler.deleteMessageMedia(media))
  );

  // Step 3: Atomically pull all valid messages
  await this.updateOne(
    { _id: chatId },
    { $pull: { messages: { messageId: { $in: validIds } } } }
  );

  // Step 4: Update lastMessage if any deleted message was the last one
  const lastMessageId = chat.lastMessage?.messageId;
  if (lastMessageId !== undefined && validIds.includes(lastMessageId)) {
    const updated = await this.findById(chatId, {
      messages: { $slice: -1 },
      _id: 0,
    });
    if (updated && updated.messages.length > 0) {
      const last = updated.messages[0] as INewMessage;
      await this.updateOne(
        { _id: chatId },
        {
          $set: {
            lastMessage: {
              messageId: last.messageId,
              text: last.text,
              sender: last.sender,
              messageType: last.messageType,
              media: last.media,
              status: last.status,
              createdAt: last.createdAt,
            },
          },
        }
      );
    } else {
      await this.updateOne({ _id: chatId }, { $unset: { lastMessage: 1 } });
    }
  }

  return { deletedIds: validIds, skippedIds };
};

// Pre-save middleware
MsgSchema.pre("save", function (next) {
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

const MsgModel = model<INewMsg, IMsgModelStatics>("NewMsg", MsgSchema);

export { MsgModel };
