import { Schema, model, Document, Types } from "mongoose";

// ─── Enums ──────────────────────────────────────────────────────────────────

export type CatalogCategory = "clothing" | "hair" | "makeup";
export type CatalogGender = "Male" | "Female" | "Unisex";

// Hair-specific
export type HairType = "Straight" | "Wavy" | "Curly" | "Coily";
export type HairLength = "Short" | "Medium" | "Long" | "Very Long";
export type FaceShape = "Oval" | "Round" | "Square" | "Heart" | "Diamond" | "Oblong";
export type MaintenanceLevel = "Low" | "Medium" | "High";

// Makeup-specific
export type LookType = "Everyday" | "Bridal" | "Party" | "Office" | "Editorial" | "Natural" | "Glam" | "Festive";
export type SkinTone = "Fair" | "Light" | "Medium" | "Olive" | "Tan" | "Dark" | "Deep";

// ─── Interface ──────────────────────────────────────────────────────────────

export interface ICatalogSuggestion {
  expert: Types.ObjectId;
  expertName: string;
  text: string;
  createdAt: Date;
}

export interface ICatalogItem extends Document {
  expert: Types.ObjectId;
  category: CatalogCategory;
  title: string;
  description: string;
  images: string[];
  gender: CatalogGender;
  tags: string[];
  isDeleted: boolean;
  suggestions: ICatalogSuggestion[];

  // Clothing-specific
  clothingType?: string;
  subcategory?: string;
  fabric?: string;
  pattern?: string;
  season?: string;
  occasions?: string[];
  colors?: string[];
  brand?: string;
  priceRange?: string;
  styleVibe?: string;

  // Hair-specific
  hairType?: HairType;
  hairLength?: HairLength;
  faceShapes?: FaceShape[];
  maintenanceLevel?: MaintenanceLevel;

  // Makeup-specific
  lookType?: LookType;
  skinTones?: SkinTone[];
  products?: Array<{ name: string; brand?: string; shade?: string }>;

  createdAt: Date;
  updatedAt: Date;
}

// ─── Schema ─────────────────────────────────────────────────────────────────

const suggestionSchema = new Schema(
  {
    expert: { type: Schema.Types.ObjectId, ref: "Expert", required: true },
    expertName: { type: String, required: true },
    text: { type: String, required: true, trim: true, minlength: 5, maxlength: 1000 },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const catalogItemSchema = new Schema<ICatalogItem>(
  {
    expert: { type: Schema.Types.ObjectId, ref: "Expert", required: true },
    category: {
      type: String,
      enum: ["clothing", "hair", "makeup"],
      required: true,
    },
    title: { type: String, required: true, trim: true, minlength: 3, maxlength: 150 },
    description: { type: String, required: true, trim: true, minlength: 10, maxlength: 2000 },
    images: {
      type: [String],
      validate: [
        (v: string[]) => v.length >= 2 && v.length <= 10,
        "Images must be between 2 and 10",
      ],
    },
    gender: {
      type: String,
      enum: ["Male", "Female", "Unisex"],
      required: true,
    },
    tags: {
      type: [String],
      validate: [(v: string[]) => v.length <= 15, "Maximum 15 tags"],
      default: [],
    },
    isDeleted: { type: Boolean, default: false },
    suggestions: { type: [suggestionSchema], default: [] },

    // ── Clothing-specific ──
    clothingType: {
      type: String,
      enum: ["Top", "Bottom", "Shoes", "Accessory", "Outerwear", "Full Body"],
    },
    subcategory: { type: String, trim: true },
    fabric: {
      type: String,
      enum: ["Cotton", "Silk", "Linen", "Denim", "Wool", "Polyester", "Chiffon", "Velvet", "Satin", "Leather", "Georgette", "Crepe", "Khadi", "Other"],
    },
    pattern: {
      type: String,
      enum: ["Solid", "Striped", "Checked", "Floral", "Embroidered", "Polka Dot", "Abstract", "Printed"],
    },
    season: {
      type: String,
      enum: ["Summer", "Winter", "Monsoon", "All"],
    },
    occasions: [
      {
        type: String,
        enum: ["Wedding", "Office", "Casual", "Party", "Travel", "Festive", "Date Night", "Sports", "Lounge"],
      },
    ],
    colors: [{ type: String, trim: true }],
    brand: { type: String, trim: true },
    priceRange: { type: String, trim: true },
    styleVibe: { type: String, trim: true },

    // ── Hair-specific ──
    hairType: {
      type: String,
      enum: ["Straight", "Wavy", "Curly", "Coily"],
    },
    hairLength: {
      type: String,
      enum: ["Short", "Medium", "Long", "Very Long"],
    },
    faceShapes: [
      {
        type: String,
        enum: ["Oval", "Round", "Square", "Heart", "Diamond", "Oblong"],
      },
    ],
    maintenanceLevel: {
      type: String,
      enum: ["Low", "Medium", "High"],
    },

    // ── Makeup-specific ──
    lookType: {
      type: String,
      enum: ["Everyday", "Bridal", "Party", "Office", "Editorial", "Natural", "Glam", "Festive"],
    },
    skinTones: [
      {
        type: String,
        enum: ["Fair", "Light", "Medium", "Olive", "Tan", "Dark", "Deep"],
      },
    ],
    products: [
      {
        name: { type: String, required: true, trim: true },
        brand: { type: String, trim: true },
        shade: { type: String, trim: true },
      },
    ],
  },
  { timestamps: true }
);

// ─── Indexes ────────────────────────────────────────────────────────────────

catalogItemSchema.index({ category: 1, isDeleted: 1 });
catalogItemSchema.index({ expert: 1, isDeleted: 1 });
catalogItemSchema.index({ category: 1, gender: 1, isDeleted: 1 });
catalogItemSchema.index({ category: 1, clothingType: 1, isDeleted: 1 });
catalogItemSchema.index({ title: "text", description: "text", tags: "text" });

// ─── Model ──────────────────────────────────────────────────────────────────

export const CatalogItemModel = model<ICatalogItem>("CatalogItem", catalogItemSchema);
