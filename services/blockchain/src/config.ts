import { intEnv, optionalEnv, boolEnv } from '@blockchain/common';

export const config = {
  serviceName: 'blockchain-service',
  grpcAddr: optionalEnv('BLOCKCHAIN_GRPC_ADDR', '0.0.0.0:50054'),
  httpPort: intEnv('BLOCKCHAIN_HTTP_PORT', 5054),
  difficulty: intEnv('BLOCKCHAIN_DIFFICULTY', 4),
  miningReward: intEnv('BLOCKCHAIN_MINING_REWARD', 50),
  blockTxLimit: intEnv('BLOCKCHAIN_BLOCK_TX_LIMIT', 10),
  minerAddress: optionalEnv('BLOCKCHAIN_MINER_ADDRESS', '0xMINER'),
  // Auto-mine a block as soon as a transaction enters the mempool (demo-friendly,
  // gives near-instant confirmations). Disable to mine only via the MineBlock RPC.
  autoMine: boolEnv('BLOCKCHAIN_AUTO_MINE', true),
};
