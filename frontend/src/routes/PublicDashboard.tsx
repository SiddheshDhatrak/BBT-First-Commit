import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, Award } from "lucide-react";
import { formatINR, shortINR } from "@/lib/format";
import { useCampaigns, useOrganizations, usePublicMetrics, type PublicMetrics } from "@/lib/queries";
import { PageHeader } from "@/components/composite/Chrome";
import { CountUp } from "@/components/luxe/CountUp";
import { Reveal, Stagger, StaggerItem } from "@/components/luxe/Reveal";
import { TiltCard } from "@/components/viz/Depth";
import { IsoBarChart } from "@/components/viz/IsoBarChart";

const BAR_COLORS = ["#2456D6", "#2E7CF6", "#0F7A52", "#0F6D8A"];

interface CampaignRow { id: string; name: string; targetAmount?: number; disasterId?: string; status?: string }

/** Live ledger strip from GET /dashboard/public. */
function LiveLedgerStrip({ m }: { m: PublicMetrics }) {
  const cells: [string, string][] = [
    ["Donated", formatINR(m.totalDonated)],
    ["Gifts", String(m.donationCount)],
    ["Verified delivery", String(m.deliveryVerifiedExpenses)],
    ["Pending / flagged", `${m.deliveryPendingExpenses} / ${m.deliveryFlaggedExpenses}`],
  ];
  return (
    <Reveal className="mb-4">
      <div className="rs-card flex flex-wrap items-center gap-x-8 gap-y-3 p-5 md:px-7">
        {cells.map(([k, v]) => (
          <span key={k}>
            <span className="mono block text-[10.5px] uppercase tracking-[0.12em]" style={{ color: "var(--text-muted)" }}>{k}</span>
            <span className="kpi block text-[20px] font-extrabold leading-tight">{v}</span>
          </span>
        ))}
        <span className="min-w-0 flex-1 basis-56">
          <span className="mono block text-[10.5px] uppercase tracking-[0.12em]" style={{ color: "var(--text-muted)" }}>By campaign</span>
          <span className="mt-1 block space-y-1.5">
            {m.utilizationByCampaign.slice(0, 4).map((c) => (
              <span key={c.campaignId} className="flex items-center gap-2 text-[12.5px] font-semibold">
                <span className="truncate" style={{ color: "var(--text-secondary)" }}>{c.name}</span>
                <span className="kpi ml-auto">{shortINR(c.donated)}</span>
              </span>
            ))}
          </span>
        </span>
      </div>
    </Reveal>
  );
}

