import './tracing';
import {
  createLogger,
  initMetrics,
  registerGracefulShutdown,
  closeRedis,
} from '@blockchain/common';
import { config } from './config';
import { buildApp } from './app';

const logger = createLogger(config.serviceName);

async function main(): Promise<void> {
  initMetrics(config.serviceName);
  const app = buildApp();
  const server = app.listen(config.port, () => {
    logger.info({ port: config.port }, 'API Gateway listening');
    logger.info(`Swagger UI: http://localhost:${config.port}/docs`);
  });

  registerGracefulShutdown(logger, [
    () => new Promise<void>((res) => server.close(() => res())),
    () => closeRedis(),
  ]);
}

main().catch((err) => {
  logger.fatal({ err }, 'API Gateway failed to start');
  process.exit(1);
});
