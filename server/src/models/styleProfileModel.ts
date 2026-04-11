import { Schema, model, Document, Types } from 'mongoose';

// ─── Interface ──────────────────────────────────────────────────────────────

// Sub-document for body measurements (all in cm)
export interface IMeasurements {
  bust?: number;
  waist?: number;
  hips?: number;
  inseam?: number;
  shoulderWidth?: number;
}

export interface IStyleProfile extends Document {
  user: Types.ObjectId;

  // ── Required (engine needs these 7) ──────────────────────────────────────
  bodyShape: 'Trapezoid' | 'Rectangle' | 'Triangle' | 'Inverted_Triangle' | 'Oval' | 'Hourglass' | 'Pear' | 'Apple';
  height: 'Short' | 'Medium' | 'Tall';
  skinTone: 'Fair' | 'Wheatish' | 'Dusky' | 'Dark Brown';
  undertone: 'Warm' | 'Cool' | 'Olive' | 'Neutral';
  ageGroup: 'GenZ (16-25)' | 'Young Adult (26-35)' | 'Mid-Aged (36-50)' | 'Senior (50+)';
  fitPreference: 'Slim Fit' | 'Regular Fit' | 'Oversized';
  styleVibe: 'Classic' | 'Trendy' | 'Desi' | 'Fusion' | 'Old Money';

  // ── Optional Tier 1 (onboarding, skippable) ─────────────────────────────
  faceShape?: 'Oval' | 'Round' | 'Square' | 'Heart' | 'Diamond' | 'Oblong' | 'Triangle';
  hairType?: 'Straight Fine' | 'Straight Medium' | 'Straight Coarse' |
             'Wavy Fine' | 'Wavy Medium' | 'Wavy Coarse' |
             'Curly Loose' | 'Curly Springy' | 'Curly Tight' |
             'Coily Soft' | 'Coily Zigzag' | 'Coily Dense';
  hairLength?: 'Bald' | 'Very Short' | 'Short' | 'Medium' | 'Long' | 'Very Long';
  hairColor?: 'Black' | 'Dark Brown' | 'Medium Brown' | 'Light Brown' | 'Blonde' |
              'Red' | 'Gray/Silver' | 'White' | 'Highlighted' | 'Colored/Dyed';
  eyeShape?: 'Almond' | 'Round' | 'Hooded' | 'Upturned' | 'Downturned' | 'Monolid' | 'Deep Set';
  lipShape?: 'Full' | 'Thin' | 'Cupids Bow' | 'Heart' | 'Wide' | 'Round' | 'Bottom Heavy' | 'Top Heavy';
  colorPaletteSeason?: 'Spring' | 'Summer' | 'Autumn' | 'Winter';

  // ── Optional Tier 2 (progressive disclosure) ────────────────────────────
  measurements?: IMeasurements;
  heightExact?: number;          // cm
  weight?: number;               // kg
  fabricPreferences?: string[];  // multi-select from enum
  fabricSensitivities?: string[];
  colorPreferences?: string[];
  budgetRange?: 'Ultra Budget' | 'Budget' | 'Moderate' | 'Mid Luxury' | 'Luxury';
  lifestyleTypes?: string[];
  fashionChallenges?: string[];
  favoritePatterns?: string[];
  necklinePreferences?: string[];
  modestyCoverage?: 'Very Modest' | 'Moderate' | 'Standard' | 'Less Coverage';
  favoriteBrands?: string;       // comma-separated free text
  styleInspiration?: string;     // free text tags
}

// ─── Schema ─────────────────────────────────────────────────────────────────

const measurementsSchema = new Schema<IMeasurements>(
  {
    bust: { type: Number, min: 0 },
    waist: { type: Number, min: 0 },
    hips: { type: Number, min: 0 },
    inseam: { type: Number, min: 0 },
    shoulderWidth: { type: Number, min: 0 },
  },
  { _id: false }
);

