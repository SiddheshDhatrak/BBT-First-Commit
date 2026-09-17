import { Check } from "lucide-react";

export const PIPELINE_STEPS = ["Uploaded", "Extracted", "Checked", "Scored", "Explained", "Routed"] as const;

export function PipelineStepper({ current }: { current: number }) {
  const safe = Math.max(0, Math.min(current, PIPELINE_STEPS.length - 1));
  return (
    <ol className="flex flex-wrap items-center gap-1.5" aria-label="Invoice pipeline status">
      {PIPELINE_STEPS.map((s, i) => {
        const done = i < safe;
        const active = i === safe;
        return (
          <li key={s} className="flex items-center gap-1.5">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${active ? "rs-pulse" : ""}`}
              style={{
                background: done ? "color-mix(in srgb, var(--risk-low) 14%, transparent)" : active ? "color-mix(in srgb, var(--primary-600) 13%, var(--bg-surface))" : "var(--bg-surface-alt)",
                color: done ? "var(--risk-low)" : active ? "var(--primary-600)" : "var(--text-muted)",
                border: "1px solid var(--border-subtle)",
              }}
              aria-current={active ? "step" : undefined}
            >
              {done && <Check size={12} aria-hidden />}
              {s}
            </span>
            {i < PIPELINE_STEPS.length - 1 && <span aria-hidden style={{ color: "var(--text-muted)" }}>→</span>}
          </li>
        );
      })}
    </ol>
  );
}

export function TrustScoreRing({ score, components }: { score: number; components: { name: string; weight: number; value: number }[] }) {
  // Never rendered alone — always with breakdown (§13.3)
  const clamped = Math.max(0, Math.min(100, score));
  const r = 34;
  const c = 2 * Math.PI * r;
  const off = c - (clamped / 100) * c;
  return (
    <div className="flex flex-wrap items-center gap-4">
      <svg width="104" height="104" viewBox="0 0 96 96" role="img" aria-label={`Transparency score ${clamped} of 100`}>
        <circle cx="48" cy="48" r={r} fill="none" stroke="var(--border-subtle)" strokeWidth="10" />
        <circle
          cx="48" cy="48" r={r} fill="none"
          stroke="var(--accent-500)" strokeWidth="10" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={off} transform="rotate(-90 48 48)"
        />
        <text x="48" y="55" textAnchor="middle" fontSize="22" fontWeight="800" fill="var(--text-primary)" fontFamily="Manrope">
          {clamped}
        </text>
      </svg>
      <ul className="min-w-[220px] flex-1 space-y-1.5 text-[13px]" style={{ color: "var(--text-secondary)" }}>
        {components.map((x) => (
          <li key={x.name} className="flex items-center justify-between gap-4">
            <span>{x.name} <span style={{ color: "var(--text-muted)" }}>· {x.weight}</span></span>
            <span className="kpi text-sm font-bold" style={{ color: "var(--text-primary)" }}>{x.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function BudgetProgressBar({ label, used, cap }: { label: string; used: number; cap: number }) {
  const pct = cap > 0 ? Math.max(0, Math.min(100, Math.round((used / cap) * 100))) : 0;
  const warn = pct >= 85;
  return (
    <div>
      <div className="mb-1.5 flex justify-between text-sm">
        <span className="font-semibold" style={{ color: "var(--text-primary)" }}>{label}</span>
        <span className="kpi font-bold" style={{ color: warn ? "var(--risk-med)" : "var(--text-secondary)" }}>{pct}%</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full" style={{ background: "var(--bg-surface-alt)" }} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`${label} budget ${pct} percent used`}>
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: warn ? "var(--risk-med)" : "linear-gradient(90deg,var(--primary-600),var(--primary-700))" }} />
      </div>
    </div>
  );
}

export function StatusTimeline({ items }: { items: string[] }) {
  return (
    <ol className="space-y-3.5" aria-label="Status timeline">
      {items.map((t, i) => (
        <li key={`${i}-${t}`} className="relative flex gap-3 pl-6 text-sm" style={{ color: "var(--text-secondary)" }}>
          <span className="absolute left-0 top-1 flex flex-col items-center" aria-hidden>
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: i === 0 ? "var(--accent-500)" : "var(--primary-600)", boxShadow: i === 0 ? "0 0 0 4px var(--accent-soft)" : "none" }} />
            {i < items.length - 1 && <span className="mt-1 h-6 w-px" style={{ background: "var(--border-subtle)" }} />}
          </span>
          <span style={{ color: i === 0 ? "var(--text-primary)" : undefined, fontWeight: i === 0 ? 700 : 500 }}>{t}</span>
        </li>
      ))}
    </ol>
  );
}
