'use client';
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Wallet, ArrowLeftRight, CheckCircle2, Boxes } from 'lucide-react';
import { useAnalytics, useTransactions } from '@/lib/queries';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge, statusVariant } from '@/components/ui/badge';
import { formatAmount, formatDate, shortAddress } from '@/lib/utils';

function Stat({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-6">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-6 w-6" />
        </div>
        <div>
          <div className="text-sm text-muted-foreground">{label}</div>
          <div className="text-2xl font-bold">{value}</div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { data: a } = useAnalytics();
  const { data: history } = useTransactions(1, 5);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your wallets and blockchain activity.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={Wallet} label="Total balance" value={formatAmount(a?.wallets.totalBalance ?? 0)} />
        <Stat icon={ArrowLeftRight} label="Transactions" value={String(a?.transactions.total ?? 0)} />
        <Stat icon={CheckCircle2} label="Confirmed" value={String(a?.transactions.confirmed ?? 0)} />
        <Stat icon={Boxes} label="Block height" value={String(a?.blockchain.height ?? 0)} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Transaction activity (7 days)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={a?.series ?? []}>
                <defs>
                  <linearGradient id="vol" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(244 75% 57%)" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="hsl(244 75% 57%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis tickLine={false} axisLine={false} fontSize={12} width={32} />
                <Tooltip />
                <Area type="monotone" dataKey="count" stroke="hsl(244 75% 57%)" fill="url(#vol)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent transactions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {(history?.transactions ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground">No transactions yet.</p>
          )}
          {(history?.transactions ?? []).map((tx) => (
            <div key={tx.id} className="flex items-center justify-between border-b pb-3 last:border-0">
              <div>
                <div className="font-medium">{shortAddress(tx.toAddress)}</div>
                <div className="text-xs text-muted-foreground">{formatDate(tx.createdAt)}</div>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-semibold">{formatAmount(tx.amount)}</span>
                <Badge variant={statusVariant(tx.status)}>{tx.status}</Badge>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
