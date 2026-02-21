import { Schema, model, Document, Types } from 'mongoose';

// ─── Interface ──────────────────────────────────────────────────────────────

export interface IStyleDna extends Document {
  user: Types.ObjectId;

  // Raw analysis data (mirrors Python pipeline output)
  body: {
    shape?: string;
    shoulderHipRatio?: number;
    waistHipRatio?: number;
    waistDefinition?: number;
    torsoLegRatio?: number;
    heightCategory?: string;
    classificationMethod?: string;
  } | null;
  face: {
    estimatedAge?: number;
    ageRange?: number[];
    ageConfidence?: string;
    gender?: string;
    faceShape?: string;
    eyeShape?: string;
    noseProportion?: string;
    lipFullness?: string;
  } | null;
  eyes: {
    shape?: string;
    color?: Record<string, any>;
  } | null;
  skin: {
    monkTone?: number;
    undertone?: string;
    hex?: string;
    referenceHex?: string;
  } | null;
  hair: {
    type?: string;
    color?: Record<string, any>;
    baldnessLevel?: number;
  } | null;
  colorSeason: {
    season?: string;
    subSeason?: string;
    palette?: string[];
  } | null;

  // Derived data
  descriptions: Record<string, string>;

  // Metadata
  confidence: Record<string, number>;
  warnings: string[];
  imageUrl: string;
  pipelineVersion: string;
  meta: Record<string, any>;

  analyzedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Schema ─────────────────────────────────────────────────────────────────
// Uses Schema.Types.Mixed for analysis sub-documents so new pipeline fields
// pass through without requiring schema migrations.

const styleDnaSchema = new Schema<IStyleDna>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },

    body: { type: Schema.Types.Mixed, default: null },
    face: { type: Schema.Types.Mixed, default: null },
    eyes: { type: Schema.Types.Mixed, default: null },
    skin: { type: Schema.Types.Mixed, default: null },
    hair: { type: Schema.Types.Mixed, default: null },
    colorSeason: { type: Schema.Types.Mixed, default: null },

    descriptions: { type: Schema.Types.Mixed, default: {} },
    confidence: { type: Schema.Types.Mixed, default: {} },
    warnings: { type: [String], default: [] },
    imageUrl: { type: String },
    pipelineVersion: { type: String, default: 'v6' },
    meta: { type: Schema.Types.Mixed, default: {} },

    analyzedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const StyleDnaModel = model<IStyleDna>('StyleDna', styleDnaSchema);
