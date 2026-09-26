import type { Server as HttpServer } from 'http';
import { Server, type Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { chatService } from '../services/chat/chat.service.js';
import { logger } from '../utils/logger.js';

interface AuthenticatedSocket extends Socket {
  userId?: string;
}

export function setupSocketIO(httpServer: HttpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: config.CLIENT_URL,
      credentials: true,
    },
  });

  io.use((socket: AuthenticatedSocket, next) => {
    const token = socket.handshake.auth.token as string | undefined;
    if (!token) return next(new Error('Authentication required'));

    try {
      const payload = jwt.verify(token, config.JWT_ACCESS_SECRET) as { userId: string };
      socket.userId = payload.userId;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    logger.info(`Socket connected: ${socket.id}`);

    socket.on(
      'chat:message',
      async (data: { chatId: string; content: string }) => {
        if (!socket.userId || !data.chatId || !data.content?.trim()) return;

        await chatService.streamMessage(socket.userId, data.chatId, data.content.trim(), {
          onToken: (token) => socket.emit('chat:token', { chatId: data.chatId, token }),
          onDone: (message) =>
            socket.emit('chat:done', {
              chatId: data.chatId,
              message: {
                id: message._id.toString(),
                role: message.role,
                content: message.content,
                createdAt: message.createdAt,
                metadata: message.metadata,
              },
            }),
          onError: (error) =>
            socket.emit('chat:error', {
              chatId: data.chatId,
              message: error.message,
            }),
        });
      }
    );

    socket.on('disconnect', () => {
      logger.info(`Socket disconnected: ${socket.id}`);
    });
  });

  return io;
}
