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
import { ensureGenesis } from './service';

const logger = createLogger(config.serviceName);

async function main(): Promise<void> {
  initMetrics(config.serviceName);

  const grpcServer = await startGrpcServer();
  logger.info({ addr: config.grpcAddr }, 'Blockchain gRPC server started');

  const health = createHealthServer(config.serviceName, config.httpPort, logger, {
    readiness: async () => pingDb(),
  });
  health.start();

  // Seed genesis + start consumers in the background (DB/Kafka may still be warming up).
  void ensureGenesis().catch((err) => logger.error({ err }, 'Genesis init failed (DB unreachable?)'));
  void startConsumers().catch((err) => logger.error({ err }, 'Failed to start consumers'));

  registerGracefulShutdown(logger, [
    () => new Promise<void>((res) => grpcServer.tryShutdown(() => res())),
    () => prisma.$disconnect(),
    () => disconnectKafka(),
    () => closeRedis(),
  ]);
}

main().catch((err) => {
  logger.fatal({ err }, 'Blockchain service failed to start');
  process.exit(1);
});
