import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IChat extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  title: string;
  isArchived: boolean;
  metadata: {
    messageCount: number;
    lastMessageAt?: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

const chatSchema = new Schema<IChat>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, default: 'New Chat', trim: true },
    isArchived: { type: Boolean, default: false },
    metadata: {
      messageCount: { type: Number, default: 0 },
      lastMessageAt: { type: Date },
    },
  },
  { timestamps: true }
);

chatSchema.index({ userId: 1, updatedAt: -1 });

export const Chat = mongoose.model<IChat>('Chat', chatSchema);
