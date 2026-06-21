import type { NextFunction, Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import { createLogger, httpRequestDuration, type AuthContext } from '@blockchain/common';

const logger = createLogger('api-gateway');

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      traceId: string;
      auth?: AuthContext;
      log: typeof logger;
    }
  }
}

/** Attach a trace id + child logger, and record request duration metrics. */
export function requestContext(req: Request, res: Response, next: NextFunction): void {
  const traceId = (req.headers['x-trace-id'] as string) || uuid();
  req.traceId = traceId;
  req.log = logger.child({ traceId, method: req.method, path: req.path });
  res.setHeader('x-trace-id', traceId);

  const end = httpRequestDuration.startTimer({ method: req.method });
  res.on('finish', () => {
    const route = req.route?.path ? `${req.baseUrl}${req.route.path}` : req.path;
    end({ route, status: res.statusCode });
    req.log.info({ status: res.statusCode }, 'request completed');
  });
  next();
}
