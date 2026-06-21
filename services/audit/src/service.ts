import { prisma } from './prisma';
import type { AuditLog, Prisma } from './generated/prisma';

export async function record(input: {
  actorId?: string;
  service: string;
  action: string;
  resource?: string;
  payload?: unknown;
  ip?: string;
}): Promise<void> {
  await prisma.auditLog.create({
    data: {
      actorId: input.actorId ?? null,
      service: input.service,
      action: input.action,
      resource: input.resource ?? null,
      payload: (input.payload ?? {}) as Prisma.InputJsonValue,
      ip: input.ip ?? null,
    },
  });
}

export async function query(filter: {
  actorId?: string;
  service?: string;
  action?: string;
  page?: number;
  pageSize?: number;
}): Promise<{ logs: AuditLog[]; total: number }> {
  const page = filter.page ?? 1;
  const pageSize = filter.pageSize ?? 20;
  const where: Prisma.AuditLogWhereInput = {
    ...(filter.actorId ? { actorId: filter.actorId } : {}),
    ...(filter.service ? { service: filter.service } : {}),
    ...(filter.action ? { action: filter.action } : {}),
  };
  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.auditLog.count({ where }),
  ]);
  return { logs, total };
}
