# RahatSetu — Frontend (`Frontend` branch)

Transparent Disaster-Relief Fund Tracking & Fraud Detection — React + Vite + TypeScript frontend per `Frontend PRD v1.0`.

## Stack (§18)
React 19 + Vite 8 + TS · Tailwind v4 + shadcn-style tokens · Recharts (lazy) + custom SVG · View Transitions wave (§7) · TanStack Query + Zustand · RHF + Zod · Lucide

## Run
```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # dist/ (Amplify Hosting ready)
npm run preview
```

## Demo path (<90s)
`/` → `/dashboard` → `/donate` → `/donations/DON-5000-0917` → `/ngo/invoices/upload` → `/auditor/queue` → `/auditor/alerts/ALT-1042` → `/auditor/copilot`

Login via `/login` and pick a role (mock Cognito): donor / ngo / vendor / auditor / admin → `/app` adapts.

## Notes
- Mock-first APIs in `src/lib/mock.ts`; swap to real backend by replacing hooks (backoff 2s→5s→10s ready).
- Tokens in `src/index.css` (`:root[data-theme]`); theme persists `localStorage.rahatsetu_theme`, respects `prefers-reduced-motion`.
- INR via `formatINR()` (en-IN); bank numbers masked to last-4.
- `SYNTHETIC DEMO DATA` ribbon everywhere; fraud copy uses “flagged for review / risk signal” only.

## Full-stack integration (this branch)
- `backend/` = byte-identical import of `main` (Express 5, `:3000`, `/api/v1`). Run: `npm --prefix backend ci && npm --prefix backend start`.
- Backend checks: `npm --prefix backend test`, `node backend/scripts/test-ghost-delivery.js`.
- Frontend talks to it via `src/lib/api.ts` when `VITE_API_URL` is set (see `.env.example`); otherwise mock data.
- `ml-service/` (`:8001` scoring) + `ai-agent/` (`:8002` orchestrator) = import of `ML` branch service dirs. Local: `docker compose -f docker-compose.override.yml up --build`, or `uvicorn` per README. Copilot uses `VITE_AGENT_URL` via `agent` client in `src/lib/api.ts` (mock fallback when unset).
- Role model: frontend `vendor` → backend `NGO` (explicit demo decision; backend has no VENDOR role), `field` → `FIELD` 1:1. Production auth = Cognito Bearer JWT (`api.ts` sends `Authorization` when `accessToken` is set); local demo uses `x-role` headers (`FEATURE_DEMO_ROLE_HEADERS=true`). Never commit `.env`.
- CI note: GitHub reads only root `.github/`; backend `ci.yml`/`deploy.yml` live under `backend/.github/` on this branch, so backend CI runs on `main`. The future `Frontend→main` PR must move workflows back to root and repoint paths (`backend/` prefix) — do not edit them here.
