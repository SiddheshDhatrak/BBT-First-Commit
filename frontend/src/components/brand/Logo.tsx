import { Link } from "react-router-dom";
import { cn } from "@/lib/cn";

/** Bridge-arch + rupee keystone mark. Professional, works on light/dark. */
export function LogoMark({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" role="img" aria-label="RahatSetu logo" aria-hidden={false}>
      <defs>
        <linearGradient id={`rs-tile-${size}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2E7CF6" />
          <stop offset="1" stopColor="#1A3FA0" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="60" height="60" rx="16" fill={`url(#rs-tile-${size})`} />
      <rect x="12" y="33" width="40" height="4" rx="2" fill="#ffffff" />
      <path d="M16 33 C 22 20, 42 20, 48 33" fill="none" stroke="#ffffff" strokeWidth="3.5" strokeLinecap="round" />
      <rect x="15" y="37" width="4" height="11" rx="2" fill="#ffffff" opacity="0.92" />
      <rect x="45" y="37" width="4" height="11" rx="2" fill="#ffffff" opacity="0.92" />
      <rect x="30" y="37" width="4" height="8" rx="2" fill="#ffffff" opacity="0.65" />
      <circle cx="32" cy="22.5" r="5.5" fill="#ffffff" />
      <text x="32" y="26.4" textAnchor="middle" fontSize="8" fontWeight="800" fill="#1A3FA0" fontFamily="Manrope, Arial, sans-serif">₹</text>
    </svg>
  );
}

export function Logo({ compact = false, className }: { compact?: boolean; className?: string }) {
  return (
    <Link to="/" className={cn("group flex items-center gap-2.5", className)} aria-label="RahatSetu home">
      <span className="transition-transform duration-300 group-hover:scale-105">
        <LogoMark size={compact ? 32 : 36} />
      </span>
      {!compact && (
        <span className="leading-none">
          <span className="block text-[18px] font-extrabold tracking-tight" style={{ color: "var(--text-primary)" }}>
            Rahat<span style={{ color: "var(--primary-600)" }}>Setu</span>
          </span>
          <span className="mono mt-0.5 block text-[9px] font-medium uppercase tracking-[0.24em]" style={{ color: "var(--text-muted)" }}>
            Relief Ledger
          </span>
        </span>
      )}
    </Link>
  );
}
