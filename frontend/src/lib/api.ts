// Frontend → backend contract (integration layer) — LIVE ONLY, no mocks.
// Backend: Express 5 on :3000, all routes under /api/v1, actor claims via
// Cognito `Authorization: Bearer` (primary) + x-role/x-actor-id/x-org-id
// compat headers, Idempotency-Key on payments.
// Docs: backend/README.md (served live at /api-docs).

import type { Role } from "@/lib/store";

const RAW_BASE = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") ?? "";
const RAW_AGENT_BASE = (import.meta.env.VITE_AGENT_URL as string | undefined)?.replace(/\/$/, "") ?? "";
// ML service base is derived: same origin mapping as backend is not assumed.
// Browser never calls :8001 directly in the default flow (backend proxies ML);
// VITE_ML_URL is optional and only used for the health dot.
const RAW_ML_BASE = (import.meta.env.VITE_ML_URL as string | undefined)?.replace(/\/$/, "") ?? "";

// Single normalization point: every call below uses API, so VITE_API_URL
// works with or without the /api/v1 suffix. Same for the agent base.
const API = RAW_BASE.endsWith("/api/v1") ? RAW_BASE : `${RAW_BASE}/api/v1`;
const AGENT_BASE = RAW_AGENT_BASE.endsWith("/api/v1")
  ? RAW_AGENT_BASE
  : RAW_AGENT_BASE
    ? `${RAW_AGENT_BASE}/api/v1`
    : "";
const ML_BASE = RAW_ML_BASE.endsWith("/api/v1")
  ? RAW_ML_BASE
  : RAW_ML_BASE
    ? `${RAW_ML_BASE}/api/v1`
    : "";

export const isApiEnabled = () => RAW_BASE.length > 0;
export const isAgentEnabled = () => RAW_AGENT_BASE.length > 0;
export const isMlEnabled = () => RAW_ML_BASE.length > 0;
export const mlBaseUrl = () => ML_BASE;
export const agentBaseUrl = () => AGENT_BASE;

export function requireApi() {
  if (!isApiEnabled()) throw new Error("Backend is not configured: set VITE_API_URL.");
}

/**
 * Frontend role → backend actor role.
 * Vendor is a first-class backend role (vendor-scoped routes in app.js).
 * Field maps 1:1 to FIELD.
 */
