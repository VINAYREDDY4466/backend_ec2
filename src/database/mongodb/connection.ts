import mongoose from 'mongoose';
import { config } from '../../config/index.js';
import { logger } from '../../utils/logger.js';

function mongoHelpMessage(error: Error): string {
  const isLocal =
    config.MONGODB_URI.includes('localhost') || config.MONGODB_URI.includes('127.0.0.1');

  if (isLocal) {
    return [
      'MongoDB is not running on localhost:27017.',
      'Fix options:',
      '  1) Install & start MongoDB locally, or',
      '  2) Use MongoDB Atlas — set MONGODB_URI in .env to your Atlas connection string',
    ].join('\n');
  }

  return [
    `MongoDB connection failed: ${error.message}`,
    'If using Atlas: check Network Access (your IP) and database user credentials.',
  ].join('\n');
}

export async function connectMongoDB(): Promise<void> {
  try {
    await mongoose.connect(config.MONGODB_URI);
    logger.info('MongoDB connected');
  } catch (error) {
    logger.error(mongoHelpMessage(error as Error));
    throw error;
  }
}

mongoose.connection.on('error', (err) => {
  logger.error(`MongoDB error: ${err.message}`);
});
