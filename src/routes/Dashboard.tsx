import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { ngos } from "@/lib/mock";
import { formatINR } from "@/lib/format";
import { PageHeader } from "@/components/composite/Chrome";
import { TrustScoreRing } from "@/components/composite/Viz";

export function OrgProfile() {
  const n = ngos[0];
  return (
    <div>
      <PageHeader eyebrow="Public profile" title={n.name} sub="Score with full component breakdown. No raw fraud content in public view." />
      <div className="rs-card max-w-2xl p-5 md:p-6"><TrustScoreRing score={n.score} components={n.components} /></div>
      <h2 className="rs-h2 mb-2 mt-6">Programs</h2>
      <div className="grid gap-3.5 md:grid-cols-2">
        {["Flood Food Relief", "Emergency Medical", "Shelter Kits", "Clean Water"].map((p) => (
          <div key={p} className="rs-card flex items-center justify-between p-4">
            <span className="font-bold">{p}</span>
            <ArrowUpRight size={16} aria-hidden style={{ color: "var(--text-muted)" }} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function DonorHome() {
  return (
    <div>
      <PageHeader eyebrow="Donor" title="Welcome back" sub="Recent activity and quick-donate." action={<Link to="/donate" className="rs-btn-accent rs-btn-sm">Donate now</Link>} />
      <div className="rs-card flex flex-wrap items-center gap-3 p-5">
        <div className="min-w-0 flex-1 basis-60">
          <p className="eyebrow">Last gift · Assam Floods 2026</p>
          <p className="kpi mt-0.5 text-2xl font-extrabold">{formatINR(5000)} · 78% utilised</p>
        </div>
        <Link to="/donations/DON-5000-0917" className="rs-btn-primary rs-btn-sm">Trace it →</Link>
      </div>
    </div>
  );
}
