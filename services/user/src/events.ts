import {
  Topics,
  EventTypes,
  startConsumer,
  eventsConsumed,
  createLogger,
  type EventEnvelope,
} from '@blockchain/common';
import { ensureProfile } from './service';

const log = createLogger('user-service');

interface UserRegisteredPayload {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
}

export async function startConsumers(): Promise<void> {
  await startConsumer(
    { groupId: 'user-service-group', topics: [Topics.AUTH], logger: log },
    async (event: EventEnvelope, topic) => {
      if (event.type === EventTypes.USER_REGISTERED) {
        const p = event.payload as UserRegisteredPayload;
        await ensureProfile(p);
        eventsConsumed.inc({ topic, type: event.type, result: 'ok' });
        log.info({ userId: p.userId }, 'Profile created from registration event');
      }
    },
  );
}
