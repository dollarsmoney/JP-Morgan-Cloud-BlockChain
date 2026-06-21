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
import type { UserProfile } from './generated/prisma';

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

function toProfile(p: UserProfile) {
  return {
    id: p.id,
    userId: p.userId,
    email: p.email,
    firstName: p.firstName,
    lastName: p.lastName,
    avatarUrl: p.avatarUrl ?? '',
    phone: p.phone ?? '',
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

export async function startGrpcServer(): Promise<grpc.Server> {
  const proto = loadProto('user.proto') as any;
  const server = createGrpcServer();

  server.addService(proto.user.UserService.service, {
    GetProfile: handler('GetProfile', async (req: any) =>
      toProfile(await service.getProfile(req.userId)),
    ),
    UpdateProfile: handler('UpdateProfile', async (req: any) =>
      toProfile(
        await service.updateProfile(req.userId, {
          firstName: req.firstName || undefined,
          lastName: req.lastName || undefined,
          phone: req.phone || undefined,
        }),
      ),
    ),
    UploadAvatar: handler('UploadAvatar', async (req: any) =>
      toProfile(await service.setAvatar(req.userId, Buffer.from(req.image), req.contentType)),
    ),
  });

  await bindAndStart(server, config.grpcAddr);
  return server;
}
