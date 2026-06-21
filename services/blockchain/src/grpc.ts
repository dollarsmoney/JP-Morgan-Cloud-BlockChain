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
import type { Block } from './chain';

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

function toProtoBlock(b: Block) {
  return {
    index: b.index,
    timestamp: b.timestamp,
    previousHash: b.previousHash,
    hash: b.hash,
    nonce: String(b.nonce),
    difficulty: b.difficulty,
    merkleRoot: b.merkleRoot,
    transactions: b.transactions.map((t) => ({
      sender: t.sender,
      receiver: t.receiver,
      amount: t.amount,
      fee: t.fee,
      signature: t.signature ?? '',
      txHash: t.txHash,
      timestamp: t.timestamp,
    })),
  };
}

export async function startGrpcServer(): Promise<grpc.Server> {
  const proto = loadProto('blockchain.proto') as any;
  const server = createGrpcServer();

  server.addService(proto.blockchain.BlockchainService.service, {
    SubmitTransaction: handler('SubmitTransaction', (req: any) => {
      const r = service.submitTransaction({
        sender: req.sender,
        receiver: req.receiver,
        amount: req.amount,
        fee: req.fee,
        signature: req.signature,
        txHash: req.txHash,
      });
      return { accepted: r.accepted, txHash: r.txHash, mempoolSize: r.mempoolSize };
    }),
    MineBlock: handler('MineBlock', async (req: any) =>
      toProtoBlock(await service.mine(req.minerAddress || undefined)),
    ),
    GetChain: handler('GetChain', async (req: any) => {
      const { blocks, length } = await service.getChain(req.limit || undefined);
      return { blocks: blocks.map(toProtoBlock), length };
    }),
    GetBlock: handler('GetBlock', async (req: any) => toProtoBlock(await service.getBlock(req.index))),
    ValidateChain: handler('ValidateChain', () => service.validate()),
    GetBalance: handler('GetBalance', async (req: any) => ({
      address: req.address,
      balance: String(await service.getBalance(req.address)),
    })),
  });

  await bindAndStart(server, config.grpcAddr);
  return server;
}
