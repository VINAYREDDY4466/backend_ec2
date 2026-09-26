import { Chat } from '../../database/mongodb/models/Chat.model.js';
import { Message } from '../../database/mongodb/models/Message.model.js';
import { AppError } from '../../utils/AppError.js';

export class ConversationService {
  async listChats(userId: string) {
    return Chat.find({ userId, isArchived: false })
      .sort({ updatedAt: -1 })
      .select('title metadata createdAt updatedAt');
  }

  async createChat(userId: string, title = 'New Chat') {
    return Chat.create({ userId, title });
  }

  async getChat(userId: string, chatId: string) {
    const chat = await Chat.findOne({ _id: chatId, userId });
    if (!chat) throw new AppError('Chat not found', 404, 'NOT_FOUND');

    const messages = await Message.find({ chatId })
      .sort({ createdAt: 1 })
      .select('role content createdAt metadata');

    return { chat, messages };
  }

  async renameChat(userId: string, chatId: string, title: string) {
    const chat = await Chat.findOneAndUpdate(
      { _id: chatId, userId },
      { title },
      { new: true }
    );
    if (!chat) throw new AppError('Chat not found', 404, 'NOT_FOUND');
    return chat;
  }

  async deleteChat(userId: string, chatId: string) {
    const chat = await Chat.findOneAndDelete({ _id: chatId, userId });
    if (!chat) throw new AppError('Chat not found', 404, 'NOT_FOUND');
    await Message.deleteMany({ chatId });
    return { deleted: true };
  }

  async getRecentMessages(chatId: string, limit: number) {
    const messages = await Message.find({ chatId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .select('role content createdAt');

    return messages.reverse();
  }
}

export const conversationService = new ConversationService();
