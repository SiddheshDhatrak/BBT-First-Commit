import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { Building2, HandCoins, Truck, ArrowRight, ShieldCheck } from "lucide-react";
import { useUI, type Role } from "@/lib/store";
import { PageHeader } from "@/components/composite/Chrome";
import { StatusTimeline } from "@/components/composite/Viz";
import { Reveal } from "@/components/luxe/Reveal";

export function Login() {
  const { setRole, setUser, setTheme } = useUI();
  const nav = useNavigate();
  const loc = useLocation() as { state?: { from?: string } };
  const [email, setEmail] = useState("");
  const [role, setR] = useState<Role>("donor");
  const fromDonate = (loc.state?.from ?? "").startsWith("/donat");
  return (
    <div>
      <PageHeader eyebrow="Welcome back" title="Login" sub={fromDonate ? "Sign in to donate — you'll return straight back to complete your gift." : "Role is resolved after auth (mocked Cognito for demo)."} />
      <div className="mx-auto grid max-w-4xl gap-4 lg:grid-cols-[.9fr_1.1fr]">
        <Reveal>
          <div className="rs-brand-panel relative flex h-full flex-col justify-between overflow-hidden rounded-[22px] p-7">
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-white/70">RahatSetu Access</p>
              <p className="mt-3 text-[28px] font-extrabold leading-tight tracking-tight">One login.<br />Every role,<br />covered.</p>
            </div>
            <ul className="mt-6 space-y-2.5 text-[13px] font-semibold text-white/75">
              {[["Donors trace gifts live", "01"], ["NGOs run clean pipelines", "02"], ["Auditors command the review room", "03"]].map(([t, n]) => (
                <li key={n} className="flex items-center gap-3 border-t border-white/10 pt-2.5"><span className="mono text-[11px] text-white/60">{n}</span>{t}</li>
              ))}
            </ul>
          </div>
        </Reveal>
        <Reveal delay={0.08}>
          <form
            className="rs-card space-y-4 p-6 md:p-8"
            onSubmit={(e) => {
              e.preventDefault();
              const cleanEmail = email.trim();
              const fallback = `${role}@rahatsetu.demo`;
              const finalEmail = cleanEmail || fallback;
              const prefix = finalEmail.split("@")[0].replace(/[._-]+/g, " ").trim() || role;
              const name = prefix.replace(/\b\w/g, (c) => c.toUpperCase());
              setUser({ name, email: finalEmail });
              setRole(role);
              if (role === "auditor" || role === "admin") {
                try {
                  if (!localStorage.getItem("rahatsetu_theme")) setTheme("dark");
                } catch { /* noop */ }
              }
              nav(loc.state?.from ?? "/app");
            }}
          >
            {fromDonate && (
              <p role="note" className="rs-inset flex items-center gap-2.5 p-3.5 text-[13px] font-semibold" style={{ color: "var(--text-secondary)" }}>
                <HandCoins size={16} aria-hidden style={{ color: "var(--primary-600)", flexShrink: 0 }} />
                Donating needs an account in this demo. Sign in and we'll take you right back.
              </p>
            )}
            <label className="block text-sm font-bold" htmlFor="login-email">
              Email              <input id="login-email" required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="rs-input mt-2" placeholder="you@example.org" autoComplete="email" />
            </label>
            <label className="block text-sm font-bold" htmlFor="login-pass">Password
              <input id="login-pass" required type="password" className="rs-input mt-2" placeholder="••••••••" autoComplete="current-password" />
            </label>
            <label className="block text-sm font-bold" htmlFor="login-role">Demo role
              <select id="login-role" value={role} onChange={(e) => setR(e.target.value as Role)} className="rs-input mt-2">
                <option value="donor">Donor — give & trace</option>
                <option value="ngo">NGO — programs & invoices</option>
                <option value="vendor">Vendor — KYC & payments</option>
                <option value="auditor">Auditor — investigations</option>
                <option value="admin">Admin — users & rules</option>
              </select>
            </label>
            <button type="submit" className="rs-btn-accent w-full !min-h-[52px]">Login as {role} <ArrowRight size={16} aria-hidden /></button>
            <p className="flex items-center justify-center gap-1.5 text-center text-xs" style={{ color: "var(--text-muted)" }}><ShieldCheck size={13} aria-hidden /> Auditor & admin open in dark control-room mode.</p>
          </form>
        </Reveal>
      </div>
    </div>
  );
}

