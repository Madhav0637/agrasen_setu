const app = require('./app');
const env = require('./config/env');
const logger = require('./utils/logger');
const { startScheduler } = require('./jobs/scheduler');

const PORT = env.PORT;

const server = app.listen(PORT, () => {
  logger.info(`🚀 Agrasen Setu API running on port ${PORT}`);
  logger.info(`📡 Environment: ${env.NODE_ENV}`);
  logger.info(`🌐 Frontend URL: ${env.FRONTEND_URL}`);

  // Start scheduled jobs
  if (env.isProd || env.isDev) {
    startScheduler();
  }
});

// Graceful shutdown
const gracefulShutdown = (signal) => {
  logger.info(`${signal} received. Shutting down gracefully...`);
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });

  // Force close after 30 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 30000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('unhandledRejection', (reason, promise) => {
  logger.error({ reason }, 'Unhandled Promise Rejection');
});
process.on('uncaughtException', (error) => {
  logger.error({ error }, 'Uncaught Exception');
  process.exit(1);
});
