import bcrypt from 'bcryptjs';
import { User } from '../../database/mongodb/models/User.model.js';
import { Settings, getDefaultPreferences } from '../../database/mongodb/models/Settings.model.js';
import { AppError } from '../../utils/AppError.js';
import { tokenService } from './token.service.js';

const SALT_ROUNDS = 12;

export class AuthService {
  async register(email: string, password: string, name: string) {
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      throw new AppError('Email already registered', 409, 'EMAIL_EXISTS');
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await User.create({
      email: email.toLowerCase(),
      passwordHash,
      name,
    });

    await Settings.create({
      userId: user._id,
      preferences: getDefaultPreferences(),
    });

    const tokens = tokenService.generateTokens({
      userId: user._id.toString(),
      email: user.email,
    });

    return {
      user: this.sanitizeUser(user),
      ...tokens,
    };
  }

  async login(email: string, password: string) {
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || !user.isActive) {
      throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }

    user.lastLoginAt = new Date();
    await user.save();

    const tokens = tokenService.generateTokens({
      userId: user._id.toString(),
      email: user.email,
    });

    return {
      user: this.sanitizeUser(user),
      ...tokens,
    };
  }

  async getProfile(userId: string) {
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404, 'NOT_FOUND');
    }
    return this.sanitizeUser(user);
  }

  async updateProfile(userId: string, data: { name?: string }) {
    const user = await User.findByIdAndUpdate(
      userId,
      { ...(data.name && { name: data.name }) },
      { new: true }
    );
    if (!user) {
      throw new AppError('User not found', 404, 'NOT_FOUND');
    }
    return this.sanitizeUser(user);
  }

  refreshTokens(refreshToken: string) {
    const payload = tokenService.verifyRefreshToken(refreshToken);
    return tokenService.generateTokens(payload);
  }

  private sanitizeUser(user: InstanceType<typeof User>) {
    return {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      avatar: user.avatar,
      createdAt: user.createdAt,
    };
  }
}

export const authService = new AuthService();
