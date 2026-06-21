import express, { Express } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import swaggerUi from 'swagger-ui-express';
import { errorHandler, metricsText } from '@blockchain/common';
import { config } from './config';
import { requestContext } from './middleware/context';
import { apiLimiter } from './middleware/rateLimit';
import { openapiSpec } from './openapi';
import { authRouter } from './routes/auth';
import { usersRouter } from './routes/users';
import { walletsRouter } from './routes/wallets';
import { transactionsRouter } from './routes/transactions';
import { blockchainRouter } from './routes/blockchain';
import { notificationsRouter } from './routes/notifications';
import { analyticsRouter } from './routes/analytics';
import { auditRouter } from './routes/audit';

export function buildApp(): Express {
  const app = express();

  app.set('trust proxy', 1);
  app.use(helmet());
  app.use(
    cors({
      origin: config.corsOrigins,
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    }),
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  app.use(cookieParser());
  app.use(requestContext);

  // Operational endpoints (no rate limit).
  app.get('/healthz', (_req, res) => res.json({ service: config.serviceName, status: 'ok' }));
  app.get('/readyz', (_req, res) => res.json({ service: config.serviceName, ready: true }));
  app.get('/metrics', async (_req, res) => {
    res.set('Content-Type', 'text/plain; version=0.0.4');
    res.send(await metricsText());
  });

  // API docs.
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(openapiSpec));
  app.get('/openapi.json', (_req, res) => res.json(openapiSpec));

  // Versioned API (rate-limited).
  const api = express.Router();
  api.use(apiLimiter);
  api.use('/auth', authRouter);
  api.use('/users', usersRouter);
  api.use('/wallets', walletsRouter);
  api.use('/transactions', transactionsRouter);
  api.use('/blockchain', blockchainRouter);
  api.use('/notifications', notificationsRouter);
  api.use('/analytics', analyticsRouter);
  api.use('/audit', auditRouter);
  app.use('/api/v1', api);

  app.use((_req, res) => res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Route not found' } }));
  app.use(errorHandler(config.serviceName));

  return app;
}
