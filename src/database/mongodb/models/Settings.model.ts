import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ISettings extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  preferences: {
    model: string;
    embeddingModel: string;
    temperature: number;
    maxTokens: number;
    ragTopK: number;
    memoryTopK: number;
    systemPromptOverride?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const settingsSchema = new Schema<ISettings>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    preferences: {
      model: { type: String, default: 'llama3.2' },
      embeddingModel: { type: String, default: 'nomic-embed-text' },
      temperature: { type: Number, default: 0.7, min: 0, max: 2 },
      maxTokens: { type: Number, default: 2048 },
      ragTopK: { type: Number, default: 5 },
      memoryTopK: { type: Number, default: 5 },
      systemPromptOverride: { type: String },
    },
  },
  { timestamps: true }
);

export const Settings = mongoose.model<ISettings>('Settings', settingsSchema);

export function getDefaultPreferences() {
  return {
    model: 'llama3.2',
    embeddingModel: 'nomic-embed-text',
    temperature: 0.7,
    maxTokens: 2048,
    ragTopK: 5,
    memoryTopK: 5,
  };
}
