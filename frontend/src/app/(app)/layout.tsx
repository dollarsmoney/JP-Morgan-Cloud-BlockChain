'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import { DashboardNav } from '@/components/dashboard-nav';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);
  const initialized = useAuthStore((s) => s.initialized);

  useEffect(() => {
    if (initialized && !accessToken) router.replace('/login');
  }, [initialized, accessToken, router]);

  if (!accessToken) return null;

  return (
    <div className="flex h-screen overflow-hidden">
      <DashboardNav />
      <main className="flex-1 overflow-y-auto bg-background">
        <div className="mx-auto max-w-6xl p-8">{children}</div>
      </main>
    </div>
  );
}
