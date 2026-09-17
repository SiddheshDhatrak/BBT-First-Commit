import { Moon, Sun } from "lucide-react";
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
        // Keyboard activation has clientX/Y = 0 → fall back to button centre
        const r = e.currentTarget.getBoundingClientRect();
        const x = e.clientX || r.left + r.width / 2;
        const y = e.clientY || r.top + r.height / 2;
        toggle(x, y);
      }}
      className="rs-toggle"
    >
      <span className="rs-toggle-knob" aria-hidden>
        {dark ? <Sun size={15} /> : <Moon size={15} />}
      </span>
      <span aria-hidden>{dark ? "Light" : "Dark"}</span>
    </button>
  );
}

export function SyntheticRibbon() {
  return (
    <div className="rs-ribbon mono" role="note" aria-label="Synthetic demo data notice">
      SYNTHETIC DEMO DATA — not real financial information.
    </div>
  );
}

export function PageHeader({ eyebrow, title, sub, action }: { eyebrow?: string; title: string; sub?: string; action?: React.ReactNode }) {
  return (
    <div className="rs-pagehead">
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow mb-1">{eyebrow}</p>}
        <h1 className="rs-h1">{title}</h1>
        {sub && <p className="rs-sub">{sub}</p>}
      </div>
      {action && <div className="flex shrink-0 flex-wrap gap-2">{action}</div>}
    </div>
  );
}
