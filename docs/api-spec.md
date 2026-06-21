# API Specification

Public REST API exposed by the gateway. Base URL: `/(NEXT_PUBLIC_API_BASE_URL)` → `http://localhost:4000/api/v1`.
Interactive docs (OpenAPI/Swagger): **`GET /docs`**; raw spec: **`GET /openapi.json`**
(source: [`services/api-gateway/src/openapi.ts`](../services/api-gateway/src/openapi.ts)).

Auth: send `Authorization: Bearer <accessToken>` (except the auth endpoints). The refresh token is an
httpOnly cookie set by login/register and rotated by `/auth/refresh`.

## Endpoints

### Auth (`/auth`)
| Method | Path | Auth | Body | Description |
|---|---|---|---|---|
| POST | `/auth/register` | – | `email, password, firstName, lastName` | Create account, returns access token + sets refresh cookie |
| POST | `/auth/login` | – | `email, password` | Login |
| POST | `/auth/refresh` | cookie | – | Rotate access token |
| POST | `/auth/logout` | cookie | – | Revoke refresh token |

### Users (`/users`)
| GET | `/users/me` | ✓ | – | Current profile |
| PATCH | `/users/me` | ✓ | `firstName?, lastName?, phone?` | Update profile |
| POST | `/users/me/avatar` | ✓ | multipart `avatar` | Upload avatar (Supabase Storage) |

### Wallets (`/wallets`)
| POST | `/wallets` | ✓ | `label?, currency?` | Create wallet (keypair + address) |
| GET | `/wallets` | ✓ | – | List my wallets |
| GET | `/wallets/:id` | ✓ | – | Get wallet |
| GET | `/wallets/:id/balance` | ✓ | – | Wallet balance |

### Transactions (`/transactions`)
| POST | `/transactions` | ✓ | `fromAddress, toAddress, amount, fee?` | Send a transaction (PENDING) |
| GET | `/transactions?page&pageSize&status` | ✓ | – | History (paginated) |
| GET | `/transactions/:id` | ✓ | – | Get transaction |
| GET | `/transactions/:id/status` | ✓ | – | Status + confirmations |

### Blockchain (`/blockchain`)
| GET | `/blockchain/chain?limit` | ✓ | – | Blocks |
| GET | `/blockchain/blocks/:index` | ✓ | – | Single block |
| GET | `/blockchain/validate` | ✓ | – | Validate the whole chain |
| POST | `/blockchain/mine` | ADMIN | `minerAddress?` | Mine a block manually |

### Notifications (`/notifications`)
| GET | `/notifications?page&pageSize&unreadOnly` | ✓ | – | List |
| GET | `/notifications/unread-count` | ✓ | – | Unread count |
| POST | `/notifications/:id/read` | ✓ | – | Mark read |
| POST | `/notifications/read-all` | ✓ | – | Mark all read |

### Analytics & Audit
| GET | `/analytics/summary` | ✓ | – | Dashboard aggregate (balances, tx stats, 7-day series) |
| GET | `/audit/logs?actorId&service&action&page&pageSize` | ADMIN | – | Audit log query |

### Operational (all services)
`GET /healthz` (liveness) · `GET /readyz` (deps) · `GET /metrics` (Prometheus).

## Error shape
```json
{ "error": { "code": "VALIDATION_ERROR", "message": "Validation failed", "details": [], "traceId": "…" } }
```
Codes: `VALIDATION_ERROR (400)`, `UNAUTHENTICATED (401)`, `FORBIDDEN (403)`, `NOT_FOUND (404)`,
`CONFLICT (409)`, `INSUFFICIENT_FUNDS (422)`, `RATE_LIMITED (429)`, `INTERNAL_ERROR (500)`,
`SERVICE_UNAVAILABLE (503)`.

## Internal gRPC
Service-to-service contracts are defined in [`/proto`](../proto) (`auth`, `user`, `wallet`,
`blockchain`, `transaction`, `notification`, `audit`). These are not exposed publicly.