export default function PublicDashboard() {
  const metrics = usePublicMetrics();
  const campaignsQ = useCampaigns();
  const orgsQ = useOrganizations();
  const m = metrics.data;
  const campaigns = ((campaignsQ.data ?? []) as CampaignRow[]);
  const donatedByCampaign = new Map((m?.utilizationByCampaign ?? []).map((c) => [c.campaignId, c.donated]));
  const [id, setId] = useState<string>("");
  const selected = campaigns.find((x) => x.id === id) ?? campaigns[0];
  const donated = selected ? (donatedByCampaign.get(selected.id) ?? 0) : 0;
  const target = selected?.targetAmount ?? 0;

  if (metrics.isPending || campaignsQ.isPending) {
    return (
      <div>
        <PageHeader eyebrow="Public · aggregate only" title="Transparency Dashboard" sub="Privacy-safe view. Fraud counts are aggregates — no investigation detail here." />
        <div className="rs-card p-8 text-center text-sm" style={{ color: "var(--text-secondary)" }} aria-busy="true">Loading live ledger…</div>
      </div>
    );
  }
  if (metrics.isError || !m) {
    return (
      <div>
        <PageHeader eyebrow="Public · aggregate only" title="Transparency Dashboard" sub="Privacy-safe view. Fraud counts are aggregates — no investigation detail here." />
        <div className="rs-card p-8 text-center text-sm font-bold" style={{ color: "var(--risk-high)" }} role="alert">Live ledger unreachable — check backend connection.</div>
      </div>
    );
  }
  if (!selected) {
    return (
      <div>
        <PageHeader eyebrow="Public · aggregate only" title="Transparency Dashboard" sub="Privacy-safe view. Fraud counts are aggregates — no investigation detail here." />
        <LiveLedgerStrip m={m} />
        <div className="rs-card p-8 text-center text-sm" style={{ color: "var(--text-secondary)" }}>No campaigns yet — check back after the first campaign is created.</div>
      </div>
    );
  }
  const data = [
    { name: "Donated", v: donated },
    { name: "Target", v: target },
    { name: "Remaining", v: Math.max(0, target - donated) },
    { name: "Expenses", v: m.expenseCount },
  ];
  const orgs = ((orgsQ.data ?? []) as { id: string; name: string }[]);
  return (
    <div>
      <PageHeader eyebrow="Public · aggregate only" title="Transparency Dashboard" sub="Privacy-safe view. Fraud counts are aggregates — no investigation detail here." />
      <LiveLedgerStrip m={m} />

      <Stagger className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {[["Donated", donated, "To this campaign"], ["Target", target, "Campaign goal"], ["Remaining", Math.max(0, target - donated), "To raise"], ["Gifts", m.donationCount, "Across all campaigns"]].map(([k, v, hint]) => (
          <StaggerItem key={k as string}>
            <TiltCard>
              <div className="rs-card p-5 md:p-6">
                <p className="eyebrow !text-[10px]">{k}</p>
                <p className="kpi mt-2 text-[30px] font-extrabold leading-none md:text-[34px]">
                  {k === "Gifts" ? <CountUp to={v as number} format={(x) => String(Math.round(x))} /> : <CountUp to={v as number} format={(x) => shortINR(x)} />}
                </p>
                <p className="mono mt-2 hidden text-[11px] lg:block" style={{ color: "var(--text-muted)" }} title={k === "Gifts" ? String(v) : formatINR(v as number)}>{hint} · {k === "Gifts" ? String(v) : formatINR(v as number)}</p>
              </div>
            </TiltCard>
          </StaggerItem>
        ))}
      </Stagger>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.45fr_1fr]">
        <Reveal>
          <div className="rs-card h-full p-5 md:p-7">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-[20px] font-extrabold tracking-tight">Fund movement</h2>
                <p className="mono mt-0.5 text-[11px] tracking-wide" style={{ color: "var(--text-muted)" }}>{selected.name.toUpperCase()} · RECONCILED NIGHTLY</p>
              </div>
              <label className="flex items-center gap-2 text-[13px] font-bold" style={{ color: "var(--text-secondary)" }}>
                Campaign
                <select value={selected.id} onChange={(e) => setId(e.target.value)} className="rs-input !w-auto !min-h-[40px] !rounded-full !py-2 text-[13px]" aria-label="Select campaign">
                  {campaigns.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                </select>
              </label>
            </div>
            <div className="mt-3">
              <IsoBarChart
                data={data.map((r, i) => ({ name: r.name, value: r.v, color: BAR_COLORS[i % BAR_COLORS.length] }))}
                formatTick={(v) => shortINR(v)}
                formatExact={(v) => formatINR(v)}
                ariaLabel={`Fund movement for ${selected.name}: donated ${formatINR(donated)}, target ${formatINR(target)}`}
              />
            </div>
            <details className="mt-2 text-xs" style={{ color: "var(--text-secondary)" }}><summary className="cursor-pointer font-bold underline underline-offset-2">View as data table</summary>
              <table className="rs-table mono mt-2 !text-xs">
                <caption className="sr-only">Fund movement for {selected.name}</caption>
                <thead><tr><th scope="col">Stage</th><th scope="col">Amount</th></tr></thead>
                <tbody>{data.map((r) => <tr key={r.name}><td>{r.name}</td><td>{r.name === "Expenses" ? String(r.v) : formatINR(r.v)}</td></tr>)}</tbody>
              </table>
            </details>
          </div>
        </Reveal>

        <Reveal delay={0.08}>
          <div className="rs-card h-full p-5 md:p-7">
            <p className="eyebrow">Participating organisations</p>
            <h2 className="mt-1 flex items-center gap-2 text-[20px] font-extrabold tracking-tight">
              <Award size={19} aria-hidden style={{ color: "var(--primary-600)" }} /> Hall of trust
            </h2>
            <p className="mt-1 text-[13px]" style={{ color: "var(--text-secondary)" }}>
              {orgsQ.isPending ? "Loading organisations…" : orgsQ.isError ? "Sign in to see participating organisations." : `${orgs.length} organisations on the ledger.`}
            </p>
            <div className="mt-4 space-y-2">
              {orgs.slice(0, 5).map((o) => (
                <Link key={o.id} to={`/org/${o.id}`} className="rs-inset flex items-center gap-2 p-3 text-sm font-bold">
                  {o.name} <ArrowUpRight size={14} aria-hidden className="ml-auto" />
                </Link>
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </div>
  );
}
