import { config } from '../../config/index.js';
import { Message } from '../../database/mongodb/models/Message.model.js';
import { Chat } from '../../database/mongodb/models/Chat.model.js';
import { User } from '../../database/mongodb/models/User.model.js';
import { Settings } from '../../database/mongodb/models/Settings.model.js';
import { AppError } from '../../utils/AppError.js';
import { logger } from '../../utils/logger.js';
import { ollamaService } from '../llm/ollama.service.js';
import { promptBuilderService } from '../prompt/promptBuilder.service.js';
import { conversationService } from './conversation.service.js';

export interface SendMessageResult {
  userMessage: InstanceType<typeof Message>;
  assistantMessage: InstanceType<typeof Message>;
}

export interface StreamCallbacks {
  onToken: (token: string) => void;
  onDone: (message: InstanceType<typeof Message>) => void;
  onError: (error: Error) => void;
}

/**
 * Chat Service — orchestrates the full AI pipeline:
 * history → memories (future) → RAG (future) → prompt → LLM → save
 */
export class ChatService {
  async sendMessage(userId: string, chatId: string, content: string): Promise<SendMessageResult> {
    const start = Date.now();
    await this.validateChat(userId, chatId);

    const promptMessages = await this.buildPromptMessages(userId, chatId, content);
    const settings = await Settings.findOne({ userId });
    const prefs = settings?.preferences;

    const userMessage = await Message.create({
      chatId,
      userId,
      role: 'user',
      content,
    });

    const response = await ollamaService.chat(promptMessages, {
      model: prefs?.model,
      temperature: prefs?.temperature,
      maxTokens: prefs?.maxTokens,
    });
    const latencyMs = Date.now() - start;

    const assistantMessage = await Message.create({
      chatId,
      userId,
      role: 'assistant',
      content: response,
      metadata: { model: config.OLLAMA_CHAT_MODEL, latencyMs },
    });

    await this.updateChatMetadata(chatId, content);

    return { userMessage, assistantMessage };
  }

  async streamMessage(
    userId: string,
    chatId: string,
    content: string,
    callbacks: StreamCallbacks
  ): Promise<void> {
    const start = Date.now();

    try {
      await this.validateChat(userId, chatId);

      const settings = await Settings.findOne({ userId });
      const prefs = settings?.preferences;

      const messages = await this.buildPromptMessages(
        userId,
        chatId,
        content,
        prefs?.systemPromptOverride
      );

      await Message.create({ chatId, userId, role: 'user', content });

      let fullResponse = '';

      for await (const token of ollamaService.streamChat(messages, {
        model: prefs?.model,
        temperature: prefs?.temperature,
        maxTokens: prefs?.maxTokens,
      })) {
        fullResponse += token;
        callbacks.onToken(token);
      }

      const assistantMessage = await Message.create({
        chatId,
        userId,
        role: 'assistant',
        content: fullResponse,
        metadata: {
          model: prefs?.model ?? config.OLLAMA_CHAT_MODEL,
          latencyMs: Date.now() - start,
        },
      });

      await this.updateChatMetadata(chatId, content);
      callbacks.onDone(assistantMessage);
    } catch (error) {
      logger.error(`Stream error: ${(error as Error).message}`);
      callbacks.onError(error as Error);
    }
  }

  private async buildPromptMessages(
    userId: string,
    chatId: string,
    content: string,
    systemPromptOverride?: string
  ) {
    const user = await User.findById(userId);
    if (!user) throw new AppError('User not found', 404, 'NOT_FOUND');

    const history = await conversationService.getRecentMessages(
      chatId,
      config.CONVERSATION_HISTORY_LIMIT
    );

    // V1: memories and RAG return empty — architecture ready for Phase 6/7
    const memories: string[] = [];
    const ragChunks: string[] = [];

    return promptBuilderService.build({
      userName: user.name,
      memories,
      ragChunks,
      conversationHistory: history,
      currentQuestion: content,
      systemPromptOverride,
    });
  }

  private async validateChat(userId: string, chatId: string) {
    const chat = await Chat.findOne({ _id: chatId, userId });
    if (!chat) throw new AppError('Chat not found', 404, 'NOT_FOUND');
    return chat;
  }

  private async updateChatMetadata(chatId: string, lastUserMessage: string) {
    const chat = await Chat.findById(chatId);
    if (!chat) return;

    const updates: Record<string, unknown> = {
      'metadata.messageCount': (chat.metadata?.messageCount ?? 0) + 2,
      'metadata.lastMessageAt': new Date(),
    };

    if (chat.title === 'New Chat' && lastUserMessage) {
      updates.title = lastUserMessage.slice(0, 50) + (lastUserMessage.length > 50 ? '…' : '');
    }

    await Chat.findByIdAndUpdate(chatId, updates);
  }
}

export const chatService = new ChatService();
