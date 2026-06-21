import { grpc, loadProto, unaryCall, fromGrpcError } from '@blockchain/common';
import { config } from './config';

/* eslint-disable @typescript-eslint/no-explicit-any */

let walletClient: grpc.Client | null = null;

function getWalletClient(): grpc.Client {
  if (!walletClient) {
    const proto = loadProto('wallet.proto') as any;
    walletClient = new proto.wallet.WalletService(
      config.walletGrpcTarget,
      grpc.credentials.createInsecure(),
    ) as grpc.Client;
  }
  return walletClient;
}

export async function getWalletBalance(address: string): Promise<number> {
  try {
    const res = await unaryCall<{ address: string }, { balance: string }>(
      getWalletClient(),
      'GetBalance',
      { address },
    );
    return Number(res.balance);
  } catch (err) {
    throw fromGrpcError(err);
  }
}
