import { Schema, model, Document, Types } from 'mongoose';

export type ClothingType = 'Top' | 'Bottom' | 'Shoes' | 'Accessory' | 'Outerwear';
export type SeasonType = 'Summer' | 'Winter' | 'Rainy' | 'All';

export interface IClothingItem extends Document {
  user: Types.ObjectId;
  type: ClothingType;
  photoUrl: string;
  color?: string;
  brand?: string;
  season?: SeasonType;
}

const clothingItemSchema = new Schema<IClothingItem>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
      type: String,
      enum: ['Top', 'Bottom', 'Shoes', 'Accessory', 'Outerwear'],
      required: true
    },
    photoUrl: { type: String, required: true },
    color: { type: String },
    brand: { type: String },
    season: {
      type: String,
      enum: ['Summer', 'Winter', 'Rainy', 'All'],
      default: 'All'
    }
  },
  { timestamps: true }
);

export const ClothingItemModel = model<IClothingItem>('ClothingItem', clothingItemSchema);
