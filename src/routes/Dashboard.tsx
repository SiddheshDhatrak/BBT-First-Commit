import { Link } from "react-router-dom";
import { ArrowUpRight, BadgeCheck, HandCoins, Sparkles } from "lucide-react";
import { ngos } from "@/lib/mock";
import { formatINR } from "@/lib/format";
import { PageHeader } from "@/components/composite/Chrome";
import { TrustScoreRing } from "@/components/composite/Viz";
import { CountUp } from "@/components/luxe/CountUp";
import { Reveal, Stagger, StaggerItem } from "@/components/luxe/Reveal";

export function OrgProfile() {
  const n = ngos[0];
  return (
    <div>
      <PageHeader eyebrow="Public profile" title={n.name} sub="Score with full component breakdown. No raw fraud content in public view." />
      <div className="grid gap-4 lg:grid-cols-[1.2fr_.8fr]">
        <Reveal>
          <div className="rs-card p-6 md:p-8">
            <p className="eyebrow">Transparency score · verified</p>
            <div className="mt-4"><TrustScoreRing score={n.score} components={n.components} /></div>
            <div className="rs-inset mt-5 flex flex-wrap items-center gap-3 p-4 text-sm" style={{ color: "var(--text-secondary)" }}>
              <BadgeCheck size={18} aria-hidden style={{ color: "var(--risk-low)" }} />
              <span><strong style={{ color: "var(--text-primary)" }}>Independently reconciled.</strong> {n.programs} programs · {formatINR(n.spent)} deployed to the field.</span>
            </div>
          </div>
        </Reveal>
        <Reveal delay={0.08}>
          <div className="rs-brand-panel flex h-full flex-col justify-between gap-4 rounded-[20px] p-6 md:p-8">
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] opacity-70">Donor desk</p>
              <p className="mt-2 text-[24px] font-extrabold leading-tight tracking-tight">Fund this NGO<br />in one tap.</p>
            </div>
            <div>
              <Link to="/donate" className="rs-brand-cta inline-flex min-h-[44px] items-center gap-2 rounded-xl px-5 text-[14px] font-extrabold"><HandCoins size={15} aria-hidden /> Donate to Assam Floods</Link>
              <p className="mono mt-4 text-[10.5px] tracking-[0.14em] opacity-60">HASH-VERIFIED · SIMULATED RAIL</p>
            </div>
          </div>
        </Reveal>
      </div>
      <div className="mb-2 mt-8 flex items-end justify-between">
        <h2 className="text-[22px] font-extrabold tracking-tight">Active programs</h2>
        <p className="mono hidden text-[11px] sm:block" style={{ color: "var(--text-muted)" }}>4 FIELD PROGRAMS</p>
      </div>
      <Stagger className="grid gap-4 sm:grid-cols-2">
        {["Flood Food Relief", "Emergency Medical", "Shelter Kits", "Clean Water"].map((p, i) => (
          <StaggerItem key={p}>
            <div className="rs-card rs-card-lift group flex items-center justify-between gap-3 p-5">
              <div className="flex items-center gap-4">
                <span className="kpi text-[15px] font-extrabold" style={{ color: "var(--primary-600)" }}>0{i + 1}</span>
                <div>
                  <span className="block text-[17px] font-extrabold tracking-tight">{p}</span>
                  <span className="mono text-[11px]" style={{ color: "var(--text-muted)" }}>ASSAM FLOODS 2026 · FUNDED</span>
                </div>
              </div>
              <span className="flex h-10 w-10 items-center justify-center rounded-full border transition-all group-hover:translate-x-1" style={{ borderColor: "var(--border-subtle)" }}>
                <ArrowUpRight size={17} aria-hidden style={{ color: "var(--text-muted)" }} />
              </span>
            </div>
          </StaggerItem>
        ))}
      </Stagger>
    </div>
  );
}

export function DonorHome() {
  return (
    <div>
      <PageHeader eyebrow="Donor" title="Welcome back" sub="Your giving at a glance — recent activity and one-tap giving." action={<Link to="/donate" className="rs-btn-primary rs-btn-sm"><HandCoins size={15} aria-hidden /> Donate now</Link>} />
      <div className="grid gap-4 lg:grid-cols-[1.3fr_.7fr]">
        <Reveal>
          <div className="rs-card p-6 md:p-8">
            <p className="eyebrow">Last gift · Assam Floods 2026</p>
            <p className="kpi mt-2 text-[36px] font-extrabold leading-none md:text-[42px]">
              <CountUp to={5000} format={(v) => formatINR(Math.round(v))} /> <span className="text-[19px]" style={{ color: "var(--text-muted)" }}>· 78% utilised</span>
            </p>
            <div className="mt-4 h-2.5 overflow-hidden rounded-full" style={{ background: "var(--bg-surface-alt)", border: "1px solid var(--border-subtle)" }} role="progressbar" aria-valuenow={78} aria-valuemin={0} aria-valuemax={100} aria-label="Last gift 78 percent utilised">
              <div className="h-full rounded-full" style={{ width: "78%", background: "linear-gradient(90deg,#2E7CF6,#1A3FA0)" }} />
            </div>
            <div className="mt-5 flex flex-wrap gap-2.5">
              <Link to="/donations/DON-5000-0917" className="rs-btn-primary rs-btn-sm">Trace it →</Link>
              <Link to="/donations" className="rs-btn-secondary rs-btn-sm">All my gifts</Link>
            </div>
          </div>
        </Reveal>
        <Reveal delay={0.08}>
          <div className="rs-brand-panel flex h-full flex-col justify-between gap-4 rounded-[20px] p-6">
            <div>
              <p className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-[0.14em] opacity-70"><Sparkles size={13} aria-hidden /> Impact note</p>
              <p className="mt-2 text-[22px] font-extrabold leading-snug tracking-tight">Your ₹5,000 fed 40 families this week.</p>
            </div>
            <Link to="/donate" className="rs-brand-cta inline-flex w-fit min-h-[44px] items-center rounded-xl px-5 text-[14px] font-extrabold">Give again</Link>
          </div>
        </Reveal>
      </div>
    </div>
  );
}
