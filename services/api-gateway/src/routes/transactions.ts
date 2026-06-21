import { Router } from 'express';
import { asyncHandler, validateBody, validate } from '@blockchain/common';
import { call } from '../clients';
import { authenticate } from '../middleware/auth';
import { createTransactionSchema, paginationSchema } from '../schemas';

export const transactionsRouter = Router();
transactionsRouter.use(authenticate);

transactionsRouter.post(
  '/',
  validateBody(createTransactionSchema),
  asyncHandler(async (req, res) => {
    const tx = await call(
      'transaction',
      'CreateTransaction',
      { userId: req.auth!.userId, ...req.body },
      { auth: req.auth, traceId: req.traceId },
    );
    res.status(201).json(tx);
  }),
);

transactionsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const { page, pageSize, status } = validate(paginationSchema, req.query);
    const list = await call(
      'transaction',
      'ListHistory',
      { userId: req.auth!.userId, page, pageSize, status: status ?? '' },
      { auth: req.auth, traceId: req.traceId },
    );
    res.json(list);
  }),
);

transactionsRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const tx = await call(
      'transaction',
      'GetTransaction',
      { userId: req.auth!.userId, transactionId: req.params.id },
      { auth: req.auth, traceId: req.traceId },
    );
    res.json(tx);
  }),
);

transactionsRouter.get(
  '/:id/status',
  asyncHandler(async (req, res) => {
    const status = await call(
      'transaction',
      'GetStatus',
      { userId: req.auth!.userId, transactionId: req.params.id },
      { auth: req.auth, traceId: req.traceId },
    );
    res.json(status);
  }),
);
