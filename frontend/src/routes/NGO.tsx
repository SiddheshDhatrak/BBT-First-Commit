import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { ArrowUpRight, FileUp, Plus, UploadCloud } from "lucide-react";
import { alerts, ngos } from "@/lib/mock";
import { formatINR } from "@/lib/format";
import { PageHeader } from "@/components/composite/Chrome";
import { BudgetProgressBar, PipelineStepper, PIPELINE_STEPS, TrustScoreRing } from "@/components/composite/Viz";
import { EvidenceCard, RiskBadge, SignalBanner } from "@/components/composite/Risk";
import { CountUp } from "@/components/luxe/CountUp";
import { Reveal, Stagger, StaggerItem } from "@/components/luxe/Reveal";
import { shortINR } from "@/routes/Public";

export function OrgDashboard() {
  return (
    <div>
      <PageHeader eyebrow="NGO portal" title="Org Dashboard" sub="Allocations, budget use and open alerts — the morning briefing." />
      <Stagger className="grid gap-4 md:grid-cols-3">
        {[
          ["Allocated", 12000000, "Across 5 programs"],
          ["Utilised", 8400000, "70% of allocation"],
          ["Open alerts", `${alerts.length}`, "2 need response"],
        ].map(([k, v, hint]) => (
          <StaggerItem key={k as string}>
            <div className="rs-card p-6">
              <p className="eyebrow !text-[10px]">{k}</p>
              <p className="kpi mt-2 text-[32px] font-semibold leading-none">
                {typeof v === "number" ? <CountUp to={v} format={(x) => shortINR(x)} /> : v}
              </p>
              <p className="mt-1.5 text-[13px]" style={{ color: "var(--text-muted)" }}>{hint}</p>
            </div>
          </StaggerItem>
        ))}
      </Stagger>
      <Reveal className="mt-4">
        <div className="rs-card space-y-5 p-6 md:p-8">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <h2 className="text-[22px]">Budget utilisation by category</h2>
            <Link to="/ngo/programs" className="text-[13px] font-extrabold">Manage programs <ArrowUpRight size={13} aria-hidden className="inline" /></Link>
          </div>
          <BudgetProgressBar label="Food" used={3200000} cap={4000000} />
          <BudgetProgressBar label="Medical" used={2800000} cap={3000000} />
          <BudgetProgressBar label="Shelter" used={1900000} cap={2500000} />
        </div>
      </Reveal>
    </div>
  );
}

