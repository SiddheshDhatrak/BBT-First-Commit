// Live-data hooks over src/lib/api.ts — LIVE ONLY, no mock fallback.
// Every hook requires VITE_API_URL (backend) or VITE_AGENT_URL (agent).
// Auth: Cognito access token from localStorage `rahatsetu_access_token`.

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { agent, api, isAgentEnabled, isApiEnabled, type ActorClaims } from "@/lib/api";
import { loadStoredSession } from "@/lib/cognito";
import { useUI } from "@/lib/store";

/** Actor claims for the signed-in Cognito user. */
export function useActorClaims(): ActorClaims {
  const role = useUI((s) => s.role);
  const user = useUI((s) => s.user);
  const orgId = useUI((s) => s.orgId);
  let accessToken: string | undefined;
  let storedOrg: string | null = null;
  try {
    const sess = loadStoredSession();
    accessToken = sess?.accessToken;
    storedOrg = sess?.orgId ?? null;
  } catch { /* private mode */ }
  return {
    role,
    actorId: user?.email ?? "anonymous",
    orgId: orgId ?? storedOrg ?? undefined,
    accessToken,
  };
}

export interface PublicMetrics {
  totalDonated: number;
  donationCount: number;
  expenseCount: number;
  financialVerifiedExpenses: number;
  deliveryVerifiedExpenses: number;
  deliveryPendingExpenses: number;
  deliveryFlaggedExpenses: number;
  utilizationByCampaign: { campaignId: string; name: string; donated: number }[];
  syntheticData?: boolean;
}

export interface LiveAlert {
  id: string;
  entityType?: string;
  entityId?: string;
  severity?: string;
  riskScore?: number;
  status?: string;
  evidence?: unknown;
  createdAt?: string;
}

export interface LineagePayload {
  donation?: { id: string; amount: number; campaignId: string; donorId?: string };
  campaign?: { id: string; name: string };
  allocations?: { id: string; amount: number }[];
  programs?: { id: string; name: string }[];
  expenses?: { id: string; amount: number; status: string }[];
  transactions?: { id: string; amount: number; status: string }[];
}

export interface AgentAnswer {
  summary: string;
  cites: string[];
}

/** Defensive parser for agent AnalyzeResponse shapes:
 *  {analysis:{summary,risk_factors[],evidence[]}} → summary + cites. */
export function parseAgentAnswer(raw: unknown): AgentAnswer {
  if (typeof raw === "string") return { summary: raw, cites: [] };
  const r = (raw ?? {}) as Record<string, unknown>;
  const analysis = (r.analysis ?? r.answer ?? {}) as Record<string, unknown>;
  const summary =
    (typeof analysis.summary === "string" && analysis.summary) ||
    (typeof r.summary === "string" && r.summary) ||
    (typeof r.answer === "string" && r.answer) ||
    "Analysis received.";
  const cites: string[] = [];
  for (const key of ["evidence", "risk_factors", "recommended_review_checks", "cites", "citations"]) {
    const v = (analysis as Record<string, unknown>)[key] ?? (r as Record<string, unknown>)[key];
    if (Array.isArray(v)) for (const item of v.slice(0, 6)) cites.push(String(item).slice(0, 120));
  }
  return { summary, cites };
}

const LIVE = { retry: false, staleTime: 30_000, gcTime: 5 * 60_000 } as const;

function signedIn(claims: ActorClaims) {
  return claims.role !== "guest" && !!claims.accessToken;
}

export function usePublicMetrics() {
  return useQuery({
    queryKey: ["live", "public-dashboard"],
    queryFn: () => api.publicDashboard<PublicMetrics>(),
    enabled: isApiEnabled(),
    ...LIVE,
  });
}

export function useGovernmentDashboard() {
  const claims = useActorClaims();
  const govt = claims.role === "auditor" || claims.role === "admin";
  return useQuery({
    queryKey: ["live", "government-dashboard"],
    queryFn: () => api.governmentDashboard<unknown>(claims),
    enabled: isApiEnabled() && govt && signedIn(claims),
    ...LIVE,
  });
}

export function useDisasters() {
  const claims = useActorClaims();
  return useQuery({
    queryKey: ["live", "disasters"],
    queryFn: () => api.listDisasters<unknown[]>(claims),
    // Public endpoint: no sign-in required.
    enabled: isApiEnabled(),
    ...LIVE,
  });
}

