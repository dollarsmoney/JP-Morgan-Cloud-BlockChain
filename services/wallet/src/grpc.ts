import {
  grpc,
  loadProto,
  createGrpcServer,
  bindAndStart,
  toGrpcError,
  grpcRequestDuration,
} from '@blockchain/common';
import { config } from './config';
import * as service from './service';
import type { Wallet } from './generated/prisma';

/* eslint-disable @typescript-eslint/no-explicit-any */

function handler<Req, Res>(method: string, fn: (req: Req) => Promise<Res> | Res) {
  return async (call: grpc.ServerUnaryCall<Req, Res>, callback: grpc.sendUnaryData<Res>) => {
    const end = grpcRequestDuration.startTimer({ method });
    try {
      const res = await fn(call.request);
      end({ status: 'OK' });
      callback(null, res);
    } catch (err) {
      end({ status: 'ERROR' });
      callback(toGrpcError(err));
    }
  };
}

function toProtoWallet(w: Wallet) {
  return {
    id: w.id,
    userId: w.userId,
    address: w.address,
    publicKey: w.publicKey,
    label: w.label,
    balance: w.balance.toString(),
    currency: w.currency,
    status: w.status,
    createdAt: w.createdAt.toISOString(),
  };
}

export async function startGrpcServer(): Promise<grpc.Server> {
  const proto = loadProto('wallet.proto') as any;
  const server = createGrpcServer();

  server.addService(proto.wallet.WalletService.service, {
    CreateWallet: handler('CreateWallet', async (req: any) =>
      toProtoWallet(
        await service.createWallet({
          userId: req.userId,
          label: req.label || undefined,
          currency: req.currency || undefined,
        }),
      ),
    ),
    ListWallets: handler('ListWallets', async (req: any) => ({
      wallets: (await service.listWallets(req.userId)).map(toProtoWallet),
    })),
    GetWallet: handler('GetWallet', async (req: any) =>
      toProtoWallet(await service.getWallet(req.userId, req.walletId)),
    ),
    GetBalance: handler('GetBalance', async (req: any) => service.getBalanceByAddress(req.address)),
  });

  await bindAndStart(server, config.grpcAddr);
  return server;
}
