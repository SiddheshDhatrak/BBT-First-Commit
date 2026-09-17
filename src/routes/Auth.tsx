import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Building2, HandCoins, Truck } from "lucide-react";
import { useUI, type Role } from "@/lib/store";
import { PageHeader } from "@/components/composite/Chrome";
import { StatusTimeline } from "@/components/composite/Viz";

export function Login() {
  const { setRole, setTheme } = useUI();
  const nav = useNavigate();
  const loc = useLocation() as { state?: { from?: string } };
  const [email, setEmail] = useState("");
  const [role, setR] = useState<Role>("donor");
  return (
    <div>
      <PageHeader eyebrow="Welcome back" title="Login" sub="Role is resolved after auth (mocked Cognito for demo)." />
      <form
        className="rs-card mx-auto max-w-md space-y-3.5 p-5 md:p-6"
        onSubmit={(e) => {
          e.preventDefault();
          setRole(role);
          if (role === "auditor" || role === "admin") {
            try {
              if (!localStorage.getItem("rahatsetu_theme")) setTheme("dark");
            } catch { /* noop */ }
          }
          nav(loc.state?.from ?? "/app");
        }}
      >
        <label className="block text-sm font-semibold" htmlFor="login-email">Email
          <input id="login-email" required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="rs-input mt-1.5" placeholder="you@example.org" autoComplete="email" />
        </label>
        <label className="block text-sm font-semibold" htmlFor="login-pass">Password
          <input id="login-pass" required type="password" className="rs-input mt-1.5" placeholder="••••••••" autoComplete="current-password" />
        </label>
        <label className="block text-sm font-semibold" htmlFor="login-role">Demo role
          <select id="login-role" value={role} onChange={(e) => setR(e.target.value as Role)} className="rs-input mt-1.5">
            <option value="donor">Donor — give & trace</option>
            <option value="ngo">NGO — programs & invoices</option>
            <option value="vendor">Vendor — KYC & payments</option>
            <option value="auditor">Auditor — investigations</option>
            <option value="admin">Admin — users & rules</option>
          </select>
        </label>
        <button type="submit" className="rs-btn-primary w-full">Login as {role}</button>
        <p className="text-center text-xs" style={{ color: "var(--text-muted)" }}>Auditor & admin open in dark control-room mode.</p>
      </form>
    </div>
  );
}

const KINDS = [
  { k: "Donor", icon: HandCoins, d: "Give and trace every rupee in seconds." },
  { k: "NGO", icon: Building2, d: "Run programs, manage vendors, submit invoices." },
  { k: "Vendor", icon: Truck, d: "Get onboarded, submit invoices, get paid." },
] as const;

export function Register() {
  const { setRole } = useUI();
  const nav = useNavigate();
  const [kind, setKind] = useState<(typeof KINDS)[number]["k"]>("Donor");
  return (
    <div>
      <PageHeader eyebrow="Join" title="Create your account" sub="Donor / NGO / Vendor self-registration. NGO & vendor go to pending approval." />
      <div className="grid gap-3.5 md:grid-cols-3" role="radiogroup" aria-label="Account type">
        {KINDS.map(({ k, icon: Icon, d }) => (
          <button
            key={k} type="button" role="radio" aria-checked={kind === k} onClick={() => setKind(k)}
            className="rs-card rs-card-lift p-5 text-left"
            style={kind === k ? { borderColor: "var(--accent-500)", boxShadow: "var(--shadow-2)" } : undefined}
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl" style={{ background: kind === k ? "var(--accent-soft)" : "var(--bg-surface-alt)", color: kind === k ? "var(--accent-500)" : "var(--text-secondary)" }}>
              <Icon size={19} aria-hidden />
            </span>
            <span className="rs-h2 mt-2 block">{k}</span>
            <span className="mt-1 block text-sm" style={{ color: "var(--text-secondary)" }}>{d}</span>
          </button>
        ))}
      </div>
      <form
        className="rs-card mx-auto mt-4 max-w-md space-y-3.5 p-5 md:p-6"
        onSubmit={(e) => {
          e.preventDefault();
          if (kind === "Donor") { setRole("donor"); nav("/app"); }
          else { setRole("guest"); nav("/pending"); }
        }}
      >
        <label className="block text-sm font-semibold">Organisation / full name<input required className="rs-input mt-1.5" autoComplete="organization" /></label>
        <label className="block text-sm font-semibold">Email<input required type="email" className="rs-input mt-1.5" autoComplete="email" /></label>
        <button type="submit" className="rs-btn-accent w-full">Create {kind} account</button>
      </form>
    </div>
  );
}

export function Pending() {
  return (
    <div>
      <PageHeader eyebrow="Application received" title="Pending approval" sub="Your NGO / vendor application is with the government reviewer." />
      <div className="rs-card mx-auto max-w-md p-5 md:p-6">
        <StatusTimeline items={["Application submitted — done", "Document check — in progress", "Government approval — pending"]} />
        <p className="mt-3 text-sm" style={{ color: "var(--text-secondary)" }}>We’ll notify you once verified. Track public spending meanwhile on the <a href="/dashboard" className="font-semibold">public dashboard</a>.</p>
      </div>
    </div>
  );
}
