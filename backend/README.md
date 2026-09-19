# RahatSetu backend MVP

RahatSetu tracks relief funds from a synthetic donation through procurement and payment, then independently verifies delivery. A valid invoice is **financial evidence**, not proof of impact.

This repository uses Express 5 with a modular in-memory repository so the complete demo runs immediately. The repository, evidence, identity, and AI seams are isolated so PostgreSQL/RDS, S3/Textract, Cognito, and Bedrock adapters can replace their demo equivalents without rewriting business rules.

## Run it

Requires Node 20+.

```powershell
npm ci
cp .env.example .env
npm test
npm start
```

The API listens on `http://localhost:3000`. All data is explicitly synthetic and resets on restart.

### Local PostgreSQL Database (Development)

Start a local PostgreSQL 16 instance via Docker Compose:

```powershell
npm run db:up
```

This starts a `postgres` service with:
- Database: `rahatsetu`
- User: `rahatsetu`
- Password: `rahatsetu` (development only)
- Port: `5432` (mapped to localhost)
- Persistent named volume: `rahatsetu-pgdata`
- Health check enabled

Default local `DATABASE_URL`:
```
postgres://rahatsetu:rahatsetu@localhost:5432/rahatsetu
```

Run migrations against the local database:

```powershell
npm run migrate:up
```

Create a new migration:

```powershell
npm run migrate:create migration-name
```

Rollback the last migration:

```powershell
npm run migrate:down
```

View database logs:

```powershell
npm run db:logs
```

Stop and remove the database container (keeps volume):

```powershell
npm run db:down
```

Reset the local development database completely (removes volume and reapplies migrations):

```powershell
npm run db:down
docker volume rm rahatsetu-pgdata
npm run db:up
npm run migrate:up
```

### Environment variables

See `.env.example` for all options. Key variables:

| Variable | Required | Default | Description |
|---|---|---|---|
| `NODE_ENV` | no | `development` | Set to `production` to enforce required vars |
| `PORT` | no | `3000` | HTTP port |
| `LOG_LEVEL` | no | `info` | `debug`, `info`, `warn`, `error` |
| `REPOSITORY_DRIVER` | no | `memory` | `memory` (dev/test only) or `postgres` |
| `DATABASE_URL` | prod only | `postgres://rahatsetu:rahatsetu@localhost:5432/rahatsetu` | PostgreSQL connection string |
| `DATABASE_SSL` | no | `false` | Enable SSL for PostgreSQL connection |
| `AWS_REGION` | prod only | | AWS region for Cognito/S3 |
| `COGNITO_USER_POOL_ID` | prod only | | Cognito user pool ID |
| `COGNITO_CLIENT_ID` | prod only | | Cognito app client ID |
| `EVIDENCE_BUCKET` | prod only | | S3 bucket for evidence |
| `FEATURE_DEMO_ROLE_HEADERS` | no | `true` | Allow `x-role`/`x-actor-id` headers (dev only) |
| `FEATURE_MOCK_ADAPTERS` | no | `true` | Use mock S3/Textract/Bedrock (dev only) |
| `CORS_ORIGIN` | no | `*` | CORS origin |
| `JSON_LIMIT` | no | `1mb` | JSON body limit |
| `RATE_LIMIT_WINDOW_MS` | no | `60000` | Rate limit window |
| `RATE_LIMIT_MAX` | no | `100` | Max requests per window |

**Production startup fails fast** if required variables are missing or dev-only feature flags are enabled.

**Repository driver**: `REPOSITORY_DRIVER=memory` is only permitted when `NODE_ENV !== 'production'`. The API continues to use the in-memory repository by default; PostgreSQL repository implementation is a separate step.

### Docker

```powershell
docker build -t rahatsetu-backend .
docker run -p 3000:3000 --env-file .env rahatsetu-backend
```

### Developer tooling

```powershell
npm run lint        # ESLint
npm run format      # Prettier write
npm run format:check # Prettier check
npm run migrate:create <name>  # Create new migration
npm run migrate:up   # Apply pending migrations
npm run migrate:down # Rollback last migration
npm run db:up       # Start local PostgreSQL
npm run db:down     # Stop local PostgreSQL
npm run db:logs     # View PostgreSQL logs
```

## API documentation

With the API running, browse the interactive Swagger reference at
`http://localhost:3000/api-docs`. The machine-readable OpenAPI 3.0 document is
available at `http://localhost:3000/api-docs/openapi.json`.

For protected demo endpoints, use the **Authorize** button to supply `x-role`
and `x-actor-id`; NGO and FIELD requests also require `x-org-id`. The reference
includes request examples, required fields, valid roles, response conventions,
and the `Idempotency-Key` requirement for payments.

## Three-minute ghost-delivery flow

Run the prebuilt demo with a government actor:

```powershell
Invoke-RestMethod -Method Post -Uri http://localhost:3000/api/v1/demo/ghost-delivery -Headers @{ 'x-role'='GOVT'; 'x-actor-id'='auditor-demo' }
```

