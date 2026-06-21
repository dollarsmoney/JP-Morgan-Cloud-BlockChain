import {
  Topics,
  EventTypes,
  startConsumer,
  eventsConsumed,
  createLogger,
  type EventEnvelope,
} from '@blockchain/common';
import { ingestAndMaybeMine } from './service';

const log = createLogger('blockchain-service');

interface TxCreatedPayload {
  transactionId: string;
  userId: string;
  fromAddress: string;
  toAddress: string;
  amount: string;
  fee: string;
  txHash: string;
}

export async function startConsumers(): Promise<void> {
  await startConsumer(
    { groupId: 'blockchain-service-group', topics: [Topics.TRANSACTION], logger: log },
    async (event: EventEnvelope, topic) => {
      if (event.type === EventTypes.TX_CREATED) {
        const p = event.payload as TxCreatedPayload;
        await ingestAndMaybeMine({
          sender: p.fromAddress,
          receiver: p.toAddress,
          amount: p.amount,
          fee: p.fee,
          txHash: p.txHash,
        });
        eventsConsumed.inc({ topic, type: event.type, result: 'ok' });
        log.info({ txHash: p.txHash }, 'Transaction ingested into mempool');
      }
    },
  );
}
