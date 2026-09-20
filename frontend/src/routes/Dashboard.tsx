import { Link, useParams } from "react-router-dom";
import { ArrowUpRight, BadgeCheck, HandCoins } from "lucide-react";
import { formatINR } from "@/lib/format";
import { useDonations, useOrganizations, usePrograms, usePublicMetrics } from "@/lib/queries";
import { PageHeader } from "@/components/composite/Chrome";
import { CountUp } from "@/components/luxe/CountUp";
import { Reveal, Stagger, StaggerItem } from "@/components/luxe/Reveal";

interface Org { id: string; name: string }
interface Program { id: string; name: string; organizationId?: string; campaignId?: string; status?: string }
interface Donation { id: string; amount: number; campaignId: string }

export function OrgProfile() {
  const { id } = useParams();
  const orgsQ = useOrganizations();
  const programsQ = usePrograms();
  const orgs = ((orgsQ.data ?? []) as Org[]);
  const org = orgs.find((o) => o.id === id) ?? orgs[0];
  const programs = ((programsQ.data ?? []) as Program[]).filter((p) => !org || p.organizationId === org.id);

  if (orgsQ.isPending || programsQ.isPending) {
    return (
      <div>
        <PageHeader eyebrow="Public profile" title="Organisation" sub="Live ledger profile." />
        <div className="rs-card p-8 text-center text-sm" style={{ color: "var(--text-secondary)" }} aria-busy="true">Loading organisation…</div>
      </div>
    );
  }
  if (orgsQ.isError || !org) {
    return (
      <div>
        <PageHeader eyebrow="Public profile" title="Organisation" sub="Live ledger profile." />
        <div className="rs-card p-8 text-center text-sm font-bold" style={{ color: "var(--risk-high)" }} role="alert">
          Organisation not found or unreachable. Sign in with an NGO account to view the ledger.
        </div>
      </div>
    );
  }
  return (
    <div>
      <PageHeader eyebrow="Live profile" title={org.name} sub="Live programs from the backend ledger. No aggregate fraud content in public view." />
      <div className="grid gap-4 lg:grid-cols-[1.2fr_.8fr]">
        <Reveal>
          <div className="rs-card p-6 md:p-8">
            <p className="eyebrow">Verified organisation · live</p>
            <div className="rs-inset mt-5 flex flex-wrap items-center gap-3 p-4 text-sm" style={{ color: "var(--text-secondary)" }}>
              <BadgeCheck size={18} aria-hidden style={{ color: "var(--risk-low)" }} />
              <span><strong style={{ color: "var(--text-primary)" }}>On-ledger.</strong> {programs.length} programs · ID {org.id.slice(0, 8)}…</span>
            </div>
          </div>
        </Reveal>
        <Reveal delay={0.08}>
          <div className="rs-brand-panel flex h-full flex-col justify-between gap-4 rounded-[20px] p-6 md:p-8">
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] opacity-70">Donor desk</p>
              <p className="mt-2 text-[24px] font-extrabold leading-tight tracking-tight">Fund relief<br />in one tap.</p>
            </div>
            <div>
              <Link to="/donate" className="rs-brand-cta inline-flex min-h-[44px] items-center gap-2 rounded-xl px-5 text-[14px] font-extrabold"><HandCoins size={15} aria-hidden /> Donate now</Link>
              <p className="mono mt-4 text-[10.5px] tracking-[0.14em] opacity-60">HASH-VERIFIED · LIVE RAIL</p>
            </div>
          </div>
        </Reveal>
      </div>
      <div className="mb-2 mt-8 flex items-end justify-between">
        <h2 className="text-[22px] font-extrabold tracking-tight">Active programs</h2>
        <p className="mono hidden text-[11px] sm:block" style={{ color: "var(--text-muted)" }}>{programs.length} LIVE PROGRAMS</p>
      </div>
      {programs.length === 0 ? (
        <div className="rs-card p-6 text-sm" style={{ color: "var(--text-secondary)" }}>No programs yet for this organisation.</div>
      ) : (
        <Stagger className="grid gap-4 sm:grid-cols-2">
          {programs.map((p, i) => (
            <StaggerItem key={p.id}>
              <div className="rs-card rs-card-lift group flex items-center justify-between gap-3 p-5">
                <div className="flex items-center gap-4">
                  <span className="kpi text-[15px] font-extrabold" style={{ color: "var(--primary-600)" }}>0{i + 1}</span>
                  <div>
                    <span className="block text-[17px] font-extrabold tracking-tight">{p.name}</span>
                    <span className="mono text-[11px]" style={{ color: "var(--text-muted)" }}>{p.status ?? "ACTIVE"} · FUNDED</span>
                  </div>
                </div>
                <span className="flex h-10 w-10 items-center justify-center rounded-full border transition-all group-hover:translate-x-1" style={{ borderColor: "var(--border-subtle)" }}>
                  <ArrowUpRight size={17} aria-hidden style={{ color: "var(--text-muted)" }} />
                </span>
              </div>
            </StaggerItem>
          ))}
        </Stagger>
      )}
    </div>
  );
}

