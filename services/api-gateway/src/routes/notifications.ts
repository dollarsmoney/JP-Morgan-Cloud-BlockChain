import { Router } from 'express';
import { asyncHandler, validate } from '@blockchain/common';
import { call } from '../clients';
import { authenticate } from '../middleware/auth';
import { paginationSchema } from '../schemas';

export const notificationsRouter = Router();
notificationsRouter.use(authenticate);

notificationsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const { page, pageSize } = validate(paginationSchema, req.query);
    const unreadOnly = req.query.unreadOnly === 'true';
    const list = await call(
      'notification',
      'ListNotifications',
      { userId: req.auth!.userId, page, pageSize, unreadOnly },
      { auth: req.auth, traceId: req.traceId },
    );
    res.json(list);
  }),
);

notificationsRouter.get(
  '/unread-count',
  asyncHandler(async (req, res) => {
    const r = await call('notification', 'UnreadCount', { userId: req.auth!.userId }, {
      auth: req.auth,
      traceId: req.traceId,
    });
    res.json(r);
  }),
);

notificationsRouter.post(
  '/:id/read',
  asyncHandler(async (req, res) => {
    const r = await call(
      'notification',
      'MarkRead',
      { userId: req.auth!.userId, notificationId: req.params.id },
      { auth: req.auth, traceId: req.traceId },
    );
    res.json(r);
  }),
);

notificationsRouter.post(
  '/read-all',
  asyncHandler(async (req, res) => {
    const r = await call('notification', 'MarkAllRead', { userId: req.auth!.userId }, {
      auth: req.auth,
      traceId: req.traceId,
    });
    res.json(r);
  }),
);
