'use client';
import { Bell, Check } from 'lucide-react';
import { useMarkNotificationRead, useNotifications } from '@/lib/queries';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn, formatDate } from '@/lib/utils';

export default function NotificationsPage() {
  const { data, isLoading } = useNotifications();
  const markRead = useMarkNotificationRead();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
        <p className="text-muted-foreground">Updates about your account and transactions.</p>
      </div>

      <div className="space-y-3">
        {isLoading && <p className="text-muted-foreground">Loading…</p>}
        {!isLoading && (data?.notifications ?? []).length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center gap-2 p-10 text-center text-muted-foreground">
              <Bell className="h-8 w-8" />
              <p>You&apos;re all caught up.</p>
            </CardContent>
          </Card>
        )}
        {data?.notifications?.map((n) => (
          <Card key={n.id} className={cn(!n.read && 'border-primary/40 bg-primary/5')}>
            <CardContent className="flex items-start justify-between gap-4 p-4">
              <div className="flex gap-3">
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Bell className="h-4 w-4" />
                </div>
                <div>
                  <div className="font-medium">{n.title}</div>
                  <div className="text-sm text-muted-foreground">{n.body}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{formatDate(n.createdAt)}</div>
                </div>
              </div>
              {!n.read && (
                <Button variant="ghost" size="sm" onClick={() => markRead.mutate(n.id)}>
                  <Check className="h-4 w-4" />
                  Mark read
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
