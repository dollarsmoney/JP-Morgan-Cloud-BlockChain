/** Canonical Kafka topic + event-type registry shared by every service. */

export const Topics = {
  AUTH: 'auth.events',
  USER: 'user.events',
  WALLET: 'wallet.events',
  TRANSACTION: 'transaction.events',
  BLOCKCHAIN: 'blockchain.events',
  NOTIFICATION: 'notification.events',
  AUDIT: 'audit.events',
} as const;

export type TopicName = (typeof Topics)[keyof typeof Topics];

export const ALL_TOPICS: TopicName[] = Object.values(Topics);

/** Strongly-typed event names per topic. */
export const EventTypes = {
  // auth.events
  USER_REGISTERED: 'auth.user.registered',
  USER_LOGGED_IN: 'auth.user.logged_in',
  USER_LOGGED_OUT: 'auth.user.logged_out',
  // user.events
  PROFILE_CREATED: 'user.profile.created',
  PROFILE_UPDATED: 'user.profile.updated',
  // wallet.events
  WALLET_CREATED: 'wallet.created',
  WALLET_BALANCE_UPDATED: 'wallet.balance.updated',
  // transaction.events
  TX_CREATED: 'transaction.created',
  TX_CONFIRMED: 'transaction.confirmed',
  TX_FAILED: 'transaction.failed',
  // blockchain.events
  BLOCK_MINED: 'blockchain.block.mined',
  TX_VERIFIED: 'blockchain.tx.verified',
  // notification.events
  NOTIFICATION_CREATED: 'notification.created',
} as const;

export type EventType = (typeof EventTypes)[keyof typeof EventTypes];
