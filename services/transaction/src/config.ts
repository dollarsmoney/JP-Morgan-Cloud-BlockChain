import { intEnv, optionalEnv } from '@blockchain/common';

export const config = {
  serviceName: 'transaction-service',
  grpcAddr: optionalEnv('TRANSACTION_GRPC_ADDR', '0.0.0.0:50055'),
  httpPort: intEnv('TRANSACTION_HTTP_PORT', 5055),
  walletGrpcTarget: optionalEnv('WALLET_GRPC_TARGET', 'localhost:50053'),
};
