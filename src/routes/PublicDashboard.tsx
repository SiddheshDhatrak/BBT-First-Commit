import { useState } from "react";
import { Link } from "react-router-dom";
import { Cell, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowUpRight } from "lucide-react";
import { disasters, ngos } from "@/lib/mock";
import { formatINR } from "@/lib/format";
import { PageHeader } from "@/components/composite/Chrome";
import { TrustScoreRing } from "@/components/composite/Viz";
import { shortINR } from "@/routes/Public";

const BAR_COLORS = ["#14499a", "#2f6fd0", "#157a54", "#d9871f"];

// Lazy-loaded so recharts stays out of the initial bundle (§16)
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
      <div className="grid grid-cols-2 gap-3.5 xl:grid-cols-4">
        {[["Collected", d.collected, "Total raised"], ["Allocated", d.allocated, "Sent to NGOs"], ["Spent", d.spent, "Paid to vendors"], ["Remaining", d.collected - d.spent, "Unspent balance"]].map(([k, v, hint], i) => (
          <div key={k as string} className={`rs-card p-4 md:p-5 ${i === 0 ? "!border-[var(--primary-600)] shadow-[var(--shadow-2)]" : ""}`}>
            <p className="eyebrow">{k}</p>
            <p className="kpi mt-1 text-[26px] font-extrabold leading-8">{shortINR(v as number)}</p>
            <p className="mono mt-0.5 hidden text-[11px] lg:block" style={{ color: "var(--text-muted)" }} title={formatINR(v as number)}>{hint} · {formatINR(v as number)}</p>
          </div>
        ))}
      </div>

      <div className="mt-3.5 grid gap-3.5 lg:grid-cols-[1.4fr_1fr]">
        <div className="rs-card p-4 md:p-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="rs-h2">Fund movement</h2>
            <label className="flex items-center gap-2 text-[13px] font-medium" style={{ color: "var(--text-secondary)" }}>
              Disaster
              <select value={id} onChange={(e) => setId(e.target.value)} className="rs-input !w-auto !min-h-[36px] !py-1.5 text-[13px]" aria-label="Select disaster">
                {disasters.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
              </select>
            </label>
          </div>
          <div className="mt-2 h-64 min-h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: "var(--text-secondary)", fontSize: 12, fontWeight: 600 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "var(--text-muted)", fontSize: 11 }} tickFormatter={(v: number) => shortINR(v)} axisLine={false} tickLine={false} width={72} />
                <Tooltip
                  formatter={(v) => [formatINR(Number(v)), "Amount"]}
                  contentStyle={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: 12, color: "var(--text-primary)", fontSize: 13 }}
                />
                <Bar dataKey="v" radius={[10, 10, 4, 4]} maxBarSize={64}>
                  {data.map((_, i) => <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <details className="mt-1 text-xs" style={{ color: "var(--text-secondary)" }}><summary className="cursor-pointer font-medium underline underline-offset-2">View as data table</summary>
            <table className="rs-table mono mt-2 !text-xs">
              <caption className="sr-only">Fund movement for {d.name}</caption>
              <thead><tr><th scope="col">Stage</th><th scope="col">Amount</th></tr></thead>
              <tbody>{data.map((r) => <tr key={r.name}><td>{r.name}</td><td>{formatINR(r.v)}</td></tr>)}</tbody>
            </table>
          </details>
        </div>

        <div className="rs-card p-4 md:p-5">
          <h2 className="rs-h2">Top NGO by score</h2>
          <p className="text-[13px]" style={{ color: "var(--text-secondary)" }}>Scores always ship with breakdowns.</p>
          <div className="mt-3"><TrustScoreRing score={ngos[0].score} components={ngos[0].components} /></div>
          <Link to={`/org/${ngos[0].id}`} className="mt-2 inline-flex items-center gap-1 text-sm font-bold">{ngos[0].name} <ArrowUpRight size={15} aria-hidden /></Link>
        </div>
      </div>

      <h2 className="rs-h2 mb-2 mt-6">Participating NGOs</h2>
      <div className="grid gap-3.5 md:grid-cols-2">
        {ngos.map((n) => (
          <Link key={n.id} to={`/org/${n.id}`} className="rs-card rs-card-lift block p-5">
            <div className="flex items-center justify-between gap-2">
              <span className="font-display text-[16px] font-bold">{n.name}</span>
              <span className="kpi rounded-full border px-2.5 py-0.5 text-xs font-extrabold" style={{ borderColor: "var(--border-subtle)", background: "var(--accent-soft)" }}>{n.score}</span>
            </div>
            <div className="mt-3"><TrustScoreRing score={n.score} components={n.components} /></div>
          </Link>
        ))}
      </div>
    </div>
  );
}
