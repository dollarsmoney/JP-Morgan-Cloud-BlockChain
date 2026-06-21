import pino, { Logger } from 'pino';
import { optionalEnv, isProduction } from '../config/env';

/**
 * Structured JSON logger (pino). In production we emit raw JSON to stdout so the
 * cluster log shipper (Promtail/Grafana Agent) forwards it to Loki. Locally we
 * keep JSON too (docker-compose logs) but at a friendlier level.
 */
export function createLogger(service: string): Logger {
  return pino({
    name: service,
    level: optionalEnv('LOG_LEVEL', isProduction() ? 'info' : 'debug'),
    base: {
      service,
      env: optionalEnv('NODE_ENV', 'development'),
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: {
      level: (label) => ({ level: label }),
    },
    redact: {
      paths: [
        'req.headers.authorization',
        'password',
        'passwordHash',
        '*.password',
        '*.passwordHash',
        'token',
        'refreshToken',
        'accessToken',
      ],
      censor: '[REDACTED]',
    },
  });
}

export type { Logger };
