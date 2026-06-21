import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
  firstName: z.string().min(1).max(60),
  lastName: z.string().min(1).max(60),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const updateProfileSchema = z.object({
  firstName: z.string().min(1).max(60).optional(),
  lastName: z.string().min(1).max(60).optional(),
  phone: z.string().min(5).max(20).optional(),
});

export const createWalletSchema = z.object({
  label: z.string().min(1).max(60).optional(),
  currency: z.string().min(2).max(10).optional(),
});

export const createTransactionSchema = z.object({
  fromAddress: z.string().regex(/^0x[0-9a-fA-F]{40}$/, 'Invalid wallet address'),
  toAddress: z.string().regex(/^0x[0-9a-fA-F]{40}$/, 'Invalid wallet address'),
  amount: z.string().regex(/^\d+(\.\d+)?$/, 'Amount must be a positive number'),
  fee: z
    .string()
    .regex(/^\d+(\.\d+)?$/, 'Fee must be a non-negative number')
    .optional(),
});

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  status: z.string().optional(),
});
