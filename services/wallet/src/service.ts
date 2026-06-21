import {
  AppError,
  Topics,
  EventTypes,
  buildEvent,
  publishEvent,
  generateKeyPair,
  cacheDel,
  businessCounter,
  createLogger,
} from '@blockchain/common';
import { prisma } from './prisma';
import { config } from './config';
import { Prisma } from './generated/prisma';
import type { Wallet } from './generated/prisma';

const log = createLogger('wallet-service');

export async function createWallet(input: {
  userId: string;
  label?: string;
  currency?: string;
}): Promise<Wallet> {
  const { publicKey, address } = generateKeyPair();
  const wallet = await prisma.wallet.create({
    data: {
      userId: input.userId,
      address,
      publicKey,
      label: input.label || 'Primary Wallet',
      currency: input.currency || config.defaultCurrency,
      balance: new Prisma.Decimal(config.initialBalance),
    },
  });

  await publishEvent(
    Topics.WALLET,
    buildEvent(
      EventTypes.WALLET_CREATED,
      { walletId: wallet.id, userId: input.userId, address, balance: config.initialBalance },
      { actorId: input.userId },
    ),
    input.userId,
  );
  businessCounter.inc({ name: 'wallet_created' });
  log.info({ userId: input.userId, address }, 'Wallet created');
  return wallet;
}

export async function listWallets(userId: string): Promise<Wallet[]> {
  return prisma.wallet.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } });
}

export async function getWallet(userId: string, walletId: string): Promise<Wallet> {
  const wallet = await prisma.wallet.findUnique({ where: { id: walletId } });
  if (!wallet || wallet.userId !== userId) throw AppError.notFound('Wallet not found');
  return wallet;
}

export async function getBalanceByAddress(
  address: string,
): Promise<{ address: string; balance: string; currency: string }> {
  const wallet = await prisma.wallet.findUnique({ where: { address } });
  if (!wallet) throw AppError.notFound('Wallet not found');
  return { address, balance: wallet.balance.toString(), currency: wallet.currency };
}

/**
 * Apply the effects of a mined block to local wallets: debit senders
 * (amount + fee) and credit receivers (amount). External addresses (SYSTEM,
 * miner, off-platform) are silently ignored via updateMany.
 */
export async function applyBlock(
  transactions: Array<{ sender: string; receiver: string; amount: string; fee: string }>,
): Promise<void> {
  const touched = new Set<string>();

  await prisma.$transaction(async (tx) => {
    for (const t of transactions) {
      const amount = new Prisma.Decimal(t.amount);
      const fee = new Prisma.Decimal(t.fee || '0');

      const debit = await tx.wallet.updateMany({
        where: { address: t.sender },
        data: { balance: { decrement: amount.add(fee) } },
      });
      if (debit.count > 0) touched.add(t.sender);

      const credit = await tx.wallet.updateMany({
        where: { address: t.receiver },
        data: { balance: { increment: amount } },
      });
      if (credit.count > 0) touched.add(t.receiver);
    }
  });

  // Invalidate cache + announce new balances.
  for (const address of touched) {
    await cacheDel(`balance:${address}`);
    const wallet = await prisma.wallet.findUnique({ where: { address } });
    if (wallet) {
      await publishEvent(
        Topics.WALLET,
        buildEvent(
          EventTypes.WALLET_BALANCE_UPDATED,
          { userId: wallet.userId, address, balance: wallet.balance.toString() },
          { actorId: wallet.userId },
        ),
        wallet.userId,
      );
    }
  }
  if (touched.size > 0) log.info({ wallets: touched.size }, 'Balances updated from mined block');
}
