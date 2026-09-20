// Live-data hooks over src/lib/api.ts with mock-first fallback.
// Pattern: every hook is `enabled` only when its env URL is set and the
// caller has a suitable role; components render `data` when present and
// fall back to src/lib/mock.ts content on disabled/error. This keeps
// Amplify builds (no env vars) pixel-identical to the mock demo.

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { agent, api, isAgentEnabled, isApiEnabled, type ActorClaims } from "@/lib/api";
import { useUI } from "@/lib/store";

/** Actor claims for the signed-in demo user. Picks up a Cognito access
 *  token from localStorage when present (future Hosted-UI login writes
 *  `rahatsetu_access_token`); otherwise header-claims demo mode. */
export function useActorClaims(): ActorClaims {
  const role = useUI((s) => s.role);
  const user = useUI((s) => s.user);
  let accessToken: string | undefined;
  try {
    accessToken = localStorage.getItem("rahatsetu_access_token") ?? undefined;
  } catch { /* private mode */ }
  return { role, actorId: user?.email ?? `${role}-demo`, accessToken };
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
    "Analysis received.";
  const cites: string[] = [];
  for (const key of ["evidence", "risk_factors", "recommended_review_checks", "cites", "citations"]) {
    const v = (analysis as Record<string, unknown>)[key] ?? (r as Record<string, unknown>)[key];
    if (Array.isArray(v)) for (const item of v.slice(0, 6)) cites.push(String(item).slice(0, 60));
  }
  return { summary, cites };
}

const LIVE = { retry: false, staleTime: 30_000, gcTime: 5 * 60_000 } as const;

export function usePublicMetrics() {
  return useQuery({
    queryKey: ["live", "public-dashboard"],
    queryFn: () => api.publicDashboard<PublicMetrics>(),
    enabled: isApiEnabled(),
    ...LIVE,
  });
}

export function useDonationLineage(donationId: string | undefined) {
  const claims = useActorClaims();
  return useQuery({
    queryKey: ["live", "lineage", donationId, claims.actorId],
    queryFn: () => api.lineage<LineagePayload>(donationId as string, claims),
    enabled: isApiEnabled() && !!donationId,
    ...LIVE,
  });
}

/** GOVT-only endpoint: enabled for auditor/admin roles when API is set. */
export function useFraudAlerts() {
  const claims = useActorClaims();
  const govt = claims.role === "auditor" || claims.role === "admin";
  return useQuery({
    queryKey: ["live", "fraud-alerts"],
    queryFn: () => api.fraudAlerts<LiveAlert[]>(claims),
    enabled: isApiEnabled() && govt,
    ...LIVE,
  });
}

export function useResolveAlert() {
  const claims = useActorClaims();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, reason }: { id: string; status: string; reason: string }) =>
      api.resolveAlert<LiveAlert>(id, { status, reason }, claims),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["live", "fraud-alerts"] }),
  });
}

export function useAgentAsk() {
  return useMutation({
    mutationFn: (question: string) => agent.aiQuery<unknown>({ question }).then(parseAgentAnswer),
  });
}