const KINDS = [
  { k: "Donor", icon: HandCoins, d: "Give and trace every rupee in seconds." },
  { k: "NGO", icon: Building2, d: "Run programs, manage vendors, submit invoices." },
  { k: "Vendor", icon: Truck, d: "Get onboarded, submit invoices, get paid." },
] as const;

export function Register() {
  const { setRole, setUser } = useUI();
  const nav = useNavigate();
  const [kind, setKind] = useState<(typeof KINDS)[number]["k"]>("Donor");
  const [name, setName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  return (
    <div>
      <PageHeader eyebrow="Join" title="Create your account" sub="Donor / NGO / Vendor self-registration. NGO & vendor go to pending approval." />
      <div className="grid gap-4 md:grid-cols-3" role="radiogroup" aria-label="Account type">
        {KINDS.map(({ k, icon: Icon, d }) => (
          <motion.button
            key={k} type="button" role="radio" aria-checked={kind === k} onClick={() => setKind(k)}
            whileHover={{ y: -3 }}
            whileTap={{ scale: 0.98 }}
            className="rs-card p-6 text-left"
            style={kind === k ? { borderColor: "var(--accent-500)", boxShadow: "var(--shadow-2)" } : undefined}
          >
            {kind === k && <div className="absolute inset-x-8 top-0 h-[2px]" style={{ background: "var(--primary-600)" }} aria-hidden />}
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl" style={kind === k ? { background: "var(--primary-600)", color: "#fff" } : { background: "var(--bg-surface-alt)", color: "var(--text-secondary)" }}>
              <Icon size={21} aria-hidden />
            </span>
            <span className="mt-3 block text-[20px] font-extrabold tracking-tight">{k}</span>
            <span className="mt-1 block text-sm" style={{ color: "var(--text-secondary)" }}>{d}</span>
          </motion.button>
        ))}
      </div>
      <Reveal className="mt-4">
        <form
          className="rs-card mx-auto max-w-lg space-y-4 p-6 md:p-8"
          onSubmit={(e) => {
            e.preventDefault();
            const cleanName = name.trim() || (kind === "Donor" ? "Donor" : `${kind} Applicant`);
            const cleanEmail = regEmail.trim() || `${kind.toLowerCase()}@rahatsetu.demo`;
            if (kind === "Donor") { setUser({ name: cleanName, email: cleanEmail }); setRole("donor"); nav("/app"); }
            else { setUser(null); setRole("guest"); nav("/pending"); }
          }}
        >
          <label className="block text-sm font-bold">Organisation / full name<input required value={name} onChange={(e) => setName(e.target.value)} className="rs-input mt-2" autoComplete="organization" placeholder="Seva Sahyog Foundation" /></label>
          <label className="block text-sm font-bold">Email<input required value={regEmail} onChange={(e) => setRegEmail(e.target.value)} type="email" className="rs-input mt-2" autoComplete="email" placeholder="you@example.org" /></label>
          <button type="submit" className="rs-btn-accent w-full !min-h-[52px]">Create {kind} account <ArrowRight size={16} aria-hidden /></button>
        </form>
      </Reveal>
    </div>
  );
}

export function Pending() {
  return (
    <div>
      <PageHeader eyebrow="Application received" title="Pending approval" sub="Your NGO / vendor application is with the government reviewer." />
      <Reveal>
        <div className="rs-card mx-auto max-w-lg overflow-hidden">
          <div className="h-1.5" style={{ background: "var(--primary-600)" }} aria-hidden />
          <div className="p-6 md:p-8">
            <StatusTimeline items={["Application submitted — done", "Document check — in progress", "Government approval — pending"]} />
            <div className="luxe-divider my-5" aria-hidden />
            <p className="text-sm leading-6" style={{ color: "var(--text-secondary)" }}>We’ll notify you once verified. Track public spending meanwhile on the <Link to="/dashboard" className="font-extrabold">public dashboard</Link>.</p>
          </div>
        </div>
      </Reveal>
    </div>
  );
}
