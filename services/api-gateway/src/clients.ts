import {
  grpc,
  loadProto,
  unaryCall,
  fromGrpcError,
  authMetadata,
  type AuthContext,
} from '@blockchain/common';
import { config } from './config';

/* eslint-disable @typescript-eslint/no-explicit-any */

function makeClient(protoFile: string, pkg: string, svc: string, target: string): grpc.Client {
  const proto = loadProto(protoFile) as any;
  const Ctor = proto[pkg][svc];
  return new Ctor(target, grpc.credentials.createInsecure());
}

export const clients = {
  auth: makeClient('auth.proto', 'auth', 'AuthService', config.grpcTargets.auth),
  user: makeClient('user.proto', 'user', 'UserService', config.grpcTargets.user),
  wallet: makeClient('wallet.proto', 'wallet', 'WalletService', config.grpcTargets.wallet),
  blockchain: makeClient(
    'blockchain.proto',
    'blockchain',
    'BlockchainService',
    config.grpcTargets.blockchain,
  ),
  transaction: makeClient(
    'transaction.proto',
    'transaction',
    'TransactionService',
    config.grpcTargets.transaction,
  ),
  notification: makeClient(
    'notification.proto',
    'notification',
    'NotificationService',
    config.grpcTargets.notification,
  ),
  audit: makeClient('audit.proto', 'audit', 'AuditService', config.grpcTargets.audit),
};

export type ServiceName = keyof typeof clients;

/** Typed unary call that forwards the authenticated principal + trace id as gRPC
 *  metadata, and normalizes downstream errors into AppError. */
export async function call<Res = any>(
  service: ServiceName,
  method: string,
  req: unknown,
  ctx?: { auth?: AuthContext; traceId?: string },
): Promise<Res> {
  const md = ctx?.auth ? authMetadata(ctx.auth, ctx.traceId) : new grpc.Metadata();
  try {
    return await unaryCall<unknown, Res>(clients[service], method, req, md);
  } catch (err) {
    throw fromGrpcError(err);
  }
}
