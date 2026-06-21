'use client';
import { useState } from 'react';
import { useTransactions } from '@/lib/queries';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge, statusVariant } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatAmount, formatDate, shortAddress } from '@/lib/utils';

export default function TransactionsPage() {
  const [page, setPage] = useState(1);
  const pageSize = 15;
  const { data, isLoading } = useTransactions(page, pageSize);
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Transactions</h1>
        <p className="text-muted-foreground">Your transaction history and live status.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>History</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>To</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Fee</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Block</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    Loading…
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && (data?.transactions ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No transactions yet.
                  </TableCell>
                </TableRow>
              )}
              {data?.transactions?.map((tx) => (
                <TableRow key={tx.id}>
                  <TableCell className="font-mono text-xs">{shortAddress(tx.toAddress)}</TableCell>
                  <TableCell className="font-medium">{formatAmount(tx.amount)}</TableCell>
                  <TableCell>{formatAmount(tx.fee)}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(tx.status)}>{tx.status}</Badge>
                  </TableCell>
                  <TableCell>{tx.blockIndex ?? '—'}</TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(tx.createdAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="mt-4 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              Page {page} of {totalPages} · {total} total
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Previous
              </Button>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