export function useCampaigns() {
  const claims = useActorClaims();
  return useQuery({
    queryKey: ["live", "campaigns"],
    queryFn: () => api.listCampaigns<unknown[]>(claims),
    // Public endpoint: no sign-in required.
    enabled: isApiEnabled(),
    ...LIVE,
  });
}

export function useDonations() {
  const claims = useActorClaims();
  return useQuery({
    queryKey: ["live", "donations", claims.actorId],
    queryFn: () => api.listDonations<unknown[]>(claims),
    enabled: isApiEnabled() && signedIn(claims),
    ...LIVE,
  });
}

export function useDonationLineage(donationId: string | undefined) {
  const claims = useActorClaims();
  return useQuery({
    queryKey: ["live", "lineage", donationId, claims.actorId],
    queryFn: () => api.lineage<LineagePayload>(donationId as string, claims),
    enabled: isApiEnabled() && !!donationId && signedIn(claims),
    ...LIVE,
  });
}

export function useDonate() {
  const claims = useActorClaims();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ campaignId, amount }: { campaignId: string; amount: number }) =>
      api.donate<unknown>(campaignId, { amount }, claims),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["live", "donations"] });
      qc.invalidateQueries({ queryKey: ["live", "public-dashboard"] });
    },
  });
}

/** GOVT-only endpoint: enabled for auditor/admin roles when API is set. */
export function useFraudAlerts() {
  const claims = useActorClaims();
  const govt = claims.role === "auditor" || claims.role === "admin";
  return useQuery({
    queryKey: ["live", "fraud-alerts"],
    queryFn: () => api.fraudAlerts<LiveAlert[]>(claims),
    enabled: isApiEnabled() && govt && signedIn(claims),
    ...LIVE,
  });
}

export function useResolveAlert() {
  const claims = useActorClaims();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, reason }: { id: string; status: string; reason: string }) =>
      api.resolveAlert<LiveAlert>(id, { status, reason }, claims),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["live", "fraud-alerts"] });
      qc.invalidateQueries({ queryKey: ["live", "government-dashboard"] });
    },
  });
}

export function useOrganizations() {
  const claims = useActorClaims();
  return useQuery({
    queryKey: ["live", "organizations"],
    queryFn: () => api.listOrganizations<unknown[]>(claims),
    enabled: isApiEnabled() && signedIn(claims),
    ...LIVE,
  });
}

export function usePrograms() {
  const claims = useActorClaims();
  return useQuery({
    queryKey: ["live", "programs"],
    queryFn: () => api.listPrograms<unknown[]>(claims),
    enabled: isApiEnabled() && signedIn(claims),
    ...LIVE,
  });
}

export function useVendors() {
  const claims = useActorClaims();
  return useQuery({
    queryKey: ["live", "vendors"],
    queryFn: () => api.listVendors<unknown[]>(claims),
    enabled: isApiEnabled() && signedIn(claims),
    ...LIVE,
  });
}

export function useCreateOrganization() {
  const claims = useActorClaims();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: unknown) => api.createOrganization<unknown>(body, claims),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["live", "organizations"] }),
  });
}

export function useCreateProgram() {
  const claims = useActorClaims();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: unknown) => api.createProgram<unknown>(body, claims),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["live", "programs"] }),
  });
}

export function useCreateVendor() {
  const claims = useActorClaims();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: unknown) => api.createVendor<unknown>(body, claims),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["live", "vendors"] }),
  });
}

export function useUploadInvoice() {
  const claims = useActorClaims();
  return useMutation({
    mutationFn: (body: unknown) => api.uploadInvoice<unknown>(body, claims),
  });
}

export function usePayExpense() {
  const claims = useActorClaims();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ body, key }: { body: unknown; key: string }) =>
      api.payExpense<unknown>(body, claims, key),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["live", "government-dashboard"] });
      qc.invalidateQueries({ queryKey: ["live", "public-dashboard"] });
    },
  });
}

export function useAgentAsk() {
  return useMutation({
    mutationFn: (question: string) => {
      if (!isAgentEnabled()) throw new Error("AI agent is not configured: set VITE_AGENT_URL.");
      return agent.aiQuery<unknown>({ question }).then(parseAgentAnswer);
    },
  });
}
