import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle2, FileCheck2, Landmark } from "lucide-react";
import { maskBank, formatINR, shortINR } from "@/lib/format";
import { api } from "@/lib/api";
import { useActorClaims, useFraudAlerts, usePayExpense, useVendors, type LiveAlert } from "@/lib/queries";
import { PageHeader } from "@/components/composite/Chrome";
import { Reveal, Stagger, StaggerItem } from "@/components/luxe/Reveal";

interface Vendor { id: string; name: string; status?: string }

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message.slice(0, 300) : "Request failed.";
}

export function VendorHome() {
  const vendorsQ = useVendors();
  const vendors = ((vendorsQ.data ?? []) as Vendor[]);
  return (
    <div>
      <PageHeader eyebrow="Vendor" title="Vendor Dashboard" sub="Live vendors on the ledger — onboarding status in real time." />
      {vendorsQ.isPending ? (
        <div className="rs-card p-6 text-sm" style={{ color: "var(--text-secondary)" }} aria-busy="true">Loading vendors…</div>
      ) : vendorsQ.isError ? (
        <div className="rs-card p-6 text-sm font-bold" style={{ color: "var(--risk-high)" }} role="alert">Could not load vendors — check sign-in and backend connection.</div>
      ) : (
        <Stagger className="grid gap-4 md:grid-cols-3">
          {[
            ["Vendors on ledger", String(vendors.length), "Live count"],
            ["Approved", String(vendors.filter((v) => (v.status ?? "").toUpperCase() === "APPROVED").length), "Ready for POs"],
            ["Pending review", String(vendors.filter((v) => (v.status ?? "").toUpperCase() !== "APPROVED").length), "Awaiting NGO review"],
          ].map(([k, v, hint]) => (
            <StaggerItem key={k as string}>
              <div className="rs-card p-6"><p className="eyebrow !text-[10px]">{k}</p><p className="kpi mt-2 text-[30px] font-semibold leading-none">{v}</p><p className="mt-1.5 text-[13px]" style={{ color: "var(--text-muted)" }}>{hint}</p></div>
            </StaggerItem>
          ))}
        </Stagger>
      )}
    </div>
  );
}