export function Programs() {
  const rows = [
    ["Flood Food Relief", "Assam Floods 2026", 4000000, 3200000],
    ["Emergency Medical", "Assam Floods 2026", 3000000, 2800000],
  ] as const;
  return (
    <div>
      <PageHeader eyebrow="NGO portal" title="Programs" sub="CRUD tied to campaigns, with per-category caps." action={<button type="button" className="rs-btn-primary rs-btn-sm"><Plus size={15} aria-hidden /> New program</button>} />
      <Reveal>
        <div className="rs-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="rs-table min-w-[620px]">
              <caption className="sr-only">Programs with budgets</caption>
              <thead><tr><th scope="col">Program</th><th scope="col">Campaign</th><th scope="col">Budget</th><th scope="col">Spent</th><th scope="col">Use</th></tr></thead>
              <tbody>
                {rows.map((r) => {
                  const pct = Math.round((r[3] / r[2]) * 100);
                  return (
                    <tr key={r[0]}>
                      <td className="text-[16px] font-semibold">{r[0]}</td>
                      <td style={{ color: "var(--text-secondary)" }}>{r[1]}</td>
                      <td className="kpi font-semibold">{formatINR(r[2])}</td>
                      <td className="kpi font-semibold">{formatINR(r[3])}</td>
                      <td><span className="mono rounded-full px-2.5 py-1 text-[11px] font-bold" style={{ background: "var(--accent-soft)", color: "var(--accent-600)" }}>{pct}%</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </Reveal>
    </div>
  );
}

export function InvoiceList() {
  return (
    <div>
      <PageHeader eyebrow="NGO portal" title="Invoices" sub="Upload → Extracted → Checked → Scored → Explained → Routed." action={<Link to="/ngo/invoices/upload" className="rs-btn-primary rs-btn-sm"><UploadCloud size={15} aria-hidden /> Upload invoice</Link>} />
      <Reveal>
        <div className="rs-card mb-4 p-5 md:p-6"><PipelineStepper current={4} /></div>
      </Reveal>
      <Reveal delay={0.05}>
        <div className="rs-card overflow-x-auto">
          <table className="rs-table min-w-[640px]">
            <caption className="sr-only">Invoices with risk signals</caption>
            <thead><tr><th scope="col">Invoice</th><th scope="col">Vendor</th><th scope="col">Amount</th><th scope="col">Risk</th><th scope="col"><span className="sr-only">Open</span></th></tr></thead>
            <tbody>
              {[
                ["INV-8821", "Sharma Suppliers", 48500, "high"],
                ["INV-7710", "NorthEast Traders", 66000, "medium"],
              ].map((r) => (
                <tr key={r[0] as string}>
                  <td className="mono font-bold"><Link to={`/ngo/invoices/${r[0]}`}>{r[0]}</Link></td>
                  <td>{r[1]}</td><td className="kpi text-[15px] font-semibold">{formatINR(r[2] as number)}</td>
                  <td><RiskBadge severity={r[3] as "high" | "medium"} /></td>
                  <td className="text-right"><Link to={`/ngo/invoices/${r[0]}`} className="font-extrabold" aria-label={`Open ${r[0]}`}>→</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Reveal>
    </div>
  );
}

export function InvoiceUpload() {
  const [stage, setStage] = useState(0);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);
  const [running, setRunning] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const timer = useRef<number | null>(null);

  const stop = () => { if (timer.current) { window.clearInterval(timer.current); timer.current = null; } setRunning(false); };
  useEffect(() => () => stop(), []);

  const acceptFile = (f: File | undefined) => {
    setError(null);
    if (!f) return;
    const okType = /pdf|image/i.test(f.type) || /\.(pdf|png|jpe?g|webp)$/i.test(f.name);
    if (!okType) { setError("Only PDF or image invoices are accepted in this demo."); return; }
    if (f.size > 10 * 1024 * 1024) { setError("File is larger than 10 MB."); return; }
    setFileName(`${f.name} · ${(f.size / 1024).toFixed(0)} KB`);
    setStage(1);
    setRunning(true);
    stop();
    timer.current = window.setInterval(() => {
      setStage((s) => {
        if (s >= PIPELINE_STEPS.length - 1) { stop(); return s; }
        return s + 1;
      });
    }, 900);
  };

  return (
    <div>
      <PageHeader eyebrow="NGO portal" title="Upload invoice" sub="Drag-drop PDF/image. Live stepper binds to real pipeline status when backend is ready." />
      <div className="mx-auto max-w-3xl">
        <motion.div
          className="rs-card relative overflow-hidden p-10 text-center md:p-14"
          animate={drag ? { scale: 1.01, borderColor: "var(--accent-500)" } : { scale: 1 }}
          style={drag ? { boxShadow: "var(--shadow-3)" } : undefined}
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); acceptFile(e.dataTransfer.files?.[0]); }}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); inputRef.current?.click(); } }}
          role="button" tabIndex={0} aria-label="Upload invoice PDF or image. Activate to browse files."
        >
          <div className="absolute left-1/2 top-0 h-32 w-96 -translate-x-1/2 rounded-full blur-3xl" style={{ background: "radial-gradient(circle, rgba(46,124,246,.12), transparent 65%)" }} aria-hidden />
          <input ref={inputRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.webp" className="sr-only" tabIndex={-1}
            aria-label="Invoice file" onChange={(e) => acceptFile(e.target.files?.[0])} />
          <motion.span
            className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-3xl"
            style={{ background: "var(--primary-600)", color: "#fff", boxShadow: "var(--shadow-2)" }}
            animate={drag ? { scale: 1.12, rotate: -6 } : { scale: 1, rotate: 0 }}
          >
            <UploadCloud size={28} aria-hidden />
          </motion.span>
          <p className="relative mt-5 text-[24px]">{fileName ?? "Drop invoice PDF / image here"}</p>
          <p className="relative mx-auto mt-2 max-w-md text-sm" style={{ color: "var(--text-secondary)" }}>
            or <span className="font-extrabold underline underline-offset-2">browse files</span> · PDF, PNG, JPG up to 10 MB · Textract + fraud pipeline runs async.
          </p>
          {error && <p role="alert" className="relative mx-auto mt-3 max-w-md rounded-xl border p-3 text-sm font-bold" style={{ color: "var(--risk-high)", borderColor: "color-mix(in srgb, var(--risk-high) 40%, transparent)", background: "color-mix(in srgb, var(--risk-high) 8%, transparent)" }}>{error}</p>}
          {running && <p className="mono relative mt-3 text-xs" style={{ color: "var(--text-muted)" }} aria-live="polite">Processing… stage {stage + 1} of {PIPELINE_STEPS.length}</p>}
        </motion.div>
        <div className="rs-card mt-4 p-5 md:p-6">
          <PipelineStepper current={stage} />
          {!running && stage >= PIPELINE_STEPS.length - 1 && (
            <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-3 flex items-center gap-2 rounded-xl p-3 text-sm font-bold" style={{ color: "var(--risk-low)", background: "color-mix(in srgb, var(--risk-low) 9%, transparent)" }}>
              <FileUp size={16} aria-hidden /> Extraction complete — review low-confidence fields in invoice detail.
            </motion.p>
          )}
        </div>
      </div>
    </div>
  );
}

