import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowUpRight, Plus, UploadCloud } from "lucide-react";
import { api } from "@/lib/api";
import {
  useActorClaims,
  useCampaigns,
  useCreateProgram,
  useCreateVendor,
  useOrganizations,
  usePrograms,
  useUploadInvoice,
  useVendors,
} from "@/lib/queries";
import { PageHeader } from "@/components/composite/Chrome";
import { PipelineStepper } from "@/components/composite/Viz";
import { CountUp } from "@/components/luxe/CountUp";
import { Reveal, Stagger, StaggerItem } from "@/components/luxe/Reveal";
import { shortINR } from "@/lib/format";

interface Org { id: string; name: string }
interface Program { id: string; name: string; organizationId?: string; campaignId?: string; status?: string }
interface Vendor { id: string; name: string; status?: string }
interface Campaign { id: string; name: string }

export function OrgDashboard() {
  const programsQ = usePrograms();
  const vendorsQ = useVendors();
  const orgsQ = useOrganizations();
  const programs = ((programsQ.data ?? []) as Program[]);
  const vendors = ((vendorsQ.data ?? []) as Vendor[]);
  const orgs = ((orgsQ.data ?? []) as Org[]);
  const pending = programsQ.isPending || vendorsQ.isPending || orgsQ.isPending;
  const failed = programsQ.isError || vendorsQ.isError || orgsQ.isError;
  return (
    <div>
      <PageHeader eyebrow="NGO portal" title="Org Dashboard" sub="Live programs, vendors and organisations — the morning briefing." />
      {pending ? (
        <div className="rs-card p-8 text-center text-sm" style={{ color: "var(--text-secondary)" }} aria-busy="true">Loading live ledger…</div>
      ) : failed ? (
        <div className="rs-card p-8 text-center text-sm font-bold" style={{ color: "var(--risk-high)" }} role="alert">Ledger unreachable — check sign-in and backend connection.</div>
      ) : (
        <>
          <Stagger className="grid gap-4 md:grid-cols-3">
            {[
              ["Programs", programs.length, "Live on ledger"],
              ["Vendors", vendors.length, "Onboarded"],
              ["Organisations", orgs.length, "Visible to you"],
            ].map(([k, v, hint]) => (
              <StaggerItem key={k as string}>
                <div className="rs-card p-6">
                  <p className="eyebrow !text-[10px]">{k}</p>
                  <p className="kpi mt-2 text-[32px] font-semibold leading-none">
                    <CountUp to={v as number} format={(x) => String(Math.round(x))} />
                  </p>
                  <p className="mt-1.5 text-[13px]" style={{ color: "var(--text-muted)" }}>{hint}</p>
                </div>
              </StaggerItem>
            ))}
          </Stagger>
          <Reveal className="mt-4">
            <div className="rs-card space-y-3 p-6 md:p-8">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <h2 className="text-[22px]">Live programs</h2>
                <Link to="/ngo/programs" className="text-[13px] font-extrabold">Manage programs <ArrowUpRight size={13} aria-hidden className="inline" /></Link>
              </div>
              {programs.length === 0 ? (
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>No programs yet — create the first one below.</p>
              ) : (
                programs.slice(0, 5).map((p) => (
                  <div key={p.id} className="rs-inset flex items-center gap-3 p-4 text-sm font-bold">
                    {p.name}
                    <span className="mono ml-auto text-[11px]" style={{ color: "var(--text-muted)" }}>{p.status ?? "ACTIVE"}</span>
                  </div>
                ))
              )}
            </div>
          </Reveal>
        </>
      )}
    </div>
  );
}

