import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { ArrowUpRight, Award } from "lucide-react";
import { disasters, ngos } from "@/lib/mock";
import { formatINR } from "@/lib/format";
import { isApiEnabled } from "@/lib/api";
import { usePublicMetrics, type PublicMetrics } from "@/lib/queries";
import { PageHeader } from "@/components/composite/Chrome";
import { TrustScoreRing } from "@/components/composite/Viz";
import { CountUp } from "@/components/luxe/CountUp";
import { Reveal, Stagger, StaggerItem } from "@/components/luxe/Reveal";
import { TiltCard } from "@/components/viz/Depth";
import { IsoBarChart } from "@/components/viz/IsoBarChart";
import { shortINR } from "@/routes/Public";

const BAR_COLORS = ["#2456D6", "#2E7CF6", "#0F7A52", "#0F6D8A"];

/** Live ledger strip: renders only when VITE_API_URL is set and the call succeeds. */
function LiveLedgerStrip() {
  const live = usePublicMetrics();
  if (!isApiEnabled() || !live.data) return null;
  const m: PublicMetrics = live.data;
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
  const [id, setId] = useState(disasters[0]?.id ?? "");
  const d = disasters.find((x) => x.id === id) ?? disasters[0];
  if (!d) return <div className="rs-card p-8 text-center text-sm" style={{ color: "var(--text-secondary)" }}>No disaster data yet — check back soon.</div>;
  const data = [
    { name: "Collected", v: d.collected },
    { name: "Allocated", v: d.allocated },
    { name: "Spent", v: d.spent },
    { name: "Remaining", v: Math.max(0, d.collected - d.spent) },
  ];
  return (
    <div>
      <PageHeader eyebrow="Public · aggregate only" title="Transparency Dashboard" sub="Privacy-safe view. Fraud counts are aggregates — no investigation detail here." />
      <LiveLedgerStrip />

      <Stagger className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {[["Collected", d.collected, "Total raised"], ["Allocated", d.allocated, "Sent to NGOs"], ["Spent", d.spent, "Paid to vendors"], ["Remaining", d.collected - d.spent, "Unspent balance"]].map(([k, v, hint]) => (
          <StaggerItem key={k as string}>
            <TiltCard>
              <div className="rs-card p-5 md:p-6">
                <p className="eyebrow !text-[10px]">{k}</p>
                <p className="kpi mt-2 text-[30px] font-extrabold leading-none md:text-[34px]">
                  <CountUp to={v as number} format={(x) => shortINR(x)} />
                </p>
                <p className="mono mt-2 hidden text-[11px] lg:block" style={{ color: "var(--text-muted)" }} title={formatINR(v as number)}>{hint} · {formatINR(v as number)}</p>
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
                <p className="mono mt-0.5 text-[11px] tracking-wide" style={{ color: "var(--text-muted)" }}>{d.name.toUpperCase()} · RECONCILED NIGHTLY</p>
              </div>
              <label className="flex items-center gap-2 text-[13px] font-bold" style={{ color: "var(--text-secondary)" }}>
                Disaster
                <select value={id} onChange={(e) => setId(e.target.value)} className="rs-input !w-auto !min-h-[40px] !rounded-full !py-2 text-[13px]" aria-label="Select disaster">
                  {disasters.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                </select>
              </label>
            </div>
            <div className="mt-3">
              <IsoBarChart
                data={data.map((r, i) => ({ name: r.name, value: r.v, color: BAR_COLORS[i % BAR_COLORS.length] }))}
                formatTick={(v) => shortINR(v)}
                formatExact={(v) => formatINR(v)}
                ariaLabel={`Fund movement for ${d.name}: collected ${formatINR(d.collected)}, allocated ${formatINR(d.allocated)}, spent ${formatINR(d.spent)}`}
              />
            </div>
            <details className="mt-2 text-xs" style={{ color: "var(--text-secondary)" }}><summary className="cursor-pointer font-bold underline underline-offset-2">View as data table</summary>
              <table className="rs-table mono mt-2 !text-xs">
                <caption className="sr-only">Fund movement for {d.name}</caption>
                <thead><tr><th scope="col">Stage</th><th scope="col">Amount</th></tr></thead>
                <tbody>{data.map((r) => <tr key={r.name}><td>{r.name}</td><td>{formatINR(r.v)}</td></tr>)}</tbody>
              </table>
            </details>
          </div>
        </Reveal>

        <Reveal delay={0.08}>
          <div className="rs-card h-full p-5 md:p-7">
            <p className="eyebrow">Top NGO by score</p>
            <h2 className="mt-1 flex items-center gap-2 text-[20px] font-extrabold tracking-tight">
              <Award size={19} aria-hidden style={{ color: "var(--primary-600)" }} /> Hall of trust
            </h2>
            <p className="mt-1 text-[13px]" style={{ color: "var(--text-secondary)" }}>Scores always ship with breakdowns.</p>
            <div className="mt-4"><TrustScoreRing score={ngos[0].score} components={ngos[0].components} /></div>
            <Link to={`/org/${ngos[0].id}`} className="mt-3 inline-flex items-center gap-1 text-sm font-extrabold">{ngos[0].name} <ArrowUpRight size={15} aria-hidden /></Link>
          </div>
        </Reveal>
      </div>

      <div className="mb-2 mt-8 flex items-end justify-between">
        <h2 className="text-[22px] font-extrabold tracking-tight">Participating NGOs</h2>
        <p className="mono hidden text-[11px] tracking-wide sm:block" style={{ color: "var(--text-muted)" }}>{ngos.length} VERIFIED PARTNERS</p>
      </div>
      <Stagger className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {ngos.map((n, i) => (
          <StaggerItem key={n.id}>
            <Link to={`/org/${n.id}`} className="rs-card rs-card-lift block p-6">
              <div className="flex items-center justify-between gap-2">
                <span className="mono text-[11px] font-bold" style={{ color: "var(--text-muted)" }}>0{i + 1}</span>
                <span className="kpi rounded-full border px-3 py-1 text-[13px] font-extrabold" style={{ borderColor: "var(--border-subtle)", background: "var(--accent-soft)", color: "var(--primary-600)" }}>{n.score} / 100</span>
              </div>
              <span className="mt-2 block text-[19px] font-extrabold tracking-tight">{n.name}</span>
              <span className="mono mt-1 block text-[11px]" style={{ color: "var(--text-muted)" }}>{n.programs} PROGRAMS · {formatINR(n.spent)} DEPLOYED</span>
              <div className="mt-4 border-t pt-4" style={{ borderColor: "var(--border-subtle)" }}>
                <TrustScoreRing score={n.score} components={n.components} />
              </div>
              <motion.span className="mt-4 inline-flex items-center gap-1 text-[13px] font-extrabold" whileHover={{ x: 3 }}>
                View public profile <ArrowUpRight size={14} aria-hidden />
              </motion.span>
            </Link>
          </StaggerItem>
        ))}
      </Stagger>
    </div>
  );
}
