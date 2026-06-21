import {
  ALL_TOPICS,
  startConsumer,
  eventsConsumed,
  createLogger,
  type EventEnvelope,
} from '@blockchain/common';
import { record } from './service';

const log = createLogger('audit-service');

/** The audit service is the platform-wide sink: it subscribes to every topic and
 *  persists an append-only record of each event. */
export async function startConsumers(): Promise<void> {
  await startConsumer(
    { groupId: 'audit-service-group', topics: ALL_TOPICS, logger: log },
    async (event: EventEnvelope, topic) => {
      await record({
        actorId: event.actorId,
        service: topic.split('.')[0], // e.g. "transaction" from "transaction.events"
        action: event.type,
        resource: topic,
        payload: { eventId: event.eventId, occurredAt: event.occurredAt, ...(event.payload as object) },
      });
      eventsConsumed.inc({ topic, type: event.type, result: 'ok' });
    },
  );
}
