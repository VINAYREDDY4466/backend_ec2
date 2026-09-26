import { config } from '../../config/index.js';
import { logger } from '../../utils/logger.js';
import { AppError } from '../../utils/AppError.js';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface StreamOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

/**
 * Single gateway for all Ollama API calls.
 * Learn: LLMs are accessed via HTTP — this service wraps that so
 * the rest of the app never talks to Ollama directly.
 */
export class OllamaService {
  private baseUrl = config.OLLAMA_BASE_URL;

  async healthCheck(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/api/tags`);
      return res.ok;
    } catch {
      return false;
    }
  }

  async chat(messages: ChatMessage[], options: StreamOptions = {}): Promise<string> {
    const model = options.model ?? config.OLLAMA_CHAT_MODEL;

    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages,
        stream: false,
        options: {
          temperature: options.temperature ?? 0.7,
          num_predict: options.maxTokens ?? 2048,
        },
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      logger.error(`Ollama chat error: ${text}`);
      throw new AppError(
        'AI model unavailable. Is Ollama running with llama3.2 pulled?',
        503,
        'OLLAMA_UNAVAILABLE'
      );
    }

    const data = (await response.json()) as { message: { content: string } };
    return data.message.content;
  }

  async *streamChat(
    messages: ChatMessage[],
    options: StreamOptions = {}
  ): AsyncGenerator<string> {
    const model = options.model ?? config.OLLAMA_CHAT_MODEL;

    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages,
        stream: true,
        options: {
          temperature: options.temperature ?? 0.7,
          num_predict: options.maxTokens ?? 2048,
        },
      }),
    });

    if (!response.ok) {
      throw new AppError(
        'AI model unavailable. Is Ollama running with llama3.2 pulled?',
        503,
        'OLLAMA_UNAVAILABLE'
      );
    }

    const reader = response.body?.getReader();
    if (!reader) throw new AppError('No response stream from Ollama', 503, 'OLLAMA_UNAVAILABLE');

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const parsed = JSON.parse(line) as { message?: { content?: string }; done?: boolean };
          if (parsed.message?.content) {
            yield parsed.message.content;
          }
        } catch {
          // skip malformed lines
        }
      }
    }
  }

  async embed(text: string | string[], model = 'nomic-embed-text'): Promise<number[][]> {
    const inputs = Array.isArray(text) ? text : [text];
    const vectors: number[][] = [];

    for (const input of inputs) {
      const response = await fetch(`${this.baseUrl}/api/embeddings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, prompt: input }),
      });

      if (!response.ok) {
        throw new AppError(
          'Embedding model unavailable. Run: ollama pull nomic-embed-text',
          503,
          'OLLAMA_UNAVAILABLE'
        );
      }

      const data = (await response.json()) as { embedding: number[] };
      vectors.push(data.embedding);
    }

    return vectors;
  }
}

export const ollamaService = new OllamaService();