const styleProfileSchema = new Schema<IStyleProfile>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },

    // ── Required (engine core) ───────────────────────────────────────────
    bodyShape: {
      type: String,
      enum: ['Trapezoid', 'Rectangle', 'Triangle', 'Inverted_Triangle', 'Oval', 'Hourglass', 'Pear', 'Apple'],
      required: true,
    },
    height: {
      type: String,
      enum: ['Short', 'Medium', 'Tall'],
      required: true,
    },
    skinTone: {
      type: String,
      enum: ['Fair', 'Wheatish', 'Dusky', 'Dark Brown'],
      required: true,
    },
    undertone: {
      type: String,
      enum: ['Warm', 'Cool', 'Olive', 'Neutral'],
      required: true,
    },
    ageGroup: {
      type: String,
      enum: ['GenZ (16-25)', 'Young Adult (26-35)', 'Mid-Aged (36-50)', 'Senior (50+)'],
      required: true,
    },
    fitPreference: {
      type: String,
      enum: ['Slim Fit', 'Regular Fit', 'Oversized'],
      required: true,
    },
    styleVibe: {
      type: String,
      enum: ['Classic', 'Trendy', 'Desi', 'Fusion', 'Old Money'],
      required: true,
    },

    // ── Optional Tier 1 (onboarding) ─────────────────────────────────────
    faceShape: {
      type: String,
      enum: ['Oval', 'Round', 'Square', 'Heart', 'Diamond', 'Oblong', 'Triangle'],
    },
    hairType: {
      type: String,
      enum: [
        'Straight Fine', 'Straight Medium', 'Straight Coarse',
        'Wavy Fine', 'Wavy Medium', 'Wavy Coarse',
        'Curly Loose', 'Curly Springy', 'Curly Tight',
        'Coily Soft', 'Coily Zigzag', 'Coily Dense',
      ],
    },
    hairLength: {
      type: String,
      enum: ['Bald', 'Very Short', 'Short', 'Medium', 'Long', 'Very Long'],
    },
    hairColor: {
      type: String,
      enum: ['Black', 'Dark Brown', 'Medium Brown', 'Light Brown', 'Blonde',
             'Red', 'Gray/Silver', 'White', 'Highlighted', 'Colored/Dyed'],
    },
    eyeShape: {
      type: String,
      enum: ['Almond', 'Round', 'Hooded', 'Upturned', 'Downturned', 'Monolid', 'Deep Set'],
    },
    lipShape: {
      type: String,
      enum: ['Full', 'Thin', 'Cupids Bow', 'Heart', 'Wide', 'Round', 'Bottom Heavy', 'Top Heavy'],
    },
    colorPaletteSeason: {
      type: String,
      enum: ['Spring', 'Summer', 'Autumn', 'Winter'],
    },

    // ── Optional Tier 2 (progressive disclosure) ─────────────────────────
    measurements: { type: measurementsSchema },
    heightExact: { type: Number, min: 50, max: 250 },
    weight: { type: Number, min: 20, max: 300 },
    fabricPreferences: {
      type: [String],
      enum: ['Natural & Breathable', 'Luxury', 'Easy Care', 'Performance', 'Sustainable'],
    },
    fabricSensitivities: {
      type: [String],
      enum: ['Wool', 'Synthetic', 'Chemical Dye', 'Rough Texture', 'None'],
    },
    colorPreferences: {
      type: [String],
      enum: ['Neutrals', 'Earth Tones', 'Pastels', 'Jewel Tones', 'Brights', 'Metallics'],
    },
    budgetRange: {
      type: String,
      enum: ['Ultra Budget', 'Budget', 'Moderate', 'Mid Luxury', 'Luxury'],
    },
    lifestyleTypes: {
      type: [String],
      enum: ['Office Formal', 'Office Casual', 'Work From Home', 'Casual', 'Athletic', 'Social Events', 'Parent Life'],
    },
    fashionChallenges: {
      type: [String],
      enum: ['Finding Fit', 'Body Confidence', 'Color Confusion', 'Budget', 'Time'],
    },
    favoritePatterns: {
      type: [String],
      enum: ['Solid', 'Striped', 'Checked', 'Floral', 'Embroidered', 'Polka Dot', 'Abstract', 'Printed'],
    },
    necklinePreferences: {
      type: [String],
      enum: ['V-Neck', 'Scoop', 'Crew', 'Boat', 'Off-Shoulder', 'Turtleneck', 'Mandarin', 'Sweetheart'],
    },
    modestyCoverage: {
      type: String,
      enum: ['Very Modest', 'Moderate', 'Standard', 'Less Coverage'],
    },
    favoriteBrands: { type: String, trim: true },
    styleInspiration: { type: String, trim: true },
  },
  { timestamps: true }
);

export const StyleProfileModel = model<IStyleProfile>('StyleProfile', styleProfileSchema);
