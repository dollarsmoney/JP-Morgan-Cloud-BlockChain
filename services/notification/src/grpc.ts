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
import type { Notification } from './generated/prisma';

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

function toProto(n: Notification) {
  return {
    id: n.id,
    userId: n.userId,
    type: n.type,
    title: n.title,
    body: n.body,
    read: n.read,
    metadata: JSON.stringify(n.metadata ?? {}),
    createdAt: n.createdAt.toISOString(),
  };
}

export async function startGrpcServer(): Promise<grpc.Server> {
  const proto = loadProto('notification.proto') as any;
  const server = createGrpcServer();

  server.addService(proto.notification.NotificationService.service, {
    ListNotifications: handler('ListNotifications', async (req: any) => {
      const r = await service.list(req.userId, req.page || 1, req.pageSize || 20, !!req.unreadOnly);
      return { notifications: r.notifications.map(toProto), total: r.total };
    }),
    MarkRead: handler('MarkRead', async (req: any) =>
      toProto(await service.markRead(req.userId, req.notificationId)),
    ),
    MarkAllRead: handler('MarkAllRead', async (req: any) => ({
      updated: await service.markAllRead(req.userId),
    })),
    UnreadCount: handler('UnreadCount', async (req: any) => ({
      count: await service.unreadCount(req.userId),
    })),
  });

  await bindAndStart(server, config.grpcAddr);
  return server;
}
