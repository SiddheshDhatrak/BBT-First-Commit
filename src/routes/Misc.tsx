import { useState } from "react";
import { Link } from "react-router-dom";
import { maskBank, formatINR } from "@/lib/format";
import { PageHeader } from "@/components/composite/Chrome";
import { shortINR } from "@/routes/Public";

export function VendorHome() {
  return (
    <div>
      <PageHeader eyebrow="Vendor" title="Vendor Dashboard" sub="Open POs, invoices awaiting payment." />
      <div className="grid gap-3.5 md:grid-cols-3">
        {[["Open POs", "3", "2 due this week"], ["Awaiting payment", shortINR(114500), "2 invoices"], ["Paid (30d)", shortINR(286000), "Settled via simulated rail"]].map(([k, v, hint]) => (
          <div key={k as string} className="rs-card p-5"><p className="eyebrow">{k}</p><p className="kpi mt-1 text-[26px] font-extrabold">{v}</p><p className="mt-0.5 text-[13px]" style={{ color: "var(--text-muted)" }}>{hint}</p></div>
        ))}
      </div>
    </div>
  );
}

export function VendorKYC() {
  const [sent, setSent] = useState(false);
  return (
    <div>
      <PageHeader eyebrow="Vendor" title="KYC / Registration" sub="GSTIN + bank. Status stays pending until NGO/government verification." />
      <form className="rs-card mx-auto max-w-md space-y-3.5 p-5 md:p-6" onSubmit={(e) => { e.preventDefault(); setSent(true); }}>
        <label className="block text-sm font-semibold" htmlFor="kyc-gstin">GSTIN
          <input id="kyc-gstin" required className="rs-input mono mt-1.5" placeholder="18ABCFS1234F1Z5" aria-describedby="gstin-help" pattern="^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$" title="15-character GSTIN" />
          <span id="gstin-help" className="mt-1 block text-xs font-normal" style={{ color: "var(--text-muted)" }}>15-char format with checksum; verified at onboarding.</span>
        </label>
        <label className="block text-sm font-semibold" htmlFor="kyc-bank">Bank account
          <input id="kyc-bank" required inputMode="numeric" className="rs-input mono mt-1.5" placeholder="50100288124412" minLength={9} maxLength={18} />
        </label>
        <p className="mono text-xs" style={{ color: "var(--text-muted)" }}>Stored preview: {maskBank("50100288124412")} (last-4 only)</p>
        <button type="submit" className="rs-btn-primary w-full">{sent ? "Submitted — pending verification" : "Submit for verification"}</button>
        {sent && <p role="status" className="text-center text-sm font-semibold" style={{ color: "var(--risk-low)" }}>Received. NGO/government review is pending.</p>}
      </form>
    </div>
  );
}

export function VendorInvoices() {
  return (
    <div>
      <PageHeader eyebrow="Vendor" title="Submit Invoice" sub="Scoped to your own POs — same pipeline as NGO upload." action={<Link to="/vendor/payments" className="rs-btn-secondary rs-btn-sm">Payment status</Link>} />
      <div className="rs-card space-y-2 p-5 text-sm" style={{ color: "var(--text-secondary)" }}>
        {[["PO-221", "Tarpaulin × 500", "Eligible"], ["PO-224", "Rice bags × 200", "Eligible"]].map((r) => (
          <div key={r[0]} className="rs-inset flex items-center gap-3 p-3">
            <span className="mono font-bold" style={{ color: "var(--text-primary)" }}>{r[0]}</span>
            <span>{r[1]}</span>
            <span className="ml-auto text-xs font-bold" style={{ color: "var(--risk-low)" }}>{r[2]}</span>
          </div>
        ))}
        <p className="text-[13px]">Uploads run through Uploaded → Extracted → Checked → Scored → Explained → Routed. Use NGO upload in this demo build.</p>
      </div>
    </div>
  );
}

