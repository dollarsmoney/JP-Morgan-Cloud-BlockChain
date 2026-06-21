import { Consumer, Kafka, Producer, logLevel } from 'kafkajs';
import { v4 as uuid } from 'uuid';
import { listEnv, optionalEnv, boolEnv } from '../config/env';
import { markEventProcessed } from '../redis';
import type { Logger } from '../logger';

export * from './topics';
import { TopicName } from './topics';

/** Standard event envelope written to every topic. */
export interface EventEnvelope<T = unknown> {
  eventId: string;
  type: string;
  version: number;
  occurredAt: string;
  traceId?: string;
  actorId?: string;
  payload: T;
}

export function buildEvent<T>(
  type: string,
  payload: T,
  opts: { actorId?: string; traceId?: string; version?: number } = {},
): EventEnvelope<T> {
  return {
    eventId: uuid(),
    type,
    version: opts.version ?? 1,
    occurredAt: new Date().toISOString(),
    traceId: opts.traceId,
    actorId: opts.actorId,
    payload,
  };
}

let kafka: Kafka | null = null;
function getKafka(): Kafka {
  if (!kafka) {
    kafka = new Kafka({
      clientId: optionalEnv('KAFKA_CLIENT_ID', 'blockchain-fintech'),
      brokers: listEnv('KAFKA_BROKERS', ['localhost:9092']),
      ssl: boolEnv('KAFKA_SSL', false),
      logLevel: logLevel.ERROR,
      retry: { retries: 8, initialRetryTime: 300 },
    });
  }
  return kafka;
}

// ---------- Producer ----------
let producer: Producer | null = null;

export async function getProducer(): Promise<Producer> {
  if (!producer) {
    producer = getKafka().producer({ allowAutoTopicCreation: true, idempotent: true });
    await producer.connect();
  }
  return producer;
}

/** Publish an event. Partition key defaults to actorId for per-user ordering. */
export async function publishEvent<T>(
  topic: TopicName,
  event: EventEnvelope<T>,
  key?: string,
): Promise<void> {
  const p = await getProducer();
  await p.send({
    topic,
    messages: [
      {
        key: key ?? event.actorId ?? event.eventId,
        value: JSON.stringify(event),
        headers: { type: event.type, eventId: event.eventId },
      },
    ],
  });
}

// ---------- Consumer ----------
export interface ConsumerOptions {
  groupId: string;
  topics: TopicName[];
  logger: Logger;
  /** When true (default) duplicate eventIds are skipped via Redis. */
  idempotent?: boolean;
  fromBeginning?: boolean;
}

export type EventHandler = (event: EventEnvelope, topic: string) => Promise<void>;

/**
 * Start a consumer with at-least-once delivery, Redis idempotency dedupe and a
 * per-group dead-letter topic for poison messages.
 */
export async function startConsumer(opts: ConsumerOptions, handler: EventHandler): Promise<Consumer> {
  const consumer: Consumer = getKafka().consumer({
    groupId: opts.groupId,
    sessionTimeout: 30000,
    heartbeatInterval: 3000,
  });
  await consumer.connect();
  for (const topic of opts.topics) {
    await consumer.subscribe({ topic, fromBeginning: opts.fromBeginning ?? false });
  }

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      const raw = message.value?.toString();
      if (!raw) return;
      let event: EventEnvelope;
      try {
        event = JSON.parse(raw) as EventEnvelope;
      } catch {
        opts.logger.error({ topic, partition }, 'Failed to parse event JSON');
        return;
      }

      if ((opts.idempotent ?? true) && !(await markEventProcessed(event.eventId))) {
        opts.logger.debug({ eventId: event.eventId, type: event.type }, 'Duplicate event skipped');
        return;
      }

      try {
        await handler(event, topic);
      } catch (err) {
        opts.logger.error(
          { err, eventId: event.eventId, type: event.type },
          'Handler failed; routing to DLQ',
        );
        try {
          const p = await getProducer();
          await p.send({
            topic: `${opts.groupId}.dlq`,
            messages: [{ key: event.eventId, value: raw }],
          });
        } catch (dlqErr) {
          opts.logger.error({ dlqErr }, 'Failed to write to DLQ');
        }
      }
    },
  });

  return consumer;
}

export async function disconnectKafka(): Promise<void> {
  if (producer) {
    await producer.disconnect();
    producer = null;
  }
}
