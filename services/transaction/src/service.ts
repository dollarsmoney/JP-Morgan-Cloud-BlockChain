import { v4 as uuid } from 'uuid';
import {
  AppError,
  Topics,
  EventTypes,
  buildEvent,
  publishEvent,
  sha256,
  businessCounter,
  createLogger,
} from '@blockchain/common';
import { prisma } from './prisma';
import { getWalletBalance } from './clients';
import { Prisma } from './generated/prisma';
import type { Transaction, TxStatus } from './generated/prisma';

const log = createLogger('transaction-service');

export async function createTransaction(input: {
  userId: string;
  fromAddress: string;
  toAddress: string;
  amount: string;
  fee?: string;
}): Promise<Transaction> {
  const amount = new Prisma.Decimal(input.amount);
  const fee = new Prisma.Decimal(input.fee || '0');

  if (amount.lte(0)) throw AppError.validation('Amount must be greater than zero');
  if (input.fromAddress === input.toAddress) {
    throw AppError.validation('Sender and receiver cannot be the same address');
  }

  // Synchronous balance check against the Wallet service.
  const balance = await getWalletBalance(input.fromAddress);
  if (balance < amount.add(fee).toNumber()) {
    throw AppError.insufficientFunds(
      `Balance ${balance} is insufficient for amount ${amount.toString()} + fee ${fee.toString()}`,
    );
  }

  const timestamp = new Date().toISOString();
  const txHash = sha256(
    `${input.fromAddress}|${input.toAddress}|${amount.toString()}|${fee.toString()}|${timestamp}|${uuid()}`,
  );

  const transaction = await prisma.transaction.create({
    data: {
      userId: input.userId,
      fromAddress: input.fromAddress,
      toAddress: input.toAddress,
      amount,
      fee,
      txHash,
      status: 'PENDING',
    },
  });

  await publishEvent(
    Topics.TRANSACTION,
    buildEvent(
      EventTypes.TX_CREATED,
      {
        transactionId: transaction.id,
        userId: input.userId,
        fromAddress: input.fromAddress,
        toAddress: input.toAddress,
        amount: amount.toString(),
        fee: fee.toString(),
        txHash,
      },
      { actorId: input.userId },
    ),
    input.userId,
  );

  businessCounter.inc({ name: 'tx_created' });
  log.info({ txHash, userId: input.userId }, 'Transaction created (PENDING)');
  return transaction;
}

export async function getTransaction(userId: string, id: string): Promise<Transaction> {
  const tx = await prisma.transaction.findUnique({ where: { id } });
  if (!tx || tx.userId !== userId) throw AppError.notFound('Transaction not found');
  return tx;
}

export async function listHistory(
  userId: string,
  page = 1,
  pageSize = 20,
  status?: string,
): Promise<{ transactions: Transaction[]; total: number; page: number; pageSize: number }> {
  const where = {
    userId,
    ...(status ? { status: status as TxStatus } : {}),
  };
  const [transactions, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.transaction.count({ where }),
  ]);
  return { transactions, total, page, pageSize };
}

export async function getStatus(
  userId: string,
  id: string,
): Promise<{ transactionId: string; status: string; confirmations: number }> {
  const tx = await getTransaction(userId, id);
  return {
    transactionId: tx.id,
    status: tx.status,
    confirmations: tx.status === 'CONFIRMED' ? 1 : 0,
  };
}

/** Called by the event consumer when the chain verifies a transaction. */
export async function markConfirmed(txHash: string, blockIndex: number): Promise<void> {
  const tx = await prisma.transaction.findUnique({ where: { txHash } });
  if (!tx || tx.status === 'CONFIRMED') return;

  const updated = await prisma.transaction.update({
    where: { txHash },
    data: { status: 'CONFIRMED', blockIndex, confirmedAt: new Date() },
  });

  await publishEvent(
    Topics.TRANSACTION,
    buildEvent(
      EventTypes.TX_CONFIRMED,
      { transactionId: updated.id, userId: updated.userId, txHash, blockIndex },
      { actorId: updated.userId },
    ),
    updated.userId,
  );
  businessCounter.inc({ name: 'tx_confirmed' });
  log.info({ txHash, blockIndex }, 'Transaction confirmed');
}
