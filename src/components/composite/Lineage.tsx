import { motion } from "motion/react";
import { lineageExample } from "@/lib/mock";
import { formatINR } from "@/lib/format";

export interface LineageSplit { category: string; amount: number; color: string }

/** Clean professional fund-flow. Depth via soft shadows, blue donor node. */
export function FundLineageFlow({ amount, splits, donationId }: { amount?: number; splits?: LineageSplit[]; donationId?: string } = {}) {
  const total = amount ?? lineageExample.amount;
  const parts = splits ?? lineageExample.splits;
  const id = donationId ?? lineageExample.donationId;
  const count = parts.length;
  const H = Math.max(210, count * 52 + 16);
  return (
    <figure className="rs-panel overflow-hidden p-5 md:p-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <figcaption className="eyebrow mb-1.5">Donation lineage</figcaption>
          <p className="mono text-[12px] font-medium tracking-wide" style={{ color: "var(--text-muted)" }}>{id}</p>
          <p className="kpi mt-0.5 text-[30px] font-extrabold leading-none">{formatINR(total)}</p>
        </div>
        <span className="mono rounded-full border px-3 py-1 text-[11px] font-bold" style={{ borderColor: "var(--border-subtle)", color: "var(--text-secondary)", background: "var(--bg-surface-alt)" }}>
          {count} WAY SPLIT · VERIFIED
        </span>
      </div>
      <svg viewBox={`0 0 560 ${H}`} className="mt-3 w-full" role="img" aria-label={`Donation of ${formatINR(total)} split across ${count} categories`}>
        <defs>
          <linearGradient id="rs-donor-node" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#2E7CF6" />
            <stop offset="100%" stopColor="#1A3FA0" />
          </linearGradient>
        </defs>
        <motion.g initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.5 }}>
          <rect x="8" y={H / 2 - 28} width="126" height="56" rx="14" fill="url(#rs-donor-node)" />
          <text x="71" y={H / 2 - 4} textAnchor="middle" fill="#fff" fontSize="13" fontWeight="800" fontFamily="Manrope, sans-serif">{formatINR(total)}</text>
          <text x="71" y={H / 2 + 14} textAnchor="middle" fill="rgba(255,255,255,.8)" fontSize="10" fontWeight="700" letterSpacing="1">DONATION</text>
        </motion.g>
        {parts.map((s, i) => {
          const y = 10 + i * 52;
          const frac = total > 0 ? s.amount / total : 0;
          const w = Math.max(130, 100 + frac * 230);
          const cy = H / 2;
          return (
            <g key={s.category}>
              <motion.path
                d={`M134 ${cy} C 188 ${cy}, 188 ${y + 18}, 252 ${y + 18}`}
                fill="none" stroke={s.color} strokeLinecap="round"
                strokeWidth={Math.max(5, frac * 26)} opacity={0.75}
                initial={{ pathLength: 0, opacity: 0 }}
                whileInView={{ pathLength: 1, opacity: 0.75 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: 0.1 + i * 0.1 }}
              />
              <motion.g
                initial={{ opacity: 0, x: -10 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45, delay: 0.2 + i * 0.1 }}
              >
                <rect x="252" y={y} width={Math.min(w, 292)} height="36" rx="10" fill="var(--bg-surface-alt)" stroke="var(--border-subtle)" />
                <rect x="252" y={y} width="4" height="36" rx="2" fill={s.color} />
                <text x={264} y={y + 22} fontSize="12" fontWeight="700" fill="var(--text-primary)" fontFamily="Manrope, sans-serif">
                  {s.category.length > 12 ? `${s.category.slice(0, 11)}…` : s.category} · {formatINR(s.amount)}
                </text>
              </motion.g>
            </g>
          );
        })}
      </svg>
      <div className="luxe-divider my-3" aria-hidden />
      <details className="text-[13px]" style={{ color: "var(--text-secondary)" }}>
        <summary className="cursor-pointer font-bold underline underline-offset-2">View as data table</summary>
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
