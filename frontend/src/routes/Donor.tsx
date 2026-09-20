import { useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, ArrowRight, CheckCircle2, ShieldCheck, Ticket } from "lucide-react";
import { formatINR } from "@/lib/format";
import { useCampaigns, useDonate, useDonationLineage, useDonations, type LineagePayload } from "@/lib/queries";
import { PageHeader } from "@/components/composite/Chrome";
import { FundLineageFlow } from "@/components/composite/Lineage";
import { StatusTimeline } from "@/components/composite/Viz";
import { Reveal } from "@/components/luxe/Reveal";

const MIN = 100;
const MAX = 10000000;

interface CampaignRow { id: string; name: string; targetAmount?: number; status?: string }
interface DonationRow { id: string; amount: number; campaignId: string }

const RATIOS = [
  { category: "Food", frac: 0.4, color: "#2456D6" },
  { category: "Medical", frac: 0.3, color: "#0F7A52" },
  { category: "Shelter", frac: 0.2, color: "#2E7CF6" },
  { category: "Logistics", frac: 0.1, color: "#0F6D8A" },
];

function splitAmount(amount: number) {
  return RATIOS.map((r) => ({ ...r, amount: Math.round(amount * r.frac) }));
}

export function DonateFlow() {
  const campaignsQ = useCampaigns();
  const campaigns = ((campaignsQ.data ?? []) as CampaignRow[]).filter((c) => (c.status ?? "OPEN") === "OPEN");
  const [campaignId, setCampaignId] = useState("");
  const activeCampaign = campaigns.find((c) => c.id === campaignId) ?? campaigns[0];
  const [raw, setRaw] = useState("5000");
  const [step, setStep] = useState(0);
  const [touched, setTouched] = useState(false);
  const [donatedId, setDonatedId] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const donate = useDonate();
  const nav = useNavigate();

  const amount = Number(raw);
  const valid = Number.isFinite(amount) && Number.isInteger(amount) && amount >= MIN && amount <= MAX;
  const err = !valid && touched
    ? !Number.isFinite(amount) || raw.trim() === "" ? "Enter an amount in whole rupees."
    : amount < MIN ? `Minimum donation is ${formatINR(MIN)}.`
    : `Maximum single donation is ${formatINR(MAX)}.`
    : null;

  const [ref] = useState(() => `TXN-${Date.now().toString(36).toUpperCase()}`);

  if (campaignsQ.isPending) {
    return (
      <div>
        <PageHeader eyebrow="Donor flow" title="Donate" sub="Step 1 of 3 — live ledger rail." />
        <div className="rs-card mx-auto max-w-2xl p-8 text-center text-sm" style={{ color: "var(--text-secondary)" }} aria-busy="true">Loading live campaigns…</div>
      </div>
    );
  }
  if (campaignsQ.isError || campaigns.length === 0) {
    return (
      <div>
        <PageHeader eyebrow="Donor flow" title="Donate" sub="Step 1 of 3 — live ledger rail." />
        <div className="rs-card mx-auto max-w-2xl p-8 text-center text-sm font-bold" style={{ color: "var(--risk-high)" }} role="alert">
          No open campaigns available right now. Please check back after a campaign is created.
        </div>
      </div>
    );
  }
  const cid = activeCampaign.id;

  const submitDonation = async () => {
    setSubmitError(null);
    try {
      const created = await donate.mutateAsync({ campaignId: cid, amount });
      const id = (created as { id?: string })?.id ?? (created as { donation?: { id?: string } })?.donation?.id ?? null;
      if (id) setDonatedId(id);
      setStep(2);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Donation failed.");
    }
  };

  return (
    <div>
      <PageHeader eyebrow="Donor flow" title="Donate" sub={`Step ${step + 1} of 3 — live ledger rail. Real backend record, no simulated charge.`} />
      <div className="mx-auto max-w-2xl">
        <ol className="mb-5 flex items-center gap-2" aria-label="Donation progress">
          {["Campaign", "Amount", "Confirm"].map((s, i) => (
            <li key={s} className="flex flex-1 items-center gap-2">
              <span
                className="kpi flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold transition-all"
                style={
                  i < step
                    ? { background: "var(--risk-low)", color: "#fff" }
                    : i === step
                      ? { background: "var(--primary-600)", color: "#fff", boxShadow: "var(--shadow-2)" }
                      : { background: "var(--bg-surface-alt)", color: "var(--text-muted)", border: "1px solid var(--border-subtle)" }
                }
                aria-current={i === step ? "step" : undefined}
              >
                {i < step ? "✓" : i + 1}
              </span>
              <span className="hidden text-[13px] font-bold sm:block" style={{ color: i <= step ? "var(--text-primary)" : "var(--text-muted)" }}>{s}</span>
              {i < 2 && (
                <span className="relative h-[2px] flex-1 overflow-hidden rounded-full" style={{ background: "var(--bg-surface-alt)" }} aria-hidden>
                  <motion.span
                    className="absolute inset-y-0 left-0 rounded-full"
                    style={{ background: "var(--primary-600)" }}
                    initial={false}
                    animate={{ width: i < step ? "100%" : "0%" }}
                    transition={{ duration: 0.5 }}
                  />
                </span>
              )}
            </li>
          ))}
        </ol>

        <div className="rs-card overflow-hidden">
          <div className="h-1.5" style={{ background: "var(--primary-600)" }} aria-hidden />
          <div className="p-6 md:p-9">
            <AnimatePresence mode="wait">
              {step === 0 && (
                <motion.div key="s0" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.35 }}>
                  <p className="eyebrow">01 · Choose your cause</p>
                  <h2 className="mt-2 text-[24px] font-extrabold tracking-tight">Where should it go?</h2>
                  <label className="mt-5 block text-sm font-bold" htmlFor="don-campaign">Live campaign
                    <select id="don-campaign" value={cid} onChange={(e) => setCampaignId(e.target.value)} className="rs-input mt-2 !min-h-[54px] !rounded-2xl !text-[15px]">
                      {campaigns.map((d) => <option key={d.id} value={d.id}>{d.name}{d.targetAmount ? ` — target ${formatINR(d.targetAmount)}` : ""}</option>)}
                    </select>
                  </label>
                  <div className="rs-inset mt-4 flex items-center gap-3 p-4 text-[13px]" style={{ color: "var(--text-secondary)" }}>
                    <ShieldCheck size={18} aria-hidden style={{ color: "var(--risk-low)", flexShrink: 0 }} />
                    Every campaign is ledger-verified with nightly reconciliation.
                  </div>
                  <button type="button" className="rs-btn-accent mt-5 w-full !min-h-[52px]" onClick={() => setStep(1)}>Continue <ArrowRight size={16} aria-hidden /></button>
                </motion.div>
              )}
              {step === 1 && (
                <motion.div key="s1" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.35 }}>
                  <p className="eyebrow">02 · Set your amount</p>
                  <h2 className="mt-2 text-[24px] font-extrabold tracking-tight">How generous today?</h2>
                  <label className="mt-5 block text-sm font-bold" htmlFor="don-amount">Amount (INR)
                    <div className="relative mt-2">
                      <span className="kpi absolute left-5 top-1/2 -translate-y-1/2 text-[22px]" style={{ color: "var(--accent-600)" }} aria-hidden>₹</span>
                      <input
                        id="don-amount" inputMode="numeric" autoComplete="off"
                        value={raw} onChange={(e) => { setRaw(e.target.value.replace(/[^0-9]/g, "").slice(0, 8)); setTouched(true); }}
                        className="rs-input kpi !rounded-2xl !py-4 pl-11 !text-[26px] font-semibold" aria-describedby="alloc-preview don-err" aria-invalid={!!err}
                        placeholder="5,000"
                      />
                    </div>
                  </label>
                  <div className="mt-2.5 flex flex-wrap gap-2">
                    {[1000, 5000, 11000, 51000].map((v) => (
                      <button key={v} type="button" onClick={() => { setRaw(String(v)); setTouched(true); }} className="mono rounded-full border px-3.5 py-1.5 text-[12px] font-bold transition-all hover:-translate-y-0.5" style={{ borderColor: raw === String(v) ? "var(--accent-500)" : "var(--border-subtle)", background: raw === String(v) ? "var(--accent-soft)" : "transparent", color: "var(--text-primary)" }}>
                        ₹{v.toLocaleString("en-IN")}
                      </button>
                    ))}
                  </div>
                  {err ? <p id="don-err" role="alert" className="mt-3 text-[13px] font-bold" style={{ color: "var(--risk-high)" }}>{err}</p>
                  : <div id="alloc-preview" className="rs-inset mt-4 p-4">
                    <p className="eyebrow !text-[10px]">Allocation preview</p>
                    <div className="mt-3 space-y-2.5">
                      {splitAmount(Number.isFinite(amount) ? amount : 0).map((s) => (
                        <div key={s.category}>
                          <div className="flex items-center gap-2 text-[13px]">
                            <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} aria-hidden />
                            <span className="font-semibold" style={{ color: "var(--text-secondary)" }}>{s.category} · {Math.round(s.frac * 100)}%</span>
                            <span className="kpi ml-auto text-[14px] font-semibold">{formatINR(s.amount)}</span>
                          </div>
                          <div className="mt-1 h-1.5 overflow-hidden rounded-full" style={{ background: "var(--bg-surface)" }} aria-hidden>
                            <motion.div className="h-full rounded-full" style={{ background: s.color }} initial={false} animate={{ width: `${s.frac * 100}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>}
                  {submitError && <p role="alert" className="mt-3 text-[13px] font-bold" style={{ color: "var(--risk-high)" }}>{submitError}</p>}
                  <div className="mt-5 flex gap-2.5">
                    <button type="button" className="rs-btn-secondary flex-1 !min-h-[52px]" onClick={() => setStep(0)}><ArrowLeft size={16} aria-hidden /> Back</button>
                    <button type="button" className="rs-btn-primary flex-[2] !min-h-[52px]" disabled={!valid || donate.isPending} onClick={submitDonation}>
                      {donate.isPending ? "Recording…" : `Donate ${valid ? formatINR(amount) : "—"}`}
                    </button>
                  </div>
                </motion.div>
              )}
              {step === 2 && (
                <motion.div key="s2" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }} className="py-2 text-center">
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", damping: 12, stiffness: 200, delay: 0.1 }}
                    className="mx-auto flex h-16 w-16 items-center justify-center rounded-full"
                    style={{ background: "linear-gradient(180deg,#e6f5ec,#cdeeda)", color: "var(--risk-low)", border: "1px solid color-mix(in srgb, var(--risk-low) 35%, transparent)", boxShadow: "0 0 40px -8px rgba(15,122,82,.5)" }}
                  >
                    <CheckCircle2 size={32} aria-hidden />
                  </motion.span>
                  <p className="eyebrow mt-4 justify-center">Ledger recorded · success</p>
                  <p className="mt-2 text-[28px] font-extrabold tracking-tight">Thank you.</p>
                  <p className="kpi mt-1 text-[20px]" style={{ color: "var(--text-secondary)" }}>{formatINR(amount)} → {activeCampaign.name}</p>
                  <div className="ticket-notch mx-auto mt-5 max-w-sm border border-dashed p-4" style={{ borderColor: "var(--border-strong)", background: "var(--bg-surface-alt)", borderRadius: 18 }}>
                    <p className="mono flex items-center justify-center gap-2 text-[12px] font-bold" style={{ color: "var(--text-primary)" }}><Ticket size={14} aria-hidden /> {ref}</p>
                    <p className="mono mt-1 text-[10.5px] tracking-[0.14em]" style={{ color: "var(--text-muted)" }}>LIVE LEDGER RAIL</p>
                  </div>
                  <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
                    <button
                      type="button" className="rs-btn-accent flex-1 !min-h-[52px]"
                      disabled={!donatedId}
                      onClick={() => donatedId && nav(`/donations/${donatedId}`, { state: { amount, disaster: activeCampaign.name, ref } })}
                    >
                      Trace this donation
                    </button>
                    <Link to="/donations" className="rs-btn-secondary flex-1 !min-h-[52px]">My donations</Link>
                  </div>
                  <button type="button" onClick={() => setStep(1)} className="rs-btn-ghost mt-1 text-[13px]">Edit amount</button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}

export function MyDonations() {
  const giftsQ = useDonations();
  const gifts = ((giftsQ.data ?? []) as DonationRow[]);
  return (
    <div>
      <PageHeader eyebrow="Donor" title="My Donations" sub="Every gift, traceable to the field receipt." action={<Link to="/donate" className="rs-btn-accent rs-btn-sm">New donation</Link>} />
      <Reveal>
        <div className="rs-card overflow-hidden">
          {giftsQ.isPending ? (
            <p className="p-6 text-sm" style={{ color: "var(--text-secondary)" }} aria-busy="true">Loading your gifts…</p>
          ) : giftsQ.isError ? (
            <p className="p-6 text-sm font-bold" style={{ color: "var(--risk-high)" }} role="alert">Could not load gifts — check sign-in and backend connection.</p>
          ) : gifts.length === 0 ? (
            <div className="p-6 text-sm" style={{ color: "var(--text-secondary)" }}>
              No gifts yet. <Link to="/donate" className="font-extrabold">Make your first donation →</Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="rs-table min-w-[600px]">
                <caption className="sr-only">Your donations</caption>
                <thead><tr><th scope="col">Donation</th><th scope="col">Campaign</th><th scope="col">Amount</th><th scope="col"><span className="sr-only">Action</span></th></tr></thead>
                <tbody>
                  {gifts.map((g) => (
                    <tr key={g.id}>
                      <td className="mono text-[13px]" style={{ color: "var(--text-secondary)" }}>{g.id.slice(0, 12)}…</td>
                      <td className="font-bold">{g.campaignId.slice(0, 12)}…</td>
                      <td className="kpi text-[16px] font-semibold">{formatINR(g.amount)}</td>
                      <td className="text-right"><Link to={`/donations/${g.id}`} className="font-extrabold">Trace →</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Reveal>
    </div>
  );
}

export function LineageDetail() {
  const { id } = useParams();
  const loc = useLocation() as { state?: { amount?: number; disaster?: string; ref?: string } };
  const live = useDonationLineage(id);
  const data = live.data as LineagePayload | undefined;
  const splits = data?.programs?.length
    ? data.programs.map((p, i) => ({ category: p.name, amount: data.expenses?.[i]?.amount ?? 0, color: RATIOS[i % RATIOS.length]?.color ?? "#2456D6" }))
    : undefined;
  const timeline = [
    data?.donation ? `Donation received · ${formatINR(data.donation.amount)}` : null,
    data?.campaign ? `Allocated to ${data.campaign.name}` : null,
    data?.programs?.length ? `${data.programs.length} program(s) assigned` : null,
    data?.expenses?.length ? `${data.expenses.length} expense(s) recorded` : null,
    data?.transactions?.length ? `${data.transactions.length} payment(s) settled` : null,
  ].filter((x): x is string => !!x);

  return (
    <div>
      <PageHeader eyebrow={data?.campaign?.name ?? loc.state?.disaster ?? "Donation"} title={`Donation ${id?.slice(0, 12) ?? ""}…`} sub="End-to-end lineage: donation → fund → NGO → program → vendor → invoice → payment." />
      {live.isPending ? (
        <div className="rs-card p-8 text-center text-sm" style={{ color: "var(--text-secondary)" }} aria-busy="true">Loading live lineage…</div>
      ) : live.isError || !data?.donation ? (
        <div className="rs-card p-8 text-center text-sm font-bold" style={{ color: "var(--risk-high)" }} role="alert">
          Live lineage unavailable for this donation — it may belong to another donor or the ledger is unreachable.
        </div>
      ) : (
        <>
          <div className="rs-card mb-4 flex flex-wrap gap-x-8 gap-y-2 p-5">
            {[
              ["Ledger amount", formatINR(data.donation?.amount ?? 0)],
              ["Allocations", String(data.allocations?.length ?? 0)],
              ["Programs", String(data.programs?.length ?? 0)],
              ["Expenses", String(data.expenses?.length ?? 0)],
              ["Payments", String(data.transactions?.length ?? 0)],
            ].map(([k, v]) => (
              <span key={k}>
                <span className="mono block text-[10.5px] uppercase tracking-[0.12em]" style={{ color: "var(--text-muted)" }}>{k}</span>
                <span className="kpi block text-[18px] font-extrabold">{v}</span>
              </span>
            ))}
          </div>
          {loc.state?.ref && <p className="mono mb-4 inline-block rounded-full border px-3 py-1.5 text-xs" style={{ borderColor: "var(--border-subtle)", color: "var(--text-muted)" }}>Ref {loc.state.ref} · LIVE LEDGER RAIL</p>}
          <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
            <Reveal><FundLineageFlow amount={data.donation.amount} splits={splits} donationId={data.donation.id} /></Reveal>
            <Reveal delay={0.1}>
              <div className="rs-card h-fit p-6">
                <p className="eyebrow">Journey</p>
                <h2 className="mt-1 text-[20px] font-extrabold tracking-tight">Status timeline</h2>
                <div className="mt-4"><StatusTimeline items={timeline.length > 0 ? timeline : ["Recorded on ledger"]} /></div>
                <div className="luxe-divider my-4" aria-hidden />
                <Link to="/donations" className="rs-btn-secondary rs-btn-sm w-full">Back to my gifts</Link>
              </div>
            </Reveal>
          </div>
        </>
      )}
    </div>
  );
}