export function VendorPayments() {
  return (
    <div>
      <PageHeader eyebrow="Vendor" title="Payment Status" sub="Simulated rail — synthetic references only." />
      <div className="rs-card overflow-x-auto">
        <table className="rs-table min-w-[600px]">
          <caption className="sr-only">Vendor payments</caption>
          <thead><tr><th scope="col">Reference</th><th scope="col">Invoice</th><th scope="col">Amount</th><th scope="col">Status</th></tr></thead>
          <tbody>
            <tr><td className="mono font-bold">TXN-SYN-881212</td><td className="mono">INV-7602</td><td className="kpi font-bold">{formatINR(48500)}</td><td><span className="font-bold" style={{ color: "var(--risk-low)" }}>Settled (simulated)</span></td></tr>
            <tr><td className="mono font-bold">TXN-SYN-881198</td><td className="mono">INV-7590</td><td className="kpi font-bold">{formatINR(66000)}</td><td style={{ color: "var(--text-secondary)" }}>In route (simulated)</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function AdminUsers() {
  const rows = [["auditor@relief.gov", "auditor", "active"], ["seva@ngo.org", "ngo", "active"], ["trader@vendor.in", "vendor", "pending"]] as const;
  return (
    <div>
      <PageHeader eyebrow="Admin" title="Users & Roles" sub="Assign roles, deactivate/reactivate. No fraud content here (separation of duties)." />
      <div className="rs-card overflow-x-auto">
        <table className="rs-table min-w-[600px]">
          <caption className="sr-only">Users and roles</caption>
          <thead><tr><th scope="col">User</th><th scope="col">Role</th><th scope="col">Status</th><th scope="col"><span className="sr-only">Actions</span></th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r[0]}><td className="font-semibold">{r[0]}</td><td className="capitalize">{r[1]}</td><td>{r[2]}</td>
                <td className="text-right"><button type="button" className="rs-btn-secondary rs-btn-sm">Manage</button></td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function AdminRules() {
  return (
    <div>
      <PageHeader eyebrow="Admin" title="Fraud Rule Thresholds" sub="Enable/disable deterministic rules + per-disaster overrides." />
      <div className="space-y-2.5">
        {[["DUP-AMT-02", "Duplicate amount window", "48h · enabled"], ["PRICE-BAND", "Emergency price band", "±25% · enabled"], ["NEW-VENDOR", "New-vendor context flag", "30d · enabled"]].map(([id, t, m]) => (
          <div key={id} className="rs-card flex flex-wrap items-center gap-3 p-4">
            <span className="mono rounded-lg px-2 py-1 text-xs font-bold" style={{ background: "var(--bg-surface-alt)" }}>{id}</span>
            <p className="min-w-0 flex-1 basis-48 text-sm font-bold">{t}</p>
            <span className="mono text-xs" style={{ color: "var(--text-muted)" }}>{m}</span>
            <button type="button" className="rs-btn-secondary rs-btn-sm">Edit threshold</button>
          </div>
        ))}
      </div>
    </div>
  );
}

export function Forbidden() {
  return (
    <div className="rs-card mx-auto max-w-md p-8 text-center">
      <p className="eyebrow">403 · Restricted</p>
      <h1 className="rs-h1 mt-1">You don’t have access</h1>
      <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>This area belongs to a different role. Switch accounts or return to your dashboard.</p>
      <div className="mt-4 flex justify-center gap-2">
        <Link to="/app" className="rs-btn-primary rs-btn-sm">My dashboard</Link>
        <Link to="/login" className="rs-btn-secondary rs-btn-sm">Switch role</Link>
      </div>
    </div>
  );
}

export function NotFound() {
  return (
    <div className="rs-card mx-auto max-w-md p-8 text-center">
      <p className="eyebrow">404 · Missing</p>
      <h1 className="rs-h1 mt-1">Page not found</h1>
      <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>The link may be mistyped or the page moved.</p>
      <Link to="/" className="rs-btn-primary rs-btn-sm mt-4">Go home</Link>
    </div>
  );
}
