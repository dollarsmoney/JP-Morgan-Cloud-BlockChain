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
import type { Transaction } from './generated/prisma';

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

function toProtoTx(t: Transaction) {
  return {
    id: t.id,
    userId: t.userId,
    fromAddress: t.fromAddress,
    toAddress: t.toAddress,
    amount: t.amount.toString(),
    fee: t.fee.toString(),
    status: t.status,
    txHash: t.txHash,
    blockIndex: t.blockIndex ?? 0,
    createdAt: t.createdAt.toISOString(),
    confirmedAt: t.confirmedAt ? t.confirmedAt.toISOString() : '',
  };
}

export async function startGrpcServer(): Promise<grpc.Server> {
  const proto = loadProto('transaction.proto') as any;
  const server = createGrpcServer();

  server.addService(proto.transaction.TransactionService.service, {
    CreateTransaction: handler('CreateTransaction', async (req: any) =>
      toProtoTx(
        await service.createTransaction({
          userId: req.userId,
          fromAddress: req.fromAddress,
          toAddress: req.toAddress,
          amount: req.amount,
          fee: req.fee || undefined,
        }),
      ),
    ),
    GetTransaction: handler('GetTransaction', async (req: any) =>
      toProtoTx(await service.getTransaction(req.userId, req.transactionId)),
    ),
    ListHistory: handler('ListHistory', async (req: any) => {
      const r = await service.listHistory(
        req.userId,
        req.page || 1,
        req.pageSize || 20,
        req.status || undefined,
      );
      return {
        transactions: r.transactions.map(toProtoTx),
        total: r.total,
        page: r.page,
        pageSize: r.pageSize,
      };
    }),
    GetStatus: handler('GetStatus', async (req: any) =>
      service.getStatus(req.userId, req.transactionId),
    ),
  });

  await bindAndStart(server, config.grpcAddr);
  return server;
}
