import { z } from 'zod';

export const createChatSchema = z.object({
  title: z.string().min(1).max(100).optional(),
});

export const renameChatSchema = z.object({
  title: z.string().min(1).max(100),
});

export const sendMessageSchema = z.object({
  content: z.string().min(1, 'Message cannot be empty').max(10000),
});
