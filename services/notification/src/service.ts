import { AppError } from '@blockchain/common';
import { prisma } from './prisma';
import type { Notification, Prisma } from './generated/prisma';

export async function create(input: {
  userId: string;
  type: string;
  title: string;
  body: string;
  metadata?: Record<string, unknown>;
}): Promise<Notification> {
  return prisma.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body,
      metadata: (input.metadata ?? {}) as Prisma.InputJsonValue,
    },
  });
}

export async function list(
  userId: string,
  page = 1,
  pageSize = 20,
  unreadOnly = false,
): Promise<{ notifications: Notification[]; total: number }> {
  const where = { userId, ...(unreadOnly ? { read: false } : {}) };
  const [notifications, total] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.notification.count({ where }),
  ]);
  return { notifications, total };
}

export async function markRead(userId: string, id: string): Promise<Notification> {
  const n = await prisma.notification.findUnique({ where: { id } });
  if (!n || n.userId !== userId) throw AppError.notFound('Notification not found');
  return prisma.notification.update({ where: { id }, data: { read: true } });
}

export async function markAllRead(userId: string): Promise<number> {
  const r = await prisma.notification.updateMany({
    where: { userId, read: false },
    data: { read: true },
  });
  return r.count;
}

export async function unreadCount(userId: string): Promise<number> {
  return prisma.notification.count({ where: { userId, read: false } });
}
