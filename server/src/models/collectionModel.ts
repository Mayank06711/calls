import { Schema, model, Document, Types } from 'mongoose';

// ─── Interface ──────────────────────────────────────────────────────────────

export interface ICollection extends Document {
  user: Types.ObjectId;
  name: string;
  description?: string;
  emoji?: string;
  color?: string;
  itemIds: Types.ObjectId[];
}

// ─── Schema ─────────────────────────────────────────────────────────────────

const collectionSchema = new Schema<ICollection>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true, maxlength: 50 },
    description: { type: String, trim: true, maxlength: 200 },
    emoji: { type: String, trim: true },
    color: { type: String, trim: true },
    itemIds: [{
      type: Schema.Types.ObjectId,
      ref: 'ClothingItem',
    }],
  },
  { timestamps: true }
);

collectionSchema.index({ user: 1 });
collectionSchema.index({ user: 1, name: 1 }, { unique: true });

export const CollectionModel = model<ICollection>('Collection', collectionSchema);
