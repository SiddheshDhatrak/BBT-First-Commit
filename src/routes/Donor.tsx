import { useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import { disasters, lineageExample } from "@/lib/mock";
import { formatINR } from "@/lib/format";
import { strings } from "@/lib/strings";
import { PageHeader } from "@/components/composite/Chrome";
import { FundLineageFlow } from "@/components/composite/Lineage";
import { StatusTimeline } from "@/components/composite/Viz";

const MIN = 100;
const MAX = 10000000;

const RATIOS = [
  { category: "Food", frac: 0.4, color: "#14499a" },
  { category: "Medical", frac: 0.3, color: "#157a54" },
  { category: "Shelter", frac: 0.2, color: "#d9871f" },
  { category: "Logistics", frac: 0.1, color: "#146d86" },
];

function splitAmount(amount: number) {
  return RATIOS.map((r) => ({ ...r, amount: Math.round(amount * r.frac) }));
}

export function DonateFlow() {
  const [disaster, setDisaster] = useState(disasters[0].id);
  const [raw, setRaw] = useState("5000");
  const [step, setStep] = useState(0);
  const [touched, setTouched] = useState(false);
  const nav = useNavigate();

  const amount = Number(raw);
  const valid = Number.isFinite(amount) && Number.isInteger(amount) && amount >= MIN && amount <= MAX;
  const err = !valid && touched
    ? !Number.isFinite(amount) || raw.trim() === "" ? "Enter an amount in whole rupees."
    : amount < MIN ? `Minimum donation is ${formatINR(MIN)}.`
    : `Maximum single donation is ${formatINR(MAX)}.`
    : null;

  const ref = useMemo(() => `TXN-SYN-${Math.random().toString(36).slice(2, 8).toUpperCase()}`, []);
  const dName = disasters.find((d) => d.id === disaster)?.name ?? disaster;

  return (
    <div>
      <PageHeader eyebrow="Donor flow" title="Donate" sub={`Step ${step + 1} of 3 — ${strings.simulatedRail}`} />
      <ol className="mb-4 flex gap-1.5" aria-label="Donation progress">
        {["Campaign", "Amount", "Confirm"].map((s, i) => (
          <li key={s} className="flex flex-1 items-center gap-1.5">
            <span className="rs-inset kpi flex h-7 w-7 items-center justify-center text-xs font-extrabold" style={i <= step ? { background: "var(--primary-600)", color: "#fff", borderColor: "transparent" } : undefined} aria-current={i === step ? "step" : undefined}>{i < step ? "✓" : i + 1}</span>
            <span className="hidden text-xs font-semibold sm:block" style={{ color: i <= step ? "var(--text-primary)" : "var(--text-muted)" }}>{s}</span>
            {i < 2 && <span className="h-px flex-1" style={{ background: "var(--border-subtle)" }} aria-hidden />}
          </li>
        ))}
      </ol>
      <div className="rs-card mx-auto max-w-xl p-5 md:p-6">
        {step === 0 && (
          <div>
            <label className="block text-sm font-semibold" htmlFor="don-campaign">Choose disaster / campaign
              <select id="don-campaign" value={disaster} onChange={(e) => setDisaster(e.target.value)} className="rs-input mt-1.5">
                {disasters.map((d) => <option key={d.id} value={d.id}>{d.name} — {formatINR(d.collected)} tracked</option>)}
              </select>
            </label>
            <button type="button" className="rs-btn-primary mt-4 w-full" onClick={() => setStep(1)}>Continue</button>
          </div>
        )}
        {step === 1 && (
          <div>
            <label className="block text-sm font-semibold" htmlFor="don-amount">Amount (INR)
              <input
                id="don-amount" inputMode="numeric" autoComplete="off"
                value={raw} onChange={(e) => { setRaw(e.target.value.replace(/[^0-9]/g, "").slice(0, 8)); setTouched(true); }}
                className="rs-input kpi mt-1.5 text-lg font-extrabold" aria-describedby="alloc-preview don-err" aria-invalid={!!err}
                placeholder="5,000"
              />
            </label>
            {err ? <p id="don-err" role="alert" className="mt-1.5 text-[13px] font-medium" style={{ color: "var(--risk-high)" }}>{err}</p>
            : <div id="alloc-preview" className="rs-inset mt-3 grid grid-cols-2 gap-2 p-3 text-[13px]">
              {splitAmount(Number.isFinite(amount) ? amount : 0).map((s) => (
                <div key={s.category} className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} aria-hidden />
                  <span style={{ color: "var(--text-secondary)" }}>{s.category}</span>
                  <span className="kpi ml-auto font-bold">{formatINR(s.amount)}</span>
                </div>
              ))}
            </div>}
            <div className="mt-4 flex gap-2">
              <button type="button" className="rs-btn-secondary flex-1" onClick={() => setStep(0)}>Back</button>
              <button type="button" className="rs-btn-primary flex-[2]" disabled={!valid} onClick={() => setStep(2)}>
                Pay {valid ? formatINR(amount) : "—"}
              </button>
            </div>
          </div>
        )}
        {step === 2 && (
          <div className="py-2 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full" style={{ background: "color-mix(in srgb, var(--risk-low) 14%, transparent)", color: "var(--risk-low)" }}>
              <CheckCircle2 size={26} aria-hidden />
            </span>
            <p className="rs-h2 mt-3">Thank you — payment simulated.</p>
            <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>{formatINR(amount)} to {dName}</p>
            <p className="mono mt-1 text-xs" style={{ color: "var(--text-muted)" }}>{strings.simulatedRail} · Ref {ref}</p>
            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
              <button
                type="button" className="rs-btn-accent flex-1"
                onClick={() => nav(`/donations/DON-${amount}-${ref.slice(-4)}`, { state: { amount, disaster: dName, ref } })}
              >
                Trace this donation
              </button>
              <Link to="/donations" className="rs-btn-secondary flex-1">My donations</Link>
            </div>
            <button type="button" onClick={() => setStep(1)} className="rs-btn-ghost mt-1 text-[13px]">Edit amount</button>
          </div>
        )}
      </div>
    </div>
  );
}

