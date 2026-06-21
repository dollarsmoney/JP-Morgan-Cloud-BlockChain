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
import type { AuditLog } from './generated/prisma';

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

function toProto(l: AuditLog) {
  return {
    id: l.id,
    actorId: l.actorId ?? '',
    service: l.service,
    action: l.action,
    resource: l.resource ?? '',
    payload: JSON.stringify(l.payload ?? {}),
    ip: l.ip ?? '',
    createdAt: l.createdAt.toISOString(),
  };
}

export async function startGrpcServer(): Promise<grpc.Server> {
  const proto = loadProto('audit.proto') as any;
  const server = createGrpcServer();

  server.addService(proto.audit.AuditService.service, {
    QueryLogs: handler('QueryLogs', async (req: any) => {
      const r = await service.query({
        actorId: req.actorId || undefined,
        service: req.service || undefined,
        action: req.action || undefined,
        page: req.page || 1,
        pageSize: req.pageSize || 20,
      });
      return { logs: r.logs.map(toProto), total: r.total };
    }),
  });

  await bindAndStart(server, config.grpcAddr);
  return server;
}
