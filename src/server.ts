import http from 'http';
import app from './app.js';
import { config } from './config/index.js';
import { connectMongoDB } from './database/mongodb/connection.js';
import { setupSocketIO } from './sockets/chat.socket.js';
import { logger } from './utils/logger.js';

async function start() {
  await connectMongoDB();

  const httpServer = http.createServer(app);
  setupSocketIO(httpServer);

  httpServer.listen(config.PORT,'0.0.0.0', () => {
    logger.info(`Server running on ${config.PORT}`);
    logger.info(`Environment: ${config.NODE_ENV}`);
    logger.info(`API URL: ${config.API_URL}`);
    console.log(`Server running on ${config.PORT}`);
  });
}

start().catch((err) => {
  logger.error(`Failed to start server: ${err.message}`);
  process.exit(1);
});
