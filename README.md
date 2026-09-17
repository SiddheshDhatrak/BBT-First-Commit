# RahatSetu backend MVP

RahatSetu tracks relief funds from a synthetic donation through procurement and payment, then independently verifies delivery. A valid invoice is **financial evidence**, not proof of impact.

This repository uses Express 5 with a modular in-memory repository so the complete demo runs immediately. The repository, evidence, identity, and AI seams are isolated so PostgreSQL/RDS, S3/Textract, Cognito, and Bedrock adapters can replace their demo equivalents without rewriting business rules.

## Run it

Requires Node 20+.

```powershell
npm test
npm start
```

The API listens on `http://localhost:3000`. All data is explicitly synthetic and resets on restart.

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

## Authentication in the demo

For a local hackathon demo, actor claims are supplied with headers:

- `x-role`: `DONOR`, `NGO`, `FIELD`, or `GOVT`
- `x-actor-id`: immutable demo actor ID
- `x-org-id`: organization claim for NGO/FIELD tenancy, e.g. `org-rahat-demo`

Production must populate these only from a verified Cognito JWT. Tenant checks intentionally ignore any organization ID in request JSON.

## Key API routes

| Area | Routes |
| --- | --- |
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

## Current MVP boundaries

Implemented: RBAC/tenancy controls, fund lineage, budgets, POs/invoices/expenses, idempotent simulated payments, independent delivery states, proof GPS/photo-hash/timestamp/quantity checks, alerts, random audit selection, auditor resolution, hash-chain verification, privacy-safe public metrics, and a source-grounded mock auditor response.

Adapter work remaining for a real AWS deployment: Cognito JWT verification, PostgreSQL/RDS migrations, private S3 multipart upload + magic-byte scanning, EventBridge/Step Functions orchestration, Textract/Bedrock/SNS calls, KMS/Secrets Manager, and IaC. No real PII, payments, or fraud conclusion is represented by this demo.
