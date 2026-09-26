import mongoose, { Schema, Document, Types } from 'mongoose';

export type MessageRole = 'user' | 'assistant' | 'system' | 'tool';

export interface IMessage extends Document {
  _id: Types.ObjectId;
  chatId: Types.ObjectId;
  userId: Types.ObjectId;
  role: MessageRole;
  content: string;
  tokenCount?: number;
  metadata?: {
    model?: string;
    latencyMs?: number;
  };
  createdAt: Date;
}

const messageSchema = new Schema<IMessage>(
  {
    chatId: { type: Schema.Types.ObjectId, ref: 'Chat', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, enum: ['user', 'assistant', 'system', 'tool'], required: true },
    content: { type: String, required: true },
    tokenCount: { type: Number },
    metadata: {
      model: { type: String },
      latencyMs: { type: Number },
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

messageSchema.index({ chatId: 1, createdAt: 1 });

export const Message = mongoose.model<IMessage>('Message', messageSchema);