export function Programs() {
  const programsQ = usePrograms();
  const orgsQ = useOrganizations();
  const campaignsQ = useCampaigns();
  const programs = ((programsQ.data ?? []) as Program[]);
  const orgs = ((orgsQ.data ?? []) as Org[]);
  const campaigns = ((campaignsQ.data ?? []) as Campaign[]);
  const create = useCreateProgram();
  const [orgId, setOrgId] = useState("");
  const [campaignId, setCampaignId] = useState("");
  const [name, setName] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    setErr(null);
    try {
      const created = await create.mutateAsync({ organizationId: orgId || orgs[0]?.id, campaignId: campaignId || campaigns[0]?.id, name: name.trim() });
      setMsg(`Program created · ${(created as { id?: string })?.id ?? "recorded"}`);
      setName("");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Create failed.");
    }
  };

  return (
    <div>
      <PageHeader eyebrow="NGO portal" title="Programs" sub="Live programs tied to campaigns. Create new ones against the ledger." />
      <Reveal>
        <form onSubmit={submit} className="rs-card mb-4 grid gap-3 p-5 md:grid-cols-[1fr_1fr_2fr_auto] md:p-6">
          <label className="block text-sm font-bold">Organisation
            <select value={orgId} onChange={(e) => setOrgId(e.target.value)} className="rs-input mt-2" aria-label="Organisation">
              {orgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </label>
          <label className="block text-sm font-bold">Campaign
            <select value={campaignId} onChange={(e) => setCampaignId(e.target.value)} className="rs-input mt-2" aria-label="Campaign">
              {campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          <label className="block text-sm font-bold">Program name
            <input value={name} onChange={(e) => setName(e.target.value)} required minLength={2} className="rs-input mt-2" placeholder="Emergency Food Kits" />
          </label>
          <div className="flex items-end">
            <button type="submit" disabled={create.isPending || orgs.length === 0 || campaigns.length === 0} className="rs-btn-primary rs-btn-sm w-full md:w-auto">
              <Plus size={15} aria-hidden /> {create.isPending ? "Creating…" : "New program"}
            </button>
          </div>
          {msg && <p role="status" className="text-sm font-bold md:col-span-4" style={{ color: "var(--risk-low)" }}>{msg}</p>}
          {err && <p role="alert" className="text-sm font-bold md:col-span-4" style={{ color: "var(--risk-high)" }}>{err}</p>}
        </form>
      </Reveal>
      <Reveal>
        <div className="rs-card overflow-hidden">
          {programsQ.isPending ? (
            <p className="p-6 text-sm" style={{ color: "var(--text-secondary)" }} aria-busy="true">Loading programs…</p>
          ) : programsQ.isError ? (
            <p className="p-6 text-sm font-bold" style={{ color: "var(--risk-high)" }} role="alert">Could not load programs.</p>
          ) : programs.length === 0 ? (
            <p className="p-6 text-sm" style={{ color: "var(--text-secondary)" }}>No programs yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="rs-table min-w-[620px]">
                <caption className="sr-only">Live programs</caption>
                <thead><tr><th scope="col">Program</th><th scope="col">Status</th><th scope="col">ID</th></tr></thead>
                <tbody>
                  {programs.map((p) => (
                    <tr key={p.id}>
                      <td className="text-[16px] font-semibold">{p.name}</td>
                      <td style={{ color: "var(--text-secondary)" }}>{p.status ?? "ACTIVE"}</td>
                      <td className="mono text-xs" style={{ color: "var(--text-muted)" }}>{p.id.slice(0, 12)}…</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Reveal>
    </div>
  );
}

export function InvoiceList() {
  const [lookupId, setLookupId] = useState("");
  const [result, setResult] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const claims = useActorClaims();
  const lookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setResult(null);
    setBusy(true);
    try {
      setResult(await api.invoiceVerification<unknown>(lookupId.trim(), claims));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Lookup failed.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div>
      <PageHeader eyebrow="NGO portal" title="Invoices" sub="Upload → Extracted → Checked → Scored → Explained → Routed." action={<Link to="/ngo/invoices/upload" className="rs-btn-primary rs-btn-sm"><UploadCloud size={15} aria-hidden /> Upload invoice</Link>} />
      <Reveal>
        <div className="rs-card mb-4 p-5 md:p-6"><PipelineStepper current={4} /></div>
      </Reveal>
      <Reveal>
        <form onSubmit={lookup} className="rs-card flex flex-wrap gap-2.5 p-5">
          <input value={lookupId} onChange={(e) => setLookupId(e.target.value)} placeholder="Enter invoice UUID to check verification…" aria-label="Invoice ID" className="rs-input min-w-0 flex-1" required />
          <button type="submit" disabled={busy} className="rs-btn-secondary rs-btn-sm">{busy ? "Checking…" : "Check verification"}</button>
          {err && <p role="alert" className="w-full text-sm font-bold" style={{ color: "var(--risk-high)" }}>{err}</p>}
          {result ? <pre className="mono w-full overflow-x-auto rounded-xl border p-4 text-xs" style={{ borderColor: "var(--border-subtle)", background: "var(--bg-surface-alt)" }}>{JSON.stringify(result, null, 2)}</pre> : null}
        </form>
      </Reveal>
    </div>
  );
}

export function InvoiceUpload() {
  const upload = useUploadInvoice();
  const [purchaseOrderId, setPurchaseOrderId] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [fileKey, setFileKey] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    setErr(null);
    try {
      const created = await upload.mutateAsync({
        purchaseOrderId: purchaseOrderId.trim(),
        invoiceNumber: invoiceNumber.trim(),
        amount: Number(amount),
        fileKey: fileKey.trim(),
      });
      setMsg(`Invoice recorded · ${(created as { id?: string })?.id ?? "see verification lookup"}`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Upload failed.");
    }
  };

  return (
    <div>
      <PageHeader eyebrow="NGO portal" title="Upload invoice" sub="Record invoice metadata against the live ledger. File bytes go to S3 via signed URL (phase 2); fileKey references the stored object." />
      <div className="mx-auto max-w-3xl">
        <form onSubmit={submit} className="rs-card space-y-4 p-6 md:p-8">
          <label className="block text-sm font-bold">Purchase order ID (UUID)<input value={purchaseOrderId} onChange={(e) => setPurchaseOrderId(e.target.value)} required className="rs-input mono mt-2" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" /></label>
          <label className="block text-sm font-bold">Invoice number<input value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} required className="rs-input mt-2" placeholder="INV-2026-0001" /></label>
          <label className="block text-sm font-bold">Amount (INR)<input value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ""))} required inputMode="numeric" className="rs-input mt-2" placeholder="48500" /></label>
          <label className="block text-sm font-bold">Evidence fileKey (S3 object key)<input value={fileKey} onChange={(e) => setFileKey(e.target.value)} required className="rs-input mono mt-2" placeholder="invoices/2026/INV-2026-0001.pdf" /></label>
          {msg && <p role="status" className="text-sm font-bold" style={{ color: "var(--risk-low)" }}>{msg}</p>}
          {err && <p role="alert" className="text-sm font-bold" style={{ color: "var(--risk-high)" }}>{err}</p>}
          <button type="submit" disabled={upload.isPending} className="rs-btn-primary w-full !min-h-[52px]">{upload.isPending ? "Recording…" : "Record invoice"}</button>
        </form>
      </div>
    </div>
  );
}

export function InvoiceDetail() {
  const { id } = useParams();
  const claims = useActorClaims();
  const [result, setResult] = useState<unknown>(null);
  const [busy, setBusy] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!id) {
        setBusy(false);
        setErr("No invoice ID in route.");
        return;
      }
      setBusy(true);
      setErr(null);
      try {
        const data = await api.invoiceVerification<unknown>(id, claims);
        if (!cancelled) setResult(data);
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : "Load failed.");
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);
  return (
    <div>
      <PageHeader eyebrow="Invoice" title={id ? `Invoice ${id.slice(0, 12)}…` : "Invoice"} sub="Live verification record from the backend." />
      <div className="rs-card p-6">
        {busy ? (
          <p className="text-sm" style={{ color: "var(--text-secondary)" }} aria-busy="true">Loading verification…</p>
        ) : err ? (
          <p className="text-sm font-bold" style={{ color: "var(--risk-high)" }} role="alert">{err}</p>
        ) : (
          <pre className="mono overflow-x-auto rounded-xl border p-4 text-xs" style={{ borderColor: "var(--border-subtle)", background: "var(--bg-surface-alt)" }}>{JSON.stringify(result, null, 2)}</pre>
        )}
        <button type="button" onClick={() => window.location.reload()} className="rs-btn-secondary rs-btn-sm mt-4">Refresh</button>
      </div>
    </div>
  );
}

