const app = require('./app');
const db = require('./config/database');
const logger = require('./config/logger');
require('dotenv').config();

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

const startServer = async () => {
  try {
    db.createPool();
    await db.testConnection();
    
    const server = app.listen(PORT, HOST, () => {
      logger.info(`Server is running on http://${HOST}:${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`Health check: http://${HOST}:${PORT}/health`);
    });

    return server;
  } catch (error) {
    logger.error(`Failed to start server: ${error.message}`);
    process.exit(1);
  }
};

const server = startServer().catch((error) => {
  logger.error(`Server initialization error: ${error.message}`);
  process.exit(1);
});

// Graceful shutdown handler
const gracefulShutdown = async (signal) => {
  logger.info(`${signal} signal received: closing HTTP server`);
  
  const resolvedServer = await server;
  
  resolvedServer.close(async () => {
    logger.info('HTTP server closed');
    
    try {
      await db.closePool();
      logger.info('Database connections closed');
      process.exit(0);
    } catch (error) {
      logger.error(`Error during shutdown: ${error.message}`);
      process.exit(1);
    }
  });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
