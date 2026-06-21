import { Router } from 'express';
import { asyncHandler } from '@blockchain/common';
import { call } from '../clients';
import { authenticate } from '../middleware/auth';

export const analyticsRouter = Router();
analyticsRouter.use(authenticate);

/** Dashboard summary aggregated across Wallet, Transaction and Blockchain. */
analyticsRouter.get(
  '/summary',
  asyncHandler(async (req, res) => {
    const ctx = { auth: req.auth, traceId: req.traceId };
    const userId = req.auth!.userId;

    const [wallets, history, chain] = await Promise.all([
      call('wallet', 'ListWallets', { userId }, ctx),
      call('transaction', 'ListHistory', { userId, page: 1, pageSize: 100 }, ctx),
      call('blockchain', 'GetChain', { limit: 0 }, ctx),
    ]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const txs: any[] = history.transactions ?? [];
    const totalBalance = (wallets.wallets ?? []).reduce(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (sum: number, w: any) => sum + Number(w.balance),
      0,
    );
    const confirmed = txs.filter((t) => t.status === 'CONFIRMED');
    const pending = txs.filter((t) => t.status === 'PENDING');
    const sent = txs.filter((t) => wallets.wallets?.some((w: { address: string }) => w.address === t.fromAddress));
    const volume = confirmed.reduce((s, t) => s + Number(t.amount), 0);

    // Build a 7-day transaction count series for the chart.
    const series = buildDailySeries(txs);

    res.json({
      wallets: { count: wallets.wallets?.length ?? 0, totalBalance },
      transactions: {
        total: history.total ?? txs.length,
        confirmed: confirmed.length,
        pending: pending.length,
        sent: sent.length,
        volume,
      },
      blockchain: { height: chain.length ?? 0 },
      series,
    });
  }),
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildDailySeries(txs: any[]): Array<{ date: string; count: number; volume: number }> {
  const days: Array<{ date: string; count: number; volume: number }> = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const dayTxs = txs.filter((t) => (t.createdAt ?? '').slice(0, 10) === key);
    days.push({
      date: key,
      count: dayTxs.length,
      volume: dayTxs.reduce((s, t) => s + Number(t.amount), 0),
    });
  }
  return days;
}
