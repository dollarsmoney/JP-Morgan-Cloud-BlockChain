import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { getRedis, ErrorCode } from '@blockchain/common';
import { config } from '../config';

/** Distributed rate limiter backed by Redis so limits hold across gateway
 *  replicas. Stricter on auth endpoints to slow brute-force attempts. */
export const apiLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sendCommand: (...args: string[]) => (getRedis() as any).call(...args),
  }),
  handler: (_req, res) => {
    res.status(429).json({
      error: { code: ErrorCode.RATE_LIMITED, message: 'Too many requests, please slow down' },
    });
  },
});

export const authLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: Math.max(5, Math.floor(config.rateLimit.max / 10)),
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sendCommand: (...args: string[]) => (getRedis() as any).call(...args),
  }),
  handler: (_req, res) => {
    res.status(429).json({
      error: { code: ErrorCode.RATE_LIMITED, message: 'Too many authentication attempts' },
    });
  },
});
