/** Data-source badge: LIVE when the component renders backend data, mock otherwise. */
export function LiveBadge({ live, label }: { live: boolean; label?: string }) {
  return (
    <span
      className="mono inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold tracking-[0.12em]"
      style={{
        borderColor: "var(--border-subtle)",
        color: live ? "var(--risk-low)" : "var(--text-muted)",
        background: live ? "color-mix(in srgb, var(--risk-low) 10%, transparent)" : "var(--bg-surface-alt)",
      }}
      title={live ? "Rendering live backend data" : "Rendering synthetic mock data"}
    >
      <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: "currentColor" }} aria-hidden />
      {live ? (label ?? "LIVE") : "SYNTHETIC"}
    </span>
  );
}
