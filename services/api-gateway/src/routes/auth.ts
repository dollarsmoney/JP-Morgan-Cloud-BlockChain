import { Router } from 'express';
import { asyncHandler, validateBody, isProduction, intEnv } from '@blockchain/common';
import { call } from '../clients';
import { authLimiter } from '../middleware/rateLimit';
import { registerSchema, loginSchema } from '../schemas';

const REFRESH_COOKIE = 'refresh_token';

function setRefreshCookie(res: import('express').Response, token: string): void {
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: isProduction(),
    sameSite: 'strict',
    maxAge: intEnv('JWT_REFRESH_TTL', 604800) * 1000,
    path: '/api/v1/auth',
  });
}

export const authRouter = Router();

authRouter.post(
  '/register',
  authLimiter,
  validateBody(registerSchema),
  asyncHandler(async (req, res) => {
    const r = await call('auth', 'Register', req.body, { traceId: req.traceId });
    setRefreshCookie(res, r.refreshToken);
    res.status(201).json({
      user: { id: r.userId, email: r.email, role: r.role },
      accessToken: r.accessToken,
      expiresIn: r.accessExpiresIn,
    });
  }),
);

authRouter.post(
  '/login',
  authLimiter,
  validateBody(loginSchema),
  asyncHandler(async (req, res) => {
    const r = await call('auth', 'Login', req.body, { traceId: req.traceId });
    setRefreshCookie(res, r.refreshToken);
    res.json({
      user: { id: r.userId, email: r.email, role: r.role },
      accessToken: r.accessToken,
      expiresIn: r.accessExpiresIn,
    });
  }),
);

authRouter.post(
  '/refresh',
  asyncHandler(async (req, res) => {
    const refreshToken = req.cookies?.[REFRESH_COOKIE] || req.body?.refreshToken;
    const r = await call('auth', 'Refresh', { refreshToken }, { traceId: req.traceId });
    setRefreshCookie(res, r.refreshToken);
    res.json({ accessToken: r.accessToken, expiresIn: r.accessExpiresIn });
  }),
);

authRouter.post(
  '/logout',
  asyncHandler(async (req, res) => {
    const refreshToken = req.cookies?.[REFRESH_COOKIE] || req.body?.refreshToken;
    await call('auth', 'Logout', { refreshToken }, { traceId: req.traceId });
    res.clearCookie(REFRESH_COOKIE, { path: '/api/v1/auth' });
    res.json({ success: true });
  }),
);
