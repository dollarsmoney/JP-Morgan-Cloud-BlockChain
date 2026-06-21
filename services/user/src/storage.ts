import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config, storageConfigured } from './config';

let client: SupabaseClient | null = null;
let bucketEnsured = false;

function getClient(): SupabaseClient {
  if (!client) {
    client = createClient(config.supabase.url, config.supabase.serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}

/** Best-effort create the public avatar bucket once per process. */
async function ensureBucket(c: SupabaseClient): Promise<void> {
  if (bucketEnsured) return;
  const { error } = await c.storage.createBucket(config.supabase.avatarBucket, {
    public: true,
    fileSizeLimit: '2MB',
  });
  // Ignore "already exists"; surface anything else lazily (upload will report it).
  if (error && !/exist/i.test(error.message)) {
    // eslint-disable-next-line no-console
    console.warn('[storage] createBucket warning:', error.message);
  }
  bucketEnsured = true;
}

function extFor(contentType?: string): string {
  switch (contentType) {
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    case 'image/gif':
      return 'gif';
    case 'image/jpeg':
    case 'image/jpg':
      return 'jpg';
    default:
      return 'png';
  }
}

/**
 * Upload raw image bytes to Supabase Storage and return the public URL. Falls
 * back to a deterministic placeholder when storage isn't configured (local dev).
 */
export async function uploadAvatar(
  userId: string,
  image: Buffer,
  contentType?: string,
): Promise<string> {
  if (!storageConfigured()) {
    return `https://placehold.co/256x256?text=${encodeURIComponent(userId.slice(0, 6))}`;
  }

  const c = getClient();
  await ensureBucket(c);

  const path = `${userId}.${extFor(contentType)}`;
  const { error } = await c.storage
    .from(config.supabase.avatarBucket)
    .upload(path, image, {
      contentType: contentType || 'image/png',
      upsert: true,
      cacheControl: '3600',
    });
  if (error) throw new Error(`Avatar upload failed: ${error.message}`);

  const { data } = c.storage.from(config.supabase.avatarBucket).getPublicUrl(path);
  // Bust CDN cache so an updated avatar reflects immediately.
  return `${data.publicUrl}?v=${Date.now()}`;
}
