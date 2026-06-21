import Redis from 'ioredis';
import { optionalEnv } from '../config/env';

let client: Redis | null = null;

/** Singleton Redis client (lazy). Used for cache, rate-limiting, refresh-token
 *  store and Kafka idempotency keys. */
export function getRedis(): Redis {
  if (!client) {
    client = new Redis(optionalEnv('REDIS_URL', 'redis://localhost:6379'), {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: false,
      retryStrategy: (times) => Math.min(times * 200, 2000),
    });
    client.on('error', (err) => {
      // eslint-disable-next-line no-console
      console.error('[redis] connection error', err.message);
    });
  }
  return client;
}

export async function closeRedis(): Promise<void> {
  if (client) {
    await client.quit();
    client = null;
  }
}

// ---------- Cache helpers ----------
export async function cacheGet<T>(key: string): Promise<T | null> {
  const raw = await getRedis().get(key);
  return raw ? (JSON.parse(raw) as T) : null;
}

export async function cacheSet(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  await getRedis().set(key, JSON.stringify(value), 'EX', ttlSeconds);
}

export async function cacheDel(...keys: string[]): Promise<void> {
  if (keys.length) await getRedis().del(...keys);
}

/** Cache-aside wrapper: return cached value or compute, store and return it. */
export async function cacheAside<T>(
  key: string,
  ttlSeconds: number,
  producer: () => Promise<T>,
): Promise<T> {
  const cached = await cacheGet<T>(key);
  if (cached !== null) return cached;
  const value = await producer();
  await cacheSet(key, value, ttlSeconds);
  return value;
}

/** Idempotency guard for Kafka consumers. Returns true if this is the first time
 *  we have seen `eventId` (and records it), false if it is a duplicate. */
export async function markEventProcessed(eventId: string, ttlSeconds = 86400): Promise<boolean> {
  const res = await getRedis().set(`evt:${eventId}`, '1', 'EX', ttlSeconds, 'NX');
  return res === 'OK';
}
