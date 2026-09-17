import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { FileUp, UploadCloud } from "lucide-react";
import { alerts, ngos } from "@/lib/mock";
import { formatINR } from "@/lib/format";
import { PageHeader } from "@/components/composite/Chrome";
import { BudgetProgressBar, PipelineStepper, PIPELINE_STEPS, TrustScoreRing } from "@/components/composite/Viz";
import { EvidenceCard, RiskBadge, SignalBanner } from "@/components/composite/Risk";
import { shortINR } from "@/routes/Public";

export function OrgDashboard() {
  return (
    <div>
      <PageHeader eyebrow="NGO portal" title="Org Dashboard" sub="Allocations, budget use and open alerts at a glance." />
      <div className="grid gap-3.5 md:grid-cols-3">
        {[
          ["Allocated", 12000000, "Across 5 programs"],
          ["Utilised", 8400000, "70% of allocation"],
          ["Open alerts", `${alerts.length}`, "2 need response"],
        ].map(([k, v, hint]) => (
          <div key={k as string} className="rs-card p-5">
            <p className="eyebrow">{k}</p>
            <p className="kpi mt-1 text-[28px] font-extrabold leading-9">{typeof v === "number" ? shortINR(v) : v}</p>
            <p className="mt-0.5 text-[13px]" style={{ color: "var(--text-muted)" }}>{hint}</p>
          </div>
        ))}
      </div>
      <div className="rs-card mt-3.5 space-y-4 p-5 md:p-6">
        <h2 className="rs-h2">Budget utilisation by category</h2>
        <BudgetProgressBar label="Food" used={3200000} cap={4000000} />
        <BudgetProgressBar label="Medical" used={2800000} cap={3000000} />
        <BudgetProgressBar label="Shelter" used={1900000} cap={2500000} />
      </div>
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
      <PageHeader eyebrow="NGO portal" title="Programs" sub="CRUD tied to campaigns, with per-category caps." action={<button type="button" className="rs-btn-primary rs-btn-sm">New program</button>} />
      <div className="rs-card overflow-x-auto">
        <table className="rs-table min-w-[620px]">
          <caption className="sr-only">Programs with budgets</caption>
          <thead><tr><th scope="col">Program</th><th scope="col">Campaign</th><th scope="col">Budget</th><th scope="col">Spent</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r[0]}>
                <td className="font-bold">{r[0]}</td>
                <td style={{ color: "var(--text-secondary)" }}>{r[1]}</td>
                <td className="kpi font-bold">{formatINR(r[2])}</td>
                <td className="kpi font-bold">{formatINR(r[3])}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function InvoiceList() {
  return (
    <div>
      <PageHeader eyebrow="NGO portal" title="Invoices" sub="Upload → Extracted → Checked → Scored → Explained → Routed." action={<Link to="/ngo/invoices/upload" className="rs-btn-primary rs-btn-sm">Upload invoice</Link>} />
      <div className="rs-card mb-3.5 p-4 md:p-5"><PipelineStepper current={4} /></div>
      <div className="rs-card overflow-x-auto">
        <table className="rs-table min-w-[640px]">
          <caption className="sr-only">Invoices with risk signals</caption>
          <thead><tr><th scope="col">Invoice</th><th scope="col">Vendor</th><th scope="col">Amount</th><th scope="col">Risk</th></tr></thead>
          <tbody>
            <tr>
              <td className="mono font-bold"><Link to="/ngo/invoices/INV-8821">INV-8821</Link></td>
              <td>Sharma Suppliers</td><td className="kpi font-bold">{formatINR(48500)}</td>
              <td><RiskBadge severity="high" /></td>
            </tr>
            <tr>
              <td className="mono font-bold"><Link to="/ngo/invoices/INV-7710">INV-7710</Link></td>
              <td>NorthEast Traders</td><td className="kpi font-bold">{formatINR(66000)}</td>
              <td><RiskBadge severity="medium" /></td>
            </tr>
          </tbody>
        </table>
      </div>
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
      <div
        className="rs-card p-8 text-center md:p-10"
        style={drag ? { borderColor: "var(--primary-600)", boxShadow: "var(--shadow-2)" } : undefined}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); acceptFile(e.dataTransfer.files?.[0]); }}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); inputRef.current?.click(); } }}
        role="button" tabIndex={0} aria-label="Upload invoice PDF or image. Activate to browse files."
      >
        <input ref={inputRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.webp" className="sr-only" tabIndex={-1}
          aria-label="Invoice file" onChange={(e) => acceptFile(e.target.files?.[0])} />
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl" style={{ background: "color-mix(in srgb, var(--primary-600) 12%, var(--bg-surface-alt))", color: "var(--primary-600)" }}>
          <UploadCloud size={24} aria-hidden />
        </span>
        <p className="rs-h2 mt-3">{fileName ?? "Drop invoice PDF / image here"}</p>
        <p className="mx-auto mt-1 max-w-md text-sm" style={{ color: "var(--text-secondary)" }}>
          or <span className="font-bold underline underline-offset-2">browse files</span> · PDF, PNG, JPG up to 10 MB · Textract + fraud pipeline runs async.
        </p>
        {error && <p role="alert" className="mx-auto mt-2 max-w-md text-sm font-semibold" style={{ color: "var(--risk-high)" }}>{error}</p>}
        {running && <p className="mono mt-2 text-xs" style={{ color: "var(--text-muted)" }} aria-live="polite">Processing… stage {stage + 1} of {PIPELINE_STEPS.length}</p>}
      </div>
      <div className="rs-card mt-3.5 p-4 md:p-5">
        <PipelineStepper current={stage} />
        {!running && stage >= PIPELINE_STEPS.length - 1 && (
          <p className="mt-2 flex items-center gap-1.5 text-sm font-semibold" style={{ color: "var(--risk-low)" }}>
            <FileUp size={15} aria-hidden /> Extraction complete — review low-confidence fields in invoice detail.
          </p>
        )}
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
      <div className="mt-3.5 grid gap-3.5 lg:grid-cols-2">
        <div className="rs-card h-fit p-5">
          <h2 className="rs-h2">Extracted data</h2>
          <dl className="mt-3 space-y-2 text-sm">
            {[["Vendor", "Sharma Suppliers"], ["Amount", formatINR(48500)], ["GSTIN", "18ABCFS1234F1Z5"], ["Invoice hash", "9f2c…41ab"], ["Risk score", "0.87 · High signal"]].map(([k, v]) => (
              <div key={k} className="flex items-center justify-between gap-3 border-b pb-2" style={{ borderColor: "var(--border-subtle)" }}>
                <dt style={{ color: "var(--text-secondary)" }}>{k}</dt>
                <dd className="mono text-[13px] font-semibold">{v}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-3"><RiskBadge severity="high" withPulse /></div>
        </div>
        <div className="space-y-2.5" aria-live="polite">
          {a.evidence.map((e, i) => <EvidenceCard key={`${e.source}-${i}`} label={e.label} source={e.source} index={i} />)}
        </div>
      </div>
    </div>
  );
}

export function NgoAlerts() {
  return (
    <div>
      <PageHeader eyebrow="NGO portal" title="My Fraud Alerts" sub="Respond with an explanation or supporting document." />
      <SignalBanner />
      <div className="mt-3.5 space-y-2.5">
        {alerts.map((a) => (
          <div key={a.id} className="rs-card flex flex-wrap items-center gap-3 p-4">
            <RiskBadge severity={a.severity} />
            <div className="min-w-0 flex-1 basis-56">
              <p className="text-sm font-bold">{a.title}</p>
              <p className="mono mt-0.5 text-xs" style={{ color: "var(--text-muted)" }}>{a.id} · {a.entity}</p>
            </div>
            <Link to="/ngo/invoices/INV-8821" className="rs-btn-secondary rs-btn-sm">Respond</Link>
          </div>
        ))}
      </div>
    </div>
  );
}

export function OrgScore() {
  const n = ngos[0];
  return (
    <div>
      <PageHeader eyebrow="NGO portal" title="Transparency Score" sub="Full breakdown with what to fix — never a bare number." />
      <div className="rs-card max-w-2xl p-5 md:p-6">
        <TrustScoreRing score={n.score} components={n.components} />
        <div className="rs-inset mt-4 p-4 text-sm" style={{ color: "var(--text-secondary)" }}>
          <strong style={{ color: "var(--text-primary)" }}>What to fix:</strong> upload pending receipts for 2 programs to lift receipt coverage from 26 → 30.
        </div>
      </div>
    </div>
  );
}
