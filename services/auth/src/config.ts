import { intEnv, optionalEnv } from '@blockchain/common';

export const config = {
  serviceName: 'auth-service',
  grpcAddr: optionalEnv('AUTH_GRPC_ADDR', '0.0.0.0:50051'),
  httpPort: intEnv('AUTH_HTTP_PORT', 5051),
};
