import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { conversationService } from '../services/chat/conversation.service.js';
import { chatService } from '../services/chat/chat.service.js';

function getParam(value: string | string[]): string {
  return Array.isArray(value) ? value[0] : value;
}

export const listChats = asyncHandler(async (req: Request, res: Response) => {
  const chats = await conversationService.listChats(req.user!.id);
  sendSuccess(res, chats);
});

export const createChat = asyncHandler(async (req: Request, res: Response) => {
  const chat = await conversationService.createChat(req.user!.id, req.body.title);
  sendSuccess(res, chat, 'Chat created', 201);
});

export const getChat = asyncHandler(async (req: Request, res: Response) => {
  const result = await conversationService.getChat(req.user!.id, getParam(req.params.chatId));
  sendSuccess(res, result);
});

export const renameChat = asyncHandler(async (req: Request, res: Response) => {
  const chat = await conversationService.renameChat(
    req.user!.id,
    getParam(req.params.chatId),
    req.body.title
  );
  sendSuccess(res, chat, 'Chat renamed');
});

export const deleteChat = asyncHandler(async (req: Request, res: Response) => {
  const result = await conversationService.deleteChat(req.user!.id, getParam(req.params.chatId));
  sendSuccess(res, result, 'Chat deleted');
});

export const sendMessage = asyncHandler(async (req: Request, res: Response) => {
  const result = await chatService.sendMessage(
    req.user!.id,
    getParam(req.params.chatId),
    req.body.content
  );
  sendSuccess(res, result);
});
