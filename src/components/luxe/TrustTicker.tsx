import { disasters } from "@/lib/mock";
import { formatINR, formatNumber } from "@/lib/format";

function shortINR(v: number): string {
  if (v >= 10000000) return `₹${(v / 10000000).toFixed(2)} Cr`;
  if (v >= 100000) return `₹${(v / 100000).toFixed(1)} L`;
  if (v >= 1000) return `₹${(v / 1000).toFixed(1)}K`;
  return formatINR(v);
}

/** Neutral professional trust ticker. */
export function TrustTicker() {
  const total = disasters.reduce((a, d) => a + d.collected, 0);
  const ngos = disasters.reduce((a, d) => a + d.ngos, 0);
  const resolved = disasters.reduce((a, d) => a + d.alertsResolved, 0);
  const items = [
    `${shortINR(total)} tracked`,
    `${formatNumber(ngos)} NGOs onboarded`,
    `${formatNumber(resolved)} alerts resolved with evidence`,
    "94% receipt coverage",
    "Signals, never verdicts",
    "Simulated demo rail",
  ];
  const row = [...items, ...items];
  return (
    <div
      className="relative overflow-hidden rounded-2xl border py-3"
      style={{ borderColor: "var(--border-subtle)", background: "var(--bg-surface)" }}
      aria-label="Trust highlights"
    >
      <div className="marquee-track items-center gap-10 pr-10">
        {[0, 1].map((half) => (
          <div key={half} className="flex shrink-0 items-center gap-10" aria-hidden={half === 1}>
            {row.map((t, i) => (
              <span key={`${half}-${i}`} className="flex items-center gap-10 text-[12.5px] font-bold tracking-wide" style={{ color: "var(--text-secondary)" }}>
                <span className="whitespace-nowrap">{t}</span>
                <span aria-hidden className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: "var(--primary-600)", opacity: 0.5 }} />
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
