import { intEnv, optionalEnv } from '@blockchain/common';

export const config = {
  serviceName: 'notification-service',
  grpcAddr: optionalEnv('NOTIFICATION_GRPC_ADDR', '0.0.0.0:50056'),
  httpPort: intEnv('NOTIFICATION_HTTP_PORT', 5056),
};
