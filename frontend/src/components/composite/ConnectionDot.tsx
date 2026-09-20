import { isAgentEnabled, isApiEnabled } from "@/lib/api";
import { usePublicMetrics } from "@/lib/queries";

/**
 * Single connection indicator for the header.
 * grey = mock mode (no env URLs) · amber = configured but unreachable ·
 * green = live backend data. Agent state is folded into the tooltip.
 */
export function ConnectionDot() {
  const live = usePublicMetrics();
  const enabled = isApiEnabled();
  const state: "mock" | "connecting" | "live" = !enabled
    ? "mock"
    : live.data
      ? "live"
      : "connecting";
  const color =
    state === "live"
      ? "var(--risk-low)"
      : state === "connecting"
        ? "var(--risk-med)"
        : "var(--text-muted)";
  const title =
    state === "live"
      ? `Connected to live backend${isAgentEnabled() ? " + AI agent" : " (agent: canned prompts)"}`
      : state === "connecting"
        ? "Backend configured but unreachable — showing synthetic data"
        : "Synthetic demo data — set VITE_API_URL to go live";
  return (
    <span
      role="status"
      aria-label={title}
      title={title}
      className={`inline-block h-2 w-2 shrink-0 rounded-full ${state === "live" ? "animate-pulse" : ""}`}
      style={{ background: color, boxShadow: `0 0 0 3px color-mix(in srgb, ${color} 18%, transparent)` }}
    />
  );
}
