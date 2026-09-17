import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { ArrowUpDown, CheckCircle2, Inbox, MapPin, SearchCheck, Sparkles } from "lucide-react";
import { alerts, copilotCanned } from "@/lib/mock";
import { formatINR } from "@/lib/format";
import { PageHeader } from "@/components/composite/Chrome";
import { EvidenceCard, RiskBadge, SignalBanner } from "@/components/composite/Risk";
import { Reveal, Stagger, StaggerItem } from "@/components/luxe/Reveal";
import { IsoBars } from "@/components/viz/Depth";
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
            <strong className=" text-[16px]" style={{ color: "var(--text-primary)" }}>Kamrup needs a look: </strong>
            spend is 2.1× the district reference with 2 duplicate-amount flags.
          </p>
          <Link to="/auditor/geo" className="rs-btn-secondary rs-btn-sm">Open district view →</Link>
        </div>
      </Reveal>
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
      <div className="mt-4 flex flex-wrap gap-2.5">
        <div className="rs-input flex max-w-md flex-1 items-center gap-2 !rounded-full !py-3">
          <SearchCheck size={16} aria-hidden style={{ color: "var(--text-muted)" }} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter by vendor, rule, ID, disaster…" aria-label="Filter investigations" className="w-full bg-transparent text-sm font-medium outline-none" />
        </div>
        <button type="button" onClick={() => setSortDesc((s) => !s)} className="rs-btn-secondary rs-btn-sm !rounded-full" aria-label={sortDesc ? "Sort lowest risk first" : "Sort highest risk first"}>
          <ArrowUpDown size={15} aria-hidden /> Score {sortDesc ? "↓" : "↑"}
        </button>
      </div>
      <Reveal className="mt-4">
        <div className="rs-card overflow-x-auto">
          <table className="rs-table min-w-[760px]">
            <caption className="sr-only">Investigations sorted by risk score</caption>
            <thead><tr><th scope="col">Alert</th><th scope="col">Entity</th><th scope="col">Risk</th><th scope="col">Top evidence</th></tr></thead>
            <tbody>
              <AnimatePresence initial={false}>
                {rows.map((a) => (
                  <motion.tr key={a.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <td><Link to={`/auditor/alerts/${a.id}`} className=" text-[15px] font-semibold">{a.title}</Link><p className="mono mt-1 text-xs" style={{ color: "var(--text-muted)" }}>{a.id} · {a.disaster} · {a.date}</p></td>
                    <td style={{ color: "var(--text-secondary)" }}>{a.entity}</td>
                    <td><RiskBadge severity={a.severity} /><p className="kpi mono mt-1.5 text-xs" style={{ color: "var(--text-muted)" }}>{a.score.toFixed(2)}</p></td>
                    <td className="max-w-[280px] text-[13px] leading-5" style={{ color: "var(--text-secondary)" }}>{a.evidence[0].label}</td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </Reveal>
      {rows.length === 0 && (
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
  const a = alerts.find((x) => x.id === id) ?? alerts[0];
  const [reason, setReason] = useState("");
  const [done, setDone] = useState<string | null>(null);
  return (
    <div>
      <PageHeader eyebrow={`${a.disaster} · ${a.date}`} title={`Alert ${a.id}`} sub="Full evidence bundle. Resolve or escalate requires a reason code." />
      <SignalBanner />
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Reveal>
          <div className="rs-card h-fit p-6 md:p-7">
            <p className="eyebrow">Forensics</p>
            <h2 className=" mt-1 text-[22px]">Source document vs extracted</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rs-inset p-4"><p className="eyebrow !text-[10px]">Scanned invoice</p><p className="mono mt-2 text-xs leading-6" style={{ color: "var(--text-secondary)" }}>[PDF preview]<br />INV-8821 · {formatINR(48500)}<br />GSTIN 18ABC…F1Z5</p></div>
              <div className="rs-inset p-4"><p className="eyebrow !text-[10px]">Extracted (Textract)</p><p className="mono mt-2 text-xs leading-6">amount = 48500 (0.99)<br />gstin = 18ABC…F1Z5 (0.97)<br />hash = 9f2c…41ab</p></div>
            </div>
            <div className="rs-inset mt-3 p-4 text-sm leading-6" style={{ color: "var(--text-secondary)" }}>
              <span className="eyebrow !text-[10px]">Machine explanation</span>
              <p className="mt-1.5"><span style={{ color: "var(--text-primary)" }} className="font-semibold">Amounts match a prior invoice within 48h</span> <span className="mono rounded bg-[var(--bg-surface)] px-1.5 text-xs">[INV-8834]</span>, and the payee account appears across 3 vendors <span className="mono rounded bg-[var(--bg-surface)] px-1.5 text-xs">[vendor_bank_4412]</span>.</p>
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
              <button type="button" disabled={!reason} className="rs-btn-primary rs-btn-sm flex-1" onClick={() => setDone(`Resolved as “${reason}”. Logged to hash-chained audit trail.`)}>Resolve</button>
              <button type="button" disabled={!reason} className="rs-btn-secondary rs-btn-sm flex-1" onClick={() => setDone(`Escalated as “${reason}”. Added to command-centre watchlist.`)}>Escalate</button>
            </div>
            {!reason && <p className="mt-2 text-xs" style={{ color: "var(--text-muted)" }}>Choose a reason code to enable Resolve / Escalate.</p>}
            {done && <motion.p initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} role="status" className="mt-3 flex items-center gap-2 rounded-xl p-3 text-sm font-bold" style={{ color: "var(--risk-low)", background: "color-mix(in srgb, var(--risk-low) 9%, transparent)" }}><CheckCircle2 size={16} aria-hidden />{done}</motion.p>}
          </div>
        </Reveal>
        <div>
          <div className="rs-card mb-3 flex flex-wrap items-center gap-3 p-4">
            <RiskBadge severity={a.severity} withPulse />
            <span className="kpi text-[20px] font-semibold">score {a.score.toFixed(2)}</span>
            <span className="mono text-xs" style={{ color: "var(--text-muted)" }}>{a.entity}</span>
          </div>
          <div className="space-y-3" aria-live="polite">
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
      <div className="mb-4 flex flex-wrap gap-2" aria-label="Suggested queries">
        {copilotCanned.map((c) => <button key={c} type="button" onClick={() => ask(c)} className="rs-btn-secondary rs-btn-sm !rounded-full !font-semibold"><Sparkles size={13} aria-hidden style={{ color: "var(--accent-600)" }} /> {c}</button>)}
      </div>
      <Reveal>
        <div className="rs-card flex max-h-[60vh] min-h-[340px] flex-col overflow-hidden">
          <div className="flex items-center gap-3 border-b px-5 py-3.5" style={{ borderColor: "var(--border-subtle)" }}>
            <span className="flex h-9 w-9 items-center justify-center rounded-2xl text-white" style={{ background: "var(--primary-600)" }}><Sparkles size={17} aria-hidden /></span>
            <div>
              <p className="text-[14px] font-extrabold">Copilot · ledger-grounded</p>
              <p className="mono text-[10.5px]" style={{ color: busy ? "var(--accent-600)" : "var(--risk-low)" }}>{busy ? "● REASONING OVER LEDGER…" : "● GROUNDED · CITATIONS ON"}</p>
            </div>
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto p-5" aria-live="polite">
            {msgs.map((m) => (
              <div key={m.id} className="space-y-2">
                <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rs-inset ml-auto max-w-[85%] px-4 py-3 text-sm font-medium">{m.q}</motion.p>
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="max-w-[92%] rounded-2xl rounded-tl-md border p-4 text-sm leading-6" style={{ borderColor: "var(--border-subtle)", background: "var(--bg-surface-alt)" }}>
                  {m.a
                    ? <><p>{m.a}</p><p className="mono mt-2.5 flex flex-wrap gap-1 text-[11px]" style={{ color: "var(--text-muted)" }}>Sources: {m.cites.map((c) => <span key={c} className="rounded-md border px-1.5 py-0.5 underline underline-offset-2" style={{ borderColor: "var(--border-subtle)" }}>[{c}]</span>)}</p></>
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
  const [decided, setDecided] = useState<Record<string, string>>({});
  const items = [["Seva Sahyog — budget revision ₹12L", "Budget", "Docs 4/4 ✓"], ["Brahmaputra Logistics — vendor KYC", "KYC", "GSTIN ✓ · bank pending"]];
  return (
    <div>
      <PageHeader eyebrow="Auditor console" title="Approvals" sub="NGO/vendor onboarding + high-risk sign-offs with document checklist." />
      <Stagger className="space-y-3">
        {items.map(([t, k, docs]) => (
          <StaggerItem key={t as string}>
            <div className="rs-card flex flex-wrap items-center gap-4 p-5">
              <span className="eyebrow w-16 !text-[10px]">{k}</span>
              <div className="min-w-0 flex-1 basis-56"><p className=" text-[16.5px]">{t}</p><p className="mono mt-0.5 text-xs" style={{ color: "var(--text-muted)" }}>{docs}</p></div>
              {decided[t as string]
                ? <p role="status" className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-bold" style={{ color: "var(--risk-low)", background: "color-mix(in srgb, var(--risk-low) 9%, transparent)" }}><CheckCircle2 size={15} aria-hidden />{decided[t as string]}</p>
                : <>
                  <button type="button" className="rs-btn-primary rs-btn-sm" onClick={() => setDecided((d) => ({ ...d, [t as string]: "Approved ✓ logged" }))}>Approve</button>
                  <button type="button" className="rs-btn-secondary rs-btn-sm" onClick={() => setDecided((d) => ({ ...d, [t as string]: "Changes requested — sent back" }))}>Request changes</button>
                </>}
            </div>
          </StaggerItem>
        ))}
      </Stagger>
    </div>
  );
}

export function AllFunds() {
  const rows = [["TXN-9001", "Assam Fund → Seva Sahyog", 2000000, "a91f…02ce"], ["TXN-9002", "Seva Sahyog → Sharma Suppliers", 48500, "9f2c…41ab"], ["TXN-9003", "Seva Sahyog → NorthEast Traders", 66000, "77be…10d2"]] as const;
  return (
    <div>
      <PageHeader eyebrow="Auditor console" title="All Funds & Transactions" sub="Full-detail government ledger view. Bank accounts masked to last-4." />
      <Reveal>
        <div className="rs-card overflow-x-auto">
          <table className="rs-table min-w-[720px]">
            <caption className="sr-only">Full fund ledger</caption>
            <thead><tr><th scope="col">Txn</th><th scope="col">From → To</th><th scope="col">Amount</th><th scope="col">Chain hash</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r[0]}><td className="mono font-bold">{r[0]}</td><td className="font-medium">{r[1]}</td><td className="kpi text-[15px] font-semibold">{formatINR(r[2])}</td><td className="mono text-xs" style={{ color: "var(--text-muted)" }}><span className="mr-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full align-middle text-[10px]" style={{ background: "color-mix(in srgb, var(--risk-low) 14%, transparent)", color: "var(--risk-low)" }}>✓</span>{r[3]}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </Reveal>
    </div>
  );
}

export function GeoView() {
  const rows: [string, number, string, number][] = [["Kamrup", 8200000, "High affected", 92], ["Dhemaji", 5400000, "High affected", 61], ["Barpeta", 3100000, "Medium", 35], ["Jorhat", 1900000, "Medium", 22]];
  const max = Math.max(...rows.map((r) => r[1]));
  return (
    <div>
      <PageHeader eyebrow="Auditor console" title="District Expenditure" sub="Spend vs affected population. Table is the source of truth for accessibility." />
      <Reveal>
        <div className="rs-card p-6 md:p-7">
          <IsoBars
            ariaLabel="District spend bars: Kamrup highest, then Dhemaji, Barpeta, Jorhat"
            max={max}
            items={rows.map(([name, spend, aff], i) => ({
              name,
              value: spend,
              label: `${shortINR(spend)} · ${aff}`,
              color: ["#2456D6", "#2E7CF6", "#0F7A52", "#0F6D8A"][i % 4],
            }))}
          />
          <p className="mono mt-3 text-[11px]" style={{ color: "var(--text-muted)" }}>KAMRUP 92 · DHEMAJI 61 · BARPETA 35 · JORHAT 22 — INDEX VS REFERENCE</p>
          <table className="rs-table mono mt-5 !text-xs">
            <caption className="sr-only">District spend versus affected population</caption>
            <thead><tr><th scope="col">District</th><th scope="col">Spend</th><th scope="col">Affected</th></tr></thead>
            <tbody>{rows.map((r) => <tr key={r[0]}><td className="font-bold">{r[0]}</td><td>{formatINR(r[1])}</td><td>{r[2]}</td></tr>)}</tbody>
          </table>
        </div>
      </Reveal>
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
      <input placeholder="Search hash, actor, action…" aria-label="Search audit log" className="rs-input max-w-md !rounded-full" />
      <Reveal className="mt-4">
        <div className="rs-card mono space-y-2 overflow-hidden p-5 text-xs leading-6" style={{ color: "var(--text-secondary)" }} aria-live="polite">
          <div className="flex items-center gap-3 border-b pb-2.5" style={{ borderColor: "var(--border-subtle)" }}>
            <span className="rounded-md px-2 py-0.5 font-bold" style={{ background: "var(--bg-surface-alt)" }}>#8812</span>
            <span>2026-09-12 · auditor@relief · RESOLVE ALT-1039 · prev 7c1a… → 9f2c…</span>
            <span className="ml-auto font-bold" style={{ color: "var(--risk-low)" }}>✓</span>
          </div>
          <div className="flex items-center gap-3 border-b pb-2.5" style={{ borderColor: "var(--border-subtle)" }}>
            <span className="rounded-md px-2 py-0.5 font-bold" style={{ background: "var(--bg-surface-alt)" }}>#8813</span>
            <span>2026-09-12 · system · SCORE INV-8821 = 0.87 · prev 9f2c… → 41ab…</span>
            <span className="ml-auto font-bold" style={{ color: "var(--risk-low)" }}>✓</span>
          </div>
          {verifying && <p className="rs-skeleton h-4 rounded" aria-label="Verifying chain" />}
          {ok && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} role="status" className="flex items-center gap-2 rounded-xl p-3 font-bold" style={{ color: "var(--risk-low)", background: "color-mix(in srgb, var(--risk-low) 9%, transparent)" }}><CheckCircle2 size={15} aria-hidden />{ok}</motion.p>}
        </div>
      </Reveal>
    </div>
  );
}
