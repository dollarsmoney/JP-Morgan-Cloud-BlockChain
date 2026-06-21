import {
  Topics,
  EventTypes,
  startConsumer,
  eventsConsumed,
  createLogger,
  type EventEnvelope,
} from '@blockchain/common';
import { create } from './service';

const log = createLogger('notification-service');

/** Map a domain event to a user notification, or null to ignore it. */
function toNotification(
  event: EventEnvelope,
): { userId: string; type: string; title: string; body: string; metadata: Record<string, unknown> } | null {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = event.payload as any;
  const userId = event.actorId || p?.userId;
  if (!userId) return null;

  switch (event.type) {
    case EventTypes.USER_REGISTERED:
      return {
        userId,
        type: 'WELCOME',
        title: 'Welcome to BlockChain Fintech',
        body: 'Your account is ready. Create a wallet to get started.',
        metadata: {},
      };
    case EventTypes.WALLET_CREATED:
      return {
        userId,
        type: 'WALLET',
        title: 'Wallet created',
        body: `New wallet ${p.address} created with balance ${p.balance}.`,
        metadata: { address: p.address },
      };
    case EventTypes.TX_CREATED:
      return {
        userId,
        type: 'TRANSACTION',
        title: 'Transaction submitted',
        body: `You sent ${p.amount} to ${p.toAddress}. Awaiting confirmation.`,
        metadata: { txHash: p.txHash },
      };
    case EventTypes.TX_CONFIRMED:
      return {
        userId,
        type: 'TRANSACTION',
        title: 'Transaction confirmed',
        body: `Transaction ${p.txHash} was confirmed in block ${p.blockIndex}.`,
        metadata: { txHash: p.txHash, blockIndex: p.blockIndex },
      };
    case EventTypes.TX_FAILED:
      return {
        userId,
        type: 'TRANSACTION',
        title: 'Transaction failed',
        body: `Transaction ${p.txHash} failed: ${p.reason ?? 'unknown reason'}.`,
        metadata: { txHash: p.txHash },
      };
    default:
      return null;
  }
}

export async function startConsumers(): Promise<void> {
  await startConsumer(
    {
      groupId: 'notification-service-group',
      topics: [Topics.AUTH, Topics.WALLET, Topics.TRANSACTION],
      logger: log,
    },
    async (event: EventEnvelope, topic) => {
      const n = toNotification(event);
      if (n) {
        await create(n);
        eventsConsumed.inc({ topic, type: event.type, result: 'ok' });
        log.info({ userId: n.userId, type: n.type }, 'Notification created');
      }
    },
  );
}
