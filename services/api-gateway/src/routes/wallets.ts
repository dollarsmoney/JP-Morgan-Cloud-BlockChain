import { Router } from 'express';
import { asyncHandler, validateBody } from '@blockchain/common';
import { call } from '../clients';
import { authenticate } from '../middleware/auth';
import { createWalletSchema } from '../schemas';

export const walletsRouter = Router();
walletsRouter.use(authenticate);

walletsRouter.post(
  '/',
  validateBody(createWalletSchema),
  asyncHandler(async (req, res) => {
    const wallet = await call(
      'wallet',
      'CreateWallet',
      { userId: req.auth!.userId, ...req.body },
      { auth: req.auth, traceId: req.traceId },
    );
    res.status(201).json(wallet);
  }),
);

walletsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const list = await call('wallet', 'ListWallets', { userId: req.auth!.userId }, {
      auth: req.auth,
      traceId: req.traceId,
    });
    res.json(list);
  }),
);

walletsRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const wallet = await call(
      'wallet',
      'GetWallet',
      { userId: req.auth!.userId, walletId: req.params.id },
      { auth: req.auth, traceId: req.traceId },
    );
    res.json(wallet);
  }),
);

walletsRouter.get(
  '/:id/balance',
  asyncHandler(async (req, res) => {
    const wallet = await call(
      'wallet',
      'GetWallet',
      { userId: req.auth!.userId, walletId: req.params.id },
      { auth: req.auth, traceId: req.traceId },
    );
    const balance = await call('wallet', 'GetBalance', { address: wallet.address }, {
      auth: req.auth,
      traceId: req.traceId,
    });
    res.json(balance);
  }),
);
