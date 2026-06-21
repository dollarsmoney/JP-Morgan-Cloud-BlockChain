'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Send } from 'lucide-react';
import { useCreateTransaction, useWallets } from '@/lib/queries';
import { apiErrorMessage } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatAmount } from '@/lib/utils';

export default function SendPage() {
  const router = useRouter();
  const { data: wallets } = useWallets();
  const createTx = useCreateTransaction();
  const [fromAddress, setFromAddress] = useState('');
  const [toAddress, setToAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [fee, setFee] = useState('0');

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await createTx.mutateAsync({ fromAddress, toAddress, amount, fee: fee || '0' });
      toast.success('Transaction submitted — awaiting confirmation');
      router.push('/transactions');
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  }

  const selected = wallets?.find((w) => w.address === fromAddress);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Send</h1>
        <p className="text-muted-foreground">Transfer tokens to another wallet address.</p>
      </div>

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>New transaction</CardTitle>
          <CardDescription>Mined into a block and confirmed automatically.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="from">From wallet</Label>
              <select
                id="from"
                required
                value={fromAddress}
                onChange={(e) => setFromAddress(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Select a wallet…</option>
                {wallets?.map((w) => (
                  <option key={w.id} value={w.address}>
                    {w.label} — {formatAmount(w.balance, w.currency)}
                  </option>
                ))}
              </select>
              {selected && (
                <p className="text-xs text-muted-foreground">
                  Available: {formatAmount(selected.balance, selected.currency)}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="to">To address</Label>
              <Input id="to" required placeholder="0x…" value={toAddress} onChange={(e) => setToAddress(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount</Label>
                <Input id="amount" required inputMode="decimal" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fee">Fee</Label>
                <Input id="fee" inputMode="decimal" value={fee} onChange={(e) => setFee(e.target.value)} />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={createTx.isPending}>
              <Send className="h-4 w-4" />
              {createTx.isPending ? 'Submitting…' : 'Send transaction'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
