import { Schema, model, Document, Types } from 'mongoose';

// ─── Enums ──────────────────────────────────────────────────────────────────

export type ClothingType = 'Top' | 'Bottom' | 'Shoes' | 'Accessory' | 'Outerwear';

export type SeasonType = 'Summer' | 'Winter' | 'Monsoon' | 'All';

export type PatternType = 'Solid' | 'Striped' | 'Checked' | 'Floral' | 'Embroidered' | 'Polka Dot' | 'Abstract' | 'Printed';

export type FabricType = 'Cotton' | 'Silk' | 'Linen' | 'Denim' | 'Wool' | 'Polyester' | 'Chiffon' | 'Velvet' | 'Satin' | 'Leather' | 'Georgette' | 'Crepe' | 'Khadi' | 'Other';

export type OccasionTag = 'Wedding' | 'Office' | 'Casual' | 'Party' | 'Travel' | 'Festive' | 'Date Night' | 'Sports' | 'Lounge';

// ─── Interface ──────────────────────────────────────────────────────────────

export interface IClothingItem extends Document {
  user: Types.ObjectId;
  type: ClothingType;
  subcategory: string;
  photoUrl: string;
  thumbnailUrl?: string;
  color?: string;
  pattern?: PatternType;
  fabric?: FabricType;
  brand?: string;
  season?: SeasonType;
  occasions?: OccasionTag[];
  notes?: string;
  price?: number;
  purchaseDate?: Date;
  isArchived: boolean;

  // ─── Phase 7: Python AI Service Integration ──────────────────────────
  hasPersonInPhoto: boolean;
  processingStatus?: 'pending' | 'completed' | 'failed';
  nobgUrl?: string;
  dominantColors?: Array<{
    hex: string;
    rgb: [number, number, number];
    name: string;
    colorFamily?: string;
    colorType?: string;
    percentage: number;
  }>;
  processingMeta?: {
    method: string;
    originalDimensions: { width: number; height: number };
    croppedDimensions: { width: number; height: number };
    skinDetected?: {
      toneHex: string;
      ratio: number;
    };
    processedAt: Date;
  };
}

// ─── Schema ─────────────────────────────────────────────────────────────────

const clothingItemSchema = new Schema<IClothingItem>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
      type: String,
      enum: ['Top', 'Bottom', 'Shoes', 'Accessory', 'Outerwear'],
      required: true,
    },
    subcategory: {
      type: String,
      required: true,
      trim: true,
    },
    photoUrl: { type: String, required: true },
    thumbnailUrl: { type: String },
    color: { type: String, trim: true },
    pattern: {
      type: String,
      enum: ['Solid', 'Striped', 'Checked', 'Floral', 'Embroidered', 'Polka Dot', 'Abstract', 'Printed'],
    },
    fabric: {
      type: String,
      enum: ['Cotton', 'Silk', 'Linen', 'Denim', 'Wool', 'Polyester', 'Chiffon', 'Velvet', 'Satin', 'Leather', 'Georgette', 'Crepe', 'Khadi', 'Other'],
    },
    brand: { type: String, trim: true },
    season: {
      type: String,
      enum: ['Summer', 'Winter', 'Monsoon', 'All'],
      default: 'All',
    },
    occasions: [{
      type: String,
      enum: ['Wedding', 'Office', 'Casual', 'Party', 'Travel', 'Festive', 'Date Night', 'Sports', 'Lounge'],
    }],
    notes: { type: String, trim: true, maxlength: 500 },
    price: { type: Number, min: 0 },
    purchaseDate: { type: Date },
    isArchived: { type: Boolean, default: false },

    // ─── Phase 7: Python AI Service Integration ──────────────────────────
    hasPersonInPhoto: { type: Boolean, default: false },
    processingStatus: {
      type: String,
      enum: ['pending', 'completed', 'failed'],
    },
    nobgUrl: { type: String },
    dominantColors: [{
      hex: { type: String },
      rgb: [{ type: Number }],
      name: { type: String },
      colorFamily: { type: String },
      colorType: { type: String },
      percentage: { type: Number }
    }],
    processingMeta: {
      method: { type: String },
      originalDimensions: {
        width: { type: Number },
        height: { type: Number }
      },
      croppedDimensions: {
        width: { type: Number },
        height: { type: Number }
      },
      skinDetected: {
        toneHex: { type: String },
        ratio: { type: Number }
      },
      processedAt: { type: Date }
    },
  },
  { timestamps: true }
);

// Index for fast user queries
clothingItemSchema.index({ user: 1, type: 1 });
clothingItemSchema.index({ user: 1, isArchived: 1 });
clothingItemSchema.index({ user: 1, isArchived: 1, type: 1 }); // Covers generatePairings: non-archived Tops/Bottoms

export const ClothingItemModel = model<IClothingItem>('ClothingItem', clothingItemSchema);