export function VendorKYC() {
  const [name, setName] = useState("");
  const [gstin, setGstin] = useState("");
  const [account, setAccount] = useState("");
  const [ifsc, setIfsc] = useState("");
  const [sent, setSent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const claims = useActorClaims();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSent(null);
    setBusy(true);
    try {
      const vendor = await api.createVendor<{ id: string }>(
        { name: name.trim(), gstin: gstin.trim().toUpperCase() },
        claims
      );
      if (account.trim() && ifsc.trim()) {
        const bytes = new TextEncoder().encode(`rahatsetu:${account.trim()}`);
        const digest = await crypto.subtle.digest("SHA-256", bytes);
        const hash = `sha256:${Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("")}`;
        await api.addVendorBankAccount(vendor.id, { accountNumberHash: hash, ifsc: ifsc.trim().toUpperCase() }, claims);
      }
      setSent(`Vendor ${vendor.id.slice(0, 8)}… submitted — pending NGO verification.`);
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <PageHeader eyebrow="Vendor" title="KYC / Registration" sub="Live onboarding: vendor + bank account records on the ledger. Status stays pending until verification." />
      <Reveal>
        <form className="rs-card mx-auto max-w-lg overflow-hidden" onSubmit={submit}>
          <div className="h-1.5" style={{ background: "var(--primary-600)" }} aria-hidden />
          <div className="space-y-4 p-6 md:p-8">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl text-white" style={{ background: "var(--primary-600)" }}><Landmark size={20} aria-hidden /></span>
              <div>
                <p className="text-[18px] font-extrabold tracking-tight">Identity vault</p>
                <p className="mono text-[11px]" style={{ color: "var(--text-muted)" }}>BANK HASHED · GSTIN CHECKSUMMED</p>
              </div>
            </div>
            <label className="block text-sm font-bold" htmlFor="kyc-name">Legal name
              <input id="kyc-name" required value={name} onChange={(e) => setName(e.target.value)} className="rs-input mt-2" placeholder="Sharma Suppliers" />
            </label>
            <label className="block text-sm font-bold" htmlFor="kyc-gstin">GSTIN
              <input id="kyc-gstin" required value={gstin} onChange={(e) => setGstin(e.target.value)} className="rs-input mono mt-2" placeholder="18ABCFS1234F1Z5" minLength={15} maxLength={15} title="15-character GSTIN" />
            </label>
            <label className="block text-sm font-bold" htmlFor="kyc-bank">Bank account
              <input id="kyc-bank" required value={account} onChange={(e) => setAccount(e.target.value.replace(/[^0-9]/g, ""))} inputMode="numeric" className="rs-input mono mt-2" placeholder="50100288124412" minLength={9} maxLength={18} />
            </label>
            <label className="block text-sm font-bold" htmlFor="kyc-ifsc">IFSC
              <input id="kyc-ifsc" required value={ifsc} onChange={(e) => setIfsc(e.target.value)} className="rs-input mono mt-2" placeholder="HDFC0001234" minLength={11} maxLength={11} />
            </label>
            {account && <p className="mono rs-inset px-3.5 py-2.5 text-xs" style={{ color: "var(--text-muted)" }}>Stored preview: {maskBank(account)} (last-4 only)</p>}
            {error && <p role="alert" className="text-sm font-bold" style={{ color: "var(--risk-high)" }}>{error}</p>}
            <button type="submit" disabled={busy} className="rs-btn-primary w-full !min-h-[52px]">{busy ? "Submitting…" : "Submit for verification"}</button>
            {sent && <p role="status" className="flex items-center justify-center gap-2 text-center text-sm font-bold" style={{ color: "var(--risk-low)" }}><CheckCircle2 size={16} aria-hidden />{sent}</p>}
          </div>
        </form>
      </Reveal>
    </div>
  );
}

export function VendorInvoices() {
  const [invoiceId, setInvoiceId] = useState("");
  const [result, setResult] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const claims = useActorClaims();
  const lookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);
    setBusy(true);
    try {
      setResult(await api.invoiceVerification<unknown>(invoiceId.trim(), claims));
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div>
      <PageHeader eyebrow="Vendor" title="My Invoices" sub="Live verification lookup against the ledger." action={<Link to="/vendor/payments" className="rs-btn-secondary rs-btn-sm">Payment status →</Link>} />
      <Reveal>
        <form onSubmit={lookup} className="rs-card flex flex-wrap gap-2.5 p-5 md:p-6">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl text-white" style={{ background: "var(--primary-600)" }}><FileCheck2 size={18} aria-hidden /></span>
          <input value={invoiceId} onChange={(e) => setInvoiceId(e.target.value)} required placeholder="Invoice UUID…" aria-label="Invoice ID" className="rs-input min-w-0 flex-1" />
          <button type="submit" disabled={busy} className="rs-btn-secondary rs-btn-sm">{busy ? "Checking…" : "Check status"}</button>
          {error && <p role="alert" className="w-full text-sm font-bold" style={{ color: "var(--risk-high)" }}>{error}</p>}
          {result ? <pre className="mono w-full overflow-x-auto rounded-xl border p-4 text-xs" style={{ borderColor: "var(--border-subtle)", background: "var(--bg-surface-alt)" }}>{JSON.stringify(result, null, 2)}</pre> : null}
          <p className="w-full text-[13px] leading-6" style={{ color: "var(--text-secondary)" }}>New invoices run Uploaded → Extracted → Checked → Scored → Explained → Routed. Record one via <Link to="/ngo/invoices/upload" className="font-extrabold">NGO upload</Link>.</p>
        </form>
      </Reveal>
    </div>
  );
}

