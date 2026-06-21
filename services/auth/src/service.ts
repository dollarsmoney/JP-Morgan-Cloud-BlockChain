import { v4 as uuid } from 'uuid';
import {
  AppError,
  AuthContext,
  Topics,
  EventTypes,
  buildEvent,
  publishEvent,
  hashPassword,
  verifyPassword,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  verifyAccessToken,
  hashToken,
  getRedis,
  intEnv,
  businessCounter,
  createLogger,
} from '@blockchain/common';
import { prisma } from './prisma';

const log = createLogger('auth-service');

export interface AuthResult {
  userId: string;
  email: string;
  role: 'USER' | 'ADMIN';
  accessToken: string;
  refreshToken: string;
  accessExpiresIn: number;
}

async function issueTokens(ctx: AuthContext): Promise<AuthResult> {
  const jti = uuid();
  const accessToken = signAccessToken(ctx);
  const refreshToken = signRefreshToken(ctx, jti);
  const ttl = intEnv('JWT_REFRESH_TTL', 604800);

  await prisma.refreshToken.create({
    data: {
      userId: ctx.userId,
      jti,
      tokenHash: hashToken(refreshToken),
      expiresAt: new Date(Date.now() + ttl * 1000),
    },
  });
  // Cache active jti for fast revocation checks.
  await getRedis().set(`refresh:${jti}`, ctx.userId, 'EX', ttl);

  return {
    userId: ctx.userId,
    email: ctx.email,
    role: ctx.role,
    accessToken,
    refreshToken,
    accessExpiresIn: intEnv('JWT_ACCESS_TTL', 900),
  };
}

export async function register(input: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}): Promise<AuthResult> {
  const email = input.email.toLowerCase().trim();
  const existing = await prisma.credential.findUnique({ where: { email } });
  if (existing) throw AppError.conflict('An account with this email already exists');

  const userId = uuid();
  await prisma.credential.create({
    data: { userId, email, passwordHash: await hashPassword(input.password), role: 'USER' },
  });

  // Tell the User service to materialize a profile.
  await publishEvent(
    Topics.AUTH,
    buildEvent(
      EventTypes.USER_REGISTERED,
      { userId, email, firstName: input.firstName, lastName: input.lastName },
      { actorId: userId },
    ),
    userId,
  );

  businessCounter.inc({ name: 'user_registered' });
  log.info({ userId, email }, 'User registered');
  return issueTokens({ userId, email, role: 'USER' });
}

export async function login(input: { email: string; password: string }): Promise<AuthResult> {
  const email = input.email.toLowerCase().trim();
  const cred = await prisma.credential.findUnique({ where: { email } });
  if (!cred || !(await verifyPassword(input.password, cred.passwordHash))) {
    throw AppError.unauthenticated('Invalid email or password');
  }
  if (cred.status !== 'ACTIVE') throw AppError.forbidden('Account is not active');

  await prisma.credential.update({
    where: { id: cred.id },
    data: { lastLoginAt: new Date() },
  });

  await publishEvent(
    Topics.AUTH,
    buildEvent(EventTypes.USER_LOGGED_IN, { userId: cred.userId, email }, { actorId: cred.userId }),
    cred.userId,
  );

  businessCounter.inc({ name: 'user_login' });
  return issueTokens({ userId: cred.userId, email: cred.email, role: cred.role });
}

export async function refresh(refreshToken: string): Promise<AuthResult> {
  const payload = verifyRefreshToken(refreshToken);
  const jti = payload.jti!;

  const record = await prisma.refreshToken.findUnique({ where: { jti } });
  if (!record || record.revoked || record.expiresAt < new Date()) {
    throw AppError.unauthenticated('Refresh token is no longer valid');
  }
  if (record.tokenHash !== hashToken(refreshToken)) {
    // Token reuse / tampering — revoke the whole family for safety.
    await prisma.refreshToken.updateMany({ where: { userId: payload.sub }, data: { revoked: true } });
    throw AppError.unauthenticated('Refresh token mismatch');
  }
  const cached = await getRedis().get(`refresh:${jti}`);
  if (!cached) throw AppError.unauthenticated('Session expired');

  // Rotate: revoke the old token, then issue a fresh pair.
  await prisma.refreshToken.update({ where: { jti }, data: { revoked: true } });
  await getRedis().del(`refresh:${jti}`);

  return issueTokens({
    userId: payload.sub,
    email: payload.email,
    role: payload.role,
  });
}

export async function logout(refreshToken: string): Promise<boolean> {
  try {
    const payload = verifyRefreshToken(refreshToken);
    const jti = payload.jti!;
    await prisma.refreshToken.updateMany({ where: { jti }, data: { revoked: true } });
    await getRedis().del(`refresh:${jti}`);
    await publishEvent(
      Topics.AUTH,
      buildEvent(EventTypes.USER_LOGGED_OUT, { userId: payload.sub }, { actorId: payload.sub }),
      payload.sub,
    );
    return true;
  } catch {
    // Logout is idempotent — never error on an already-invalid token.
    return true;
  }
}

export function verify(accessToken: string): {
  valid: boolean;
  userId: string;
  email: string;
  role: string;
} {
  const payload = verifyAccessToken(accessToken);
  return { valid: true, userId: payload.sub, email: payload.email, role: payload.role };
}
