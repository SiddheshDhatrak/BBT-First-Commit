import { useState } from "react";
import { AlertTriangle, CheckCircle2, Info, OctagonAlert } from "lucide-react";
import { cn } from "@/lib/cn";

export type Severity = "low" | "medium" | "high" | "info";

const SEV = {
  low: { icon: CheckCircle2, label: "Low signal", bg: "var(--risk-low)" },
  medium: { icon: AlertTriangle, label: "Medium signal", bg: "var(--risk-med)" },
  high: { icon: OctagonAlert, label: "High signal", bg: "var(--risk-high)" },
  info: { icon: Info, label: "Info", bg: "var(--risk-info)" },
} as const;

// Risk colour is never the only signal — icon + text label always (§6.4)
export function RiskBadge({ severity, className, withPulse }: { severity: Severity; className?: string; withPulse?: boolean }) {
  const m = SEV[severity];
  const Icon = m.icon;
  return (
    <span
      className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold", className)}
      style={{ background: `color-mix(in srgb, ${m.bg} 14%, transparent)`, color: m.bg, border: `1px solid color-mix(in srgb, ${m.bg} 40%, transparent)` }}
    >
      <Icon size={14} strokeWidth={2.2} aria-hidden />
      {m.label}
      {withPulse && <span className="rs-pulse inline-block h-1.5 w-1.5 rounded-full" aria-hidden style={{ background: m.bg }} />}
    </span>
  );
}

export function EvidenceCard({ label, source, index = 0, onSource }: { label: string; source: string; index?: number; onSource?: (s: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rs-card rs-rise p-3.5 text-sm leading-6" style={{ animationDelay: `${Math.min(index, 6) * 80}ms` }}>
      <div className="flex items-start gap-2.5">
        <span className="rs-inset flex h-7 w-7 shrink-0 items-center justify-center" aria-hidden>
          <Info size={15} style={{ color: "var(--risk-info)" }} />
        </span>
        <div className="min-w-0">
          <p className="font-medium" style={{ color: "var(--text-primary)" }}>{label}</p>
          <button
            type="button"
            className="mono mt-1 text-[11px] underline underline-offset-2"
            style={{ color: "var(--text-secondary)" }}
            aria-label={`View source ${source}`}
            aria-expanded={open}
            onClick={() => { setOpen((o) => !o); onSource?.(source); }}
          >
            Source: {source} {open ? "▴" : "▾"}
          </button>
          {open && (
            <p className="mono rs-inset mt-2 px-2.5 py-2 text-[11px]" style={{ color: "var(--text-muted)" }}>
              {source} · ledger snapshot 2026-09-12 · hash-verified · opens in audit view in production.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export function SignalBanner() {
  return (
    <div
      role="note"
      className="flex items-start gap-2.5 rounded-2xl border p-3.5 text-sm"
      style={{ borderColor: "color-mix(in srgb, var(--risk-med) 45%, transparent)", background: "color-mix(in srgb, var(--risk-med) 9%, var(--bg-surface))", color: "var(--text-primary)" }}
    >
      <AlertTriangle size={17} aria-hidden style={{ color: "var(--risk-med)", marginTop: 1, flexShrink: 0 }} />
      <p>
        <strong>Signal, not verdict.</strong>{" "}
        <span style={{ color: "var(--text-secondary)" }}>These are investigation signals, not proof. Every flag needs auditor review before action.</span>
      </p>
    </div>
  );
}
