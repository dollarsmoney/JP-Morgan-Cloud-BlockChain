import {
  Topics,
  EventTypes,
  startConsumer,
  eventsConsumed,
  createLogger,
  type EventEnvelope,
} from '@blockchain/common';
import { markConfirmed } from './service';

const log = createLogger('transaction-service');

interface TxVerifiedPayload {
  txHash: string;
  blockIndex: number;
}

export async function startConsumers(): Promise<void> {
  await startConsumer(
    { groupId: 'transaction-service-group', topics: [Topics.BLOCKCHAIN], logger: log },
    async (event: EventEnvelope, topic) => {
      if (event.type === EventTypes.TX_VERIFIED) {
        const p = event.payload as TxVerifiedPayload;
        await markConfirmed(p.txHash, p.blockIndex);
        eventsConsumed.inc({ topic, type: event.type, result: 'ok' });
      }
    },
  );
}
