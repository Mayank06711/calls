import { Schema, model, Document, Types } from 'mongoose';

export interface IOutfitPair extends Document {
  user: Types.ObjectId;
  name?: string;
  clothingItems: Types.ObjectId[];
}

const outfitPairSchema = new Schema<IOutfitPair>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String },
    clothingItems: [
      { type: Schema.Types.ObjectId, ref: 'ClothingItem', required: true }
    ]
  },
  { timestamps: true }
);

export const OutfitPairModel = model<IOutfitPair>('OutfitPair', outfitPairSchema);
