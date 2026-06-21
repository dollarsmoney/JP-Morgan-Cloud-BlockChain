import './tracing'; // must be first
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

const logger = createLogger(config.serviceName);

async function main(): Promise<void> {
  initMetrics(config.serviceName);

  // Start the gRPC + health servers first so liveness/readiness work even while
  // Kafka/Redis warm up. The Kafka producer connects lazily on first publish.
  const grpcServer = await startGrpcServer();
  logger.info({ addr: config.grpcAddr }, 'Auth gRPC server started');

  const health = createHealthServer(config.serviceName, config.httpPort, logger, {
    readiness: async () => pingDb(),
  });
  health.start();

  registerGracefulShutdown(logger, [
    () => new Promise<void>((res) => grpcServer.tryShutdown(() => res())),
    () => prisma.$disconnect(),
    () => disconnectKafka(),
    () => closeRedis(),
  ]);
}

main().catch((err) => {
  logger.fatal({ err }, 'Auth service failed to start');
  process.exit(1);
});
