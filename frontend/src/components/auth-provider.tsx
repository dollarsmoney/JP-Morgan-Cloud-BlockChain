'use client';
import { useEffect } from 'react';
import axios from 'axios';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';

const baseURL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api/v1';

/** On first mount, try to restore the session using the httpOnly refresh cookie,
 *  then load the user's profile so role-based UI works. */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setAuth, setUser, setInitialized, initialized } = useAuthStore();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await axios.post(`${baseURL}/auth/refresh`, {}, { withCredentials: true });
        if (cancelled) return;
        setAuth(res.data.accessToken);
        const profile = await api.get('/users/me');
        if (cancelled) return;
        setUser({ id: profile.data.userId, email: profile.data.email, role: 'USER' });
      } catch {
        // Not logged in — that's fine.
      } finally {
        if (!cancelled) setInitialized(true);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!initialized) {
    return (
      <div className="flex h-screen items-center justify-center text-muted-foreground">
        Loading…
      </div>
    );
  }
  return <>{children}</>;
}
