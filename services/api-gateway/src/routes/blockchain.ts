import { Router } from 'express';
import { asyncHandler } from '@blockchain/common';
import { call } from '../clients';
import { authenticate, requireRole } from '../middleware/auth';

export const blockchainRouter = Router();
blockchainRouter.use(authenticate);

blockchainRouter.get(
  '/chain',
  asyncHandler(async (req, res) => {
    const limit = req.query.limit ? Number(req.query.limit) : 0;
    const chain = await call('blockchain', 'GetChain', { limit }, { traceId: req.traceId });
    res.json(chain);
  }),
);

blockchainRouter.get(
  '/blocks/:index',
  asyncHandler(async (req, res) => {
    const block = await call(
      'blockchain',
      'GetBlock',
      { index: Number(req.params.index) },
      { traceId: req.traceId },
    );
    res.json(block);
  }),
);

blockchainRouter.get(
  '/validate',
  asyncHandler(async (req, res) => {
    const result = await call('blockchain', 'ValidateChain', {}, { traceId: req.traceId });
    res.json(result);
  }),
);

// Manual mining is an administrative action.
blockchainRouter.post(
  '/mine',
  requireRole('ADMIN'),
  asyncHandler(async (req, res) => {
    const block = await call(
      'blockchain',
      'MineBlock',
      { minerAddress: req.body?.minerAddress ?? '' },
      { auth: req.auth, traceId: req.traceId },
    );
    res.json(block);
  }),
);
