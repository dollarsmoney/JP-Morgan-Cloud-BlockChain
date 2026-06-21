import { status as GrpcStatus } from '@grpc/grpc-js';
import type { NextFunction, Request, Response } from 'express';

/**
 * Canonical error codes shared across all services. Each maps deterministically
 * to an HTTP status (for the gateway/REST) and a gRPC status (for internal RPCs).
 */
export enum ErrorCode {
  VALIDATION = 'VALIDATION_ERROR',
  UNAUTHENTICATED = 'UNAUTHENTICATED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  RATE_LIMITED = 'RATE_LIMITED',
  INSUFFICIENT_FUNDS = 'INSUFFICIENT_FUNDS',
  INTERNAL = 'INTERNAL_ERROR',
  UNAVAILABLE = 'SERVICE_UNAVAILABLE',
}

const HTTP_MAP: Record<ErrorCode, number> = {
  [ErrorCode.VALIDATION]: 400,
  [ErrorCode.UNAUTHENTICATED]: 401,
  [ErrorCode.FORBIDDEN]: 403,
  [ErrorCode.NOT_FOUND]: 404,
  [ErrorCode.CONFLICT]: 409,
  [ErrorCode.RATE_LIMITED]: 429,
  [ErrorCode.INSUFFICIENT_FUNDS]: 422,
  [ErrorCode.INTERNAL]: 500,
  [ErrorCode.UNAVAILABLE]: 503,
};

const GRPC_MAP: Record<ErrorCode, number> = {
  [ErrorCode.VALIDATION]: GrpcStatus.INVALID_ARGUMENT,
  [ErrorCode.UNAUTHENTICATED]: GrpcStatus.UNAUTHENTICATED,
  [ErrorCode.FORBIDDEN]: GrpcStatus.PERMISSION_DENIED,
  [ErrorCode.NOT_FOUND]: GrpcStatus.NOT_FOUND,
  [ErrorCode.CONFLICT]: GrpcStatus.ALREADY_EXISTS,
  [ErrorCode.RATE_LIMITED]: GrpcStatus.RESOURCE_EXHAUSTED,
  [ErrorCode.INSUFFICIENT_FUNDS]: GrpcStatus.FAILED_PRECONDITION,
  [ErrorCode.INTERNAL]: GrpcStatus.INTERNAL,
  [ErrorCode.UNAVAILABLE]: GrpcStatus.UNAVAILABLE,
};

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly httpStatus: number;
  public readonly grpcStatus: number;
  public readonly details?: unknown;
  public readonly isOperational = true;

  constructor(code: ErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.httpStatus = HTTP_MAP[code];
    this.grpcStatus = GRPC_MAP[code];
    this.details = details;
    Error.captureStackTrace?.(this, AppError);
  }

  static validation(message: string, details?: unknown) {
    return new AppError(ErrorCode.VALIDATION, message, details);
  }
  static unauthenticated(message = 'Authentication required') {
    return new AppError(ErrorCode.UNAUTHENTICATED, message);
  }
  static forbidden(message = 'You do not have permission to perform this action') {
    return new AppError(ErrorCode.FORBIDDEN, message);
  }
  static notFound(message = 'Resource not found') {
    return new AppError(ErrorCode.NOT_FOUND, message);
  }
  static conflict(message: string) {
    return new AppError(ErrorCode.CONFLICT, message);
  }
  static insufficientFunds(message = 'Insufficient wallet balance') {
    return new AppError(ErrorCode.INSUFFICIENT_FUNDS, message);
  }
  static internal(message = 'Internal server error') {
    return new AppError(ErrorCode.INTERNAL, message);
  }
}

/** Convert a thrown gRPC error (from a downstream service) into an AppError. */
export function fromGrpcError(err: unknown): AppError {
  const e = err as { code?: number; details?: string; message?: string };
  const entry = (Object.entries(GRPC_MAP) as [ErrorCode, number][]).find(
    ([, g]) => g === e.code,
  );
  const code = entry ? entry[0] : ErrorCode.INTERNAL;
  return new AppError(code, e.details || e.message || 'Upstream service error');
}

/** Express error-handling middleware. Never leaks stack traces to clients. */
export function errorHandler(serviceName: string) {
  return (err: unknown, req: Request, res: Response, _next: NextFunction): void => {
    const appErr =
      err instanceof AppError
        ? err
        : new AppError(ErrorCode.INTERNAL, 'Internal server error');

    const log = (req as unknown as { log?: { error: (o: unknown, m: string) => void } }).log;
    if (!appErr.isOperational || appErr.code === ErrorCode.INTERNAL) {
      log?.error({ err, service: serviceName }, 'Unhandled error');
    }

    res.status(appErr.httpStatus).json({
      error: {
        code: appErr.code,
        message: appErr.message,
        details: appErr.details,
        traceId: (req as unknown as { traceId?: string }).traceId,
      },
    });
  };
}

/** Wrap an async express handler so rejections flow into the error handler. */
export function asyncHandler<T extends Request>(
  fn: (req: T, res: Response, next: NextFunction) => Promise<unknown>,
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    fn(req as T, res, next).catch(next);
  };
}
