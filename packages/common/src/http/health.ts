import express, { Express } from 'express';
import { metricsText } from '../telemetry/metrics';
import type { Logger } from '../logger';

export interface HealthChecks {
  /** Liveness — process is up. Always returns ok unless overridden. */
  liveness?: () => Promise<boolean> | boolean;
  /** Readiness — dependencies (DB, Kafka, Redis) reachable. */
  readiness?: () => Promise<boolean> | boolean;
}

/**
 * Minimal Express app exposing /healthz, /readyz and /metrics. Every service
 * (including the gRPC-only ones) runs this so K8s probes and Prometheus work.
 */
export function createHealthServer(
  serviceName: string,
  port: number,
  logger: Logger,
  checks: HealthChecks = {},
): { app: Express; start: () => void } {
  const app = express();

  app.get('/healthz', async (_req, res) => {
    const ok = checks.liveness ? await checks.liveness() : true;
    res.status(ok ? 200 : 503).json({ service: serviceName, status: ok ? 'ok' : 'down' });
  });

  app.get('/readyz', async (_req, res) => {
    try {
      const ok = checks.readiness ? await checks.readiness() : true;
      res.status(ok ? 200 : 503).json({ service: serviceName, ready: ok });
    } catch (err) {
      res.status(503).json({ service: serviceName, ready: false, error: (err as Error).message });
    }
  });

  app.get('/metrics', async (_req, res) => {
    res.set('Content-Type', 'text/plain; version=0.0.4');
    res.send(await metricsText());
  });

  return {
    app,
    start: () => {
      app.listen(port, () => logger.info({ port }, `${serviceName} health/metrics listening`));
    },
  };
}
