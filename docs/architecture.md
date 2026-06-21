# Architecture

## 1. System overview

The platform is a set of independently deployable TypeScript microservices behind a single
API Gateway, a Next.js 15 web app, and a simplified in-house Proof-of-Work blockchain. Services
communicate **synchronously over gRPC** and **asynchronously over Kafka**. State lives in
Supabase Postgres (one schema per service), Redis (cache/rate-limit/sessions), and Supabase Storage
(avatars).

```
                       ┌───────────────────────────────────────────┐
                       │   Next.js 15 (Tailwind, ShadCN, RQ, Axios)  │
                       └───────────────────────┬─────────────────────┘
                                REST/HTTPS (JWT access; refresh cookie)
                                               │
                       ┌───────────────────────▼─────────────────────┐
                       │  API GATEWAY  (Express)                       │
                       │  Helmet · CORS · Redis rate-limit · Zod ·     │
                       │  JWT verify · RBAC · Swagger · trace ctx      │
                       └─┬───────┬───────┬───────┬───────┬────────┬────┘
                gRPC     │       │       │       │       │        │
            ┌────────────┴─┐ ┌───┴──┐ ┌──┴───┐ ┌─┴────────┐ ┌────┴─────┐ ┌────────┐
            │     Auth     │ │ User │ │Wallet│ │Blockchain│ │Transaction│ │ Notif. │
            └──────┬───────┘ └──┬───┘ └──┬───┘ └────┬─────┘ └─────┬─────┘ └───┬────┘
                   │            │        │          │             │           │
                   └─────── Kafka topics (async domain events) ───┴───────────┘
                                               │ (all events)
                                               ▼
                                        ┌─────────────┐
                                        │   Audit     │
                                        └─────────────┘

  Shared: Supabase Postgres (schema/service) · Redis · Supabase Storage
  Observability: Prometheus · Grafana · Loki (logs) · Jaeger (OTel traces)
```

## 2. Services

| Service | Responsibility | Postgres schema | gRPC port |
|---|---|---|---|
| api-gateway | Public REST surface; REST→gRPC; authn/authz; docs | — | 4000 (HTTP) |
| auth | Register/login/refresh/logout, JWT issuance, RBAC | `app_auth`¹ | 50051 |
| user | Profile CRUD, Supabase Storage avatar | `users` | 50052 |
| wallet | Wallet creation, balances, balance updates | `wallets` | 50053 |
| blockchain | PoW chain, mining, validation, balances | `blockchain` | 50054 |
| transaction | Transaction lifecycle + history + status | `transactions` | 50055 |
| notification | User notifications (fan-in from events) | `notifications` | 50056 |
| audit | Append-only audit log (all events) | `audit` | 50057 |

Every service also exposes an HTTP port for `/healthz`, `/readyz`, `/metrics`.

¹ `auth` is reserved by Supabase (GoTrue), so the Auth service uses the `app_auth` Postgres schema.

## 3. Communication

- **Sync (gRPC):** Contracts in [`/proto`](../proto). The gateway holds a typed client per service.
  Cross-service calls (e.g. Transaction → Wallet `GetBalance`) use the same clients. The
  authenticated principal + trace id propagate via gRPC metadata (`x-user-id`, `x-trace-id`).
- **Async (Kafka):** Standard envelope `{ eventId, type, version, occurredAt, traceId, actorId, payload }`.
  At-least-once delivery, Redis-based idempotency dedupe, per-consumer dead-letter topics, and
  partition key = `userId` for per-user ordering.

### Topics & producers/consumers

| Topic | Produced by | Consumed by |
|---|---|---|
| `auth.events` | auth | user, notification, audit |
| `user.events` | user | audit |
| `wallet.events` | wallet | notification, audit |
| `transaction.events` | transaction | blockchain, notification, audit |
| `blockchain.events` | blockchain | wallet, transaction, audit |
| `notification.events` | notification | audit |

## 4. Core domain flow — send → mine → confirm

```
Frontend ──POST /transactions──► Gateway ──gRPC──► Transaction.CreateTransaction
   Transaction ──gRPC──► Wallet.GetBalance (validate funds)
   Transaction persists PENDING, emits transaction.created ─────────────┐
   Blockchain consumes transaction.created → mempool → mineBlock (PoW)   │
   Blockchain persists Block + emits blockchain.block.mined + tx.verified│
   Transaction consumes tx.verified → marks CONFIRMED, emits tx.confirmed│
   Wallet consumes block.mined → debits sender / credits receiver        │
   Notification consumes events → user notifications                     │
   Audit consumes every topic → append-only log ◄────────────────────────┘
```

Frontend uses React Query polling (5s) so `PENDING → CONFIRMED` appears automatically.

## 5. Blockchain design

- **Block:** index, timestamp, previousHash, hash, nonce, difficulty, merkleRoot, transactions.
- **Hashing:** SHA-256 over the block header; transactions form a Merkle tree whose leaves hash the
  **full transaction content** (so tampering with an amount invalidates the block).
- **Proof of Work:** increment nonce until `hash` has `difficulty` leading zeros (configurable).
- **Validation:** recompute each block hash, verify PoW target, Merkle root, and previous-hash
  linkage across the whole chain (`GET /blockchain/validate`).
- **Balances:** derived from confirmed on-chain transactions; the Wallet service also keeps a
  materialized balance updated on `block.mined` for fast reads.
- Core logic is pure and unit-tested: [`services/blockchain/src/chain.ts`](../services/blockchain/src/chain.ts).

## 6. Data model (schema per service)

One Supabase database, one Postgres schema per service; no cross-schema foreign keys (services
reference each other by id). Prisma schemas:
[auth](../services/auth/prisma/schema.prisma) ·
[user](../services/user/prisma/schema.prisma) ·
[wallet](../services/wallet/prisma/schema.prisma) ·
[blockchain](../services/blockchain/prisma/schema.prisma) ·
[transaction](../services/transaction/prisma/schema.prisma) ·
[notification](../services/notification/prisma/schema.prisma) ·
[audit](../services/audit/prisma/schema.prisma).

## 7. Shared library

[`packages/common`](../packages/common) provides logger (pino), errors (AppError + HTTP/gRPC
mapping), auth (JWT/bcrypt/RBAC), Redis helpers, Kafka producer/consumer + topic registry, gRPC
helpers, crypto (SHA-256, keypairs, Merkle), Zod validation, telemetry (OTel + prom-client), and
health/shutdown helpers. This keeps every service thin and consistent.

See also: [security.md](security.md) · [scalability.md](scalability.md) ·
[deployment-guide.md](deployment-guide.md) · [dr-runbook.md](dr-runbook.md) · [api-spec.md](api-spec.md).
