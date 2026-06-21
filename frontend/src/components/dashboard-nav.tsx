'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, Wallet, Send, ListOrdered, Bell, LogOut } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { useUnreadCount } from '@/lib/queries';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

const links = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/wallets', label: 'Wallets', icon: Wallet },
  { href: '/send', label: 'Send', icon: Send },
  { href: '/transactions', label: 'Transactions', icon: ListOrdered },
  { href: '/notifications', label: 'Notifications', icon: Bell },
];

export function DashboardNav() {
  const pathname = usePathname();
  const router = useRouter();
  const clear = useAuthStore((s) => s.clear);
  const user = useAuthStore((s) => s.user);
  const { data: unread } = useUnreadCount();

  async function logout() {
    try {
      await api.post('/auth/logout');
    } catch {
      /* ignore */
    }
    clear();
    router.replace('/login');
  }

  return (
    <aside className="flex w-64 flex-col border-r bg-card">
      <div className="flex h-16 items-center gap-2 border-b px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold">
          B
        </div>
        <span className="font-semibold">BlockChain Fintech</span>
      </div>
      <nav className="flex-1 space-y-1 p-4">
        {links.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
              )}
            >
              <Icon className="h-4 w-4" />
              <span className="flex-1">{label}</span>
              {label === 'Notifications' && !!unread && (
                <Badge variant={active ? 'secondary' : 'destructive'}>{unread}</Badge>
              )}
            </Link>
          );
        })}
      </nav>
      <div className="border-t p-4">
        <div className="mb-3 px-2 text-xs text-muted-foreground truncate">{user?.email}</div>
        <button
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
