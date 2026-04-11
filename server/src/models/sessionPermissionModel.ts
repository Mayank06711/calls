import mongoose, { Schema, Document, Types } from "mongoose";

export interface ISessionPermission extends Document {
  booking: Types.ObjectId;
  user: Types.ObjectId;       // The client who grants permission
  expert: Types.ObjectId;     // Expert's User _id
  permissions: {
    closet: boolean;          // ClothingItems read + expert add/edit
    outfits: boolean;         // Outfits read + expert create
  };
  isActive: boolean;
  grantedAt: Date;
  revokedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const SessionPermissionSchema = new Schema<ISessionPermission>(
  {
    booking: {
      type: Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
      unique: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    expert: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    permissions: {
      closet: { type: Boolean, default: false },
      outfits: { type: Boolean, default: false },
    },
    isActive: { type: Boolean, default: true },
    grantedAt: { type: Date, default: Date.now },
    revokedAt: { type: Date },
  },
  { timestamps: true }
);

// Expert lookups for active permissions
SessionPermissionSchema.index({ expert: 1, isActive: 1 });

export const SessionPermissionModel = mongoose.model<ISessionPermission>(
  "SessionPermission",
  SessionPermissionSchema
);
