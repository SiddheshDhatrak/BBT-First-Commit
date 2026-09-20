import { isAgentEnabled, isApiEnabled } from "@/lib/api";
import { usePublicMetrics } from "@/lib/queries";

/**
 * Single connection indicator for the header — LIVE ONLY.
 * green = live backend data · amber = configured but unreachable/error ·
 * red = backend not configured (VITE_API_URL missing). No mock state.
 */
export function ConnectionDot() {
  const live = usePublicMetrics();
  const enabled = isApiEnabled();
  const state: "missing" | "connecting" | "live" = !enabled
    ? "missing"
    : live.data
      ? "live"
      : "connecting";
  const color =
    state === "live"
      ? "var(--risk-low)"
      : state === "connecting"
        ? "var(--risk-med)"
        : "var(--risk-high)";
  const title =
    state === "live"
      ? `Connected to live backend${isAgentEnabled() ? " + AI agent" : " (agent not configured)"}`
      : state === "connecting"
        ? "Backend configured but unreachable — check API URL, CORS, and Cognito token"
        : "Backend not configured — set VITE_API_URL";
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
