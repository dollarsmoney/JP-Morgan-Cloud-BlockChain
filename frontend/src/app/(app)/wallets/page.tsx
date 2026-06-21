'use client';
import { useState } from 'react';
import { toast } from 'sonner';
import { Copy, Plus, Wallet as WalletIcon } from 'lucide-react';
import { useCreateWallet, useWallets } from '@/lib/queries';
import { apiErrorMessage } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge, statusVariant } from '@/components/ui/badge';
import { formatAmount, shortAddress } from '@/lib/utils';

export default function WalletsPage() {
  const { data: wallets, isLoading } = useWallets();
  const createWallet = useCreateWallet();
  const [label, setLabel] = useState('');

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    try {
      await createWallet.mutateAsync({ label: label || undefined });
      setLabel('');
      toast.success('Wallet created');
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  }

  function copy(text: string) {
    navigator.clipboard.writeText(text);
    toast.success('Address copied');
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Wallets</h1>
        <p className="text-muted-foreground">Create and manage your blockchain wallets.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>New wallet</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onCreate} className="flex items-end gap-3">
            <div className="flex-1 space-y-2">
              <Label htmlFor="label">Label</Label>
              <Input id="label" placeholder="e.g. Savings" value={label} onChange={(e) => setLabel(e.target.value)} />
            </div>
            <Button type="submit" disabled={createWallet.isPending}>
              <Plus className="h-4 w-4" />
              {createWallet.isPending ? 'Creating…' : 'Create'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        {isLoading && <p className="text-muted-foreground">Loading wallets…</p>}
        {wallets?.length === 0 && <p className="text-muted-foreground">No wallets yet. Create one above.</p>}
        {wallets?.map((w) => (
          <Card key={w.id}>
            <CardContent className="space-y-4 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <WalletIcon className="h-5 w-5" />
                  </div>
                  <span className="font-medium">{w.label}</span>
                </div>
                <Badge variant={statusVariant(w.status)}>{w.status}</Badge>
              </div>
              <div className="text-3xl font-bold">{formatAmount(w.balance, w.currency)}</div>
              <button
                onClick={() => copy(w.address)}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
              >
                <span className="font-mono">{shortAddress(w.address)}</span>
                <Copy className="h-3.5 w-3.5" />
              </button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