export function NgoAlerts() {
  const vendorsQ = useVendors();
  const create = useCreateVendor();
  const [name, setName] = useState("");
  const [gstin, setGstin] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const vendors = ((vendorsQ.data ?? []) as Vendor[]);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    setErr(null);
    try {
      await create.mutateAsync({ name: name.trim(), gstin: gstin.trim().toUpperCase() });
      setMsg("Vendor submitted for review.");
      setName("");
      setGstin("");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Submit failed.");
    }
  };
  return (
    <div>
      <PageHeader eyebrow="NGO portal" title="Vendors" sub="Onboard vendors against the live ledger. Fraud investigation detail is auditor-only." />
      <form onSubmit={submit} className="rs-card mb-4 grid gap-3 p-5 md:grid-cols-[2fr_2fr_auto]">
        <label className="block text-sm font-bold">Vendor name<input value={name} onChange={(e) => setName(e.target.value)} required className="rs-input mt-2" placeholder="Sharma Suppliers" /></label>
        <label className="block text-sm font-bold">GSTIN<input value={gstin} onChange={(e) => setGstin(e.target.value)} required className="rs-input mono mt-2" placeholder="18ABCFS1234F1Z5" minLength={15} maxLength={15} /></label>
        <div className="flex items-end"><button type="submit" disabled={create.isPending} className="rs-btn-primary rs-btn-sm w-full">{create.isPending ? "Submitting…" : "Onboard vendor"}</button></div>
        {msg && <p role="status" className="text-sm font-bold md:col-span-3" style={{ color: "var(--risk-low)" }}>{msg}</p>}
        {err && <p role="alert" className="text-sm font-bold md:col-span-3" style={{ color: "var(--risk-high)" }}>{err}</p>}
      </form>
      <div className="rs-card overflow-hidden">
        {vendorsQ.isPending ? (
          <p className="p-6 text-sm" style={{ color: "var(--text-secondary)" }} aria-busy="true">Loading vendors…</p>
        ) : vendorsQ.isError ? (
          <p className="p-6 text-sm font-bold" style={{ color: "var(--risk-high)" }} role="alert">Could not load vendors.</p>
        ) : vendors.length === 0 ? (
          <p className="p-6 text-sm" style={{ color: "var(--text-secondary)" }}>No vendors yet.</p>
        ) : (
          <table className="rs-table min-w-[600px]">
            <caption className="sr-only">Live vendors</caption>
            <thead><tr><th scope="col">Vendor</th><th scope="col">Status</th><th scope="col">ID</th></tr></thead>
            <tbody>
              {vendors.map((v) => (
                <tr key={v.id}><td className="font-bold">{v.name}</td><td style={{ color: "var(--text-secondary)" }}>{v.status ?? "PENDING_REVIEW"}</td><td className="mono text-xs" style={{ color: "var(--text-muted)" }}>{v.id.slice(0, 12)}…</td></tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export function OrgScore() {
  const programsQ = usePrograms();
  const vendorsQ = useVendors();
  const programs = ((programsQ.data ?? []) as Program[]).length;
  const vendors = ((vendorsQ.data ?? []) as Vendor[]).length;
  return (
    <div>
      <PageHeader eyebrow="NGO portal" title="Ledger Standing" sub="Live counts from the backend. Numeric trust scoring ships with the ML service." />
      <div className="grid gap-4 lg:max-w-4xl lg:grid-cols-2">
        <Reveal>
          <div className="rs-card h-full p-6 md:p-8">
            <p className="eyebrow">Live standing</p>
            <p className="kpi mt-2 text-[34px] font-extrabold">{programs} programs · {vendors} vendors</p>
            <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>
              Deterministic trust breakdowns (timely reporting, receipt coverage, budget discipline, alert responsiveness) are computed from ledger history. Amounts shown use {shortINR(100000)}-style ledger formatting.
            </p>
          </div>
        </Reveal>
        <Reveal delay={0.1}>
          <div className="flex h-full flex-col justify-between gap-4 rounded-[22px] border p-6" style={{ borderColor: "color-mix(in srgb, var(--accent-500) 40%, transparent)", background: "linear-gradient(160deg,#101c38,#1d2f5c)", color: "#fff" }}>
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-white/70">Field note</p>
              <p className="mt-2 text-[22px] leading-snug">Keep invoices verified to lift standing.</p>
            </div>
            <Link to="/ngo/invoices/upload" className="rs-btn-accent rs-btn-sm w-fit">Upload receipts</Link>
          </div>
        </Reveal>
      </div>
    </div>
  );
}
