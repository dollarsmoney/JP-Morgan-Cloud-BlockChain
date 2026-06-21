import { Router } from 'express';
import multer from 'multer';
import { asyncHandler, validateBody, AppError } from '@blockchain/common';
import { call } from '../clients';
import { authenticate } from '../middleware/auth';
import { updateProfileSchema } from '../schemas';

const upload = multer({ limits: { fileSize: 2 * 1024 * 1024 } }); // 2MB

export const usersRouter = Router();
usersRouter.use(authenticate);

usersRouter.get(
  '/me',
  asyncHandler(async (req, res) => {
    const profile = await call('user', 'GetProfile', { userId: req.auth!.userId }, {
      auth: req.auth,
      traceId: req.traceId,
    });
    res.json(profile);
  }),
);

usersRouter.patch(
  '/me',
  validateBody(updateProfileSchema),
  asyncHandler(async (req, res) => {
    const profile = await call(
      'user',
      'UpdateProfile',
      { userId: req.auth!.userId, ...req.body },
      { auth: req.auth, traceId: req.traceId },
    );
    res.json(profile);
  }),
);

usersRouter.post(
  '/me/avatar',
  upload.single('avatar'),
  asyncHandler(async (req, res) => {
    if (!req.file) throw AppError.validation('No avatar file uploaded (field name: avatar)');
    const profile = await call(
      'user',
      'UploadAvatar',
      { userId: req.auth!.userId, image: req.file.buffer, contentType: req.file.mimetype },
      { auth: req.auth, traceId: req.traceId },
    );
    res.json(profile);
  }),
);
