import { intEnv, optionalEnv } from '@blockchain/common';

export const config = {
  serviceName: 'user-service',
  grpcAddr: optionalEnv('USER_GRPC_ADDR', '0.0.0.0:50052'),
  httpPort: intEnv('USER_HTTP_PORT', 5052),
  supabase: {
    url: optionalEnv('SUPABASE_URL', ''),
    // service_role key bypasses RLS — required to write to Storage from the backend.
    serviceRoleKey: optionalEnv('SUPABASE_SERVICE_ROLE_KEY', ''),
    avatarBucket: optionalEnv('SUPABASE_AVATAR_BUCKET', 'avatars'),
  },
};

export const storageConfigured = (): boolean =>
  Boolean(config.supabase.url && config.supabase.serviceRoleKey);
