# BlockChain Fintech Platform

A production-grade blockchain transaction platform built as TypeScript microservices with a Next.js 15
frontend, a simplified in-house Proof-of-Work blockchain, and an enterprise DevOps stack
(Docker → Kubernetes/EKS → Terraform → ArgoCD → Prometheus/Grafana/Loki/Jaeger).

> Users can register/login, manage a profile, create wallets, view balances, send blockchain
> transactions, track transaction status, view history, receive notifications, and view an analytics
> dashboard.

## Architecture at a glance

```
Next.js 15 (Tailwind + ShadCN + React Query)
        │  REST/HTTPS (JWT)
        ▼
API Gateway (Express) ──gRPC──► Auth · User · Wallet · Blockchain · Transaction · Notification · Audit
        │                                     │
        └────────────── Kafka (async domain events) ──────────────┘
Shared infra: Supabase Postgres (schema/service) · Redis · Supabase Storage
Observability: Prometheus · Grafana · Loki · Jaeger (OpenTelemetry)
```

| Layer | Tech |
|---|---|
| Frontend | Next.js 15, TypeScript, TailwindCSS, ShadCN UI, React Query, Axios |
| Services | Node.js 20, TypeScript, Express, Prisma, gRPC |
| Auth | JWT access + rotating refresh tokens, bcrypt, RBAC |
| Data | Supabase PostgreSQL (one schema per service) |
| Cache | Redis (cache, rate limit, refresh-token store, idempotency) |
| Messaging | Apache Kafka (KafkaJS) |
| Storage | Supabase Storage (S3-compatible object storage) |
| Observability | Prometheus, Grafana, Loki, Jaeger / OpenTelemetry |
| DevOps | Docker, GitHub Actions, Terraform, EKS, ArgoCD |

## Repository layout

```
packages/common   Shared library (logger, errors, kafka, redis, grpc, auth, telemetry, validation)
proto/            gRPC contracts (.proto)
services/*        api-gateway, auth, user, wallet, blockchain, transaction, notification, audit
frontend/         Next.js 15 app
infra/            terraform, k8s, argocd, monitoring
docs/             architecture, deployment, scalability, HA, DR
```

## Quick start (local)

```bash
# 1. Install
npm install

# 2. Configure secrets
cp .env.example .env   # fill in Supabase URL + keys + DB pooler strings

# 3. Generate Prisma clients + run migrations against Supabase
npm run prisma:generate
npm run db:migrate:all

# 4. Start everything (services + Redis + Kafka + observability)
docker compose up --build

# Frontend: http://localhost:3000
# Gateway API + Swagger: http://localhost:4000/docs
# Grafana: http://localhost:3001   Jaeger: http://localhost:16686
```

See [docs/deployment-guide.md](docs/deployment-guide.md) for production deployment on AWS EKS.

## Documentation

- [docs/architecture.md](docs/architecture.md) — system & event-driven design
- [docs/security.md](docs/security.md) — security best practices
- [docs/scalability.md](docs/scalability.md) — scaling to 100k+ users, HA
- [docs/dr-runbook.md](docs/dr-runbook.md) — disaster recovery
- [docs/deployment-guide.md](docs/deployment-guide.md) — production deployment
