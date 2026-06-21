import { startTracing } from '@blockchain/common';
import { config } from './config';

// Must be imported first in index.ts so OpenTelemetry can patch http/grpc/etc.
startTracing(config.serviceName);
