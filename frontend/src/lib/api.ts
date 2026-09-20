// Frontend → backend contract (integration layer).
// Deployment-safe: when VITE_API_URL is unset, callers keep using src/lib/mock.ts.
// Backend: Express 5 on :3000, all routes under /api/v1, header actor claims
// (x-role: DONOR|NGO|FIELD|GOVT, x-actor-id, x-org-id), Idempotency-Key on payments.
// Docs: backend/README.md, backend/docs/backend-prd-and-aws-delivery-plan.md

import type { Role } from "@/lib/store";

const BASE = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") ?? "";
const AGENT_BASE = (import.meta.env.VITE_AGENT_URL as string | undefined)?.replace(/\/$/, "") ?? "";

export const isApiEnabled = () => BASE.length > 0;
export const isAgentEnabled = () => AGENT_BASE.length > 0;

/**
 * Frontend role → backend actor role.
 * Vendor has no backend role; NGO is closest (documented demo decision —
 * see README integration section). Field maps 1:1 to FIELD.
 */
export function toBackendRole(role: Role): string {
  switch (role) {
    case "donor": return "DONOR";
    case "ngo":
    case "vendor": return "NGO";
    case "field": return "FIELD";
    case "auditor":
    case "admin": return "GOVT";
    default: return "DONOR";
  }
}

export interface ActorClaims {
  role: Role;
  actorId: string;
  orgId?: string;
  /** Cognito access token. When set, sent as `Authorization: Bearer`.
   *  Local demo keeps working without it (backend FEATURE_DEMO_ROLE_HEADERS). */
  accessToken?: string;
}

function headers(claims: ActorClaims, extra: Record<string, string> = {}) {
  const h: Record<string, string> = {
    "content-type": "application/json",
    "x-role": toBackendRole(claims.role),
    "x-actor-id": claims.actorId,
    ...extra,
  };
  if (claims.orgId) h["x-org-id"] = claims.orgId;
  if (claims.accessToken) h["authorization"] = `Bearer ${claims.accessToken}`;
  return h;
}

async function request<T>(path: string, claims: ActorClaims, init: RequestInit = {}, idempotencyKey?: string): Promise<T> {
  if (!isApiEnabled()) throw new Error("API disabled: set VITE_API_URL to enable live backend calls.");
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: headers(claims, {
      ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
      ...((init.headers as Record<string, string> | undefined) ?? {}),
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API ${res.status} ${path}: ${text.slice(0, 200)}`);
  }
  return res.json() as Promise<T>;
}

async function agentRequest<T>(path: string, body: unknown): Promise<T> {
  if (!isAgentEnabled()) throw new Error("Agent disabled: set VITE_AGENT_URL to enable live AI analysis.");
  const res = await fetch(`${AGENT_BASE}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Agent ${res.status} ${path}: ${text.slice(0, 200)}`);
  }
  return res.json() as Promise<T>;
}

export const agent = {
  health: () => {
    if (!isAgentEnabled()) throw new Error("Agent disabled.");
    return fetch(`${AGENT_BASE}/health`).then((r) => { if (!r.ok) throw new Error(`agent health ${r.status}`); return r.json(); });
  },
  /** Standalone structured analysis: POST /api/v1/analyze */
  analyze: <T,>(body: unknown): Promise<T> => agentRequest(`/analyze`, body),
  /** Expense-scoped query, aligned with backend verification route. */
  aiQuery: <T,>(body: unknown): Promise<T> => agentRequest(`/verification/ai-query`, body),
  /** Backend audit-concept compatibility route. */
  aiAudit: <T,>(body: unknown): Promise<T> => agentRequest(`/ai/audit`, body),
};

export const api = {
  health: () => fetch(`${BASE}/health`).then((r) => { if (!r.ok) throw new Error(`health ${r.status}`); return r.json(); }),
  publicDashboard: <T,>(): Promise<T> => fetch(`${BASE}/dashboard/public`).then((r) => { if (!r.ok) throw new Error(`public ${r.status}`); return r.json(); }),
  lineage: <T,>(donationId: string, claims: ActorClaims): Promise<T> =>
    request(`/donations/${encodeURIComponent(donationId)}/lineage`, claims),
  fraudAlerts: <T,>(claims: ActorClaims): Promise<T> => request(`/fraud-alerts`, claims),
  resolveAlert: <T,>(id: string, body: unknown, claims: ActorClaims): Promise<T> =>
    request(`/fraud-alerts/${encodeURIComponent(id)}/resolve`, claims, { method: "POST", body: JSON.stringify(body) }),
  ghostDelivery: <T,>(claims: ActorClaims): Promise<T> =>
    request(`/demo/ghost-delivery`, claims, { method: "POST", body: "{}" }),
};
