import type { NextFunction, Request, Response } from 'express';
import { AppError, verifyAccessToken, type Role } from '@blockchain/common';

/** Verify the Bearer access token locally (fast path — no round-trip to Auth). */
export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) throw AppError.unauthenticated('Missing bearer token');
    const payload = verifyAccessToken(header.slice(7));
    req.auth = { userId: payload.sub, email: payload.email, role: payload.role };
    next();
  } catch (err) {
    next(err);
  }
}

/** RBAC guard — must be used after `authenticate`. */
export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.auth) return next(AppError.unauthenticated());
    if (!roles.includes(req.auth.role)) return next(AppError.forbidden());
    next();
  };
}
