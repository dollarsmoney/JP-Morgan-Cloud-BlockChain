# Security Best Practices

## Authentication
- **JWT access tokens** (~15 min), verified locally at the gateway (`verifyAccessToken`) — no
  per-request round-trip to Auth.
- **Refresh tokens** (~7 days): rotated on every use, hashed at rest (SHA-256), tracked in Postgres
  + Redis, and revoked on logout. Reuse of a rotated token revokes the whole token family.
- Delivered to the browser as an **httpOnly, Secure, SameSite=strict cookie** scoped to `/api/v1/auth`;
  the access token lives only in memory on the client.
- **Passwords** hashed with **bcrypt** (cost 12) in `packages/common/src/auth`.

## Authorization
- **RBAC** (`USER`, `ADMIN`) enforced at the gateway (`requireRole`) and re-assertable in services
  via the gRPC `AuthContext` metadata.
- The gateway derives `userId` from the verified token and injects it into downstream calls — clients
  cannot act on another user's id.
- Admin-only routes: `POST /blockchain/mine`, `GET /audit/logs`.

## Edge hardening (gateway)
- **Helmet** security headers, **CORS** allowlist (`CORS_ORIGINS`), JSON/body size limit (1 MB).
- **Rate limiting** backed by Redis (holds across replicas): global limiter + a stricter limiter on
  auth endpoints to slow brute force.
- **Input validation** with **Zod** on every mutating route; address/amount formats enforced.

## Injection / XSS
- **Prisma** parameterized queries throughout — no raw SQL string building.
- Errors are normalized (`AppError`) and never leak stack traces to clients.
- React escapes output by default; CSP via Helmet on the API; avatars restricted to known hosts.

## Secrets management
- Local: `.env` (gitignored); `.env.example` documents every key.
- Kubernetes: `bcf-secrets` Secret (template provided), upgradeable to **External Secrets Operator**
  / **Sealed Secrets** sourcing **AWS Secrets Manager** via **IRSA** (no static cloud keys in pods).
- CI/CD authenticates to AWS with **GitHub OIDC** (no long-lived AWS keys).

## Network & runtime
- **NetworkPolicies**: default-deny ingress; only the gateway/frontend are publicly reachable;
  internal gRPC ports are reachable only intra-namespace; Prometheus scrape allowed from
  `observability`.
- Containers run **non-root**, `allowPrivilegeEscalation: false`, all Linux capabilities dropped.
- TLS terminates at the ALB (ACM certificate); HTTP redirects to HTTPS.

## Auditability
- Every state-changing domain event is published to Kafka and persisted append-only by the **Audit**
  service (actor, service, action, resource, payload, timestamp), queryable by admins.
- Every request carries a `traceId` correlating logs (Loki), metrics (Prometheus) and traces (Jaeger).

## Blockchain integrity
- SHA-256 block hashing; PoW with configurable difficulty; full-chain validation endpoint;
  Merkle leaves bind full transaction content so tampering is detectable; balances derived from
  confirmed chain state.

## Recommended before production
- Rotate `JWT_SECRET`/`JWT_REFRESH_SECRET`; enforce strong password policy + optional MFA.
- Enable WAF on the ALB; add bot/abuse protection on auth endpoints.
- Enable Supabase PITR, restrict DB network access, and use least-privilege DB roles per schema.
- Run `npm audit`, Snyk, and image scanning (ECR scan-on-push is enabled) in CI gates.
