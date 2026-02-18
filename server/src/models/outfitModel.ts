import { Schema, model, Document, Types } from 'mongoose';

// ─── Types ──────────────────────────────────────────────────────────────────

export type OutfitSource = 'manual' | 'ai_suggested' | 'engine_suggested' | 'builder' | 'builder-slots';

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
  screenshotUrl?: string;

  // ─── Phase 7: Python AI Service Integration ──────────────────────────
  flatlayUrl?: string;
  colorPalette?: Array<{
    hex: string;
    rgb: [number, number, number];
    name: string;
    colorFamily?: string;
    colorType?: string;
    slot: string;
  }>;
  generatedAt?: Date;

  // ─── Sharing ───────────────────────────────────────────────────────
  shareToken?: string;
  isPublic: boolean;
  shareCount: number;
  viewCount: number;
  publicLikes: number;
  sharedAt?: Date;
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
      enum: ['manual', 'ai_suggested', 'engine_suggested', 'builder', 'builder-slots'],
      default: 'manual',
    },
    isFavorite: { type: Boolean, default: false },
    notes: { type: String, trim: true },
    screenshotUrl: { type: String, trim: true },

    // ─── Phase 7: Python AI Service Integration ──────────────────────────
    flatlayUrl: { type: String, trim: true },
    colorPalette: [{
      hex: { type: String },
      rgb: [{ type: Number }],
      name: { type: String },
      colorFamily: { type: String },
      colorType: { type: String },
      slot: { type: String }
    }],
    generatedAt: { type: Date },

    // ─── Sharing ──────────────────────────────────────────────────────
    shareToken: { type: String, trim: true },
    isPublic: { type: Boolean, default: false },
    shareCount: { type: Number, default: 0 },
    viewCount: { type: Number, default: 0 },
    publicLikes: { type: Number, default: 0 },
    sharedAt: { type: Date },
  },
  { timestamps: true }
);

outfitSchema.index({ user: 1 });
outfitSchema.index({ user: 1, isFavorite: 1 });
outfitSchema.index({ user: 1, source: 1 }); // Fast filter: engine-suggested vs manual vs ai-suggested
outfitSchema.index({ shareToken: 1 }, { unique: true, sparse: true }); // Public lookup by share token

export const OutfitModel = model<IOutfit>('Outfit', outfitSchema);
