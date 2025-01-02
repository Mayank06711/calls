import mongoose, { Document, Schema, model, Types, Query } from "mongoose";

// Define the Attachment interface
interface IAttachment {
  key: string;
  url: string;
}

// Define the OldMessage interface
// Define the base interface for the document
interface IOldMessageDoc extends Document {
  chatId: Types.ObjectId;
  messageId: number;
  text: string;
  sender: Types.ObjectId;
  receiver: Types.ObjectId;
  attachments?: IAttachment[];
  isRead: boolean;
  readAt?: Date;
  deliveredAt?: Date;
  deletedBySender: boolean;
  deletedByReceiver: boolean;
}

interface IOldMessageMethods {
  softDelete(userId: Types.ObjectId): Promise<void>;
  isVisibleTo(userId: Types.ObjectId): boolean;
}

// Combine document and methods interfaces
interface IOldMessage extends IOldMessageDoc, IOldMessageMethods {}

interface IOldMessageQueryHelpers {
  visibleTo(
    userId: Types.ObjectId
  ): mongoose.Query<any, IOldMessage, IOldMessageQueryHelpers>;
}

// Define model interface
interface IOldMessageModel
  extends mongoose.Model<IOldMessage, IOldMessageQueryHelpers> {}

// Define the OldMsg Schema
// Define schema
const OldMsgSchema = new Schema<
  IOldMessage,
  IOldMessageModel,
  IOldMessageMethods,
  IOldMessageQueryHelpers
>(
  {
    chatId: {
      type: Schema.Types.ObjectId,
      ref: "NewMsg",
      required: true,
      index: true,
    },
    messageId: {
      type: Number,
      required: true,
      index: true,
    },
    text: {
      type: String,
      required: true,
    },
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
    attachments: [
      {
        key: String,
        url: String,
      },
    ],
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: Date,
    deliveredAt: Date,
    deletedBySender: {
      type: Boolean,
      default: false,
    },
    deletedByReceiver: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Define methods
OldMsgSchema.methods.softDelete = async function (
  this: IOldMessage,
  userId: Types.ObjectId
) {
  if (userId.equals(this.sender)) {
    this.deletedBySender = true;
  } else if (userId.equals(this.receiver)) {
    this.deletedByReceiver = true;
  }
  await this.save();
};

OldMsgSchema.methods.isVisibleTo = function (
  this: IOldMessage,
  userId: Types.ObjectId
) {
  if (userId.equals(this.sender)) {
    return !this.deletedBySender;
  } else if (userId.equals(this.receiver)) {
    return !this.deletedByReceiver;
  }
  return false;
};

// Define query helper
OldMsgSchema.query.visibleTo = function (
  this: mongoose.Query<any, IOldMessage, IOldMessageQueryHelpers>,
  userId: Types.ObjectId
) {
  return this.where({
    $or: [
      { sender: userId, deletedBySender: false },
      { receiver: userId, deletedByReceiver: false },
    ],
  });
};

// Pre-save hook
OldMsgSchema.pre("save", async function (this: IOldMessage, next) {
  if (this.isNew) {
    const Model = this.constructor as IOldMessageModel;
    const lastMessage = await Model.findOne({ chatId: this.chatId })
      .sort({ messageId: -1 })
      .limit(1);

    if (lastMessage) {
      this.messageId = lastMessage.messageId + 1;
    } else {
      this.messageId = 1;
    }
  }
  next();
});

// Create indexes
OldMsgSchema.index({ chatId: 1, messageId: 1 }, { unique: true });
OldMsgSchema.index({ deletedBySender: 1, deletedByReceiver: 1 });

// Create model
const OldMsgModel = model<IOldMessage, IOldMessageModel>(
  "OldMsg",
  OldMsgSchema
);

// Exports
export { OldMsgModel, IOldMessage, IOldMessageQueryHelpers };
