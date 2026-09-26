import type { IMessage } from '../../database/mongodb/models/Message.model.js';
import type { ChatMessage } from '../llm/ollama.service.js';

export interface PromptContext {
  userName: string;
  memories: string[];
  ragChunks: string[];
  conversationHistory: IMessage[];
  currentQuestion: string;
  systemPromptOverride?: string;
}

const BASE_SYSTEM_PROMPT = `You are a Personal AI Agent — a thoughtful, private assistant built exclusively for your user.

Your role:
- Help with questions, planning, learning, and daily tasks
- Remember context from the conversation
- Be concise but thorough when explaining technical topics (the user is learning AI)
- If you don't know something, say so honestly

Guidelines:
- Use markdown for code and structured answers when helpful
- Be warm and professional
- Never invent personal facts about the user`;

/**
 * Prompt Builder — never send raw user messages directly to the LLM.
 * Learn: The quality of AI responses depends heavily on how you structure the prompt.
 */
export class PromptBuilderService {
  build(context: PromptContext): ChatMessage[] {
    const messages: ChatMessage[] = [];

    let systemContent = context.systemPromptOverride ?? BASE_SYSTEM_PROMPT;
    systemContent += `\n\nYou are speaking with ${context.userName}.`;

    if (context.memories.length > 0) {
      systemContent += '\n\n## What you know about the user\n';
      systemContent += context.memories.map((m) => `- ${m}`).join('\n');
    }

    if (context.ragChunks.length > 0) {
      systemContent += '\n\n## Relevant documents\n';
      systemContent += context.ragChunks.map((c, i) => `[Doc ${i + 1}]\n${c}`).join('\n\n');
    }

    messages.push({ role: 'system', content: systemContent });

    for (const msg of context.conversationHistory) {
      if (msg.role === 'user' || msg.role === 'assistant') {
        messages.push({ role: msg.role, content: msg.content });
      }
    }

    messages.push({ role: 'user', content: context.currentQuestion });

    return messages;
  }
}

export const promptBuilderService = new PromptBuilderService();