export function toBackendRole(role: Role): string {
  switch (role) {
    case "donor": return "DONOR";
    case "ngo": return "NGO";
    case "vendor": return "VENDOR";
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
  /** Cognito access token, sent as `Authorization: Bearer`. Required in production. */
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
  requireApi();
  const send = (token: string | undefined) =>
    fetch(`${API}${path}`, {
      ...init,
      headers: headers({ ...claims, accessToken: token }, {
        ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
        ...((init.headers as Record<string, string> | undefined) ?? {}),
      }),
    });
  let res = await send(claims.accessToken);
  if (res.status === 401 && claims.accessToken && !path.startsWith("/auth/")) {
    // Access token expired: try one silent refresh, then sign out globally.
    try {
      const { auth } = await import("@/lib/auth");
      const refreshed = await auth.refreshSession();
      const retry = await send(refreshed.accessToken);
      if (retry.ok) {
        const { useUI } = await import("@/lib/store");
        useUI.getState().setUser({
          ...(useUI.getState().user as { name: string; email: string }),
          accessToken: refreshed.accessToken,
          refreshToken: refreshed.refreshToken,
          idToken: refreshed.idToken,
        });
        return retry.json() as Promise<T>;
      }
    } catch {
      /* refresh failed — fall through to global sign-out */
    }
    try {
      const { useUI } = await import("@/lib/store");
      useUI.getState().signOut();
    } catch {
      /* noop */
    }
    if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
      window.location.href = "/login?expired=true";
    }
    throw new Error(`API 401 ${path}: session expired — signed out.`);
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API ${res.status} ${path}: ${text.slice(0, 300)}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

async function agentRequest<T>(path: string, body: unknown, claims?: ActorClaims): Promise<T> {
  if (!isAgentEnabled()) throw new Error("Agent is not configured: set VITE_AGENT_URL.");
  const h: Record<string, string> = { "content-type": "application/json" };
  // Forward actor context when available so the agent's backend reads stay
  // authorized; backend-routed Copilot remains the default path.
  if (claims) {
    h["x-role"] = toBackendRole(claims.role);
    h["x-actor-id"] = claims.actorId;
    if (claims.orgId) h["x-org-id"] = claims.orgId;
    if (claims.accessToken) h["authorization"] = `Bearer ${claims.accessToken}`;
  }
  const res = await fetch(`${AGENT_BASE}${path}`, {
    method: "POST",
    headers: h,
    body: JSON.stringify(body ?? {}),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Agent ${res.status} ${path}: ${text.slice(0, 300)}`);
  }
  return res.json() as Promise<T>;
}

export const agent = {
  health: <T,>() => {
    if (!isAgentEnabled()) throw new Error("Agent disabled.");
    return fetch(`${AGENT_BASE}/health`).then((r) => { if (!r.ok) throw new Error(`agent health ${r.status}`); return r.json() as Promise<T>; });
  },
  /** Standalone structured analysis: POST /api/v1/analyze */
  analyze: <T,>(body: unknown, claims?: ActorClaims): Promise<T> => agentRequest(`/analyze`, body, claims),
  /** Expense-scoped query, aligned with backend verification route. */
  aiQuery: <T,>(body: unknown, claims?: ActorClaims): Promise<T> => agentRequest(`/verification/ai-query`, body, claims),
  /** Backend audit-concept compatibility route. */
  aiAudit: <T,>(body: unknown, claims?: ActorClaims): Promise<T> => agentRequest(`/ai/audit`, body, claims),
};

export const ml = {
  health: <T,>() => {
    if (!isMlEnabled()) throw new Error("ML disabled.");
    return fetch(`${ML_BASE}/health`).then((r) => { if (!r.ok) throw new Error(`ml health ${r.status}`); return r.json() as Promise<T>; });
  },
};

export const api = {
  health: () => { requireApi(); return fetch(`${API}/health`).then((r) => { if (!r.ok) throw new Error(`health ${r.status}`); return r.json(); }); },
  publicDashboard: <T,>(): Promise<T> => { requireApi(); return fetch(`${API}/dashboard/public`).then((r) => { if (!r.ok) throw new Error(`public ${r.status}`); return r.json(); }); },
  governmentDashboard: <T,>(claims: ActorClaims): Promise<T> =>
    request(`/dashboard/government`, claims),
  auditVerify: <T,>(claims: ActorClaims): Promise<T> =>
    request(`/audit-chain/verify`, claims),

  // Relief: disasters, campaigns, donations, allocations, lineage
  createDisaster: <T,>(body: unknown, claims: ActorClaims): Promise<T> =>
    request(`/disasters`, claims, { method: "POST", body: JSON.stringify(body) }),
  listDisasters: <T,>(claims: ActorClaims): Promise<T> =>
    request(`/disasters`, claims),
  createCampaign: <T,>(body: unknown, claims: ActorClaims): Promise<T> =>
    request(`/campaigns`, claims, { method: "POST", body: JSON.stringify(body) }),
  listCampaigns: <T,>(claims: ActorClaims): Promise<T> =>
    request(`/campaigns`, claims),
  donate: <T,>(campaignId: string, body: unknown, claims: ActorClaims): Promise<T> =>
    request(`/campaigns/${encodeURIComponent(campaignId)}/donations`, claims, { method: "POST", body: JSON.stringify(body) }),
  listDonations: <T,>(claims: ActorClaims): Promise<T> =>
    request(`/donations`, claims),
  allocateFunds: <T,>(body: unknown, claims: ActorClaims): Promise<T> =>
    request(`/fund-allocations`, claims, { method: "POST", body: JSON.stringify(body) }),
  lineage: <T,>(donationId: string, claims: ActorClaims): Promise<T> =>
    request(`/donations/${encodeURIComponent(donationId)}/lineage`, claims),

  // Orgs, programs, budgets, vendors, POs, invoices, expenses, payments
  createOrganization: <T,>(body: unknown, claims: ActorClaims): Promise<T> =>
    request(`/organizations`, claims, { method: "POST", body: JSON.stringify(body) }),
  listOrganizations: <T,>(claims: ActorClaims): Promise<T> =>
    request(`/organizations`, claims),
  createProgram: <T,>(body: unknown, claims: ActorClaims): Promise<T> =>
    request(`/programs`, claims, { method: "POST", body: JSON.stringify(body) }),
  listPrograms: <T,>(claims: ActorClaims): Promise<T> =>
    request(`/programs`, claims),
  createBudget: <T,>(body: unknown, claims: ActorClaims): Promise<T> =>
    request(`/budgets`, claims, { method: "POST", body: JSON.stringify(body) }),
  createVendor: <T,>(body: unknown, claims: ActorClaims): Promise<T> =>
    request(`/vendors`, claims, { method: "POST", body: JSON.stringify(body) }),
  listVendors: <T,>(claims: ActorClaims): Promise<T> =>
    request(`/vendors`, claims),
  addVendorBankAccount: <T,>(vendorId: string, body: unknown, claims: ActorClaims): Promise<T> =>
    request(`/vendors/${encodeURIComponent(vendorId)}/bank-accounts`, claims, { method: "POST", body: JSON.stringify(body) }),
  listVendorBankAccounts: <T,>(vendorId: string, claims: ActorClaims): Promise<T> =>
    request(`/vendors/${encodeURIComponent(vendorId)}/bank-accounts`, claims),
  createPurchaseOrder: <T,>(body: unknown, claims: ActorClaims): Promise<T> =>
    request(`/purchase-orders`, claims, { method: "POST", body: JSON.stringify(body) }),
  uploadInvoice: <T,>(body: unknown, claims: ActorClaims): Promise<T> =>
    request(`/invoices/upload`, claims, { method: "POST", body: JSON.stringify(body) }),
  invoiceVerification: <T,>(id: string, claims: ActorClaims): Promise<T> =>
    request(`/invoices/${encodeURIComponent(id)}/verification`, claims),
  createExpense: <T,>(body: unknown, claims: ActorClaims): Promise<T> =>
    request(`/expenses`, claims, { method: "POST", body: JSON.stringify(body) }),
  payExpense: <T,>(body: unknown, claims: ActorClaims, idempotencyKey: string): Promise<T> =>
    request(`/transactions`, claims, { method: "POST", body: JSON.stringify(body) }, idempotencyKey),
  expenseVerification: <T,>(id: string, claims: ActorClaims): Promise<T> =>
    request(`/expenses/${encodeURIComponent(id)}/verification`, claims),
  checkPending: <T,>(expenseId: string, claims: ActorClaims): Promise<T> =>
    request(`/expenses/${encodeURIComponent(expenseId)}/check-pending`, claims, { method: "POST", body: "{}" }),

  // Delivery: beneficiaries, distributions, proofs, disputes
  createBeneficiary: <T,>(body: unknown, claims: ActorClaims): Promise<T> =>
    request(`/beneficiaries`, claims, { method: "POST", body: JSON.stringify(body) }),
  createDistribution: <T,>(body: unknown, claims: ActorClaims): Promise<T> =>
    request(`/distributions`, claims, { method: "POST", body: JSON.stringify(body) }),
  uploadProof: <T,>(distributionId: string, body: unknown, claims: ActorClaims): Promise<T> =>
    request(`/distributions/${encodeURIComponent(distributionId)}/proof`, claims, { method: "POST", body: JSON.stringify(body) }),
  confirmDistribution: <T,>(distributionId: string, body: unknown): Promise<T> => {
    requireApi();
    return fetch(`${API}/distributions/${encodeURIComponent(distributionId)}/confirm`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }).then(async (r) => {
      if (!r.ok) throw new Error(`API ${r.status} confirm: ${(await r.text().catch(() => "")).slice(0, 300)}`);
      return r.json();
    });
  },
  createDispute: <T,>(body: unknown, claims: ActorClaims): Promise<T> =>
    request(`/community-disputes`, claims, { method: "POST", body: JSON.stringify(body) }),

  // Oversight
  fraudAlerts: <T,>(claims: ActorClaims): Promise<T> => request(`/fraud-alerts`, claims),
  resolveAlert: <T,>(id: string, body: unknown, claims: ActorClaims): Promise<T> =>
    request(`/fraud-alerts/${encodeURIComponent(id)}/resolve`, claims, { method: "POST", body: JSON.stringify(body) }),
  sampleAudits: <T,>(body: unknown, claims: ActorClaims): Promise<T> =>
    request(`/field-audits/sample`, claims, { method: "POST", body: JSON.stringify(body) }),
  auditResult: <T,>(id: string, body: unknown, claims: ActorClaims): Promise<T> =>
    request(`/field-audits/${encodeURIComponent(id)}/result`, claims, { method: "POST", body: JSON.stringify(body) }),
  aiAudit: <T,>(body: unknown, claims: ActorClaims): Promise<T> =>
    request(`/ai/audit`, claims, { method: "POST", body: JSON.stringify(body) }),

  // Verification pipeline + evidence
  processInvoice: <T,>(id: string, body: unknown, claims: ActorClaims): Promise<T> =>
    request(`/verification/invoices/${encodeURIComponent(id)}/process`, claims, { method: "POST", body: JSON.stringify(body) }),
  invoiceStatus: <T,>(id: string, claims: ActorClaims): Promise<T> =>
    request(`/verification/invoices/${encodeURIComponent(id)}/status`, claims),
  processProof: <T,>(id: string, body: unknown, claims: ActorClaims): Promise<T> =>
    request(`/verification/proofs/${encodeURIComponent(id)}/process`, claims, { method: "POST", body: JSON.stringify(body) }),
  proofStatus: <T,>(id: string, claims: ActorClaims): Promise<T> =>
    request(`/verification/proofs/${encodeURIComponent(id)}/status`, claims),
  verificationAiQuery: <T,>(body: unknown, claims: ActorClaims): Promise<T> =>
    request(`/verification/ai-query`, claims, { method: "POST", body: JSON.stringify(body) }),
  s3SignedUrl: <T,>(params: Record<string, string | number>, claims: ActorClaims): Promise<T> => {
    const qs = new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)])).toString();
    return request(`/verification/s3-signed-url?${qs}`, claims);
  },

  ghostDelivery: <T,>(claims: ActorClaims): Promise<T> =>
    request(`/demo/ghost-delivery`, claims, { method: "POST", body: "{}" }),

  // User management (GOVT): approval queue, role assignment, removal
  listUsers: <T,>(claims: ActorClaims): Promise<T> =>
    request(`/auth/users`, claims),
  assignRole: <T,>(userId: string, role: string, claims: ActorClaims): Promise<T> =>
    request(`/auth/assign-role`, claims, { method: "POST", body: JSON.stringify({ userId, role }) }),
  deleteUser: <T,>(userId: string, claims: ActorClaims): Promise<T> =>
    request(`/auth/users/${encodeURIComponent(userId)}`, claims, { method: "DELETE" }),

  // Invitations (GOVT): issue (email + copy-token), list, resend, revoke
  createInvite: <T,>(body: { email: string; role: string; sendEmail?: boolean }, claims: ActorClaims): Promise<T> =>
    request(`/auth/invites`, claims, { method: "POST", body: JSON.stringify(body) }),
  listInvites: <T,>(claims: ActorClaims): Promise<T> =>
    request(`/auth/invites`, claims),
  resendInvite: <T,>(id: string, claims: ActorClaims): Promise<T> =>
    request(`/auth/invites/${encodeURIComponent(id)}/resend`, claims, { method: "POST", body: "{}" }),
  revokeInvite: <T,>(id: string, claims: ActorClaims): Promise<T> =>
    request(`/auth/invites/${encodeURIComponent(id)}`, claims, { method: "DELETE" }),
};
