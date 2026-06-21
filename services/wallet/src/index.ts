import './tracing';
import {
  createLogger,
  initMetrics,
  createHealthServer,
  registerGracefulShutdown,
  closeRedis,
  disconnectKafka,
} from '@blockchain/common';
import { config } from './config';
import { prisma, pingDb } from './prisma';
import { startGrpcServer } from './grpc';
import { startConsumers } from './events';

const logger = createLogger(config.serviceName);

async function main(): Promise<void> {
  initMetrics(config.serviceName);

  const grpcServer = await startGrpcServer();
  logger.info({ addr: config.grpcAddr }, 'Wallet gRPC server started');

  const health = createHealthServer(config.serviceName, config.httpPort, logger, {
    readiness: async () => pingDb(),
  });
  health.start();

  void startConsumers().catch((err) => logger.error({ err }, 'Failed to start consumers'));

  registerGracefulShutdown(logger, [
    () => new Promise<void>((res) => grpcServer.tryShutdown(() => res())),
    () => prisma.$disconnect(),
    () => disconnectKafka(),
    () => closeRedis(),
  ]);
}

main().catch((err) => {
  logger.fatal({ err }, 'Wallet service failed to start');
  process.exit(1);
});
