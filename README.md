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