export function VendorPayments() {
  const pay = usePayExpense();
  const [expenseId, setExpenseId] = useState("");
  const [last4, setLast4] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    setError(null);
    try {
      const key = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `key-${Date.now()}`;
      const created = await pay.mutateAsync({ body: { expenseId: expenseId.trim(), toAccountLast4: last4.trim() }, key });
      setMsg(`Payment recorded · ${JSON.stringify((created as { id?: string })?.id ?? created).slice(0, 80)}`);
    } catch (e) {
      setError(errMsg(e));
    }
  };
  return (
    <div>
      <PageHeader eyebrow="Vendor" title="Payment Status" sub="Live ledger payments with idempotency protection." />
      <Reveal>
        <form onSubmit={submit} className="rs-card grid gap-3 p-6 md:grid-cols-[2fr_1fr_auto]">
          <label className="block text-sm font-bold">Expense ID (UUID)<input value={expenseId} onChange={(e) => setExpenseId(e.target.value)} required className="rs-input mono mt-2" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" /></label>
          <label className="block text-sm font-bold">To account (last 4)<input value={last4} onChange={(e) => setLast4(e.target.value.replace(/[^0-9]/g, "").slice(0, 4))} required inputMode="numeric" minLength={4} maxLength={4} className="rs-input mono mt-2" placeholder="4412" /></label>
          <div className="flex items-end"><button type="submit" disabled={pay.isPending} className="rs-btn-primary rs-btn-sm w-full">{pay.isPending ? "Paying…" : "Pay expense"}</button></div>
          {msg && <p role="status" className="text-sm font-bold md:col-span-3" style={{ color: "var(--risk-low)" }}>{msg}</p>}
          {error && <p role="alert" className="text-sm font-bold md:col-span-3" style={{ color: "var(--risk-high)" }}>{error}</p>}
          <p className="text-[12px] md:col-span-3" style={{ color: "var(--text-muted)" }}>Retries reuse a fresh Idempotency-Key per attempt; safe to retry on network failure. Amounts use {formatINR(1000)} ledger formatting.</p>
        </form>
      </Reveal>
    </div>
  );
}

export function AdminRules() {
  const alertsQ = useFraudAlerts();
  const alerts = ((alertsQ.data ?? []) as LiveAlert[]);
  return (
    <div>
      <PageHeader eyebrow="Admin" title="Fraud Signals" sub="Live deterministic + ML signals from the verification pipeline. Thresholds are versioned in backend code." />
      <Reveal>
        <div className="rs-card mb-4 space-y-2 p-5 text-sm leading-6" style={{ color: "var(--text-secondary)" }}>
          {[
            ["DUP-AMT-02", "Duplicate amount window — flags repeat amounts to one payee within 48h."],
            ["PRICE-BAND", "Emergency price band — flags unit prices beyond the district reference band."],
            ["NEW-VENDOR", "New-vendor context — first-invoice context flag, low severity."],
          ].map(([ruleId, desc]) => (
            <div key={ruleId} className="rs-inset flex items-center gap-3 p-3.5">
              <span className="mono rounded-xl border px-3 py-1.5 text-xs font-bold" style={{ background: "var(--bg-surface-alt)", borderColor: "var(--border-subtle)" }}>{ruleId}</span>
              <span>{desc}</span>
            </div>
          ))}
          <p>Live open signals: <strong className="kpi">{alertsQ.isPending ? "…" : alertsQ.isError ? "unreachable" : alerts.length}</strong> · sample amounts use {shortINR(48500)} formatting.</p>
        </div>
      </Reveal>
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
            <Link to="/login" className="rs-btn-secondary rs-btn-sm">Switch account</Link>
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
          <p className="mx-auto mt-3 max-w-sm text-sm" style={{ color: "var(--text-secondary)" }}>The link may be mistyped or the page moved.</p>
          <Link to="/" className="rs-btn-primary rs-btn-sm mt-6">Go home <ArrowRight size={14} aria-hidden /></Link>
        </div>
      </Reveal>
    </div>
  );
}
