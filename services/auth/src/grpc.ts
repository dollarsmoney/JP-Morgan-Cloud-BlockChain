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

/* eslint-disable @typescript-eslint/no-explicit-any */

/** Wrap a handler with metrics + uniform error translation. */
function handler<Req, Res>(
  method: string,
  fn: (req: Req) => Promise<Res> | Res,
): grpc.handleUnaryCall<Req, Res> {
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

export async function startGrpcServer(): Promise<grpc.Server> {
  const proto = loadProto('auth.proto') as any;
  const server = createGrpcServer();

  server.addService(proto.auth.AuthService.service, {
    Register: handler('Register', async (req: any) => {
      const r = await service.register({
        email: req.email,
        password: req.password,
        firstName: req.firstName,
        lastName: req.lastName,
      });
      return toAuthResponse(r);
    }),
    Login: handler('Login', async (req: any) => {
      const r = await service.login({ email: req.email, password: req.password });
      return toAuthResponse(r);
    }),
    Refresh: handler('Refresh', async (req: any) => {
      const r = await service.refresh(req.refreshToken);
      return toAuthResponse(r);
    }),
    Logout: handler('Logout', async (req: any) => {
      const success = await service.logout(req.refreshToken);
      return { success };
    }),
    VerifyToken: handler('VerifyToken', (req: any) => service.verify(req.accessToken)),
  });

  await bindAndStart(server, config.grpcAddr);
  return server;
}

function toAuthResponse(r: service.AuthResult) {
  return {
    userId: r.userId,
    email: r.email,
    role: r.role,
    accessToken: r.accessToken,
    refreshToken: r.refreshToken,
    accessExpiresIn: r.accessExpiresIn,
  };
}
