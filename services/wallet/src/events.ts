import {
  Topics,
  EventTypes,
  startConsumer,
  eventsConsumed,
  createLogger,
  type EventEnvelope,
} from '@blockchain/common';
import { applyBlock } from './service';

const log = createLogger('wallet-service');

interface BlockMinedPayload {
  index: number;
  hash: string;
  transactions: Array<{ sender: string; receiver: string; amount: string; fee: string }>;
}

export async function startConsumers(): Promise<void> {
  await startConsumer(
    { groupId: 'wallet-service-group', topics: [Topics.BLOCKCHAIN], logger: log },
    async (event: EventEnvelope, topic) => {
      if (event.type === EventTypes.BLOCK_MINED) {
        const p = event.payload as BlockMinedPayload;
        await applyBlock(p.transactions);
        eventsConsumed.inc({ topic, type: event.type, result: 'ok' });
        log.info({ index: p.index }, 'Applied mined block to wallet balances');
      }
    },
  );
}
