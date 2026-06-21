# Scalability & High Availability

Target: **100,000+ users** with horizontal scale and no single point of failure.

## Horizontal scaling
- All services are **stateless** → scale by replica count. **HPAs** scale on CPU/memory
  (gateway 3→20, services 2→10) and the **Cluster Autoscaler** grows the node group.
- The mempool in the blockchain service is the only in-memory state; for multi-replica mining move
  it to Redis/a partitioned queue (documented limitation; single miner replica is fine to start).
- The API Gateway is the front door and scales most aggressively behind the ALB.

## Caching (offload the database)
- **Redis** for: cache-aside on hot reads (profiles, balances), Redis-backed rate limiting,
  refresh-token/session store, and Kafka idempotency keys.
- Read-heavy endpoints (profile, wallet balance) are cached with short TTLs and invalidated on write.

## Database
- **Supabase Postgres** with **pgBouncer** pooled connections (`?pgbouncer=true&connection_limit=1`)
  so thousands of pods don't exhaust connections.
- One schema per service enables independent indexing and, later, independent physical databases.
- Indices on all foreign-key-like columns and query filters (userId, status, txHash, address).
- Scale path: Supabase read replicas for read-heavy queries; partition `transactions`/`audit_logs`
  by time as volume grows.

## Messaging
- **Kafka** decouples write throughput from downstream processing. Size partitions per topic for
  parallelism (partition key = `userId`); scale consumers within a consumer group up to the
  partition count. Replication factor 3 in production.

## Capacity sketch (order-of-magnitude)
- 100k users, ~5% daily active, a few tx/active-user/day ≈ tens of thousands of tx/day → tens of
  writes/sec peak. Comfortably handled by a handful of gateway + service replicas, Redis caching,
  and pooled Postgres. The architecture scales linearly well beyond this.

## High availability
- **Multi-AZ**: VPC across 3 AZs; EKS managed node group spans AZs; prod uses HA NAT gateways.
- **Redundancy**: ≥2 (gateway ≥3) replicas; **PodDisruptionBudgets** keep ≥1 up during drains;
  prod adds **topology spread** across zones.
- **Zero-downtime deploys**: rolling updates gated by readiness probes; ArgoCD self-heal.
- **Stateful deps**: Kafka replication 3; Redis HA (ElastiCache/replication) in prod; Supabase is
  managed/HA.
- **Health**: `/healthz` (liveness), `/readyz` (DB/Kafka/Redis), `/metrics` everywhere.

## Performance practices
- gRPC for low-latency internal calls; connection reuse.
- Pagination on all list endpoints; bounded page sizes.
- OTel traces to find hotspots; Prometheus p95 latency + error-rate alerts (see
  `infra/monitoring/prometheus/rules/alerts.yml`).
