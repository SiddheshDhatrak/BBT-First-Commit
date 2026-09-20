import { isAgentEnabled, isApiEnabled, isMlEnabled } from "@/lib/api";
import { useAgentHealth, useMlHealth, usePublicMetrics } from "@/lib/queries";

/**
 * Connection indicators for the header — LIVE ONLY.
 * green = live backend data · amber = configured but unreachable/error ·
 * red = backend not configured (VITE_API_URL missing). No mock state.
 * Agent/ML dots render only when VITE_AGENT_URL / VITE_ML_URL are set;
 * the default ML flow is backend-proxied so the ML dot is optional.
 */
export function ConnectionDot() {
  const live = usePublicMetrics();
  const agentQ = useAgentHealth();
  const mlQ = useMlHealth();
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
  const agentBit = !isAgentEnabled()
    ? "agent not configured (Copilot stays backend-routed)"
    : agentQ.data
      ? "agent live"
      : agentQ.isError
        ? "agent unreachable — Copilot falls back to local"
        : "agent checking…";
  const mlBit = !isMlEnabled()
    ? "ML proxied via backend"
    : mlQ.data
      ? "ML live"
      : mlQ.isError
        ? "ML unreachable — backend fails open"
        : "ML checking…";
  const title =
    state === "live"
      ? `Connected to live backend · ${agentBit} · ${mlBit}`
      : state === "connecting"
        ? "Backend configured but unreachable — check API URL, CORS, and Cognito token"
        : "Backend not configured — set VITE_API_URL";
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        role="status"
        aria-label={title}
        title={title}
        className={`inline-block h-2 w-2 shrink-0 rounded-full ${state === "live" ? "animate-pulse" : ""}`}
        style={{ background: color, boxShadow: `0 0 0 3px color-mix(in srgb, ${color} 18%, transparent)` }}
      />
      {isAgentEnabled() && (
        <span
          role="status"
          aria-label={agentBit}
          title={agentBit}
          className="inline-block h-2 w-2 shrink-0 rounded-full"
          style={{
            background: agentQ.data ? "var(--risk-low)" : agentQ.isError ? "var(--risk-med)" : "var(--risk-med)",
          }}
        />
      )}
      {isMlEnabled() && (
        <span
          role="status"
          aria-label={mlBit}
          title={mlBit}
          className="inline-block h-2 w-2 shrink-0 rounded-full"
          style={{
            background: mlQ.data ? "var(--risk-low)" : mlQ.isError ? "var(--risk-med)" : "var(--risk-med)",
          }}
        />
      )}
    </span>
  );
}
