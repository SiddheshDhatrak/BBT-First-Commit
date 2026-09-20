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

type AdminUserRow = { email: string; role: string; status: "active" | "pending" | "disabled" };

const DEFAULT_USERS: AdminUserRow[] = [
  { email: "auditor@relief.gov", role: "auditor", status: "active" },
  { email: "seva@ngo.org", role: "ngo", status: "active" },
  { email: "trader@vendor.in", role: "vendor", status: "pending" },
];

export function AdminUsers() {
  const [rows, setRows] = useState<AdminUserRow[]>(() => {
    try {
      const raw = localStorage.getItem("rahatsetu_admin_users");
      if (raw) {
        const parsed = JSON.parse(raw) as AdminUserRow[];
        if (Array.isArray(parsed) && parsed.length) return parsed;
      }
    } catch { /* ignore */ }
    return DEFAULT_USERS;
  });
  const [managing, setManaging] = useState<string | null>(null);
  const [draftRole, setDraftRole] = useState("donor");
  const [draftStatus, setDraftStatus] = useState<AdminUserRow["status"]>("active");
  const [notice, setNotice] = useState<string | null>(null);

  const openManage = (email: string) => {
    const found = rows.find((r) => r.email === email);
    if (!found) return;
    setDraftRole(found.role);
    setDraftStatus(found.status);
    setManaging(email);
    setNotice(null);
  };

  const saveManage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!managing) return;
    setRows((prev) => {
      const next = prev.map((r) => (r.email === managing ? { ...r, role: draftRole, status: draftStatus } : r));
      try { localStorage.setItem("rahatsetu_admin_users", JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
    setNotice(`Saved ${managing} → ${draftRole} / ${draftStatus}.`);
    setManaging(null);
  };

  const toggleStatus = (email: string) => {
    setRows((prev) => {
      const next = prev.map((r) => {
        if (r.email !== email) return r;
        const nextStatus = r.status === "active" ? "disabled" as const : "active" as const;
        return { ...r, status: nextStatus };
      });
      try { localStorage.setItem("rahatsetu_admin_users", JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  };

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
                <tr key={r.email}>
                  <td className="font-bold">{r.email}</td>
                  <td><span className="mono rounded-md px-2 py-1 text-[11.5px] font-bold capitalize" style={{ background: "var(--accent-soft)", color: "var(--accent-600)" }}>{r.role}</span></td>
                  <td><button type="button" onClick={() => toggleStatus(r.email)} title={`Toggle status (currently ${r.status})`} className="inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[13px] font-bold transition-colors hover:bg-[var(--bg-surface-alt)]" style={{ color: r.status === "active" ? "var(--risk-low)" : r.status === "pending" ? "var(--risk-med)" : "var(--risk-high)" }}><span className="h-1.5 w-1.5 rounded-full" style={{ background: "currentColor" }} aria-hidden />{r.status}</button></td>
                  <td className="text-right"><button type="button" onClick={() => openManage(r.email)} aria-haspopup="dialog" className="rs-btn-secondary rs-btn-sm">Manage</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Reveal>
      {notice && <p role="status" className="mt-3 text-[13px] font-bold" style={{ color: "var(--risk-low)" }}>{notice}</p>}
      {managing && (
        <div role="dialog" aria-modal="true" aria-label={`Manage ${managing}`} className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button type="button" aria-label="Close manage dialog" onClick={() => setManaging(null)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <motion.form
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.2 }}
            onSubmit={saveManage}
            className="rs-card relative w-full max-w-md space-y-4 p-6"
          >
            <p className="eyebrow">Manage user</p>
            <p className="mono truncate text-[13px] font-bold">{managing}</p>
            <label className="block text-sm font-bold">Role
              <select value={draftRole} onChange={(e) => setDraftRole(e.target.value)} className="rs-input mt-2">
                <option value="donor">donor</option>
                <option value="ngo">ngo</option>
                <option value="vendor">vendor</option>
                <option value="auditor">auditor</option>
                <option value="admin">admin</option>
              </select>
            </label>
            <label className="block text-sm font-bold">Status
              <select value={draftStatus} onChange={(e) => setDraftStatus(e.target.value as AdminUserRow["status"])} className="rs-input mt-2">
                <option value="active">active</option>
                <option value="pending">pending</option>
                <option value="disabled">disabled</option>
              </select>
            </label>
            <div className="flex gap-2.5">
              <button type="button" onClick={() => setManaging(null)} className="rs-btn-secondary rs-btn-sm flex-1">Cancel</button>
              <button type="submit" className="rs-btn-primary rs-btn-sm flex-1">Save changes</button>
            </div>
          </motion.form>
        </div>
      )}
    </div>
  );
}

type RuleRow = { id: string; title: string; value: number; unit: string; enabled: boolean };

const DEFAULT_RULES: RuleRow[] = [
  { id: "DUP-AMT-02", title: "Duplicate amount window", value: 48, unit: "h", enabled: true },
  { id: "PRICE-BAND", title: "Emergency price band", value: 25, unit: "%", enabled: true },
  { id: "NEW-VENDOR", title: "New-vendor context flag", value: 30, unit: "d", enabled: true },
];

export function AdminRules() {
  const [rules, setRules] = useState<RuleRow[]>(() => {
    try {
      const raw = localStorage.getItem("rahatsetu_admin_rules");
      if (raw) {
        const parsed = JSON.parse(raw) as RuleRow[];
        if (Array.isArray(parsed) && parsed.length) return parsed;
      }
    } catch { /* ignore */ }
    return DEFAULT_RULES;
  });
  const [editing, setEditing] = useState<string | null>(null);
  const [draftValue, setDraftValue] = useState("48");
  const [draftEnabled, setDraftEnabled] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);

  const openEdit = (id: string) => {
    const found = rules.find((r) => r.id === id);
    if (!found) return;
    setDraftValue(String(found.value));
    setDraftEnabled(found.enabled);
    setEditing(id);
    setNotice(null);
  };

  const toggleEnabled = (id: string) => {
    setRules((prev) => {
      const next = prev.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r));
      try { localStorage.setItem("rahatsetu_admin_rules", JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  };

  const saveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    const parsed = Number(draftValue);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setNotice("Enter a value greater than 0.");
      return;
    }
    setRules((prev) => {
      const next = prev.map((r) => (r.id === editing ? { ...r, value: parsed, enabled: draftEnabled } : r));
      try { localStorage.setItem("rahatsetu_admin_rules", JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
    const rule = rules.find((r) => r.id === editing);
    setNotice(`Saved ${editing} → ${parsed}${rule?.unit ?? ""} · ${draftEnabled ? "enabled" : "disabled"}.`);
    setEditing(null);
  };

  const editingRule = rules.find((r) => r.id === editing) ?? null;

  return (
    <div>
      <PageHeader eyebrow="Admin" title="Fraud Rule Thresholds" sub="Enable/disable deterministic rules + per-disaster overrides." />
      <Stagger className="space-y-3">
        {rules.map((r) => (
          <StaggerItem key={r.id}>
            <div className="rs-card flex flex-wrap items-center gap-4 p-5">
              <span className="mono rounded-xl border px-3 py-1.5 text-xs font-bold" style={{ background: "var(--bg-surface-alt)", borderColor: "var(--border-subtle)" }}>{r.id}</span>
              <p className="min-w-0 flex-1 basis-48 text-[17px] font-extrabold tracking-tight">{r.title}</p>
              <button type="button" onClick={() => toggleEnabled(r.id)} title={`Click to ${r.enabled ? "disable" : "enable"}`} aria-pressed={r.enabled} className="mono rounded-full border px-2.5 py-1 text-xs font-bold transition-colors hover:-translate-y-0.5" style={{ borderColor: "var(--border-subtle)", color: r.enabled ? "var(--risk-low)" : "var(--text-muted)", background: r.enabled ? "color-mix(in srgb, var(--risk-low) 10%, transparent)" : "transparent" }}>
                {r.unit === "%" ? `±${r.value}${r.unit}` : `${r.value}${r.unit}`} · {r.enabled ? "enabled" : "disabled"}
              </button>
              <button type="button" onClick={() => openEdit(r.id)} aria-haspopup="dialog" className="rs-btn-secondary rs-btn-sm"><SlidersHorizontal size={14} aria-hidden /> Edit threshold</button>
            </div>
          </StaggerItem>
        ))}
      </Stagger>
      {notice && <p role="status" className="mt-3 text-[13px] font-bold" style={{ color: notice.startsWith("Enter") ? "var(--risk-high)" : "var(--risk-low)" }}>{notice}</p>}
      {editingRule && (
        <div role="dialog" aria-modal="true" aria-label={`Edit ${editingRule.id}`} className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button type="button" aria-label="Close edit threshold dialog" onClick={() => setEditing(null)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <motion.form
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.2 }}
            onSubmit={saveEdit}
            className="rs-card relative w-full max-w-md space-y-4 p-6"
          >
            <p className="eyebrow">Edit threshold</p>
            <p className="text-[16px] font-extrabold tracking-tight">{editingRule.title} <span className="mono text-[12px]" style={{ color: "var(--text-muted)" }}>{editingRule.id}</span></p>
            <label className="block text-sm font-bold" htmlFor="rule-value">Threshold value ({editingRule.unit})
              <input id="rule-value" inputMode="decimal" value={draftValue} onChange={(e) => setDraftValue(e.target.value.replace(/[^0-9.]/g, ""))} className="rs-input mono mt-2" placeholder={String(editingRule.value)} />
            </label>
            <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border px-3.5 py-3 text-sm font-bold" style={{ borderColor: "var(--border-subtle)" }}>
              <span>Rule enabled</span>
              <input type="checkbox" checked={draftEnabled} onChange={(e) => setDraftEnabled(e.target.checked)} className="h-5 w-5 accent-[#2E7CF6]" aria-label="Rule enabled" />
            </label>
            <div className="flex gap-2.5">
              <button type="button" onClick={() => setEditing(null)} className="rs-btn-secondary rs-btn-sm flex-1">Cancel</button>
              <button type="submit" className="rs-btn-primary rs-btn-sm flex-1">Save threshold</button>
            </div>
          </motion.form>
        </div>
      )}
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
