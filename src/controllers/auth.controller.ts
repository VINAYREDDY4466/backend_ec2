import type { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { authService } from '../services/auth/auth.service.js';
import { ollamaService } from '../services/llm/ollama.service.js';

export const register = asyncHandler(async (req: Request, res: Response) => {
  const { email, password, name } = req.body;
  const result = await authService.register(email, password, name);
  sendSuccess(res, result, 'Account created', 201);
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const result = await authService.login(email, password);
  sendSuccess(res, result, 'Logged in');
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken } = req.body;
  const tokens = authService.refreshTokens(refreshToken);
  sendSuccess(res, tokens, 'Token refreshed');
});

export const getMe = asyncHandler(async (req: Request, res: Response) => {
  const user = await authService.getProfile(req.user!.id);
  sendSuccess(res, user);
});

export const updateMe = asyncHandler(async (req: Request, res: Response) => {
  const user = await authService.updateProfile(req.user!.id, req.body);
  sendSuccess(res, user, 'Profile updated');
});

export const healthCheck = asyncHandler(async (_req: Request, res: Response) => {
  const ollamaOk = await ollamaService.healthCheck();
  sendSuccess(res, {
    status: 'ok',
    services: {
      ollama: ollamaOk ? 'connected' : 'unavailable',
    },
    timestamp: new Date().toISOString(),
  });
});
export const test = asyncHandler(async (_req: Request, res: Response) => {
  sendSuccess(res, { message: 'Hello World' });
});