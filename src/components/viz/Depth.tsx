import { useRef, useState } from "react";
import { motion } from "motion/react";

/** Faux-3D isometric bars — pure CSS depth, no GL deps. Accessible via table fallback. */
export function IsoBars({
  items,
  max,
  ariaLabel,
}: {
  items: { name: string; value: number; label: string; color: string }[];
  max: number;
  ariaLabel: string;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" role="img" aria-label={ariaLabel}>
      {items.map((it, i) => {
        const pct = max > 0 ? Math.round((it.value / max) * 100) : 0;
        return (
          <motion.div
            key={it.name}
            className="rs-inset p-4"
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.06, duration: 0.45 }}
          >
            <p className="flex items-center justify-between text-sm font-extrabold">
              {it.name}
              <span className="kpi text-[15px]" style={{ color: "var(--primary-600)" }}>{pct}%</span>
            </p>
            <div className="mt-4 flex h-28 items-end justify-center overflow-visible rounded-xl p-2" style={{ background: "var(--bg-surface)", perspective: "400px" }}>
              <motion.div
                className="iso-bar w-14"
                style={{ background: `linear-gradient(180deg, ${it.color}, ${it.color} 70%)` }}
                initial={{ height: 0 }}
                whileInView={{ height: `${Math.max(8, pct)}%` }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: 0.1 + i * 0.07, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>
            <p className="kpi mt-2.5 text-[17px] font-extrabold">{it.label}</p>
          </motion.div>
        );
      })}
    </div>
  );
}

/** Layered donut with depth rings — SVG only. */
export function Donut3D({ value, size = 128 }: { value: number; size?: number }) {
  const clamped = Math.max(0, Math.min(100, value));
  const r = 40;
  const c = 2 * Math.PI * r;
  const off = c - (clamped / 100) * c;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 112 112" role="img" aria-label={`Score ${clamped} of 100`}>
        <defs>
          <linearGradient id="rs-blue-arc" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#2E7CF6" />
            <stop offset="100%" stopColor="#1A3FA0" />
          </linearGradient>
        </defs>
        {/* depth layers */}
        <circle cx="56" cy="60" r={r} fill="none" stroke="var(--border-subtle)" strokeWidth="10" opacity="0.7" />
        <circle cx="56" cy="58" r={r} fill="none" stroke="var(--border-subtle)" strokeWidth="10" opacity="0.85" />
        <circle cx="56" cy="56" r={r} fill="none" stroke="var(--border-subtle)" strokeWidth="10" />
        <motion.circle
          cx="56" cy="56" r={r} fill="none"
          stroke="url(#rs-blue-arc)" strokeWidth="10" strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          whileInView={{ strokeDashoffset: off }}
          viewport={{ once: true }}
          transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
          transform="rotate(-90 56 56)"
        />
        <text x="56" y="59" textAnchor="middle" fontSize="24" fontWeight="800" fill="var(--text-primary)" fontFamily="Manrope, sans-serif">
          {clamped}
        </text>
        <text x="56" y="72" textAnchor="middle" fontSize="9" fontWeight="700" fill="var(--text-muted)" letterSpacing="1.5">/ 100</text>
      </svg>
    </div>
  );
}

/** Subtle 3D tilt on hover for KPI cards. Disabled on touch / reduced motion. */
export function TiltCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [t, setT] = useState({ rx: 0, ry: 0 });

  const onMove = (e: React.MouseEvent) => {
    if (!window.matchMedia("(pointer: fine)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    setT({ rx: -py * 7, ry: px * 9 });
  };

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={() => setT({ rx: 0, ry: 0 })}
      className={`tilt-card ${className}`}
      style={{ transform: `perspective(900px) rotateX(${t.rx}deg) rotateY(${t.ry}deg)`, transition: "transform .18s ease-out" }}
    >
      {children}
    </div>
  );
}
