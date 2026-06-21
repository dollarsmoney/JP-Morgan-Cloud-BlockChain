import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
import {
  SEMRESATTRS_SERVICE_NAME,
  SEMRESATTRS_SERVICE_NAMESPACE,
} from '@opentelemetry/semantic-conventions';
import { optionalEnv, boolEnv } from '../config/env';

let sdk: NodeSDK | null = null;

/**
 * Initialise OpenTelemetry tracing. Must be called BEFORE any other imports that
 * you want auto-instrumented (http, express, grpc, kafkajs, pg/prisma). In
 * services this is the first line of a dedicated `tracing.ts` required via
 * `node -r`.
 */
export function startTracing(serviceName: string): void {
  if (sdk || boolEnv('OTEL_DISABLED', false)) return;

  const exporter = new OTLPTraceExporter({
    url: `${optionalEnv('OTEL_EXPORTER_OTLP_ENDPOINT', 'http://localhost:4318')}/v1/traces`,
  });

  sdk = new NodeSDK({
    resource: new Resource({
      [SEMRESATTRS_SERVICE_NAME]: serviceName,
      [SEMRESATTRS_SERVICE_NAMESPACE]: optionalEnv('OTEL_SERVICE_NAMESPACE', 'blockchain-fintech'),
    }),
    traceExporter: exporter,
    instrumentations: [
      getNodeAutoInstrumentations({
        '@opentelemetry/instrumentation-fs': { enabled: false },
      }),
    ],
  });

  sdk.start();

  process.on('SIGTERM', () => {
    sdk?.shutdown().finally(() => process.exit(0));
  });
}
