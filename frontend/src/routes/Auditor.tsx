import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { ArrowUpDown, CheckCircle2, Inbox, MapPin, SearchCheck, Sparkles } from "lucide-react";
import { isAgentEnabled, isApiEnabled, isMlEnabled } from "@/lib/api";
import { useAgentAsk, useAgentHealth, useFraudAlerts, useGovernmentDashboard, useMlHealth, usePublicMetrics, useResolveAlert, type LiveAlert } from "@/lib/queries";
import { PageHeader } from "@/components/composite/Chrome";
import { EvidenceCard, RiskBadge, SignalBanner } from "@/components/composite/Risk";
import { Reveal, Stagger, StaggerItem } from "@/components/luxe/Reveal";
import { IsoBars } from "@/components/viz/Depth";
import { shortINR } from "@/lib/format";

interface GovExpense { expenseId: string; riskScore?: { total?: number; components?: { mlAnomalyScore?: number } }; delivery?: { status?: string }; alerts?: { id: string }[] }

export function CommandCentre() {
  const alertsQ = useFraudAlerts();
  const govQ = useGovernmentDashboard();
  const metricsQ = usePublicMetrics();
  const agentQ = useAgentHealth();
  const mlQ = useMlHealth();
  const alerts = ((alertsQ.data ?? []) as LiveAlert[]);
  const open = alerts.filter((a) => (a.status ?? "OPEN") === "OPEN" || (a.status ?? "") === "INVESTIGATING");
  const high = alerts.filter((a) => (a.severity ?? "").toUpperCase() === "HIGH");
  const expenses = (((govQ.data as { expenses?: GovExpense[] } | undefined)?.expenses) ?? []);
  const mlScores = expenses
    .map((e) => e.riskScore?.components?.mlAnomalyScore)
    .filter((v): v is number => typeof v === "number");
  const avgMl = mlScores.length > 0 ? mlScores.reduce((s, v) => s + v, 0) / mlScores.length : null;
  const cards: [string, string, string][] = [
    ["Open investigations", alertsQ.isPending ? "…" : String(open.length), alertsQ.isError ? "ledger unreachable" : `${high.length} high signal`],
    ["Expenses tracked", govQ.isPending ? "…" : String(expenses.length), govQ.isError ? "auditor sign-in required" : avgMl == null ? "live ledger" : `avg ML ${avgMl.toFixed(1)}/25pts`],
    ["Deliveries verified", metricsQ.data ? String(metricsQ.data.deliveryVerifiedExpenses) : "…", "live ledger"],
    ["Spend tracked", metricsQ.data ? shortINR(metricsQ.data.totalDonated) : "…", "all campaigns"],
  ];
  const mlStatus = !isMlEnabled()
    ? "ML proxied via backend (VITE_ML_URL unset — direct dot disabled)"
    : mlQ.isPending ? "ML checking…" : mlQ.isError ? "ML unreachable — backend fails open" : `ML live · model ${(mlQ.data as { model_loaded?: boolean } | undefined)?.model_loaded ? "loaded" : "unknown"}`;
  const agentStatus = !isAgentEnabled()
    ? "agent not configured"
    : agentQ.isPending ? "agent checking…" : agentQ.isError ? "agent unreachable — Copilot falls back to local" : "agent live";
  return (
    <div>
      <PageHeader eyebrow="Auditor console" title="Command Centre" sub="Live control-room view. Sign in as auditor opens dark — override anytime." />
      <Stagger className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {cards.map(([k, v, hint]) => (
          <StaggerItem key={k}>
            <div className="rs-card relative overflow-hidden p-5 md:p-6">
              <div className="absolute inset-x-6 top-0 h-[2px]" style={{ background: "var(--primary-600)" }} aria-hidden />
              <p className="eyebrow !text-[10px]">{k}</p>
              <p className="kpi mt-2 text-[30px] font-semibold leading-none md:text-[34px]">{v}</p>
              <p className="mt-1.5 text-[13px]" style={{ color: "var(--text-muted)" }}>{hint}</p>
            </div>
          </StaggerItem>
        ))}
      </Stagger>
      <Reveal className="mt-4">
        <div className="rs-card flex flex-wrap items-center gap-4 p-6">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl text-white" style={{ background: "var(--primary-600)" }}>
            <MapPin size={21} aria-hidden />
          </span>
          <p className="min-w-0 flex-1 basis-60 text-sm leading-6" style={{ color: "var(--text-secondary)" }}>
            {open.length === 0 ? (
              <><strong className=" text-[16px]" style={{ color: "var(--text-primary)" }}>Queue is clear. </strong> No open investigations on the live ledger.</>
            ) : (
              <><strong className=" text-[16px]" style={{ color: "var(--text-primary)" }}>{open.length} open investigation{open.length === 1 ? "" : "s"}. </strong> Start with the highest risk score in the queue.</>
            )}
          </p>
          <Link to="/auditor/queue" className="rs-btn-secondary rs-btn-sm">Open queue →</Link>
        </div>
      </Reveal>
      <Reveal className="mt-4">
        <div className="rs-card flex flex-wrap items-center gap-3 p-5 text-[13px]" role="status" style={{ color: "var(--text-secondary)" }}>
          <span className="mono rounded-md border px-2 py-1" style={{ borderColor: "var(--border-subtle)" }}>ML: {mlStatus}</span>
          <span className="mono rounded-md border px-2 py-1" style={{ borderColor: "var(--border-subtle)" }}>AGENT: {agentStatus}</span>
          <span style={{ color: "var(--text-muted)" }}>Risk = rules + stats + ML (0–25pts) + delivery + relationship · capped at 100.</span>
        </div>
      </Reveal>
    </div>
  );
}

