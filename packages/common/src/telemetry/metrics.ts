import client from 'prom-client';

/** One shared registry per process. Services expose it at GET /metrics. */
export const registry = new client.Registry();

let initialised = false;

export function initMetrics(serviceName: string): void {
  if (initialised) return;
  initialised = true;
  registry.setDefaultLabels({ service: serviceName });
  client.collectDefaultMetrics({ register: registry });
}

export const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status'] as const,
  buckets: [0.005, 0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
  registers: [registry],
});

export const grpcRequestDuration = new client.Histogram({
  name: 'grpc_request_duration_seconds',
  help: 'gRPC request duration in seconds',
  labelNames: ['method', 'status'] as const,
  buckets: [0.005, 0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
  registers: [registry],
});

export const eventsConsumed = new client.Counter({
  name: 'kafka_events_consumed_total',
  help: 'Total Kafka events consumed',
  labelNames: ['topic', 'type', 'result'] as const,
  registers: [registry],
});

export const businessCounter = new client.Counter({
  name: 'business_events_total',
  help: 'Domain/business events (tx created, blocks mined, etc.)',
  labelNames: ['name'] as const,
  registers: [registry],
});

export async function metricsText(): Promise<string> {
  return registry.metrics();
}

export { client as promClient };
