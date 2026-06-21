import type { Logger } from '../logger';

type Closer = () => Promise<void> | void;

/** Register graceful shutdown handlers that close resources on SIGTERM/SIGINT. */
export function registerGracefulShutdown(logger: Logger, closers: Closer[]): void {
  let shuttingDown = false;
  const shutdown = async (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info({ signal }, 'Graceful shutdown initiated');
    for (const close of closers) {
      try {
        await close();
      } catch (err) {
        logger.error({ err }, 'Error during shutdown');
      }
    }
    process.exit(0);
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('unhandledRejection', (reason) => {
    logger.error({ reason }, 'Unhandled promise rejection');
  });
  process.on('uncaughtException', (err) => {
    logger.fatal({ err }, 'Uncaught exception');
    void shutdown('uncaughtException');
  });
}
