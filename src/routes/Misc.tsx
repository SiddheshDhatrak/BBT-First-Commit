import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { ArrowRight, CheckCircle2, FileCheck2, Landmark, SlidersHorizontal } from "lucide-react";
import { maskBank, formatINR } from "@/lib/format";
import { PageHeader } from "@/components/composite/Chrome";
import { Reveal, Stagger, StaggerItem } from "@/components/luxe/Reveal";
import { shortINR } from "@/routes/Public";

export function VendorHome() {
  return (
    <div>
      <PageHeader eyebrow="Vendor" title="Vendor Dashboard" sub="Open POs, invoices awaiting payment — white-glove supplier view." />
      <Stagger className="grid gap-4 md:grid-cols-3">
        {[["Open POs", "3", "2 due this week"], ["Awaiting payment", shortINR(114500), "2 invoices"], ["Paid (30d)", shortINR(286000), "Settled via simulated rail"]].map(([k, v, hint]) => (
          <StaggerItem key={k as string}>
            <div className="rs-card p-6"><p className="eyebrow !text-[10px]">{k}</p><p className="kpi mt-2 text-[30px] font-semibold leading-none">{v}</p><p className="mt-1.5 text-[13px]" style={{ color: "var(--text-muted)" }}>{hint}</p></div>
          </StaggerItem>
        ))}
      </Stagger>
    </div>
  );
}

export function VendorKYC() {
  const [sent, setSent] = useState(false);
  return (
    <div>
      <PageHeader eyebrow="Vendor" title="KYC / Registration" sub="GSTIN + bank. Status stays pending until NGO/government verification." />
      <Reveal>
        <form className="rs-card mx-auto max-w-lg overflow-hidden" onSubmit={(e) => { e.preventDefault(); setSent(true); }}>
          <div className="h-1.5" style={{ background: "var(--primary-600)" }} aria-hidden />
          <div className="space-y-4 p-6 md:p-8">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl text-white" style={{ background: "var(--primary-600)" }}><Landmark size={20} aria-hidden /></span>
              <div>
                <p className="text-[18px] font-extrabold tracking-tight">Identity vault</p>
                <p className="mono text-[11px]" style={{ color: "var(--text-muted)" }}>BANK MASKED · GSTIN CHECKSUMMED</p>
              </div>
            </div>
            <label className="block text-sm font-bold" htmlFor="kyc-gstin">GSTIN
              <input id="kyc-gstin" required className="rs-input mono mt-2" placeholder="18ABCFS1234F1Z5" aria-describedby="gstin-help" pattern="^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$" title="15-character GSTIN" />
              <span id="gstin-help" className="mt-1.5 block text-xs font-medium" style={{ color: "var(--text-muted)" }}>15-char format with checksum; verified at onboarding.</span>
            </label>
            <label className="block text-sm font-bold" htmlFor="kyc-bank">Bank account
              <input id="kyc-bank" required inputMode="numeric" className="rs-input mono mt-2" placeholder="50100288124412" minLength={9} maxLength={18} />
            </label>
            <p className="mono rs-inset px-3.5 py-2.5 text-xs" style={{ color: "var(--text-muted)" }}>Stored preview: {maskBank("50100288124412")} (last-4 only)</p>
            <button type="submit" className="rs-btn-primary w-full !min-h-[52px]">{sent ? "Submitted — pending verification" : "Submit for verification"}</button>
            {sent && <motion.p initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} role="status" className="flex items-center justify-center gap-2 text-center text-sm font-bold" style={{ color: "var(--risk-low)" }}><CheckCircle2 size={16} aria-hidden />Received. NGO/government review is pending.</motion.p>}
          </div>
        </form>
      </Reveal>
    </div>
  );
}

export function VendorInvoices() {
  return (
    <div>
      <PageHeader eyebrow="Vendor" title="Submit Invoice" sub="Scoped to your own POs — same pipeline as NGO upload." action={<Link to="/vendor/payments" className="rs-btn-secondary rs-btn-sm">Payment status →</Link>} />
      <Reveal>
        <div className="rs-card space-y-3 p-6 text-sm md:p-7" style={{ color: "var(--text-secondary)" }}>
          {[["PO-221", "Tarpaulin × 500", "Eligible"], ["PO-224", "Rice bags × 200", "Eligible"]].map((r) => (
            <div key={r[0]} className="rs-inset flex items-center gap-4 p-4">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl text-white" style={{ background: "var(--primary-600)" }}><FileCheck2 size={18} aria-hidden /></span>
              <div>
                <span className="mono block text-[14px] font-bold" style={{ color: "var(--text-primary)" }}>{r[0]}</span>
                <span className="text-[13px]">{r[1]}</span>
              </div>
              <span className="ml-auto rounded-full px-3 py-1 text-xs font-extrabold" style={{ color: "var(--risk-low)", background: "color-mix(in srgb, var(--risk-low) 10%, transparent)" }}>{r[2]}</span>
            </div>
          ))}
          <p className="text-[13px] leading-6">Uploads run through Uploaded → Extracted → Checked → Scored → Explained → Routed. Use NGO upload in this demo build.</p>
        </div>
      </Reveal>
    </div>
  );
}

