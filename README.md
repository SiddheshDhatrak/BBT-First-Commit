# RahatSetu — Frontend (`Frontend` branch)

Transparent Disaster-Relief Fund Tracking & Fraud Detection — React + Vite + TypeScript frontend per `Frontend PRD v1.0`.

## Stack (§18)
React 19 + Vite 8 + TS · Tailwind v4 + shadcn-style tokens · Recharts (lazy) + custom SVG · View Transitions wave (§7) · TanStack Query + Zustand · RHF + Zod · Lucide

## Run
```bash
npm install                # install frontend + backend workspaces
npm run dev:frontend       # UI on http://localhost:5173
npm run dev:backend        # API on http://localhost:3000
npm run build              # frontend dist/ (Amplify Hosting ready)
npm run test:backend       # backend test suite
```

## Demo path (<90s, live ledger)
`/` → `/register` (create Cognito account, confirm email) → `/login` → `/dashboard` → `/donate` (real POST) → `/donations` → trace lineage → `/auditor/queue` → resolve alert → `/auditor/copilot` (live agent).

Login via `/login` with your Cognito email + password. Role comes from your Cognito group (DONOR / NGO / VENDOR / FIELD / GOVT); GOVT + `VITE_ADMIN_EMAILS` → admin → `/app` adapts.

## Notes
- LIVE-ONLY UI: every page reads the backend (`src/lib/api.ts` + `src/lib/queries.ts`). No `src/lib/mock.ts` — deleted. Missing/error states are explicit, never synthetic.
- Tokens in `src/index.css` (`:root[data-theme]`); theme persists `localStorage.rahatsetu_theme`, respects `prefers-reduced-motion`.
- INR via `formatINR()` (en-IN); bank numbers hashed (SHA-256) server-side pattern, masked to last-4 in UI.
- `LIVE LEDGER DATA` ribbon everywhere; fraud copy uses “flagged for review / risk signal” only.

## Full-stack integration (this branch)
- `backend/` = `main` code + 2 ported fixes (audit `.at(-1)` compat, allocation `repo.list` guard) + new live list endpoints (`GET /disasters`, `/campaigns` public; `/donations`, `/organizations`, `/programs`, `/vendors` role-guarded). Run: `npm --prefix backend ci && npm --prefix backend start`.
- Managed Postgres for E2E: set `backend/.env` (`REPOSITORY_DRIVER=postgres`, managed `DATABASE_URL`, `DATABASE_SSL=true`, Cognito vars, both `FEATURE_*=false`, `CORS_ORIGIN=http://localhost:5173`), then `npm --prefix backend run migrate:up`.
- Backend checks: `npm --prefix backend test` (35 passing), `node backend/scripts/test-ghost-delivery.js`.
- Frontend requires `VITE_API_URL` + Cognito (`VITE_COGNITO_USER_POOL_ID/CLIENT_ID`) — see `.env.example`. Auth in `src/lib/cognito.ts` (real User Pool sign-up/confirm/sign-in; access token forwarded as `Authorization: Bearer`, verified by `backend/src/core/auth.js`).
- `ml-service/` (`:8001` scoring) + `ai-agent/` (`:8002` orchestrator). Full 4-service run: `docker compose -f docker-compose.override.yml up --build` (backend :3000, ml :8001, agent :8002, frontend :5173), or run each natively. Copilot requires `VITE_AGENT_URL` — no canned fallback.
- Role model: frontend `vendor` → backend `NGO`, `field` → `FIELD` 1:1, `auditor`/`admin` → `GOVT` (admin distinguished by `VITE_ADMIN_EMAILS`). Auth = Cognito Bearer JWT only in E2E (`FEATURE_DEMO_ROLE_HEADERS=false`). Never commit `.env`.
- main merge status: `origin/main` restructured to `frontend/`+`backend/` monorepo since this branch diverged. Code is in sync (all backend/frontend logic ported, diffs empty); the directory move was deliberately NOT merged to avoid breaking this working tree. A future monorepo migration should move root `src/*`→`frontend/*` in a dedicated commit.
- CI note: GitHub reads only root `.github/`; backend `ci.yml`/`deploy.yml` live under `backend/.github/` on this branch, so backend CI runs on `main`. The future `Frontend→main` PR must move workflows back to root and repoint paths (`backend/` prefix) — do not edit them here.
