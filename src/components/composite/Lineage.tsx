import { lineageExample } from "@/lib/mock";
import { formatINR } from "@/lib/format";

export interface LineageSplit { category: string; amount: number; color: string }

// Custom SVG directional flow — legible in both themes (§12)
export function FundLineageFlow({ amount, splits, donationId }: { amount?: number; splits?: LineageSplit[]; donationId?: string } = {}) {
  const total = amount ?? lineageExample.amount;
  const parts = splits ?? lineageExample.splits;
  const id = donationId ?? lineageExample.donationId;
  const count = parts.length;
  const H = Math.max(190, count * 46 + 10);
  return (
    <figure className="rs-panel p-4 md:p-5">
      <figcaption className="eyebrow mb-1">Donation lineage</figcaption>
      <p className="kpi text-lg font-extrabold">{id} · {formatINR(total)}</p>
      <svg viewBox={`0 0 560 ${H}`} className="mt-2 w-full" role="img" aria-label={`Donation of ${formatINR(total)} split across ${count} categories`}>
        <rect x="8" y={H / 2 - 24} width="118" height="48" rx="12" fill="var(--primary-600)" />
        <text x="67" y={H / 2 - 5} textAnchor="middle" fill="#fff" fontSize="12" fontWeight="800" fontFamily="Manrope">{formatINR(total)}</text>
        <text x="67" y={H / 2 + 12} textAnchor="middle" fill="rgba(255,255,255,.85)" fontSize="10">Donation</text>
        {parts.map((s, i) => {
          const y = 8 + i * 46;
          const frac = total > 0 ? s.amount / total : 0;
          const w = Math.max(120, 90 + frac * 220);
          const cy = H / 2;
          return (
            <g key={s.category}>
              <path
                d={`M126 ${cy} C 180 ${cy}, 180 ${y + 16}, 244 ${y + 16}`}
                fill="none" stroke={s.color} strokeWidth={Math.max(4, frac * 24)} opacity={0.75} strokeLinecap="round"
              />
              <rect x="244" y={y} width={Math.min(w, 300)} height="32" rx="9" fill="var(--bg-surface-alt)" stroke="var(--border-subtle)" />
              <text x={254} y={y + 20} fontSize="11.5" fontWeight="700" fill="var(--text-primary)" fontFamily="Manrope">
                {s.category.length > 14 ? `${s.category.slice(0, 13)}…` : s.category} · {formatINR(s.amount)}
              </text>
            </g>
          );
        })}
      </svg>
      <details className="mt-2 text-[13px]" style={{ color: "var(--text-secondary)" }}>
        <summary className="cursor-pointer font-medium underline underline-offset-2">View as data table</summary>
        <table className="rs-table mono mt-2 !text-xs">
          <caption className="sr-only">Donation category split</caption>
          <thead><tr><th scope="col">Category</th><th scope="col">Amount</th></tr></thead>
          <tbody>
            {parts.map((s) => (
              <tr key={s.category}><td>{s.category}</td><td>{formatINR(s.amount)}</td></tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