export function VendorPayments() {
  return (
    <div>
      <PageHeader eyebrow="Vendor" title="Payment Status" sub="Simulated rail — synthetic references only." />
      <Reveal>
        <div className="rs-card overflow-x-auto">
          <table className="rs-table min-w-[600px]">
            <caption className="sr-only">Vendor payments</caption>
            <thead><tr><th scope="col">Reference</th><th scope="col">Invoice</th><th scope="col">Amount</th><th scope="col">Status</th></tr></thead>
            <tbody>
              <tr><td className="mono font-bold">TXN-SYN-881212</td><td className="mono">INV-7602</td><td className="kpi text-[15px] font-semibold">{formatINR(48500)}</td><td><span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-extrabold" style={{ color: "var(--risk-low)", background: "color-mix(in srgb, var(--risk-low) 10%, transparent)" }}><CheckCircle2 size={13} aria-hidden />Settled (simulated)</span></td></tr>
              <tr><td className="mono font-bold">TXN-SYN-881198</td><td className="mono">INV-7590</td><td className="kpi text-[15px] font-semibold">{formatINR(66000)}</td><td><span className="rounded-full px-3 py-1 text-xs font-bold" style={{ color: "var(--text-secondary)", background: "var(--bg-surface-alt)" }}>In route (simulated)</span></td></tr>
            </tbody>
          </table>
        </div>
      </Reveal>
    </div>
  );
}

export function AdminUsers() {
  const rows = [["auditor@relief.gov", "auditor", "active"], ["seva@ngo.org", "ngo", "active"], ["trader@vendor.in", "vendor", "pending"]] as const;
  return (
    <div>
      <PageHeader eyebrow="Admin" title="Users & Roles" sub="Assign roles, deactivate/reactivate. No fraud content here (separation of duties)." />
      <Reveal>
        <div className="rs-card overflow-x-auto">
          <table className="rs-table min-w-[600px]">
            <caption className="sr-only">Users and roles</caption>
            <thead><tr><th scope="col">User</th><th scope="col">Role</th><th scope="col">Status</th><th scope="col"><span className="sr-only">Actions</span></th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r[0]}>
                  <td className="font-bold">{r[0]}</td>
                  <td><span className="mono rounded-md px-2 py-1 text-[11.5px] font-bold capitalize" style={{ background: "var(--accent-soft)", color: "var(--accent-600)" }}>{r[1]}</span></td>
                  <td><span className="inline-flex items-center gap-1.5 text-[13px] font-bold" style={{ color: r[2] === "active" ? "var(--risk-low)" : "var(--risk-med)" }}><span className="h-1.5 w-1.5 rounded-full" style={{ background: "currentColor" }} aria-hidden />{r[2]}</span></td>
                  <td className="text-right"><button type="button" className="rs-btn-secondary rs-btn-sm">Manage</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Reveal>
    </div>
  );
}

export function AdminRules() {
  return (
    <div>
      <PageHeader eyebrow="Admin" title="Fraud Rule Thresholds" sub="Enable/disable deterministic rules + per-disaster overrides." />
      <Stagger className="space-y-3">
        {[["DUP-AMT-02", "Duplicate amount window", "48h · enabled"], ["PRICE-BAND", "Emergency price band", "±25% · enabled"], ["NEW-VENDOR", "New-vendor context flag", "30d · enabled"]].map(([id, t, m]) => (
          <StaggerItem key={id}>
            <div className="rs-card flex flex-wrap items-center gap-4 p-5">
              <span className="mono rounded-xl border px-3 py-1.5 text-xs font-bold" style={{ background: "var(--bg-surface-alt)", borderColor: "var(--border-subtle)" }}>{id}</span>
              <p className="min-w-0 flex-1 basis-48 text-[17px] font-extrabold tracking-tight">{t}</p>
              <span className="mono text-xs" style={{ color: "var(--text-muted)" }}>{m}</span>
              <button type="button" className="rs-btn-secondary rs-btn-sm"><SlidersHorizontal size={14} aria-hidden /> Edit threshold</button>
            </div>
          </StaggerItem>
        ))}
      </Stagger>
    </div>
  );
}

export function Forbidden() {
  return (
    <div className="mx-auto max-w-lg py-10 text-center">
      <Reveal>
        <div className="rs-card overflow-hidden p-10">
          <div className="h-1.5" style={{ background: "var(--primary-600)" }} aria-hidden />
          <p className="eyebrow justify-center">403 · Restricted area</p>
          <h1 className="mt-3 text-[32px] font-extrabold tracking-tight">You don't have access here.</h1>
          <p className="mx-auto mt-3 max-w-sm text-sm" style={{ color: "var(--text-secondary)" }}>This area belongs to a different role. Switch accounts or return to your dashboard.</p>
          <div className="mt-6 flex justify-center gap-2.5">
            <Link to="/app" className="rs-btn-primary rs-btn-sm">My dashboard</Link>
            <Link to="/login" className="rs-btn-secondary rs-btn-sm">Switch role</Link>
          </div>
        </div>
      </Reveal>
    </div>
  );
}

export function NotFound() {
  return (
    <div className="mx-auto max-w-lg py-10 text-center">
      <Reveal>
        <div className="rs-card overflow-hidden p-10">
          <div className="h-1.5" style={{ background: "var(--primary-600)" }} aria-hidden />
          <p className="eyebrow justify-center">404 · Page missing</p>
          <h1 className="mt-3 text-[32px] font-extrabold tracking-tight">We couldn't find that page.</h1>
          <p className="mx-auto mt-3 max-w-sm text-sm" style={{ color: "var(--text-secondary)" }}>The link may be mistyped or the page moved. The concierge will escort you home.</p>
          <Link to="/" className="rs-btn-primary rs-btn-sm mt-6">Go home <ArrowRight size={14} aria-hidden /></Link>
        </div>
      </Reveal>
    </div>
  );
}
