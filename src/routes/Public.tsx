import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { ArrowRight, ArrowUpRight, BadgeCheck, TrendingUp, Landmark, FileCheck2, Eye } from "lucide-react";
import { disasters } from "@/lib/mock";
import { formatINR, formatNumber } from "@/lib/format";
import { strings } from "@/lib/strings";
import { PageHeader } from "@/components/composite/Chrome";
import { CountUp } from "@/components/luxe/CountUp";
import { Reveal, Stagger, StaggerItem } from "@/components/luxe/Reveal";
import { TrustTicker } from "@/components/luxe/TrustTicker";
import { ScrollStage } from "@/components/luxe/ScrollStage";
import { TiltCard } from "@/components/viz/Depth";

export function shortINR(v: number): string {
  if (v >= 10000000) return `₹${(v / 10000000).toFixed(2)} Cr`;
  if (v >= 100000) return `₹${(v / 100000).toFixed(1)} L`;
  if (v >= 1000) return `₹${(v / 1000).toFixed(1)}K`;
  return formatINR(v);
}

const EASE = [0.22, 1, 0.36, 1] as const;

export function Landing() {
  const total = disasters.reduce((a, d) => a + d.collected, 0);
  const ngoCount = disasters.reduce((a, d) => a + d.ngos, 0);
  const resolved = disasters.reduce((a, d) => a + d.alertsResolved, 0);
  return (
    <div>
      {/* ——— Professional hero ——— */}
      <section className="rs-hero relative overflow-hidden p-7 md:p-12" aria-labelledby="hero-title">
        <div className="rs-hero-grid" aria-hidden />
        <div className="relative grid items-center gap-10 lg:grid-cols-[1.1fr_.9fr]">
          <div>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: EASE }}
              className="inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.12em]"
              style={{ borderColor: "var(--border-subtle)", background: "var(--bg-surface)", color: "var(--primary-600)" }}
            >
              <BadgeCheck size={14} aria-hidden /> Transparent Disaster-Relief Tracking
            </motion.p>
            <motion.h1
              id="hero-title"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.08, ease: EASE }}
              className="mt-5 max-w-2xl text-balance text-[38px] font-extrabold leading-[1.05] tracking-tight md:text-[56px]"
            >
              Every donated rupee, traceable to its receipt.
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.16, ease: EASE }}
              className="mt-4 max-w-lg text-[16px] leading-7"
              style={{ color: "var(--text-secondary)" }}
            >
              {strings.heroSub} Watch funds flow from donation to the field — with evidence for every risk flag, not verdicts.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.24, ease: EASE }}
              className="mt-7 flex flex-wrap items-center gap-3"
            >
              <Link to="/donate" className="rs-btn-primary !min-h-[50px] !px-7 !text-[15px]">Donate now <ArrowRight size={17} aria-hidden /></Link>
              <Link to="/dashboard" className="rs-btn-secondary !min-h-[50px] !px-7 !text-[15px]">
                View Public Dashboard
              </Link>
            </motion.div>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.35, duration: 0.5 }}
              className="mono mt-5 text-[10.5px] tracking-[0.18em]"
              style={{ color: "var(--text-muted)" }}
            >
              SYNTHETIC DEMO DATA · {strings.simulatedRail.toUpperCase()}
            </motion.p>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.42 }}
              className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 text-[13px] font-semibold"
              style={{ color: "var(--text-secondary)" }}
            >
              {[["Audited ledger", FileCheck2], ["Donor-visible", Eye], ["Masked bank data", Landmark]].map(([t, Icon]) => {
                const I = Icon as typeof Eye;
                return <span key={t as string} className="inline-flex items-center gap-1.5"><I size={15} aria-hidden style={{ color: "var(--primary-600)" }} />{t as string}</span>;
              })}
            </motion.div>
          </div>

          {/* glass ledger card */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.2, ease: EASE }}
          >
            <TiltCard>
              <div className="glass rounded-3xl p-6 md:p-7" aria-label="Live totals">
                <p className="text-[11px] font-extrabold uppercase tracking-[0.14em]" style={{ color: "var(--text-muted)" }}>Live · tracked across {disasters.length} disasters</p>
                <p className="kpi mt-2 text-[44px] font-extrabold leading-none md:text-[52px]">
                  <CountUp to={total} format={(v) => shortINR(v)} />
                </p>
                <p className="mono mt-1 text-[11px]" style={{ color: "var(--text-muted)" }}>exact {formatINR(total)} · reconciled nightly</p>
                <dl className="mt-5 space-y-3">
                  {[
                    ["NGOs onboarded", formatNumber(ngoCount)],
                    ["Alerts resolved with evidence", formatNumber(resolved)],
                    ["Receipt coverage", "94%"],
                  ].map(([k, v]) => (
                    <div key={k as string} className="flex items-center justify-between border-t pt-3 text-sm" style={{ borderColor: "var(--border-subtle)" }}>
                      <dt style={{ color: "var(--text-secondary)" }}>{k as string}</dt>
                      <dd className="kpi text-[17px] font-extrabold">{v as string}</dd>
                    </div>
                  ))}
                </dl>
                <p className="mt-4 flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold" style={{ background: "color-mix(in srgb, var(--risk-low) 10%, transparent)", color: "var(--risk-low)" }}>
                  <TrendingUp size={14} aria-hidden /> Utilisation updated daily from the ledger
                </p>
              </div>
            </TiltCard>
          </motion.div>
        </div>

        <div className="relative mt-8 flex flex-wrap items-center gap-x-8 gap-y-2 border-t px-1 pt-4 text-[12.5px] font-semibold" style={{ borderColor: "var(--border-subtle)", color: "var(--text-secondary)" }}>
          {disasters.map((d) => (
            <span key={d.id} className="inline-flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--primary-600)" }} aria-hidden />
              {d.name} · <span className="kpi">{shortINR(d.collected)}</span>
            </span>
          ))}
        </div>
      </section>

      <div className="mt-4"><TrustTicker /></div>

      {/* ——— Scroll-hijacked storytelling (landing only) ——— */}
      <div className="mt-12">
        <ScrollStage />
      </div>

      {/* ——— Impact band ——— */}
      <Reveal className="mt-12">
        <section className="rs-card overflow-hidden" aria-label="Impact by disaster">
          <div className="grid md:grid-cols-[1fr_1.4fr]">
            <div className="p-7 md:p-9" style={{ background: "var(--primary-700)", color: "#fff" }}>
              <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] opacity-70">Impact ledger</p>
              <p className="mt-2 text-[28px] font-extrabold leading-tight tracking-tight">Money with a memory.</p>
              <p className="mt-3 max-w-xs text-sm leading-6 opacity-75">Each disaster fund reconciles collected, allocated and spent — nightly, in public.</p>
              <Link to="/dashboard" className="mt-5 inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-white px-5 text-[14px] font-extrabold" style={{ color: "var(--primary-700)" }}>Open transparency dashboard</Link>
            </div>
            <ul className="divide-y" style={{ borderColor: "var(--border-subtle)" }}>
              {disasters.map((d, i) => (
                <li key={d.id}>
                  <Link to="/dashboard" className="group flex items-center gap-4 p-5 transition-colors hover:bg-[var(--bg-surface-alt)] md:px-7">
                    <span className="kpi text-[15px] font-extrabold" style={{ color: "var(--primary-600)" }}>0{i + 1}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[17px] font-extrabold tracking-tight">{d.name}</span>
                      <span className="mono mt-0.5 block text-[11.5px]" style={{ color: "var(--text-muted)" }}>{d.ngos} NGOs · {d.alertsResolved} alerts resolved</span>
                    </span>
                    <span className="kpi text-right text-[19px] font-extrabold">{shortINR(d.collected)}</span>
                    <ArrowUpRight size={17} aria-hidden className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" style={{ color: "var(--text-muted)" }} />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </Reveal>

      {/* ——— Final CTA ——— */}
      <Reveal className="mt-10">
        <section className="rs-card relative overflow-hidden p-8 text-center md:p-14">
          <p className="eyebrow justify-center">Begin in sixty seconds</p>
          <h2 className="mx-auto mt-3 max-w-2xl text-balance text-[30px] font-extrabold leading-tight tracking-tight md:text-[42px]">
            Give once. Trace it forever.
          </h2>
          <p className="mx-auto mt-3 max-w-md text-[15px]" style={{ color: "var(--text-secondary)" }}>Simulated rail, real transparency. Your test donation appears end-to-end in the ledger.</p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link to="/donate" className="rs-btn-primary !min-h-[50px] !px-8 !text-[15px]">Donate now <ArrowRight size={17} aria-hidden /></Link>
            <Link to="/donations/DON-5000-0917" className="rs-btn-secondary !min-h-[50px] !px-8 !text-[15px]">See a traced gift</Link>
          </div>
        </section>
      </Reveal>
    </div>
  );
}

export function Methodology() {
  return (
    <div>
      <PageHeader eyebrow="Trust" title="Methodology" sub="How trust is measured — in plain language, with the maths left visible." />
      <Stagger className="grid gap-4 md:grid-cols-3">
        {[
          ["01", "Transparency score", "Timely reporting (30) + receipt coverage (30) + budget discipline (25) + alert responsiveness (15). Always shown with its breakdown — never a bare number."],
          ["02", "Fraud review", "Deterministic rules + statistics + document matching produce investigation signals. Auditors resolve with a reason code. False positives are easy to close."],
          ["03", "Signal, not verdict", "We never say “fraudulent” or “guilty” — only “flagged for review” with linked evidence and a visible resolve path."],
        ].map(([n, t, d]) => (
          <StaggerItem key={t}>
            <div className="rs-card h-full p-6 md:p-7">
              <p className="mono text-[12px] font-bold tracking-[0.18em]" style={{ color: "var(--primary-600)" }}>{n}</p>
              <h2 className="mt-2 text-[20px] font-extrabold tracking-tight">{t}</h2>
              <div className="luxe-divider my-4" aria-hidden />
              <p className="text-sm leading-7" style={{ color: "var(--text-secondary)" }}>{d}</p>
            </div>
          </StaggerItem>
        ))}
      </Stagger>
      <Reveal className="mt-4">
        <div className="rs-card flex flex-wrap items-center gap-4 p-6 md:p-7">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl text-white" style={{ background: "var(--primary-600)" }}>
            <BadgeCheck size={20} aria-hidden />
          </span>
          <p className="min-w-0 flex-1 basis-64 text-sm leading-6" style={{ color: "var(--text-secondary)" }}>
            <strong style={{ color: "var(--text-primary)" }}>Separation of duties by design.</strong> Public sees aggregates only. NGOs see their own pipeline. Auditors see the full evidence bundle.
          </p>
          <Link to="/dashboard" className="rs-btn-primary rs-btn-sm">See it live</Link>
        </div>
      </Reveal>
    </div>
  );
}
