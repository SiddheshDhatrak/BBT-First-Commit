import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { ArrowUpDown, Inbox, MapPin, SearchCheck } from "lucide-react";
import { alerts, copilotCanned } from "@/lib/mock";
import { formatINR } from "@/lib/format";
import { PageHeader } from "@/components/composite/Chrome";
import { EvidenceCard, RiskBadge, SignalBanner } from "@/components/composite/Risk";
import { shortINR } from "@/routes/Public";

export function CommandCentre() {
  const cards = [
    ["Open investigations", "18", "3 high signal"],
    ["High-risk vendors", "4", "1 shared payee cluster"],
    ["Pending approvals", "7", "2 KYC · 5 budgets"],
    ["Spend tracked", shortINR(57500000), "Across 3 disasters"],
  ] as const;
  return (
    <div>
      <PageHeader eyebrow="Auditor console" title="Command Centre" sub="Control-room view. Sign in as auditor opens dark — override anytime." />
      <div className="grid grid-cols-2 gap-3.5 xl:grid-cols-4">
        {cards.map(([k, v, hint]) => (
          <div key={k} className="rs-card p-5">
            <p className="eyebrow">{k}</p>
            <p className="kpi mt-1 text-[28px] font-extrabold leading-9">{v}</p>
            <p className="mt-0.5 text-[13px]" style={{ color: "var(--text-muted)" }}>{hint}</p>
          </div>
        ))}
      </div>
      <div className="rs-card mt-3.5 flex flex-wrap items-center gap-3 p-5">
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl" style={{ background: "color-mix(in srgb, var(--primary-600) 12%, var(--bg-surface-alt))", color: "var(--primary-600)" }}>
          <MapPin size={19} aria-hidden />
        </span>
        <p className="min-w-0 flex-1 basis-60 text-sm" style={{ color: "var(--text-secondary)" }}>
          <strong style={{ color: "var(--text-primary)" }}>Kamrup needs a look:</strong> spend is 2.1× the district reference with 2 duplicate-amount flags.
        </p>
        <Link to="/auditor/geo" className="rs-btn-secondary rs-btn-sm">Open district view</Link>
      </div>
    </div>
  );
}

