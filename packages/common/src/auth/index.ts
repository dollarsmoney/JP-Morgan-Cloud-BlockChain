import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { AppError } from '../errors';
import { intEnv, optionalEnv, requireEnv } from '../config/env';

export type Role = 'USER' | 'ADMIN';

export interface JwtPayload {
  sub: string; // userId
  email: string;
  role: Role;
  type: 'access' | 'refresh';
  jti?: string;
}

export interface AuthContext {
  userId: string;
  email: string;
  role: Role;
}

const BCRYPT_ROUNDS = 12;

// ---------- Password hashing ----------
export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

// ---------- JWT ----------
function accessSecret(): string {
  return requireEnv('JWT_SECRET');
}
function refreshSecret(): string {
  return requireEnv('JWT_REFRESH_SECRET');
}

function baseSignOptions(ttlSeconds: number): SignOptions {
  return {
    expiresIn: ttlSeconds,
    issuer: optionalEnv('JWT_ISSUER', 'blockchain-fintech'),
    audience: optionalEnv('JWT_AUDIENCE', 'blockchain-fintech-clients'),
  };
}

export function signAccessToken(ctx: AuthContext): string {
  const payload: JwtPayload = { sub: ctx.userId, email: ctx.email, role: ctx.role, type: 'access' };
  return jwt.sign(payload, accessSecret(), baseSignOptions(intEnv('JWT_ACCESS_TTL', 900)));
}

export function signRefreshToken(ctx: AuthContext, jti: string): string {
  const payload: JwtPayload = {
    sub: ctx.userId,
    email: ctx.email,
    role: ctx.role,
    type: 'refresh',
    jti,
  };
  return jwt.sign(payload, refreshSecret(), baseSignOptions(intEnv('JWT_REFRESH_TTL', 604800)));
}

export function verifyAccessToken(token: string): JwtPayload {
  try {
    const decoded = jwt.verify(token, accessSecret(), {
      issuer: optionalEnv('JWT_ISSUER', 'blockchain-fintech'),
      audience: optionalEnv('JWT_AUDIENCE', 'blockchain-fintech-clients'),
    }) as JwtPayload;
    if (decoded.type !== 'access') throw AppError.unauthenticated('Invalid token type');
    return decoded;
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw AppError.unauthenticated('Invalid or expired access token');
  }
}

export function verifyRefreshToken(token: string): JwtPayload {
  try {
    const decoded = jwt.verify(token, refreshSecret(), {
      issuer: optionalEnv('JWT_ISSUER', 'blockchain-fintech'),
      audience: optionalEnv('JWT_AUDIENCE', 'blockchain-fintech-clients'),
    }) as JwtPayload;
    if (decoded.type !== 'refresh') throw AppError.unauthenticated('Invalid token type');
    return decoded;
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw AppError.unauthenticated('Invalid or expired refresh token');
  }
}

// ---------- RBAC ----------
export function assertRole(ctx: AuthContext | undefined, ...allowed: Role[]): AuthContext {
  if (!ctx) throw AppError.unauthenticated();
  if (!allowed.includes(ctx.role)) throw AppError.forbidden();
  return ctx;
}

export function hashToken(token: string): string {
  // Lightweight, deterministic hash for storing refresh tokens at rest.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const crypto = require('crypto') as typeof import('crypto');
  return crypto.createHash('sha256').update(token).digest('hex');
}
