import { Schema, model, Document, Types } from 'mongoose';

// ─── Types ──────────────────────────────────────────────────────────────────

export type OutfitSource = 'manual' | 'ai_suggested' | 'engine_suggested';

// ─── Interface ──────────────────────────────────────────────────────────────

export interface IOutfit extends Document {
  user: Types.ObjectId;
  name?: string;
  items: Types.ObjectId[];        // References to ClothingItem (no limit on count)
  occasion?: string;
  season?: string;
  tags: string[];                 // Free-form: "date night", "interview", etc.
  source: OutfitSource;
  isFavorite: boolean;
  notes?: string;
}

// ─── Schema ─────────────────────────────────────────────────────────────────

const outfitSchema = new Schema<IOutfit>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, trim: true },
    items: [{
      type: Schema.Types.ObjectId,
      ref: 'ClothingItem',
      required: true,
    }],
    occasion: { type: String, trim: true },
    season: { type: String, trim: true },
    tags: [{ type: String, trim: true }],
    source: {
      type: String,
      enum: ['manual', 'ai_suggested', 'engine_suggested'],
      default: 'manual',
    },
    isFavorite: { type: Boolean, default: false },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

outfitSchema.index({ user: 1 });
outfitSchema.index({ user: 1, isFavorite: 1 });
outfitSchema.index({ user: 1, source: 1 }); // Fast filter: engine-suggested vs manual vs ai-suggested

export const OutfitModel = model<IOutfit>('Outfit', outfitSchema);
