import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { AlertTriangle, CheckCircle2, Info, OctagonAlert } from "lucide-react";
import { cn } from "@/lib/cn";

export type Severity = "low" | "medium" | "high" | "info";

const SEV = {
  low: { icon: CheckCircle2, label: "Low signal", bg: "var(--risk-low)" },
  medium: { icon: AlertTriangle, label: "Medium signal", bg: "var(--risk-med)" },
  high: { icon: OctagonAlert, label: "High signal", bg: "var(--risk-high)" },
  info: { icon: Info, label: "Info", bg: "var(--risk-info)" },
} as const;

export function RiskBadge({ severity, className, withPulse }: { severity: Severity; className?: string; withPulse?: boolean }) {
  const m = SEV[severity];
  const Icon = m.icon;
  return (
    <span
      className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-extrabold tracking-wide", className)}
      style={{
        background: `color-mix(in srgb, ${m.bg} 12%, var(--bg-surface))`,
        color: m.bg,
        border: `1px solid color-mix(in srgb, ${m.bg} 45%, transparent)`,
      }}
    >
      <Icon size={14} strokeWidth={2.4} aria-hidden />
      {m.label}
      {withPulse && <span className="rs-pulse inline-block h-1.5 w-1.5 rounded-full" aria-hidden style={{ background: m.bg }} />}
    </span>
  );
}

export function EvidenceCard({ label, source, index = 0, onSource }: { label: string; source: string; index?: number; onSource?: (s: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <motion.div
      className="rs-card p-4 text-sm leading-6"
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: Math.min(index, 6) * 0.06, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ background: "var(--bg-surface-alt)", border: "1px solid var(--border-subtle)" }} aria-hidden>
          <Info size={16} style={{ color: "var(--risk-info)" }} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold leading-snug" style={{ color: "var(--text-primary)" }}>{label}</p>
          <button
            type="button"
            className="mono mt-1.5 inline-flex items-center gap-1 text-[11px] font-medium underline underline-offset-2"
            style={{ color: "var(--text-secondary)" }}
            aria-label={`View source ${source}`}
            aria-expanded={open}
            onClick={() => { setOpen((o) => !o); onSource?.(source); }}
          >
            Source: {source} {open ? "▴" : "▾"}
          </button>
          <AnimatePresence initial={false}>
            {open && (
              <motion.p
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="mono rs-inset mt-2 overflow-hidden px-3 py-2.5 text-[11px] leading-relaxed"
                style={{ color: "var(--text-muted)" }}
              >
                {source} · ledger snapshot 2026-09-12 · hash-verified · opens in audit view in production.
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

export function SignalBanner() {
  return (
    <div
      role="note"
      className="relative flex items-start gap-3 overflow-hidden rounded-2xl border p-4 text-sm"
      style={{ borderColor: "var(--border-subtle)", background: "var(--bg-surface)", boxShadow: "var(--shadow-1)" }}
    >
      <div className="absolute inset-y-0 left-0 w-1" style={{ background: "var(--primary-600)" }} aria-hidden />
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ background: "var(--primary-600)", color: "#fff" }}>
        <AlertTriangle size={17} aria-hidden strokeWidth={2.4} />
      </span>
      <p className="pl-1">
        <strong className="text-[15px] font-extrabold">Signal, not verdict.</strong>{" "}
        <span style={{ color: "var(--text-secondary)" }}>These are investigation signals, not proof. Every flag needs auditor review before action.</span>
      </p>
    </div>
  );
}
