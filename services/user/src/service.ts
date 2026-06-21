import {
  AppError,
  Topics,
  EventTypes,
  buildEvent,
  publishEvent,
  cacheDel,
  cacheAside,
} from '@blockchain/common';
import { prisma } from './prisma';
import { uploadAvatar } from './storage';
import type { UserProfile } from './generated/prisma';

const CACHE_TTL = 300;
const cacheKey = (userId: string) => `profile:${userId}`;

export async function ensureProfile(input: {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
}): Promise<UserProfile> {
  const profile = await prisma.userProfile.upsert({
    where: { userId: input.userId },
    update: {},
    create: {
      userId: input.userId,
      email: input.email,
      firstName: input.firstName,
      lastName: input.lastName,
    },
  });
  await publishEvent(
    Topics.USER,
    buildEvent(EventTypes.PROFILE_CREATED, { userId: input.userId, email: input.email }, {
      actorId: input.userId,
    }),
    input.userId,
  );
  return profile;
}

export async function getProfile(userId: string): Promise<UserProfile> {
  return cacheAside(cacheKey(userId), CACHE_TTL, async () => {
    const profile = await prisma.userProfile.findUnique({ where: { userId } });
    if (!profile) throw AppError.notFound('Profile not found');
    return profile;
  });
}

export async function updateProfile(
  userId: string,
  data: { firstName?: string; lastName?: string; phone?: string },
): Promise<UserProfile> {
  const existing = await prisma.userProfile.findUnique({ where: { userId } });
  if (!existing) throw AppError.notFound('Profile not found');

  const updated = await prisma.userProfile.update({
    where: { userId },
    data: {
      firstName: data.firstName ?? existing.firstName,
      lastName: data.lastName ?? existing.lastName,
      phone: data.phone ?? existing.phone,
    },
  });
  await cacheDel(cacheKey(userId));
  await publishEvent(
    Topics.USER,
    buildEvent(EventTypes.PROFILE_UPDATED, { userId }, { actorId: userId }),
    userId,
  );
  return updated;
}

export async function setAvatar(
  userId: string,
  image: Buffer,
  contentType?: string,
): Promise<UserProfile> {
  const existing = await prisma.userProfile.findUnique({ where: { userId } });
  if (!existing) throw AppError.notFound('Profile not found');

  const avatarUrl = await uploadAvatar(userId, image, contentType);
  const updated = await prisma.userProfile.update({ where: { userId }, data: { avatarUrl } });
  await cacheDel(cacheKey(userId));
  return updated;
}