export function InvestigationQueue() {
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  const [sortDesc, setSortDesc] = useState(true);

  useEffect(() => {
    setParams(q ? { q } : {}, { replace: true });
  }, [q, setParams]);

  const liveAlerts = useFraudAlerts();
  const resolveAlert = useResolveAlert();
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [liveNote, setLiveNote] = useState<string | null>(null);
  const rows = useMemo(() => {
    const all = ((liveAlerts.data ?? []) as LiveAlert[]);
    const f = all.filter((a) =>
      `${a.entityType ?? ""} ${a.entityId ?? ""} ${a.id} ${a.status ?? ""} ${a.severity ?? ""}`.toLowerCase().includes(q.toLowerCase()),
    );
    return [...f].sort((a, b) => (sortDesc ? (b.riskScore ?? 0) - (a.riskScore ?? 0) : (a.riskScore ?? 0) - (b.riskScore ?? 0)));
  }, [liveAlerts.data, q, sortDesc]);

  const resolveLive = async (a: LiveAlert) => {
    setResolvingId(a.id);
    setLiveNote(null);
    try {
      await resolveAlert.mutateAsync({ id: a.id, status: "RESOLVED", reason: "reviewed-in-queue" });
      setLiveNote(`Resolved live alert ${a.id.slice(0, 8)}… — audit trail appended.`);
    } catch (e) {
      setLiveNote(e instanceof Error ? e.message : "Live resolve failed.");
    } finally {
      setResolvingId(null);
    }
  };

  const sevOf = (s?: string): "high" | "medium" | "low" =>
    s === "HIGH" ? "high" : s === "MEDIUM" ? "medium" : "low";

  return (
    <div>
      <PageHeader eyebrow="Auditor console" title="Investigation Queue" sub="Live backend alerts sorted by risk score. Every row resolves with an audit entry." />
      <SignalBanner />
      {liveAlerts.isPending ? (
        <div className="rs-card mt-4 p-6 text-sm" style={{ color: "var(--text-secondary)" }} aria-busy="true">Loading live alerts…</div>
      ) : liveAlerts.isError ? (
        <div className="rs-card mt-4 p-6 text-sm font-bold" style={{ color: "var(--risk-high)" }} role="alert">Could not load alerts — auditor sign-in and backend connection required.</div>
      ) : (
        <Reveal className="mt-4">
          <div className="rs-card overflow-x-auto">
            <table className="rs-table min-w-[760px]">
              <caption className="mono px-5 pt-4 text-left text-[11px] tracking-[0.12em]" style={{ color: "var(--text-muted)" }}>LIVE BACKEND ALERTS · {rows.length} SHOWN</caption>
              <thead><tr><th scope="col">Alert</th><th scope="col">Risk</th><th scope="col">Status</th><th scope="col"><span className="sr-only">Action</span></th></tr></thead>
              <tbody>
                <AnimatePresence initial={false}>
                  {rows.map((a) => (
                    <motion.tr key={a.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      <td><Link to={`/auditor/alerts/${a.id}`} className=" text-[15px] font-semibold">{a.entityType ?? "Alert"} · {(a.entityId ?? a.id).slice(0, 18)}</Link><p className="mono mt-1 text-xs" style={{ color: "var(--text-muted)" }}>{a.id}</p></td>
                      <td><RiskBadge severity={sevOf(a.severity)} /><p className="kpi mono mt-1.5 text-xs" style={{ color: "var(--text-muted)" }}>{((a.riskScore ?? 0) / 100).toFixed(2)}</p></td>
                      <td className="mono text-[12px]" style={{ color: "var(--text-secondary)" }}>{a.status ?? "OPEN"}</td>
                      <td className="text-right"><button type="button" disabled={resolvingId === a.id} onClick={() => resolveLive(a)} className="rs-btn-secondary rs-btn-sm">{resolvingId === a.id ? "Resolving…" : "Resolve"}</button></td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
            {rows.length === 0 && <p className="px-5 pb-4 text-sm" style={{ color: "var(--text-secondary)" }}>No live alerts match.</p>}
          </div>
        </Reveal>
      )}
      {liveNote && <p role="status" className="mt-3 text-[13px] font-bold" style={{ color: "var(--risk-low)" }}>{liveNote}</p>}
      <div className="mt-4 flex flex-wrap gap-2.5">
        <div className="rs-input flex max-w-md flex-1 items-center gap-2 !rounded-full !py-3">
          <SearchCheck size={16} aria-hidden style={{ color: "var(--text-muted)" }} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter by entity, ID, status…" aria-label="Filter investigations" className="w-full bg-transparent text-sm font-medium outline-none" />
        </div>
        <button type="button" onClick={() => setSortDesc((s) => !s)} className="rs-btn-secondary rs-btn-sm !rounded-full" aria-label={sortDesc ? "Sort lowest risk first" : "Sort highest risk first"}>
          <ArrowUpDown size={15} aria-hidden /> Score {sortDesc ? "↓" : "↑"}
        </button>
      </div>
      {rows.length === 0 && !liveAlerts.isPending && (
        <div className="rs-card mt-4 flex items-center gap-4 p-7">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl" style={{ background: "color-mix(in srgb, var(--risk-low) 12%, transparent)", color: "var(--risk-low)" }}>
            <Inbox size={22} aria-hidden />
          </span>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}><strong className=" text-[17px]" style={{ color: "var(--text-primary)" }}>Queue is clear. </strong>No investigations match “{q}”.</p>
        </div>
      )}
    </div>
  );
}

export function FraudDetail() {
  const { id } = useParams();
  const alertsQ = useFraudAlerts();
  const alerts = ((alertsQ.data ?? []) as LiveAlert[]);
  const a = alerts.find((x) => x.id === id);
  const [reason, setReason] = useState("");
  const [done, setDone] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const resolveMutation = useResolveAlert();
  const decide = async (status: "RESOLVED" | "ESCALATED") => {
    if (!id) return;
    setWorking(true);
    try {
      await resolveMutation.mutateAsync({ id, status, reason });
      setDone(`${status === "RESOLVED" ? "Resolved" : "Escalated"} live alert. Logged to hash-chained audit trail.`);
    } catch (e) {
      setDone(e instanceof Error ? `Live update failed: ${e.message}` : "Live update failed.");
    } finally {
      setWorking(false);
    }
  };
  if (alertsQ.isPending) {
    return (
      <div>
        <PageHeader eyebrow="Alert" title="Loading…" sub="Fetching live evidence bundle." />
        <div className="rs-card p-8 text-center text-sm" style={{ color: "var(--text-secondary)" }} aria-busy="true">Loading live alert…</div>
      </div>
    );
  }
  if (alertsQ.isError || !a) {
    return (
      <div>
        <PageHeader eyebrow="Alert" title={id ? `Alert ${id.slice(0, 12)}…` : "Alert"} sub="Full evidence bundle." />
        <div className="rs-card p-8 text-center text-sm font-bold" style={{ color: "var(--risk-high)" }} role="alert">Alert not found or unreachable — it may be resolved or outside your scope.</div>
      </div>
    );
  }
  const evidence = a.evidence as { message?: string; ruleId?: string } | undefined;
  const sev: "high" | "medium" | "low" = a.severity === "HIGH" ? "high" : a.severity === "MEDIUM" ? "medium" : "low";
  return (
    <div>
      <PageHeader eyebrow={`${a.entityType ?? "Alert"} · ${a.status ?? "OPEN"}`} title={`Alert ${a.id.slice(0, 12)}…`} sub="Full evidence bundle. Resolve or escalate requires a reason code." />
      <SignalBanner />
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Reveal>
          <div className="rs-card h-fit p-6 md:p-7">
            <p className="eyebrow">Forensics</p>
            <h2 className=" mt-1 text-[22px]">Evidence record</h2>
            <div className="rs-inset mt-3 p-4 text-sm leading-6" style={{ color: "var(--text-secondary)" }}>
              <span className="eyebrow !text-[10px]">Backend evidence</span>
              <p className="mono mt-1.5 text-xs">{evidence?.message ?? evidence?.ruleId ?? JSON.stringify(a.evidence ?? {}).slice(0, 300)}</p>
              <p className="mono mt-2 text-xs">entity {a.entityType} · {(a.entityId ?? "").slice(0, 24)} · risk {((a.riskScore ?? 0) / 100).toFixed(2)}</p>
            </div>
            <label className="mt-4 block text-sm font-bold" htmlFor="fraud-reason">Reason code (required)
              <select id="fraud-reason" value={reason} onChange={(e) => { setReason(e.target.value); setDone(null); }} className="rs-input mt-2" required>
                <option value="">Select a reason…</option>
                <option value="duplicate-confirmed">Duplicate confirmed — escalate</option>
                <option value="vendor-clarified">Vendor clarified — resolve</option>
                <option value="false-positive">False positive — resolve</option>
                <option value="needs-field-visit">Needs field visit — escalate</option>
              </select>
            </label>
            <div className="mt-3 flex gap-2.5">
              <button type="button" disabled={!reason || working} className="rs-btn-primary rs-btn-sm flex-1" onClick={() => decide("RESOLVED")}>{working ? "Saving…" : "Resolve"}</button>
              <button type="button" disabled={!reason || working} className="rs-btn-secondary rs-btn-sm flex-1" onClick={() => decide("ESCALATED")}>{working ? "Saving…" : "Escalate"}</button>
            </div>
            <p className="mono mt-2 text-[11px]" style={{ color: "var(--text-muted)" }}>LIVE ALERT · decisions write to the backend audit chain</p>
            {!reason && <p className="mt-2 text-xs" style={{ color: "var(--text-muted)" }}>Choose a reason code to enable Resolve / Escalate.</p>}
            {done && <motion.p initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} role="status" className="mt-3 flex items-center gap-2 rounded-xl p-3 text-sm font-bold" style={{ color: "var(--risk-low)", background: "color-mix(in srgb, var(--risk-low) 9%, transparent)" }}><CheckCircle2 size={16} aria-hidden />{done}</motion.p>}
          </div>
        </Reveal>
        <div>
          <div className="rs-card mb-3 flex flex-wrap items-center gap-3 p-4">
            <RiskBadge severity={sev} withPulse />
            <span className="kpi text-[20px] font-semibold">score {((a.riskScore ?? 0) / 100).toFixed(2)}</span>
            <span className="mono text-xs" style={{ color: "var(--text-muted)" }}>{a.entityType} · {(a.entityId ?? "").slice(0, 18)}</span>
          </div>
          <div className="space-y-3" aria-live="polite">
            <EvidenceCard label={evidence?.message ?? `Rule ${evidence?.ruleId ?? "signal"} requires review.`} source={`alert:${a.id.slice(0, 12)}`} index={0} />
            <div className="rs-card p-4 text-[13px] leading-6" style={{ color: "var(--text-secondary)" }}>
              <p className="eyebrow !text-[10px]">ML context</p>
              <p className="mt-1.5">
                Risk {((a.riskScore ?? 0) / 100).toFixed(2)} fuses deterministic rules, statistical checks, ML anomaly (0–25pts from
                IsolationForest <span className="mono">isolation-forest-v1</span>), delivery and relationship signals.
                Open the linked expense in Copilot or <Link to="/auditor/funds" className="font-bold underline underline-offset-2">All Funds</Link> to see the per-expense ML component.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface Msg { id: string; q: string; a: string; cites: string[] }

const SUGGESTED = [
  "Which invoices exceed the emergency price band?",
  "Show vendors sharing a bank account",
  "Summarise high-risk open alerts",
];

export function Copilot() {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [expenseId, setExpenseId] = useState("");
  const [busy, setBusy] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);
  const msgSeq = useRef(0);
  const govQ = useGovernmentDashboard();
  const askMutation = useAgentAsk();
  const expenses = useMemo(
    () => (((govQ.data as { expenses?: { expenseId: string }[] } | undefined)?.expenses) ?? []),
    [govQ.data],
  );
  useEffect(() => { bottom.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [msgs, busy]);
  const defaultedExpense = useRef(false);
  useEffect(() => {
    if (!defaultedExpense.current && !expenseId && expenses.length > 0 && expenses[0]) {
      defaultedExpense.current = true;
      setExpenseId(expenses[0].expenseId);
    }
  }, [expenses, expenseId]);

  const ask = async (q: string) => {
    const text = q.trim();
    if (!text || busy) return;
    if (!isApiEnabled()) {
      const id = `m-${++msgSeq.current}`;
      setMsgs((m) => [...m, { id, q: text, a: "Backend is not configured — set VITE_API_URL to enable ledger-grounded analysis.", cites: [] }]);
      return;
    }
    if (!expenseId) {
      const id = `m-${++msgSeq.current}`;
      setMsgs((m) => [...m, { id, q: text, a: "Pick an expense below first — analysis is scoped to one ledger expense and written to the audit chain.", cites: [] }]);
      return;
    }
    setBusy(true);
    const id = `m-${++msgSeq.current}`;
    setMsgs((m) => [...m, { id, q: text, a: "", cites: [] }]);
    setInput("");
    try {
      const parsed = await askMutation.mutateAsync({ expenseId, question: text });
      setMsgs((m) => m.map((x) => x.id === id ? { ...x, a: parsed.summary, cites: parsed.cites } : x));
    } catch (e) {
      setMsgs((m) => m.map((x) => x.id === id
        ? { ...x, a: e instanceof Error ? `Analysis failed: ${e.message}` : "Analysis failed.", cites: [] }
        : x));
    } finally {
      setBusy(false);
    }
  };

  const agentQ = useAgentHealth();
  return (
    <div>
      <PageHeader eyebrow="Auditor console" title="AI Auditor Copilot" sub="Ledger-grounded analysis via the backend verification route (backend → agent :8002 → ml :8001 → Bedrock/mock) — every query is audit-logged." />
      <p className="mono mb-3 text-[11px]" role="status" style={{ color: "var(--text-muted)" }}>
        BACKEND-ROUTED · {isAgentEnabled() ? (agentQ.isError ? "agent unreachable — local fallback" : agentQ.data ? "agent live" : "agent checking…") : "direct agent URL unset — backend delegates via AGENT_URL"} · ML fused server-side
      </p>
      <div className="mb-4 flex flex-wrap items-center gap-2.5" aria-label="Expense scope">
        <label className="flex items-center gap-2 text-[13px] font-bold" style={{ color: "var(--text-secondary)" }}>
          Expense
          <select
            value={expenseId}
            onChange={(e) => setExpenseId(e.target.value)}
            className="rs-input !w-auto !min-h-[40px] !rounded-full !py-2 text-[13px]"
            aria-label="Select expense to analyze"
          >
            <option value="">Select expense…</option>
            {expenses.map((e) => (
              <option key={e.expenseId} value={e.expenseId}>{e.expenseId.slice(0, 12)}…</option>
            ))}
          </select>
        </label>
        {govQ.isPending && <span className="text-[12px]" style={{ color: "var(--text-muted)" }}>Loading expenses…</span>}
      </div>
      <div className="mb-4 flex flex-wrap gap-2" aria-label="Suggested queries">
        {SUGGESTED.map((c) => <button key={c} type="button" onClick={() => ask(c)} className="rs-btn-secondary rs-btn-sm !rounded-full !font-semibold"><Sparkles size={13} aria-hidden style={{ color: "var(--accent-600)" }} /> {c}</button>)}
      </div>
      <Reveal>
        <div className="rs-card flex max-h-[60vh] min-h-[340px] flex-col overflow-hidden">
          <div className="flex items-center gap-3 border-b px-5 py-3.5" style={{ borderColor: "var(--border-subtle)" }}>
            <span className="flex h-9 w-9 items-center justify-center rounded-2xl text-white" style={{ background: "var(--primary-600)" }}><Sparkles size={17} aria-hidden /></span>
            <div>
              <p className="text-[14px] font-extrabold">Copilot · ledger-grounded</p>
              <p className="mono text-[10.5px]" style={{ color: busy ? "var(--accent-600)" : "var(--risk-low)" }}>{busy ? "● REASONING OVER LEDGER…" : isApiEnabled() ? "● BACKEND-ROUTED · AUDITED" : "● BACKEND NOT CONFIGURED"}</p>
            </div>
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto p-5" aria-live="polite">
            {msgs.length === 0 && (
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>Ask a question above — analysis streams back with ledger citations.</p>
            )}
            {msgs.map((m) => (
              <div key={m.id} className="space-y-2">
                <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rs-inset ml-auto max-w-[85%] px-4 py-3 text-sm font-medium">{m.q}</motion.p>
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="max-w-[92%] rounded-2xl rounded-tl-md border p-4 text-sm leading-6" style={{ borderColor: "var(--border-subtle)", background: "var(--bg-surface-alt)" }}>
                  {m.a
                    ? <><p>{m.a}</p>{m.cites.length > 0 && <p className="mono mt-2.5 flex flex-wrap gap-1 text-[11px]" style={{ color: "var(--text-muted)" }}>Sources: {m.cites.map((c) => <span key={c} className="rounded-md border px-1.5 py-0.5 underline underline-offset-2" style={{ borderColor: "var(--border-subtle)" }}>[{c}]</span>)}</p>}</>
                    : <div className="space-y-2" aria-label="Thinking"><div className="rs-skeleton h-3.5 w-11/12 rounded" /><div className="rs-skeleton h-3.5 w-3/4 rounded" /><p className="mono text-[11px]" style={{ color: "var(--text-muted)" }}>Consulting ledger…</p></div>}
                </motion.div>
              </div>
            ))}
            <div ref={bottom} />
          </div>
          <form className="flex gap-2 border-t p-4" style={{ borderColor: "var(--border-subtle)" }} onSubmit={(e) => { e.preventDefault(); ask(input); }}>
            <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask about invoices, vendors, thresholds…" aria-label="Ask copilot" className="rs-input !rounded-full" disabled={busy} />
            <button type="submit" className="rs-btn-accent rs-btn-sm !rounded-full !px-6" disabled={busy || !input.trim()}>{busy ? "…" : "Ask"}</button>
          </form>
        </div>
      </Reveal>
    </div>
  );
}

export function Approvals() {
  const alertsQ = useFraudAlerts();
  const alerts = ((alertsQ.data ?? []) as LiveAlert[]).filter((a) => (a.status ?? "OPEN") === "OPEN");
  const resolve = useResolveAlert();
  const [note, setNote] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const act = async (a: LiveAlert, status: string) => {
    setBusyId(a.id);
    setNote(null);
    try {
      await resolve.mutateAsync({ id: a.id, status, reason: status === "RESOLVED" ? "approved-after-review" : "escalated-for-field-visit" });
      setNote(`${status} recorded for ${a.id.slice(0, 8)}…`);
    } catch (e) {
      setNote(e instanceof Error ? e.message : "Action failed.");
    } finally {
      setBusyId(null);
    }
  };
  return (
    <div>
      <PageHeader eyebrow="Auditor console" title="Approvals" sub="Live open alerts awaiting auditor sign-off. User onboarding happens in the Cognito console." />
      {alertsQ.isPending ? (
        <div className="rs-card p-6 text-sm" style={{ color: "var(--text-secondary)" }} aria-busy="true">Loading approvals…</div>
      ) : alertsQ.isError ? (
        <div className="rs-card p-6 text-sm font-bold" style={{ color: "var(--risk-high)" }} role="alert">Could not load approvals.</div>
      ) : alerts.length === 0 ? (
        <div className="rs-card p-6 text-sm" style={{ color: "var(--text-secondary)" }}>Nothing awaiting approval.</div>
      ) : (
        <Stagger className="space-y-3">
          {alerts.map((a) => (
            <StaggerItem key={a.id}>
              <div className="rs-card flex flex-wrap items-center gap-4 p-5">
                <span className="eyebrow w-20 !text-[10px]">{a.severity ?? "SIGNAL"}</span>
                <div className="min-w-0 flex-1 basis-56"><p className=" text-[16.5px]">{a.entityType} · {(a.entityId ?? "").slice(0, 20)}</p><p className="mono mt-0.5 text-xs" style={{ color: "var(--text-muted)" }}>{a.id}</p></div>
                <>
                  <button type="button" className="rs-btn-primary rs-btn-sm" disabled={busyId === a.id} onClick={() => act(a, "RESOLVED")}>{busyId === a.id ? "Saving…" : "Approve"}</button>
                  <button type="button" className="rs-btn-secondary rs-btn-sm" disabled={busyId === a.id} onClick={() => act(a, "ESCALATED")}>Escalate</button>
                </>
              </div>
            </StaggerItem>
          ))}
        </Stagger>
      )}
      {note && <p role="status" className="mt-3 text-[13px] font-bold" style={{ color: "var(--risk-low)" }}>{note}</p>}
    </div>
  );
}

export function AllFunds() {
  const govQ = useGovernmentDashboard();
  const expenses = (((govQ.data as { expenses?: (GovExpense & { expenseId: string })[] } | undefined)?.expenses) ?? []);
  return (
    <div>
      <PageHeader eyebrow="Auditor console" title="All Funds & Transactions" sub="Live government ledger view with per-expense verification including ML (0–25pts)." />
      <Reveal>
        <div className="rs-card overflow-x-auto">
          {govQ.isPending ? (
            <p className="p-6 text-sm" style={{ color: "var(--text-secondary)" }} aria-busy="true">Loading ledger…</p>
          ) : govQ.isError ? (
            <p className="p-6 text-sm font-bold" style={{ color: "var(--risk-high)" }} role="alert">Ledger unreachable — auditor sign-in required.</p>
          ) : expenses.length === 0 ? (
            <p className="p-6 text-sm" style={{ color: "var(--text-secondary)" }}>No expenses on the ledger yet.</p>
          ) : (
            <table className="rs-table min-w-[820px]">
              <caption className="sr-only">Live expense ledger</caption>
              <thead><tr><th scope="col">Expense</th><th scope="col">Delivery</th><th scope="col">Risk</th><th scope="col">ML (/25)</th><th scope="col">Alerts</th></tr></thead>
              <tbody>
                {expenses.map((e) => (
                  <tr key={e.expenseId}>
                    <td className="mono font-bold">{e.expenseId.slice(0, 12)}…</td>
                    <td className="font-medium">{e.delivery?.status ?? "—"}</td>
                    <td className="kpi text-[15px] font-semibold">{e.riskScore?.total ?? 0}</td>
                    <td className="mono text-[13px] font-semibold" style={{ color: "var(--text-secondary)" }}>
                      {typeof e.riskScore?.components?.mlAnomalyScore === "number" ? e.riskScore.components.mlAnomalyScore : "—"}
                    </td>
                    <td className="mono text-xs" style={{ color: "var(--text-muted)" }}>{e.alerts?.length ?? 0} flags</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Reveal>
      <p className="mono mt-2 text-[11px]" style={{ color: "var(--text-muted)" }}>
        ML column = riskScore.components.mlAnomalyScore from IsolationForest (isolation-forest-v1) via ml-service :8001 · — means ml-service was unreachable at invoice process time.
      </p>
    </div>
  );
}

export function GeoView() {
  const govQ = useGovernmentDashboard();
  const expenses = (((govQ.data as { expenses?: GovExpense[] } | undefined)?.expenses) ?? []);
  const verified = expenses.filter((e) => e.delivery?.status === "DELIVERY_VERIFIED").length;
  const pending = expenses.filter((e) => e.delivery?.status === "DELIVERY_PENDING").length;
  const flagged = expenses.filter((e) => (e.delivery?.status ?? "").includes("FLAG")).length;
  const items = [
    { name: "Verified", value: verified, label: `${verified} verified`, color: "#0F7A52" },
    { name: "Pending", value: pending, label: `${pending} pending`, color: "#2E7CF6" },
    { name: "Flagged", value: flagged, label: `${flagged} flagged`, color: "#B3272E" },
  ];
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <div>
      <PageHeader eyebrow="Auditor console" title="Delivery Verification" sub="Live delivery outcomes across all expenses. Table is the source of truth." />
      <Reveal>
        <div className="rs-card p-6 md:p-7">
          {govQ.isPending ? (
            <p className="text-sm" style={{ color: "var(--text-secondary)" }} aria-busy="true">Loading verification…</p>
          ) : govQ.isError ? (
            <p className="text-sm font-bold" style={{ color: "var(--risk-high)" }} role="alert">Ledger unreachable — auditor sign-in required.</p>
          ) : (
            <>
              <IsoBars
                ariaLabel={`Delivery verification: ${verified} verified, ${pending} pending, ${flagged} flagged`}
                max={max}
                items={items}
              />
              <table className="rs-table mono mt-5 !text-xs">
                <caption className="sr-only">Delivery verification outcomes</caption>
                <thead><tr><th scope="col">Outcome</th><th scope="col">Count</th></tr></thead>
                <tbody>{items.map((r) => <tr key={r.name}><td className="font-bold">{r.name}</td><td>{r.value}</td></tr>)}</tbody>
              </table>
            </>
          )}
        </div>
      </Reveal>
    </div>
  );
}

export function AuditLog() {
  const govQ = useGovernmentDashboard();
  const chain = (govQ.data as { auditChain?: { valid?: boolean; length?: number } } | undefined)?.auditChain;
  const [q, setQ] = useState("");
  const expenses = (((govQ.data as { expenses?: GovExpense[] } | undefined)?.expenses) ?? []);
  const filtered = expenses.filter((e) => e.expenseId.toLowerCase().includes(q.toLowerCase()));
  return (
    <div>
      <PageHeader eyebrow="Auditor console" title="Audit-Log Search" sub="Hash-chained log verified live against the backend." />
      <Reveal>
        <div className="rs-card mb-4 p-5 text-sm font-bold" role="status" style={{ color: govQ.isError ? "var(--risk-high)" : "var(--risk-low)" }}>
          {govQ.isPending ? "Verifying chain…" : govQ.isError ? "Chain unreachable — auditor sign-in required." : `Chain ${chain?.valid === false ? "BROKEN" : "verified ✓"} — ${chain?.length ?? expenses.length} records recomputed.`}
        </div>
      </Reveal>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter by expense ID…" aria-label="Search audit log" className="rs-input max-w-md !rounded-full" />
      <Reveal className="mt-4">
        <div className="rs-card mono space-y-2 overflow-hidden p-5 text-xs leading-6" style={{ color: "var(--text-secondary)" }} aria-live="polite">
          {filtered.slice(0, 20).map((e, i) => (
            <div key={e.expenseId} className="flex items-center gap-3 border-b pb-2.5" style={{ borderColor: "var(--border-subtle)" }}>
              <span className="rounded-md px-2 py-0.5 font-bold" style={{ background: "var(--bg-surface-alt)" }}>#{i + 1}</span>
              <span>{e.expenseId.slice(0, 16)}… · {e.delivery?.status ?? "—"} · risk {e.riskScore?.total ?? 0}</span>
              <span className="ml-auto font-bold" style={{ color: "var(--risk-low)" }}>✓</span>
            </div>
          ))}
          {filtered.length === 0 && <p>No records match.</p>}
        </div>
      </Reveal>
    </div>
  );
}
