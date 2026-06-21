import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import * as path from 'path';
import { AppError, ErrorCode } from '../errors';
import type { AuthContext, Role } from '../auth';

/** Root directory containing the .proto contracts. Overridable via PROTO_DIR. */
export function protoDir(): string {
  return process.env.PROTO_DIR || path.resolve(__dirname, '../../../../proto');
}

const loaderOptions: protoLoader.Options = {
  keepCase: false,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
};

/** Load a .proto file and return its gRPC package definition object. */
export function loadProto(file: string): grpc.GrpcObject {
  const def = protoLoader.loadSync(path.join(protoDir(), file), loaderOptions);
  return grpc.loadPackageDefinition(def);
}

/** Build a gRPC server bound to the given address (call .start implicitly). */
export function createGrpcServer(): grpc.Server {
  return new grpc.Server({
    'grpc.max_receive_message_length': 1024 * 1024 * 16,
    'grpc.max_send_message_length': 1024 * 1024 * 16,
  });
}

export function bindAndStart(server: grpc.Server, addr: string): Promise<void> {
  return new Promise((resolve, reject) => {
    server.bindAsync(addr, grpc.ServerCredentials.createInsecure(), (err) => {
      if (err) return reject(err);
      resolve();
    });
  });
}

// ---------- Auth context propagation over gRPC metadata ----------
const MD_USER = 'x-user-id';
const MD_EMAIL = 'x-user-email';
const MD_ROLE = 'x-user-role';
const MD_TRACE = 'x-trace-id';

export function authMetadata(ctx: AuthContext, traceId?: string): grpc.Metadata {
  const md = new grpc.Metadata();
  md.set(MD_USER, ctx.userId);
  md.set(MD_EMAIL, ctx.email);
  md.set(MD_ROLE, ctx.role);
  if (traceId) md.set(MD_TRACE, traceId);
  return md;
}

export function readAuthContext(md: grpc.Metadata): AuthContext | undefined {
  const userId = (md.get(MD_USER)[0] as string) || undefined;
  const email = (md.get(MD_EMAIL)[0] as string) || undefined;
  const role = (md.get(MD_ROLE)[0] as string) || undefined;
  if (!userId || !email || !role) return undefined;
  return { userId, email, role: role as Role };
}

export function readTraceId(md: grpc.Metadata): string | undefined {
  return (md.get(MD_TRACE)[0] as string) || undefined;
}

/** Convert an AppError into a gRPC ServiceError payload for a callback. */
export function toGrpcError(err: unknown): grpc.ServiceError {
  const appErr =
    err instanceof AppError ? err : new AppError(ErrorCode.INTERNAL, 'Internal error');
  return {
    name: appErr.code,
    code: appErr.grpcStatus,
    details: appErr.message,
    message: appErr.message,
    metadata: new grpc.Metadata(),
  };
}

/** Promisified unary client call. */
export function unaryCall<Req, Res>(
  client: grpc.Client,
  method: string,
  req: Req,
  metadata?: grpc.Metadata,
): Promise<Res> {
  return new Promise((resolve, reject) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (client as any)[method](req, metadata ?? new grpc.Metadata(), (err: unknown, res: Res) => {
      if (err) return reject(err);
      resolve(res);
    });
  });
}

export { grpc };
