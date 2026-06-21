import { intEnv, optionalEnv } from '@blockchain/common';

export const config = {
  serviceName: 'audit-service',
  grpcAddr: optionalEnv('AUDIT_GRPC_ADDR', '0.0.0.0:50057'),
  httpPort: intEnv('AUDIT_HTTP_PORT', 5057),
};
