import { startTracing } from '@blockchain/common';
import { config } from './config';

startTracing(config.serviceName);
