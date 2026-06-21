import { Router } from 'express';
import { asyncHandler, validate } from '@blockchain/common';
import { call } from '../clients';
import { authenticate, requireRole } from '../middleware/auth';
import { paginationSchema } from '../schemas';

export const auditRouter = Router();
auditRouter.use(authenticate, requireRole('ADMIN'));

auditRouter.get(
  '/logs',
  asyncHandler(async (req, res) => {
    const { page, pageSize } = validate(paginationSchema, req.query);
    const logs = await call(
      'audit',
      'QueryLogs',
      {
        actorId: (req.query.actorId as string) ?? '',
        service: (req.query.service as string) ?? '',
        action: (req.query.action as string) ?? '',
        page,
        pageSize,
      },
      { auth: req.auth, traceId: req.traceId },
    );
    res.json(logs);
  }),
);