export function MyDonations() {
  return (
    <div>
      <PageHeader eyebrow="Donor" title="My Donations" action={<Link to="/donate" className="rs-btn-accent rs-btn-sm">New donation</Link>} />
      <div className="rs-card overflow-x-auto">
        <table className="rs-table min-w-[600px]">
          <caption className="sr-only">Your donations</caption>
          <thead><tr><th scope="col">Date</th><th scope="col">Campaign</th><th scope="col">Amount</th><th scope="col"><span className="sr-only">Action</span></th></tr></thead>
          <tbody>
            <tr>
              <td style={{ color: "var(--text-secondary)" }}>2026-09-12</td>
              <td className="font-semibold">Assam Floods 2026</td>
              <td className="kpi font-bold">{formatINR(5000)}</td>
              <td className="text-right"><Link to="/donations/DON-5000-0917" className="font-semibold">{strings.trace} →</Link></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function LineageDetail() {
  const { id } = useParams();
  const loc = useLocation() as { state?: { amount?: number; disaster?: string; ref?: string } };
  const amount = typeof loc.state?.amount === "number" ? loc.state.amount : lineageExample.amount;
  const splits = splitAmount(amount);
  return (
    <div>
      <PageHeader eyebrow={loc.state?.disaster ?? "Assam Floods 2026"} title={`Donation ${id ?? lineageExample.donationId}`} sub="End-to-end lineage: donation → fund → NGO → program → vendor → invoice → payment." />
      {loc.state?.ref && <p className="mono mb-3 text-xs" style={{ color: "var(--text-muted)" }}>Ref {loc.state.ref} · {strings.simulatedRail}</p>}
      <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <FundLineageFlow amount={amount} splits={splits} donationId={id ?? lineageExample.donationId} />
        <div className="rs-card h-fit p-5">
          <h2 className="rs-h2 mb-3">Status timeline</h2>
          <StatusTimeline items={lineageExample.timeline} />
        </div>
      </div>
    </div>
  );
}
