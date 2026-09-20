import { motion } from "motion/react";
import { Check } from "lucide-react";
import { Donut3D } from "@/components/viz/Depth";

const PIPELINE_STEPS = ["Uploaded", "Extracted", "Checked", "Scored", "Explained", "Routed"] as const;

export function PipelineStepper({ current }: { current: number }) {
  const safe = Math.max(0, Math.min(current, PIPELINE_STEPS.length - 1));
  return (
    <ol className="flex flex-wrap items-center gap-y-2" aria-label="Invoice pipeline status">
      {PIPELINE_STEPS.map((s, i) => {
        const done = i < safe;
        const active = i === safe;
        return (
          <li key={s} className="flex items-center">
            <motion.span
              initial={false}
              animate={active ? { scale: [1, 1.05, 1] } : { scale: 1 }}
              transition={{ duration: 0.4 }}
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold"
              style={{
                background: done
                  ? "color-mix(in srgb, var(--risk-low) 14%, transparent)"
                  : active
                    ? "var(--primary-600)"
                    : "var(--bg-surface-alt)",
                color: done ? "var(--risk-low)" : active ? "#fff" : "var(--text-muted)",
                border: `1px solid ${done ? "color-mix(in srgb, var(--risk-low) 40%, transparent)" : active ? "transparent" : "var(--border-subtle)"}`,
                boxShadow: active ? "var(--shadow-2)" : "none",
              }}
              aria-current={active ? "step" : undefined}
            >
              {done && <Check size={12} aria-hidden strokeWidth={3} />}
              <span className="mono mr-0.5 text-[10px] opacity-70">{i + 1}</span>
              {s}
              {active && <span className="rs-pulse inline-block h-1.5 w-1.5 rounded-full bg-white" aria-hidden />}
            </motion.span>
            {i < PIPELINE_STEPS.length - 1 && (
              <span aria-hidden className="mx-1.5 h-px w-4 sm:w-6" style={{ background: i < safe ? "var(--risk-low)" : "var(--border-strong)" }} />
            )}
          </li>
        );
      })}
    </ol>
  );
}

export function TrustScoreRing({ score, components }: { score: number; components: { name: string; weight: number; value: number }[] }) {
  const clamped = Math.max(0, Math.min(100, score));
  return (
    <div className="flex flex-wrap items-center gap-5">
      <Donut3D value={clamped} />
      <ul className="min-w-[230px] flex-1 space-y-2.5 text-[13px]" style={{ color: "var(--text-secondary)" }}>
        {components.map((x) => {
          const pct = x.weight > 0 ? Math.round((x.value / x.weight) * 100) : 0;
          return (
            <li key={x.name}>
              <div className="flex items-center justify-between gap-4">
                <span className="font-semibold">{x.name} <span className="mono text-[11px]" style={{ color: "var(--text-muted)" }}>· {x.weight}</span></span>
                <span className="kpi text-[15px] font-extrabold" style={{ color: "var(--text-primary)" }}>{x.value}</span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full" style={{ background: "var(--bg-surface-alt)" }} aria-hidden>
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: "linear-gradient(90deg,#2E7CF6,#1A3FA0)" }}
                  initial={{ width: 0 }}
                  whileInView={{ width: `${pct}%` }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.9, delay: 0.15 }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function BudgetProgressBar({ label, used, cap }: { label: string; used: number; cap: number }) {
  const pct = cap > 0 ? Math.max(0, Math.min(100, Math.round((used / cap) * 100))) : 0;
  const warn = pct >= 85;
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between text-sm">
        <span className="text-[16px] font-extrabold">{label}</span>
        <span className="kpi text-[16px] font-extrabold" style={{ color: warn ? "var(--risk-med)" : "var(--text-secondary)" }}>{pct}%</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full" style={{ background: "var(--bg-surface-alt)", border: "1px solid var(--border-subtle)" }} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`${label} budget ${pct} percent used`}>
        <motion.div
          className="h-full rounded-full"
          style={{ background: warn ? "linear-gradient(90deg,#9a6206,#ecb654)" : "linear-gradient(90deg,#2E7CF6,#1A3FA0)" }}
          initial={{ width: 0 }}
          whileInView={{ width: `${pct}%` }}
          viewport={{ once: true }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
    </div>
  );
}

export function StatusTimeline({ items }: { items: string[] }) {
  return (
    <ol className="space-y-4" aria-label="Status timeline">
      {items.map((t, i) => (
        <motion.li
          key={`${i}-${t}`}
          className="relative flex gap-3.5 pl-7 text-sm"
          style={{ color: "var(--text-secondary)" }}
          initial={{ opacity: 0, x: -8 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ delay: i * 0.06, duration: 0.35 }}
        >
          <span className="absolute left-0 top-0.5 flex flex-col items-center" aria-hidden>
            <span
              className="h-3 w-3 rounded-full"
              style={{
                background: i === 0 ? "var(--primary-600)" : "var(--border-strong)",
                boxShadow: i === 0 ? "0 0 0 4px var(--accent-soft)" : "none",
              }}
            />
            {i < items.length - 1 && <span className="mt-1 h-7 w-px" style={{ background: "var(--border-subtle)" }} />}
          </span>
          <span style={{ color: i === 0 ? "var(--text-primary)" : undefined, fontWeight: i === 0 ? 700 : 500 }}>{t}</span>
        </motion.li>
      ))}
    </ol>
  );
}
