import { Link } from "react-router-dom";
import { ArrowRight, BadgeCheck, ReceiptText, Route, ShieldCheck, TrendingUp } from "lucide-react";
import { disasters } from "@/lib/mock";
import { formatINR, formatNumber } from "@/lib/format";
import { strings } from "@/lib/strings";
import { PageHeader } from "@/components/composite/Chrome";

export function shortINR(v: number): string {
  if (v >= 10000000) return `₹${(v / 10000000).toFixed(2)} Cr`;
  if (v >= 100000) return `₹${(v / 100000).toFixed(1)} L`;
  if (v >= 1000) return `₹${(v / 1000).toFixed(1)}K`;
  return formatINR(v);
}

export function Landing() {
  const total = disasters.reduce((a, d) => a + d.collected, 0);
  const ngoCount = disasters.reduce((a, d) => a + d.ngos, 0);
  const resolved = disasters.reduce((a, d) => a + d.alertsResolved, 0);
  return (
    <div>
      <section className="rs-hero p-6 md:p-10" aria-labelledby="hero-title">
        <div className="rs-hero-grid" aria-hidden />
        <div className="relative grid items-center gap-8 lg:grid-cols-[1.15fr_.85fr]">
          <div>
            <p className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-[#ffd9a0]">
              <BadgeCheck size={13} aria-hidden /> Transparent Disaster-Relief Tracking
            </p>
            <h1 id="hero-title" className="font-display mt-3 max-w-xl text-4xl font-extrabold leading-[1.08] tracking-tight text-white md:text-[44px]">
              {strings.heroTitle}
            </h1>
            <p className="mt-3 max-w-lg text-[15.5px] leading-7 text-[#d6e2f7]">{strings.heroSub}</p>
            <div className="mt-6 flex flex-wrap gap-2.5">
              <Link to="/donate" className="rs-btn-accent">Donate now <ArrowRight size={16} aria-hidden /></Link>
              <Link to="/dashboard" className="rs-btn-primary !bg-white !text-[#0b2c5e] hover:!bg-[#e8eefb]">View Public Dashboard</Link>
            </div>
            <p className="mono mt-4 text-[11px] tracking-wide text-white/60">SYNTHETIC DEMO DATA · {strings.simulatedRail.toUpperCase()}</p>
          </div>
          <div className="rs-stat p-5" aria-label="Live totals">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-white/60">Live · tracked across {disasters.length} disasters</p>
            <p className="kpi mt-1 text-4xl font-extrabold text-white">{shortINR(total)}</p>
            <dl className="mt-4 space-y-2.5">
              {[
                ["NGOs onboarded", formatNumber(ngoCount)],
                ["Alerts resolved with evidence", formatNumber(resolved)],
                ["Receipt coverage", "94%"],
              ].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between border-t border-white/10 pt-2.5 text-sm">
                  <dt className="text-white/70">{k}</dt>
                  <dd className="kpi font-extrabold text-white">{v}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-3 flex items-center gap-1.5 text-xs text-emerald-200"><TrendingUp size={14} aria-hidden /> Utilisation updated daily from ledger</p>
          </div>
        </div>
      </section>

      <section className="mt-4 grid gap-3.5 md:grid-cols-3" aria-label="How it works">
        {[
          { icon: Route, t: "Donate to a verified campaign", d: "Pick a disaster and category. Payment runs on a clearly labelled simulated rail — never real money in demo." },
          { icon: ReceiptText, t: "Track it to the receipt", d: "Follow donation → fund → NGO → program → vendor → invoice → payment in one continuous view." },
          { icon: ShieldCheck, t: "Auditors review the signals", d: "Every risk flag ships with its evidence. Signals, never verdicts — false positives close in one click." },
        ].map((s, i) => (
          <div key={s.t} className="rs-card rs-card-lift rs-rise p-5" style={{ animationDelay: `${i * 70}ms` }}>
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl" style={{ background: "color-mix(in srgb, var(--primary-600) 12%, var(--bg-surface-alt))", color: "var(--primary-600)" }}>
              <s.icon size={19} aria-hidden />
            </span>
            <h2 className="rs-h2 mt-3">{s.t}</h2>
            <p className="mt-1.5 text-sm leading-6" style={{ color: "var(--text-secondary)" }}>{s.d}</p>
          </div>
        ))}
      </section>
    </div>
  );
}

export function Methodology() {
  return (
    <div>
      <PageHeader eyebrow="Trust" title="Methodology" sub="How trust is measured — in plain language." />
      <div className="rs-card grid gap-4 p-5 md:p-7 text-[15px] leading-7 md:grid-cols-3" style={{ color: "var(--text-secondary)" }}>
        {[
          ["Transparency score", "Timely reporting (30) + receipt coverage (30) + budget discipline (25) + alert responsiveness (15). Always shown with its breakdown — never a bare number."],
          ["Fraud review", "Deterministic rules + statistics + document matching produce investigation signals. Auditors resolve with a reason code. False positives are easy to close."],
          ["Signal, not verdict", "We never say “fraudulent” or “guilty” — only “flagged for review” with linked evidence and a visible resolve path."],
        ].map(([t, d]) => (
          <div key={t} className="rs-inset p-4">
            <h2 className="rs-h2">{t}</h2>
            <p className="mt-1.5 text-sm leading-6">{d}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