export function InvoiceDetail() {
  const a = alerts[0];
  return (
    <div>
      <PageHeader eyebrow="Invoice" title="INV-8821 · Sharma Suppliers" sub="Extracted fields with risk explanation and evidence." />
      <SignalBanner />
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Reveal>
          <div className="rs-card h-fit overflow-hidden">
            <div className="h-1" style={{ background: "linear-gradient(90deg,#b3272e,#ecb654)" }} aria-hidden />
            <div className="p-6">
              <p className="eyebrow">Extracted dossier</p>
              <h2 className="mt-1 text-[22px]">Extracted data</h2>
              <dl className="mt-4 space-y-2.5 text-sm">
                {[["Vendor", "Sharma Suppliers"], ["Amount", formatINR(48500)], ["GSTIN", "18ABCFS1234F1Z5"], ["Invoice hash", "9f2c…41ab"], ["Risk score", "0.87 · High signal"]].map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between gap-3 border-b pb-2.5" style={{ borderColor: "var(--border-subtle)" }}>
                    <dt style={{ color: "var(--text-secondary)" }}>{k}</dt>
                    <dd className="mono text-[13px] font-bold">{v}</dd>
                  </div>
                ))}
              </dl>
              <div className="mt-4"><RiskBadge severity="high" withPulse /></div>
            </div>
          </div>
        </Reveal>
        <div className="space-y-3" aria-live="polite">
          {a.evidence.map((e, i) => <EvidenceCard key={`${e.source}-${i}`} label={e.label} source={e.source} index={i} />)}
        </div>
      </div>
    </div>
  );
}

export function NgoAlerts() {
  return (
    <div>
      <PageHeader eyebrow="NGO portal" title="My Fraud Alerts" sub="Respond with an explanation or supporting document — concierge handles the rest." />
      <SignalBanner />
      <Stagger className="mt-4 space-y-3">
        {alerts.map((a) => (
          <StaggerItem key={a.id}>
            <div className="rs-card flex flex-wrap items-center gap-4 p-5">
              <RiskBadge severity={a.severity} />
              <div className="min-w-0 flex-1 basis-56">
                <p className="text-[16.5px] leading-snug">{a.title}</p>
                <p className="mono mt-1 text-xs" style={{ color: "var(--text-muted)" }}>{a.id} · {a.entity}</p>
              </div>
              <Link to="/ngo/invoices/INV-8821" className="rs-btn-secondary rs-btn-sm">Respond →</Link>
            </div>
          </StaggerItem>
        ))}
      </Stagger>
    </div>
  );
}

export function OrgScore() {
  const n = ngos[0];
  return (
    <div>
      <PageHeader eyebrow="NGO portal" title="Transparency Score" sub="Full breakdown with what to fix — never a bare number." />
      <div className="grid gap-4 lg:max-w-4xl lg:grid-cols-[1.2fr_.8fr]">
        <Reveal>
          <div className="rs-card h-full p-6 md:p-8">
            <TrustScoreRing score={n.score} components={n.components} />
          </div>
        </Reveal>
        <Reveal delay={0.1}>
          <div className="flex h-full flex-col justify-between gap-4 rounded-[22px] border p-6" style={{ borderColor: "color-mix(in srgb, var(--accent-500) 40%, transparent)", background: "linear-gradient(160deg,#101c38,#1d2f5c)", color: "#fff" }}>
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-white/70">Field note</p>
              <p className="mt-2 text-[22px] leading-snug">Upload 2 pending receipts to lift coverage 26 → 30.</p>
            </div>
            <Link to="/ngo/invoices/upload" className="rs-btn-accent rs-btn-sm w-fit">Upload receipts</Link>
          </div>
        </Reveal>
      </div>
    </div>
  );
}
