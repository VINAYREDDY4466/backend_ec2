import type { Request, Response, NextFunction } from 'express';
import { tokenService } from '../services/auth/token.service.js';
import { AppError } from '../utils/AppError.js';
import { User } from '../database/mongodb/models/User.model.js';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
      };
    }
  }
}

export async function authMiddleware(req: Request, _res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const token = header.slice(7);
    const payload = tokenService.verifyAccessToken(token);

    const user = await User.findById(payload.userId);
    if (!user || !user.isActive) {
      throw new AppError('User not found or inactive', 401, 'UNAUTHORIZED');
    }

    req.user = { id: user._id.toString(), email: user.email };
    next();
  } catch (error) {
    next(error);
  }
}
