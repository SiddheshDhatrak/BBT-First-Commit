import { formatINR, formatNumber } from "@/lib/format";
import { usePublicMetrics } from "@/lib/queries";

function shortINR(v: number): string {
  if (v >= 10000000) return `₹${(v / 10000000).toFixed(2)} Cr`;
  if (v >= 100000) return `₹${(v / 100000).toFixed(1)} L`;
  if (v >= 1000) return `₹${(v / 1000).toFixed(1)}K`;
  return formatINR(v);
}

/** Live trust ticker — renders only from backend ledger data. */
export function TrustTicker() {
  const live = usePublicMetrics();
  if (live.isPending) {
    return (
      <div className="relative overflow-hidden rounded-2xl border py-3" style={{ borderColor: "var(--border-subtle)", background: "var(--bg-surface)" }} aria-label="Trust highlights" aria-busy="true">
        <p className="px-4 text-[12.5px] font-bold" style={{ color: "var(--text-muted)" }}>Loading live ledger…</p>
      </div>
    );
  }
  if (live.isError || !live.data) {
    return (
      <div className="relative overflow-hidden rounded-2xl border py-3" style={{ borderColor: "var(--border-subtle)", background: "var(--bg-surface)" }} aria-label="Trust highlights">
        <p className="px-4 text-[12.5px] font-bold" style={{ color: "var(--text-muted)" }}>Live ledger unreachable — check backend connection.</p>
      </div>
    );
  }
  const m = live.data;
  const items = [
    `${shortINR(m.totalDonated)} tracked`,
    `${formatNumber(m.donationCount)} gifts`,
    `${formatNumber(m.deliveryVerifiedExpenses)} deliveries verified`,
    `${formatNumber(m.expenseCount)} expenses in ledger`,
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