export function InvestigationQueue() {
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  const [sortDesc, setSortDesc] = useState(true);
  const rows = useMemo(() => {
    const f = alerts.filter((a) => (a.title + a.entity + a.id + a.disaster).toLowerCase().includes(q.toLowerCase()));
    return [...f].sort((a, b) => (sortDesc ? b.score - a.score : a.score - b.score));
  }, [q, sortDesc]);

  useEffect(() => {
    setParams(q ? { q } : {}, { replace: true });
  }, [q, setParams]);

  return (
    <div>
      <PageHeader eyebrow="Auditor console" title="Investigation Queue" sub="Sorted by risk score. Every row shows a badge plus one-line evidence." />
      <SignalBanner />
      <div className="mt-3.5 flex flex-wrap gap-2">
        <div className="rs-input flex max-w-sm flex-1 items-center gap-2 !py-2.5">
          <SearchCheck size={15} aria-hidden style={{ color: "var(--text-muted)" }} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter by vendor, rule, ID, disaster…" aria-label="Filter investigations" className="w-full bg-transparent text-sm outline-none" />
        </div>
        <button type="button" onClick={() => setSortDesc((s) => !s)} className="rs-btn-secondary rs-btn-sm" aria-label={sortDesc ? "Sort lowest risk first" : "Sort highest risk first"}>
          <ArrowUpDown size={15} aria-hidden /> Score {sortDesc ? "↓" : "↑"}
        </button>
      </div>
      <div className="rs-card mt-3 overflow-x-auto">
        <table className="rs-table min-w-[760px]">
          <caption className="sr-only">Investigations sorted by risk score</caption>
          <thead><tr><th scope="col">Alert</th><th scope="col">Entity</th><th scope="col">Risk</th><th scope="col">Top evidence</th></tr></thead>
          <tbody>
            {rows.map((a) => (
              <tr key={a.id}>
                <td><Link to={`/auditor/alerts/${a.id}`} className="font-bold">{a.title}</Link><p className="mono mt-0.5 text-xs" style={{ color: "var(--text-muted)" }}>{a.id} · {a.disaster} · {a.date}</p></td>
                <td style={{ color: "var(--text-secondary)" }}>{a.entity}</td>
                <td><RiskBadge severity={a.severity} /><p className="kpi mono mt-1 text-xs" style={{ color: "var(--text-muted)" }}>{a.score.toFixed(2)}</p></td>
                <td className="max-w-[280px] text-[13px]" style={{ color: "var(--text-secondary)" }}>{a.evidence[0].label}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length === 0 && (
        <div className="rs-card mt-3 flex items-center gap-3 p-6">
          <Inbox size={22} aria-hidden style={{ color: "var(--text-muted)" }} />
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}><strong style={{ color: "var(--text-primary)" }}>Queue is clear.</strong> No investigations match “{q}”.</p>
        </div>
      )}
    </div>
  );
}

export function FraudDetail() {
  const { id } = useParams();
  const a = alerts.find((x) => x.id === id) ?? alerts[0];
  const [reason, setReason] = useState("");
  const [done, setDone] = useState<string | null>(null);
  return (
    <div>
      <PageHeader eyebrow={`${a.disaster} · ${a.date}`} title={`Alert ${a.id}`} sub="Full evidence bundle. Resolve or escalate requires a reason code." />
      <SignalBanner />
      <div className="mt-3.5 grid gap-3.5 lg:grid-cols-2">
        <div className="rs-card h-fit p-5 md:p-6">
          <h2 className="rs-h2">Source document vs extracted</h2>
          <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
            <div className="rs-inset p-3.5"><p className="eyebrow">Scanned invoice</p><p className="mono mt-1.5 text-xs leading-5" style={{ color: "var(--text-secondary)" }}>[PDF preview]<br />INV-8821 · {formatINR(48500)}<br />GSTIN 18ABC…F1Z5</p></div>
            <div className="rs-inset p-3.5"><p className="eyebrow">Extracted (Textract)</p><p className="mono mt-1.5 text-xs leading-5">amount = 48500 (0.99)<br />gstin = 18ABC…F1Z5 (0.97)<br />hash = 9f2c…41ab</p></div>
          </div>
          <div className="rs-inset mt-3 p-3.5 text-sm leading-6" style={{ color: "var(--text-secondary)" }}>
            <span className="eyebrow">Machine explanation</span>
            <p className="mt-1"><span style={{ color: "var(--text-primary)" }}>Amounts match a prior invoice within 48h</span> <span className="mono rounded bg-[var(--bg-surface)] px-1 text-xs">[INV-8834]</span>, and the payee account appears across 3 vendors <span className="mono rounded bg-[var(--bg-surface)] px-1 text-xs">[vendor_bank_4412]</span>.</p>
          </div>
          <label className="mt-3 block text-sm font-semibold" htmlFor="fraud-reason">Reason code (required)
            <select id="fraud-reason" value={reason} onChange={(e) => { setReason(e.target.value); setDone(null); }} className="rs-input mt-1.5" required>
              <option value="">Select a reason…</option>
              <option value="duplicate-confirmed">Duplicate confirmed — escalate</option>
              <option value="vendor-clarified">Vendor clarified — resolve</option>
              <option value="false-positive">False positive — resolve</option>
              <option value="needs-field-visit">Needs field visit — escalate</option>
            </select>
          </label>
          <div className="mt-2.5 flex gap-2">
            <button type="button" disabled={!reason} className="rs-btn-primary rs-btn-sm flex-1" onClick={() => setDone(`Resolved as “${reason}”. Logged to hash-chained audit trail.`)}>Resolve</button>
            <button type="button" disabled={!reason} className="rs-btn-secondary rs-btn-sm flex-1" onClick={() => setDone(`Escalated as “${reason}”. Added to command-centre watchlist.`)}>Escalate</button>
          </div>
          {!reason && <p className="mt-1.5 text-xs" style={{ color: "var(--text-muted)" }}>Choose a reason code to enable Resolve / Escalate.</p>}
          {done && <p role="status" className="mt-2 text-sm font-bold" style={{ color: "var(--risk-low)" }}>{done}</p>}
        </div>
        <div>
          <div className="mb-2.5 flex items-center gap-2.5">
            <RiskBadge severity={a.severity} withPulse />
            <span className="kpi text-lg font-extrabold">score {a.score.toFixed(2)}</span>
            <span className="mono text-xs" style={{ color: "var(--text-muted)" }}>{a.entity}</span>
          </div>
          <div className="space-y-2.5" aria-live="polite">
            {a.evidence.map((e, i) => <EvidenceCard key={`${a.id}-${e.source}-${i}`} label={e.label} source={e.source} index={i} />)}
          </div>
        </div>
      </div>
    </div>
  );
}

interface Msg { id: string; q: string; a: string; cites: string[] }

export function Copilot() {
  const [msgs, setMsgs] = useState<Msg[]>([
    { id: "seed-1", q: copilotCanned[2], a: "3 high-risk alerts open for Assam Floods 2026. Top driver is duplicate-amount matching (2 invoices, ₹48,500) on one shared payee account.", cites: ["ALT-1042", "rule:DUP-AMT-02", "doc:INV-8821"] },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);
  useEffect(() => { bottom.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [msgs, busy]);

  const ask = (q: string) => {
    const text = q.trim();
    if (!text || busy) return;
    setBusy(true);
    const id = `m-${Date.now()}`;
    setMsgs((m) => [...m, { id, q: text, a: "", cites: [] }]);
    setInput("");
    window.setTimeout(() => {
      setMsgs((m) => m.map((x) => x.id === id
        ? { ...x, a: "Ledger snapshot: 1 payee-account cluster needs review — •••• 4412 appears across 3 vendors with 2 duplicate-amount pairs. Recommend opening ALT-1042 before releasing PO-224.", cites: ["row:vendor_bank_4412", "ALT-1042", "row:vendor_9182"] }
        : x));
      setBusy(false);
    }, 900);
  };

  return (
    <div>
      <PageHeader eyebrow="Auditor console" title="AI Auditor Copilot" sub="Every sentence cites the rows it came from — never vibes." />
      <div className="mb-3 flex flex-wrap gap-2" aria-label="Suggested queries">
        {copilotCanned.map((c) => <button key={c} type="button" onClick={() => ask(c)} className="rs-btn-secondary rs-btn-sm !font-medium">{c}</button>)}
      </div>
      <div className="rs-card flex max-h-[60vh] min-h-[320px] flex-col p-4 md:p-5" aria-live="polite">
        <div className="flex-1 space-y-3 overflow-y-auto pr-1">
          {msgs.map((m) => (
            <div key={m.id} className="space-y-1.5">
              <p className="rs-inset px-3.5 py-2.5 text-sm"><strong>You:</strong> {m.q}</p>
              <div className="rounded-2xl border p-3.5 text-sm leading-6" style={{ borderColor: "var(--border-subtle)" }}>
                {m.a
                  ? <><p>{m.a}</p><p className="mono mt-2 text-[11px]" style={{ color: "var(--text-muted)" }}>Sources: {m.cites.map((c) => <span key={c} className="mr-1 rounded bg-[var(--bg-surface-alt)] px-1 underline underline-offset-2">[{c}]</span>)}</p></>
                  : <div className="space-y-2" aria-label="Thinking"><div className="rs-skeleton h-3.5 w-11/12 rounded" /><div className="rs-skeleton h-3.5 w-3/4 rounded" /></div>}
              </div>
            </div>
          ))}
          <div ref={bottom} />
        </div>
        <form className="mt-3 flex gap-2 border-t pt-3" style={{ borderColor: "var(--border-subtle)" }} onSubmit={(e) => { e.preventDefault(); ask(input); }}>
          <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask about invoices, vendors, thresholds…" aria-label="Ask copilot" className="rs-input" disabled={busy} />
          <button type="submit" className="rs-btn-primary rs-btn-sm !px-5" disabled={busy || !input.trim()}>{busy ? "…" : "Ask"}</button>
        </form>
      </div>
    </div>
  );
}

export function Approvals() {
  const [decided, setDecided] = useState<Record<string, string>>({});
  const items = [["Seva Sahyog — budget revision ₹12L", "Budget", "Docs 4/4 ✓"], ["Brahmaputra Logistics — vendor KYC", "KYC", "GSTIN ✓ · bank pending"]];
  return (
    <div>
      <PageHeader eyebrow="Auditor console" title="Approvals" sub="NGO/vendor onboarding + high-risk sign-offs with document checklist." />
      <div className="space-y-2.5">
        {items.map(([t, k, docs]) => (
          <div key={t as string} className="rs-card flex flex-wrap items-center gap-3 p-4">
            <span className="eyebrow w-16">{k}</span>
            <div className="min-w-0 flex-1 basis-56"><p className="text-sm font-bold">{t}</p><p className="mono text-xs" style={{ color: "var(--text-muted)" }}>{docs}</p></div>
            {decided[t as string]
              ? <p role="status" className="text-sm font-bold" style={{ color: "var(--risk-low)" }}>{decided[t as string]}</p>
              : <>
                <button type="button" className="rs-btn-primary rs-btn-sm" onClick={() => setDecided((d) => ({ ...d, [t as string]: "Approved ✓ logged" }))}>Approve</button>
                <button type="button" className="rs-btn-secondary rs-btn-sm" onClick={() => setDecided((d) => ({ ...d, [t as string]: "Changes requested — sent back" }))}>Request changes</button>
              </>}
          </div>
        ))}
      </div>
    </div>
  );
}

export function AllFunds() {
  const rows = [["TXN-9001", "Assam Fund → Seva Sahyog", 2000000, "a91f…02ce"], ["TXN-9002", "Seva Sahyog → Sharma Suppliers", 48500, "9f2c…41ab"], ["TXN-9003", "Seva Sahyog → NorthEast Traders", 66000, "77be…10d2"]] as const;
  return (
    <div>
      <PageHeader eyebrow="Auditor console" title="All Funds & Transactions" sub="Full-detail government ledger view. Bank accounts masked to last-4." />
      <div className="rs-card overflow-x-auto">
        <table className="rs-table min-w-[720px]">
          <caption className="sr-only">Full fund ledger</caption>
          <thead><tr><th scope="col">Txn</th><th scope="col">From → To</th><th scope="col">Amount</th><th scope="col">Chain hash</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r[0]}><td className="mono font-bold">{r[0]}</td><td>{r[1]}</td><td className="kpi font-bold">{formatINR(r[2])}</td><td className="mono text-xs" style={{ color: "var(--text-muted)" }}>{r[3]} ✓</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function GeoView() {
  const rows: [string, number, string, number][] = [["Kamrup", 8200000, "High affected", 92], ["Dhemaji", 5400000, "High affected", 61], ["Barpeta", 3100000, "Medium", 35], ["Jorhat", 1900000, "Medium", 22]];
  const max = Math.max(...rows.map((r) => r[1]));
  return (
    <div>
      <PageHeader eyebrow="Auditor console" title="District Expenditure" sub="Spend vs affected population. Table is the source of truth for accessibility." />
      <div className="rs-card p-5">
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4" role="img" aria-label="District spend bars: Kamrup highest, then Dhemaji, Barpeta, Jorhat">
          {rows.map(([name, spend, aff, pct]) => (
            <div key={name} className="rs-inset p-4">
              <p className="flex items-center justify-between text-sm font-bold">{name}<span className="kpi" style={{ color: "var(--primary-600)" }}>{pct}%</span></p>
              <div className="mt-2 h-28 overflow-hidden rounded-xl" style={{ background: "var(--bg-surface)" }}>
                <div className="mx-auto w-12 rounded-t-lg transition-all" style={{ height: `${Math.round((spend / max) * 100)}%`, marginTop: `${100 - Math.round((spend / max) * 100)}%`, background: "linear-gradient(180deg,var(--primary-600),var(--primary-700))" }} />
              </div>
              <p className="kpi mt-2 font-extrabold">{shortINR(spend)}</p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>{aff}</p>
            </div>
          ))}
        </div>
        <table className="rs-table mono mt-4 !text-xs">
          <caption className="sr-only">District spend versus affected population</caption>
          <thead><tr><th scope="col">District</th><th scope="col">Spend</th><th scope="col">Affected</th></tr></thead>
          <tbody>{rows.map((r) => <tr key={r[0]}><td className="font-bold">{r[0]}</td><td>{formatINR(r[1])}</td><td>{r[2]}</td></tr>)}</tbody>
        </table>
      </div>
    </div>
  );
}

export function AuditLog() {
  const [verifying, setVerifying] = useState(false);
  const [ok, setOk] = useState<string | null>(null);
  return (
    <div>
      <PageHeader eyebrow="Auditor console" title="Audit-Log Search" sub="Hash-chained log with visible chain verification." action={
        <button type="button" className="rs-btn-primary rs-btn-sm" disabled={verifying} onClick={() => { setVerifying(true); setOk(null); window.setTimeout(() => { setVerifying(false); setOk("Chain verified ✓ — 8,813 blocks recomputed, 0 breaks."); }, 1200); }}>
          {verifying ? "Verifying…" : "Verify chain integrity"}
        </button>
      } />
      <input placeholder="Search hash, actor, action…" aria-label="Search audit log" className="rs-input max-w-sm" />
      <div className="rs-card mono mt-3 space-y-1.5 p-4 text-xs leading-5" style={{ color: "var(--text-secondary)" }} aria-live="polite">
        <p>#8812 · 2026-09-12 · auditor@relief · RESOLVE ALT-1039 · prev 7c1a… → 9f2c… ✓</p>
        <p>#8813 · 2026-09-12 · system · SCORE INV-8821 = 0.87 · prev 9f2c… → 41ab… ✓</p>
        {verifying && <p className="rs-skeleton h-4 rounded" aria-label="Verifying chain" />}
        {ok && <p role="status" className="font-bold" style={{ color: "var(--risk-low)" }}>{ok}</p>}
      </div>
    </div>
  );
}