export function DonorHome() {
  const live = usePublicMetrics();
  const myGifts = useDonations();
  const gifts = ((myGifts.data ?? []) as Donation[]);
  const last = gifts[0];
  const m = live.data;
  return (
    <div>
      <PageHeader eyebrow="Donor" title="Welcome back" sub="Your giving at a glance — recent activity and one-tap giving." action={<Link to="/donate" className="rs-btn-primary rs-btn-sm"><HandCoins size={15} aria-hidden /> Donate now</Link>} />
      {m && (
        <Reveal className="mb-4">
          <div className="rs-inset flex flex-wrap items-center gap-x-6 gap-y-1.5 px-5 py-3 text-[13px]">
            <span className="mono text-[10.5px] uppercase tracking-[0.12em]" style={{ color: "var(--text-muted)" }}>Live ledger · all donors</span>
            <span><strong className="kpi">{formatINR(m.totalDonated)}</strong> <span style={{ color: "var(--text-secondary)" }}>across {m.donationCount} gifts</span></span>
            <span><strong className="kpi">{m.deliveryVerifiedExpenses}</strong> <span style={{ color: "var(--text-secondary)" }}>deliveries verified</span></span>
          </div>
        </Reveal>
      )}
      <div className="grid gap-4 lg:grid-cols-[1.3fr_.7fr]">
        <Reveal>
          <div className="rs-card p-6 md:p-8">
            {myGifts.isPending ? (
              <p className="text-sm" style={{ color: "var(--text-muted)" }} aria-busy="true">Loading your gifts…</p>
            ) : myGifts.isError ? (
              <p className="text-sm font-bold" style={{ color: "var(--risk-high)" }} role="alert">Could not load your gifts — check sign-in and backend connection.</p>
            ) : !last ? (
              <div>
                <p className="eyebrow">No gifts yet</p>
                <p className="mt-2 text-[20px] font-extrabold tracking-tight">Make your first donation.</p>
                <Link to="/donate" className="rs-btn-primary rs-btn-sm mt-4">Donate now</Link>
              </div>
            ) : (
              <>
                <p className="eyebrow">Last gift · {last.id.slice(0, 12)}…</p>
                <p className="kpi mt-2 text-[36px] font-extrabold leading-none md:text-[42px]">
                  <CountUp to={last.amount} format={(v) => formatINR(Math.round(v))} />
                </p>
                <div className="mt-5 flex flex-wrap gap-2.5">
                  <Link to={`/donations/${last.id}`} className="rs-btn-primary rs-btn-sm">Trace it →</Link>
                  <Link to="/donations" className="rs-btn-secondary rs-btn-sm">All my gifts</Link>
                </div>
              </>
            )}
          </div>
        </Reveal>
        <Reveal delay={0.08}>
          <div className="rs-brand-panel flex h-full flex-col justify-between gap-4 rounded-[20px] p-6">
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] opacity-70">Ledger</p>
              <p className="mt-2 text-[22px] font-extrabold leading-snug tracking-tight">
                {gifts.length > 0 ? `${gifts.length} gift${gifts.length === 1 ? "" : "s"} traced end-to-end.` : "Every gift traced end-to-end."}
              </p>
            </div>
            <Link to="/donate" className="rs-brand-cta inline-flex w-fit min-h-[44px] items-center rounded-xl px-5 text-[14px] font-extrabold">Give again</Link>
          </div>
        </Reveal>
      </div>
    </div>
  );
}