It creates a ₹5,000 donation, a ₹2 crore allocation, a clean ₹8.5 lakh invoice for 1,000 kits, and a simulated payment. The expense becomes `DELIVERY_PENDING`; a proof record with GPS outside the Assam disaster region then raises `POD-002` and changes the delivery state to `DELIVERY_FLAGGED`. The invoice remains `VERIFIED` throughout.

Inspect the public and auditor views:

```powershell
Invoke-RestMethod http://localhost:3000/api/v1/dashboard/public
Invoke-RestMethod http://localhost:3000/api/v1/dashboard/government -Headers @{ 'x-role'='GOVT'; 'x-actor-id'='auditor-demo' }
```

## Request correlation & structured logging

Every request receives an `x-request-id` header (generated or echoed). All logs are JSON lines with:

- `requestId`, `method`, `path`, `status`, `durationMs`
- Sanitized request/response bodies (tokens, PII, GPS, evidence content redacted)
- Error logs include `errorCode` and `message`

Example log line:
```json
{"timestamp":"2026-09-17T16:17:49.731Z","level":"info","message":"request_completed","requestId":"bc08ce2e-4805-48ea-93f8-211bef067e2b","method":"POST","path":"/api/v1/demo/ghost-delivery","status":200,"durationMs":32.75,"response":{...}}
```

## Request validation

All write endpoints validate body, params, and query using Zod schemas. Invalid input returns `400` with the standard error shape before business logic runs:

```json
{ "error": { "code": "BAD_REQUEST", "message": "Invalid body", "details": { "formErrors": [...], "fieldErrors": {...} } } }
```

## API hardening

- Helmet security headers (CSP disabled for Swagger UI)
- Configurable CORS via `CORS_ORIGIN`
- JSON body limit via `JSON_LIMIT`
- Rate limiting via `RATE_LIMIT_WINDOW_MS` / `RATE_LIMIT_MAX`
- Demo role headers and mock adapters disabled in production unless explicitly opted in

## Authentication in the demo

For a local hackathon demo, actor claims are supplied with headers:

- `x-role`: `DONOR`, `NGO`, `FIELD`, or `GOVT`
- `x-actor-id`: immutable demo actor ID
- `x-org-id`: organization claim for NGO/FIELD tenancy, e.g. `org-rahat-demo`

Production must populate these only from a verified Cognito JWT. Tenant checks intentionally ignore any organization ID in request JSON.

## Key API routes

| Area | Routes |
|---|---|
| Fund lineage | `POST /disasters`, `POST /campaigns`, `POST /campaigns/:id/donations`, `POST /fund-allocations`, `GET /donations/:id/lineage` |
| Procurement | `POST /vendors`, `POST /purchase-orders`, `POST /invoices/upload`, `POST /expenses`, `POST /transactions` |
| Impact verification | `POST /beneficiaries`, `POST /distributions`, `POST /distributions/:id/proof`, `POST /distributions/:id/confirm`, `GET /expenses/:id/verification` |
| Oversight | `GET /fraud-alerts`, `POST /fraud-alerts/:id/resolve`, field-audit routes, dashboard routes, `POST /ai/audit` |

All routes are under `/api/v1`. Payment requests require an `Idempotency-Key` header. Invoice upload expects **metadata JSON** (`fileKey`, hash, OCR mock) in this demo; the production adapter owns validation, private S3 upload, and short-lived signed URLs.

## Architecture and modification points

```text
HTTP/RBAC → modules (relief, delivery, oversight) → repository
                         ↓
                 hash-chained audit events

S3/EventBridge/Step Functions/Textract/Bedrock adapters plug in at module boundaries
```

- `src/core/repository.js`: replace `MemoryRepository` with a PostgreSQL transaction-backed implementation.
- `src/modules/delivery/service.js`: configurable geofence, timestamp, photo-hash, and quantity rules. This is where S3 event processing should call `uploadProof` after media validation.
- `src/modules/oversight/service.js`: the deterministic, source-record-only AI summary is the safe boundary for a Bedrock adapter.
- `src/core/audit.js`: append-only SHA-256 audit chain and verification endpoint.
- `src/data/seed.js`: synthetic demo policy, regional bounds, and audit sampling rate.
- `src/core/config.js`: production-safe configuration with validation.
- `src/core/logging.js`: request correlation and structured logging.
- `src/core/validation.js`: Zod schemas for all write endpoints.

## Current MVP boundaries

Implemented: RBAC/tenancy controls, fund lineage, budgets, POs/invoices/expenses, idempotent simulated payments, independent delivery states, proof GPS/photo-hash/timestamp/quantity checks, alerts, random audit selection, auditor resolution, hash-chain verification, privacy-safe public metrics, source-grounded mock auditor response, request correlation, structured logging, request validation, rate limiting, and security headers.

Adapter work remaining for a real AWS deployment: Cognito JWT verification, PostgreSQL/RDS migrations, private S3 multipart upload + magic-byte scanning, EventBridge/Step Functions orchestration, Textract/Bedrock/SNS calls, KMS/Secrets Manager, and IaC. No real PII, payments, or fraud conclusion is represented by this demo.