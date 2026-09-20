import { Moon, Sun } from "lucide-react";
import { motion } from "motion/react";
import { useThemeToggle } from "@/theme/useTheme";

export function ThemeToggle() {
  const { theme, toggle } = useThemeToggle();
  const dark = theme === "dark";
  return (
    <button
      type="button"
      role="switch"
      aria-checked={dark}
      aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
      onClick={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        const x = e.clientX || r.left + r.width / 2;
        const y = e.clientY || r.top + r.height / 2;
        toggle(x, y);
      }}
      className="rs-toggle group"
    >
      <span className="rs-toggle-knob transition-transform duration-300 group-hover:rotate-12" aria-hidden>
        <motion.span
          key={dark ? "sun" : "moon"}
          initial={{ rotate: -60, opacity: 0, scale: 0.6 }}
          animate={{ rotate: 0, opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="flex"
        >
          {dark ? <Sun size={15} /> : <Moon size={15} />}
        </motion.span>
      </span>
      <span aria-hidden>{dark ? "Light" : "Dark"}</span>
    </button>
  );
}

export function SyntheticRibbon() {
  return (
    <div className="rs-ribbon mono" role="note" aria-label="Live ledger data notice">
      <span className="mr-2 inline-block h-1.5 w-1.5 rounded-full align-middle" style={{ background: "var(--risk-low)" }} aria-hidden />
      LIVE LEDGER DATA — VERIFIED BACKEND RECORDS
    </div>
  );
}

/** Blocking setup screen when the backend is not configured. No mock fallback. */
export function BackendRequired() {
  return (
    <div className="mx-auto w-full max-w-[720px] p-6" role="alert" aria-label="Backend not configured">
      <div className="rs-card p-8 text-center md:p-10">
        <p className="eyebrow justify-center">Backend not configured</p>
        <h1 className="mt-3 text-[28px] font-extrabold tracking-tight">Connect the ledger to continue.</h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6" style={{ color: "var(--text-secondary)" }}>
          This build serves live data only. Set <span className="mono font-bold">VITE_API_URL</span> to your
          backend base URL (e.g. <span className="mono">http://localhost:3000/api/v1</span>) and restart,
          then sign in to access the console.
        </p>
        <div className="mt-6 flex justify-center gap-2.5">
          <a href="/login" className="rs-btn-primary rs-btn-sm">Go to login</a>
        </div>
      </div>
    </div>
  );
}

export function PageHeader({ eyebrow, title, sub, action }: { eyebrow?: string; title: string; sub?: string; action?: React.ReactNode }) {
  return (
    <motion.div
      className="rs-pagehead"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="min-w-0 max-w-3xl">
        {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
        <h1 className="rs-h1 text-balance">{title}</h1>
        {sub && <p className="rs-sub">{sub}</p>}
      </div>
      {action && <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div>}
    </motion.div>
  );
}
