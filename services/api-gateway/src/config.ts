import { intEnv, optionalEnv, listEnv } from '@blockchain/common';

export const config = {
  serviceName: 'api-gateway',
  port: intEnv('GATEWAY_PORT', 4000),
  corsOrigins: listEnv('CORS_ORIGINS', ['http://localhost:3000']),
  rateLimit: {
    windowMs: intEnv('RATE_LIMIT_WINDOW_MS', 60000),
    max: intEnv('RATE_LIMIT_MAX', 100),
  },
  grpcTargets: {
    auth: optionalEnv('AUTH_GRPC_TARGET', 'localhost:50051'),
    user: optionalEnv('USER_GRPC_TARGET', 'localhost:50052'),
    wallet: optionalEnv('WALLET_GRPC_TARGET', 'localhost:50053'),
    blockchain: optionalEnv('BLOCKCHAIN_GRPC_TARGET', 'localhost:50054'),
    transaction: optionalEnv('TRANSACTION_GRPC_TARGET', 'localhost:50055'),
    notification: optionalEnv('NOTIFICATION_GRPC_TARGET', 'localhost:50056'),
    audit: optionalEnv('AUDIT_GRPC_TARGET', 'localhost:50057'),
  },
};
