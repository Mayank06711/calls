import { Schema, model, Types, Document } from "mongoose";

export type NotificationType = "suggestion" | "social" | "promotion" | "system";
export type NotificationSeverity = "info" | "warning" | "critical";

export interface INotification extends Document {
  recipientId: Types.ObjectId | null;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;

  // Suggestion (product) fields
  product?: {
    name: string;
    image: string;
    link: string;
    price: number;
    brand: string;
    color: { name: string; hex: string };
    platform: string;
  };

  // Social fields
  action?: string;
  user?: { name: string; avatar: string };
  content?: string | null;

  // Promotion fields
  discount?: string;
  expiresIn?: string;
  description?: string;

  // System fields
  severity?: NotificationSeverity;

  // Metadata
  extLink?: string | null;
  stickyTime?: number;
  sentBy?: {
    adminId: string;
    position: string;
  };

  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    recipientId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    type: {
      type: String,
      enum: ["suggestion", "social", "promotion", "system"],
      required: true,
      index: true,
    },
    title: { type: String, default: "" },
    message: { type: String, required: true },
    read: { type: Boolean, default: false },

    // Suggestion product data
    product: {
      type: {
        name: String,
        image: String,
        link: String,
        price: Number,
        brand: String,
        color: { name: String, hex: String },
        platform: String,
      },
      default: undefined,
    },

    // Social data
    action: String,
    user: {
      type: { name: String, avatar: String },
      default: undefined,
    },
    content: Schema.Types.Mixed,

    // Promotion data
    discount: String,
    expiresIn: String,
    description: String,

    // System data
    severity: {
      type: String,
      enum: ["info", "warning", "critical"],
    },

    // Metadata
    extLink: { type: String, default: null },
    stickyTime: { type: Number, default: 1000 },
    sentBy: {
      type: { adminId: String, position: String },
      default: undefined,
    },
  },
  { timestamps: true }
);

// Compound indexes for common queries
NotificationSchema.index({ recipientId: 1, createdAt: -1 });
NotificationSchema.index({ recipientId: 1, read: 1 });
NotificationSchema.index({ type: 1, createdAt: -1 });

const NotificationModel = model<INotification>(
  "Notification",
  NotificationSchema
);

export { NotificationModel };
