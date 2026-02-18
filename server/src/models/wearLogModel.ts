import { Schema, model, Document, Types } from 'mongoose';

// ─── Interface ──────────────────────────────────────────────────────────────

export type WearLogStatus = 'worn' | 'planned';

export interface IWearLog extends Document {
  user: Types.ObjectId;
  outfit: Types.ObjectId;
  wornAt: Date;
  occasion?: string;
  notes?: string;
  weather?: string;
  status: WearLogStatus;
  plannedFor?: Date;
}

// ─── Schema ─────────────────────────────────────────────────────────────────

const wearLogSchema = new Schema<IWearLog>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    outfit: { type: Schema.Types.ObjectId, ref: 'Outfit', required: true },
    wornAt: { type: Date, default: Date.now },
    occasion: { type: String, trim: true },
    notes: { type: String, trim: true },
    weather: { type: String, trim: true },
    status: { type: String, enum: ['worn', 'planned'], default: 'worn' },
    plannedFor: { type: Date },
  },
  { timestamps: true }
);

wearLogSchema.index({ user: 1, outfit: 1 });
wearLogSchema.index({ user: 1, wornAt: -1 });
wearLogSchema.index({ user: 1, status: 1, plannedFor: 1 });

export const WearLogModel = model<IWearLog>('WearLog', wearLogSchema);
