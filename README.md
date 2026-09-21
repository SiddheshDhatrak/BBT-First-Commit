# RahatSetu — Transparent Disaster-Relief Fund Tracking & Fraud Detection

> Every rupee traceable. Every delivery verified. No ghost beneficiaries.

RahatSetu tracks relief funds from a **synthetic donation → procurement → payment → independently verified delivery**, and flags fraud (ghost deliveries, duplicate proofs, GPS spoofing) with deterministic rules + ML anomaly scoring + an AI audit copilot. Built for a hackathon: **mock-first, fully demoable offline, production-deployable on AWS.**

**Live demo:** <https://main.d1k8mhrhrbsai2.amplifyapp.com> (frontend, Amplify) · Backend API + Swagger: see [Deployment](#deployment)

---

## Table of contents

- [The problem](#the-problem)
- [The solution](#the-solution)
- [Key features](#key-features)
- [Architecture](#architecture)
- [Repository layout](#repository-layout)
- [90-second demo path](#90-second-demo-path)
- [Run it locally](#run-it-locally)
- [API overview](#api-overview)
- [Roles & auth](#roles--auth)
- [Deployment](#deployment)
- [Configuration](#configuration)
- [Testing](#testing)
- [Tech stack](#tech-stack)
- [Important notes (judges, please read)](#important-notes-judges-please-read)

---

## The problem

Disaster-relief money disappears between donation and impact: invoices get paid, but nobody independently verifies that kits reached real households. Auditors drown in paperwork while ghost deliveries, duplicate photo proofs, and out-of-region claims go unnoticed.

## The solution

RahatSetu separates **financial evidence** (a valid invoice — necessary but not sufficient) from **delivery evidence** (GPS-tagged photo proofs, beneficiary confirmations, field audits). An expense is only `DELIVERY_VERIFIED` when independent evidence checks out; anything suspicious is `DELIVERY_FLAGGED` with source-grounded rule IDs (`POD-001…POD-010`), a 0–100 risk score, and a hash-chained audit trail — never a black-box "fraud" verdict.

---

## Key features

- **End-to-end fund lineage** — disaster → campaign → donation → allocation → vendor → PO → invoice → expense → idempotent payment → distribution → proof.
- **Independent delivery verification** — geofence, photo-hash dedup, perceptual-hash similarity, quantity reconciliation, timestamp plausibility, proof-deadline, beneficiary-dedup, confirmation-absence, community-dispute checks.
- **Risk scoring** — deterministic rules + statistical anomalies + Isolation-Forest ML score (ml-service) → single 0–100 score with visible components.
- **AI audit copilot** — evidence-grounded summaries (mock offline, AWS Bedrock when configured). It only summarizes retrieved records; it never concludes fraud.
- **Privacy-safe public dashboard** — aggregate metrics with zero PII/GPS; fail-open (`degraded: true`) instead of 500s during DB outages.
- **Tamper-evident audit chain** — append-only SHA-256 hash-chained log with a verify endpoint.
- **Role-based access** — DONOR, NGO, VENDOR, FIELD, GOVT (+ PENDING approval flow for NGO/VENDOR self-registration, invite-only FIELD/GOVT).

---

## Architecture

```text
                    ┌──────────────┐
                    │   Frontend   │  React 19 + Vite + TS + Tailwind
                    │  (Amplify)   │  TanStack Query · Zustand · RHF+Zod
                    └──────┬───────┘
                           │  VITE_API_URL / VITE_AGENT_URL
        ┌──────────────────┼──────────────────┐
        ▼                  ▼                  ▼
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│   Backend    │──▶│  ML Service  │◀──│  AI Agent    │
│ Express 5    │   │ FastAPI +    │   │ FastAPI      │
│ (App Runner) │   │ IsoForest    │   │ mock/Bedrock │
│  :3000       │   │  :8001       │   │  :8002       │
└──────┬───────┘   └──────────────┘   └──────────────┘
       │  postgres (RDS :5432, memory for dev)
       ▼
┌──────────────┐
│ AWS services │  Cognito (auth) · S3 (evidence) · Textract · Bedrock
│ (prod; all have offline mocks for demo) │
└──────────────┘
```

## Repository layout

| Path | What it is | Port |
|---|---|---|
| `frontend/` | React + Vite + TypeScript console (donor / NGO / auditor views) | 5173 |
| `backend/` | Express 5 API: relief, delivery, oversight, auth, demo modules | 3000 |
| `ml-service/` | Python invoice anomaly scoring (Isolation Forest) | 8001 |
| `ai-agent/` | Python audit-analysis orchestrator (mock or Bedrock) | 8002 |
| `docker-compose.yml` | Full-stack local runtime (postgres + all services) | — |
| `.github/workflows/` | `ci.yml` (test/lint) · `deploy.yml` (ECR → App Runner) | — |

Each service has its own README with deep-dive docs: [`backend/`](backend/README.md) · [`frontend/`](frontend/README.md) · [`ml-service/`](ml-service/README.md) · [`ai-agent/`](ai-agent/README.md).

---

## 90-second demo path

**Option 1 — hosted frontend:** open the [live demo](https://main.d1k8mhrhrbsai2.amplifyapp.com), log in and pick a role (mock Cognito): `donor / ngo / vendor / auditor / admin`, then follow `/` → `/dashboard` → `/donate` → `/ngo/invoices/upload` → `/auditor/queue` → `/auditor/copilot`.

**Option 2 — one-command ghost-delivery story (backend):**

```powershell
# 1. Fire the prebuilt fraud story: clean invoice paid, then fake delivery proof
Invoke-RestMethod -Method Post -Uri http://localhost:3000/api/v1/demo/ghost-delivery `
  -Headers @{ 'x-role'='GOVT'; 'x-actor-id'='auditor-demo' }

# 2. Public view: aggregates only, no PII
Invoke-RestMethod http://localhost:3000/api/v1/dashboard/public

# 3. Auditor view: POD-002/POD-004/POD-005 flags + risk score 100
Invoke-RestMethod http://localhost:3000/api/v1/dashboard/government `
  -Headers @{ 'x-role'='GOVT'; 'x-actor-id'='auditor-demo' }
```

The invoice stays `VERIFIED` throughout (financial evidence ≠ delivery proof) while the expense flips to `DELIVERY_FLAGGED` — that contrast **is** the pitch.

---

## Run it locally

Requires **Node 20+** (frontend needs 22+), **Python 3.11+** for ML/agent, **Docker** for the full stack.

**Backend only (fastest, mock auth + in-memory DB):**

```powershell
cd backend
npm ci
npm test      # full suite: unit + E2E ghost delivery + verification pipeline
npm start     # http://localhost:3000  ·  Swagger: http://localhost:3000/api-docs
```

**Full stack (postgres + backend + ml + agent + frontend):**

```powershell
# from repo root
docker compose up --build
# frontend http://localhost:5173 · backend http://localhost:3000 · ml :8001 · agent :8002
```

**Frontend only (against local backend):**

```powershell
cd frontend
npm ci
npm run dev   # http://localhost:5173
```

**ML service (train first):**

```powershell
cd ml-service
python -m venv .venv; .\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python -m src.train
uvicorn src.main:app --host 0.0.0.0 --port 8001
```

---

## API overview

Base path `/api/v1`. Interactive reference at `/api-docs` (Swagger UI) and `/api-docs/openapi.json`.

| Area | Highlights |
|---|---|
| Auth | `POST /auth/register` · `/auth/login` · `/auth/refresh` · `/auth/me` · invites & role assignment |
| Fund lineage | `POST /disasters` · `/campaigns` · `/campaigns/:id/donations` · `/fund-allocations` · `GET /donations/:id/lineage` |
| Procurement | `POST /vendors` · `/purchase-orders` · `/invoices/upload` · `/expenses` · `/transactions` (needs `Idempotency-Key`) |
| Delivery | `POST /beneficiaries` · `/distributions` · `/distributions/:id/proof` · `/distributions/:id/confirm` |
| Oversight | `GET /dashboard/public` · `GET /dashboard/government` · `/fraud-alerts` · field audits · `POST /ai/audit` · `/audit-chain/verify` |
| Health | `GET /health` · `GET /ready` (includes DB + adapter status) |

## Roles & auth

- **Local/demo:** `x-role` + `x-actor-id` headers (`FEATURE_DEMO_ROLE_HEADERS=true`), mock Cognito users in the frontend.
- **Production:** Cognito JWT Bearer tokens; `FEATURE_DEMO_ROLE_HEADERS=false`, `FEATURE_MOCK_ADAPTERS=false`, `REPOSITORY_DRIVER=postgres`.
- Auth is resilient: with mock flags on, registration/login always work (mock mode) even if Cognito vars are stale or Cognito is unreachable — the API never 500s on auth in demo mode.

---

## Deployment

Push to `main` triggers `.github/workflows/deploy.yml`:

1. **Build** backend Docker image → push to ECR (`:<sha>` + `:latest`).
2. **Deploy** via `aws apprunner start-deployment` (App Runner, `ap-south-1`, `node src/server.js :3000`).
3. **Verify** `/api/v1/health` + `/api/v1/ready` until `RUNNING`.
4. Frontend redeploys automatically on [Amplify](https://main.d1k8mhrhrbsai2.amplifyapp.com) from the same push.

Production App Runner env (see `update-service.json`): `NODE_ENV=production`, `REPOSITORY_DRIVER=postgres`, RDS `DATABASE_URL` + `DATABASE_SSL=true`, `FEATURE_MOCK_ADAPTERS=true`, `FEATURE_DEMO_ROLE_HEADERS=true`, empty `COGNITO_*` (mock auth — set real pool IDs + `FEATURE_MOCK_ADAPTERS=false` to switch to Cognito).

---

## Configuration

See `.env.example` (root pointer) and `backend/.env.example`. Key flags:

| Variable | Default | Meaning |
|---|---|---|
| `REPOSITORY_DRIVER` | `memory` | `memory` (dev/test) or `postgres` (prod) |
| `DATABASE_URL` / `DATABASE_SSL` | — | Required for `postgres` |
| `FEATURE_MOCK_ADAPTERS` | `true` | Mock S3/Textract/Bedrock/Cognito (demo-safe) |
| `FEATURE_DEMO_ROLE_HEADERS` | `true` | `x-role` actor headers (demo-safe) |
| `COGNITO_USER_POOL_ID` / `COGNITO_CLIENT_ID` | — | Real auth when mock flags are off |
| `ML_SERVICE_URL` / `AGENT_URL` | — | Wire in live ML + AI agent |

## Testing

```powershell
cd backend
npm test   # node --test: ghost-delivery E2E, verification pipeline, delivery rules, HTTP tests, 35 unit assertions
npm run lint
```

## Tech stack

**Backend:** Node 20+, Express 5, Zod, Helmet, express-rate-limit, `pg` + `node-pg-migrate`, AWS SDK v3 (Cognito/S3/Textract/Bedrock), Swagger UI · **Frontend:** React 19, Vite 8, TypeScript, Tailwind v4, TanStack Query, Zustand, React Hook Form + Zod, Recharts, AWS Amplify · **ML/Agent:** Python 3.11, FastAPI/uvicorn, scikit-learn (Isolation Forest), boto3 · **Infra:** Docker Compose (local), AWS App Runner + ECR + RDS Postgres + Amplify (prod), GitHub Actions OIDC deploys.

---

## Important notes (judges, please read)

- **All data is synthetic.** Seed names, amounts, hashes, GPS points, and documents are fixtures; the UI carries a `SYNTHETIC DEMO DATA` ribbon.
- **No real PII, money, or fraud verdicts.** Households are stored as hashes only; payments are simulated; the system raises *review flags with evidence*, never conclusions.
- **Mocks are a feature.** Every AWS dependency has a deterministic offline mock so the demo survives dead networks — swap `FEATURE_MOCK_ADAPTERS` / `AI_PROVIDER` / `ML_PROVIDER` for the real services without touching business rules.
