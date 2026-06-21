import { intEnv, optionalEnv } from '@blockchain/common';

export const config = {
  serviceName: 'wallet-service',
  grpcAddr: optionalEnv('WALLET_GRPC_ADDR', '0.0.0.0:50053'),
  httpPort: intEnv('WALLET_HTTP_PORT', 5053),
  // Faucet grant for newly created wallets so users can transact in the demo.
  initialBalance: intEnv('WALLET_INITIAL_BALANCE', 1000),
  defaultCurrency: optionalEnv('WALLET_DEFAULT_CURRENCY', 'BFC'),
};
