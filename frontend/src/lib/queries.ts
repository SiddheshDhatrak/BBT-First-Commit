// Live-data hooks over src/lib/api.ts — LIVE ONLY, no mock fallback.
// Every hook requires VITE_API_URL (backend) or VITE_AGENT_URL (agent).
// Auth: Cognito access token from localStorage `rahatsetu_access_token`.

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, isApiEnabled, type ActorClaims } from "@/lib/api";
import { useUI } from "@/lib/store";

/** Actor claims for the signed-in user. Uses real Cognito tokens when available. */
export function useActorClaims(): ActorClaims {
  const role = useUI((s) => s.role);
  const user = useUI((s) => s.user);
  const isAuthenticated = useUI((s) => s.isAuthenticated);

  if (!isAuthenticated || !user) {
    return { role, actorId: `${role}-demo` };
  }

  return {
    role,
    actorId: user.id ?? user.email ?? `${role}-demo`,
    accessToken: user.accessToken,
    orgId: user.organizationId,
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

/** Defensive parser for agent/bedrock answer shapes:
 *  agent AnalyzeResponse {analysis:{summary,risk_factors[],evidence[]}},
 *  backend MockBedrock {completion, sourceRecordIds{...}} → summary + cites. */
export function parseAgentAnswer(raw: unknown): AgentAnswer {
  if (typeof raw === "string") return { summary: raw, cites: [] };
  const r = (raw ?? {}) as Record<string, unknown>;
  if (typeof r.completion === "string" && r.completion) {
    const cites: string[] = [];
    const src = (r.sourceRecordIds ?? {}) as Record<string, unknown>;
    for (const key of ["expenseId", "alertIds", "checkIds"]) {
      const v = src[key];
      if (typeof v === "string") cites.push(v.slice(0, 60));
      else if (Array.isArray(v)) for (const item of v.slice(0, 6)) cites.push(String(item).slice(0, 60));
    }
    return { summary: r.completion, cites };
  }
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

function signedIn(): boolean {
  try {
    return useUI.getState().isAuthenticated;
  } catch {
    return false;
  }
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
    enabled: isApiEnabled() && govt && signedIn(),
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
    enabled: isApiEnabled() && signedIn(),
    ...LIVE,
  });
}

export function useDonationLineage(donationId: string | undefined) {
  const claims = useActorClaims();
  return useQuery({
    queryKey: ["live", "lineage", donationId, claims.actorId],
    queryFn: () => api.lineage<LineagePayload>(donationId as string, claims),
    enabled: isApiEnabled() && !!donationId && signedIn(),
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
    enabled: isApiEnabled() && govt && signedIn(),
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
    enabled: isApiEnabled() && signedIn(),
    ...LIVE,
  });
}

export function usePrograms() {
  const claims = useActorClaims();
  return useQuery({
    queryKey: ["live", "programs"],
    queryFn: () => api.listPrograms<unknown[]>(claims),
    enabled: isApiEnabled() && signedIn(),
    ...LIVE,
  });
}

export function useVendors() {
  const claims = useActorClaims();
  return useQuery({
    queryKey: ["live", "vendors"],
    queryFn: () => api.listVendors<unknown[]>(claims),
    enabled: isApiEnabled() && signedIn(),
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
  const claims = useActorClaims();
  return useMutation({
    mutationFn: ({ expenseId, question }: { expenseId: string; question: string }) =>
      api.verificationAiQuery<unknown>({ expenseId, question }, claims).then(parseAgentAnswer),
  });
}

export interface ManagedUser {
  id: string;
  email: string;
  name: string;
  role: string;
  requestedRole?: string;
  organizationId?: string | null;
  status?: string;
  createdAt?: string;
}

/** GOVT-only: full user list; PENDING entries form the approval queue. */
export function useUsers() {
  const claims = useActorClaims();
  const admin = claims.role === "admin";
  return useQuery({
    queryKey: ["live", "users"],
    queryFn: () => api.listUsers<{ users: ManagedUser[] }>(claims),
    enabled: isApiEnabled() && admin && signedIn(),
    ...LIVE,
  });
}

export function useAssignRole() {
  const claims = useActorClaims();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) =>
      api.assignRole<unknown>(userId, role, claims),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["live", "users"] }),
  });
}

export function useDeleteUser() {
  const claims = useActorClaims();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => api.deleteUser<unknown>(userId, claims),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["live", "users"] }),
  });
}

export interface Invite {
  id: string;
  email: string;
  role: string;
  token?: string;
  consumedAt?: string | null;
  revokedAt?: string | null;
  createdBy?: string | null;
  createdAt?: string | null;
}

export interface InviteResult extends Invite {
  emailSent: boolean;
  emailReason?: string;
}

export function useInvites() {
  const claims = useActorClaims();
  const admin = claims.role === "admin";
  return useQuery({
    queryKey: ["live", "invites"],
    queryFn: () => api.listInvites<{ invites: Invite[] }>(claims),
    enabled: isApiEnabled() && admin && signedIn(),
    ...LIVE,
  });
}

export function useCreateInvite() {
  const claims = useActorClaims();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { email: string; role: string; sendEmail?: boolean }) =>
      api.createInvite<InviteResult>(body, claims),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["live", "invites"] }),
  });
}

export function useResendInvite() {
  const claims = useActorClaims();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.resendInvite<InviteResult>(id, claims),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["live", "invites"] }),
  });
}

export function useRevokeInvite() {
  const claims = useActorClaims();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.revokeInvite<unknown>(id, claims),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["live", "invites"] }),
  });
}
