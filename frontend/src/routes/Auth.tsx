import { useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "motion/react";
import { Building2, HandCoins, Truck, ArrowRight, ShieldCheck, AlertCircle, Loader2 } from "lucide-react";
import { useUI } from "@/lib/store";
import { PageHeader } from "@/components/composite/Chrome";
import { StatusTimeline } from "@/components/composite/Viz";
import { Reveal } from "@/components/luxe/Reveal";
import { auth, isAmplifyConfigured, toFrontendRole } from "@/lib/auth";

export function Login() {
  const { setRole, setUser, setTheme } = useUI();
  const nav = useNavigate();
  const loc = useLocation() as { state?: { from?: string } };
  const [params] = useSearchParams();
  const justRegistered = params.get("registered") === "true";
  const sessionExpired = params.get("expired") === "true";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setR] = useState<"donor" | "ngo" | "vendor" | "field" | "auditor" | "admin">("donor");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const fromDonate = /^\/(app\/)?donat/.test(loc.state?.from ?? "");

  const applyRoleTheme = (r: string) => {
    if (r === "auditor" || r === "admin") {
      try {
        if (!localStorage.getItem("rahatsetu_theme")) setTheme("dark");
      } catch { /* noop */ }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const cleanEmail = email.trim();
      const result = await auth.signIn(cleanEmail, password, role);
      const frontendRole = toFrontendRole(result.user.role, result.user.email);
      setUser({ name: result.user.name, email: result.user.email, role: result.user.role, organizationId: result.user.organizationId || undefined, accessToken: result.accessToken, refreshToken: result.refreshToken, idToken: result.idToken });
      setRole(frontendRole as any);
      applyRoleTheme(frontendRole);
      if (frontendRole === "pending") nav("/pending");
      else nav(loc.state?.from ?? "/app");
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  if (!isAmplifyConfigured) {
    return (
      <div>
        <PageHeader eyebrow="Welcome back" title="Login (Demo Mode)" sub="Cognito not configured - using mock authentication. Set VITE_COGNITO_USER_POOL_ID and VITE_COGNITO_CLIENT_ID to enable real auth." />
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
            <form className="rs-card space-y-4 p-6 md:p-8" onSubmit={handleSubmit}>
              {justRegistered && <p role="status" className="rs-inset p-3.5 text-[13px] font-semibold" style={{ color: "var(--risk-low)" }}>Account created — sign in with your new credentials.</p>}
              {sessionExpired && <p role="status" className="rs-inset p-3.5 text-[13px] font-semibold" style={{ color: "var(--risk-med)" }}>Your session expired — please sign in again.</p>}
              {error && <p role="alert" className="rs-inset flex items-center gap-2.5 p-3.5 text-[13px] font-semibold text-red-400"><AlertCircle size={16} aria-hidden /> {error}</p>}
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
                <input id="login-pass" required type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="rs-input mt-2" placeholder="••••••••" autoComplete="current-password" />
              </label>
              <label className="block text-sm font-bold" htmlFor="login-role">Demo role
                <select id="login-role" value={role} onChange={(e) => setR(e.target.value as any)} className="rs-input mt-2">
                  <option value="donor">Donor — give & trace</option>
                  <option value="ngo">NGO — programs & invoices</option>
                  <option value="vendor">Vendor — KYC & payments</option>
                  <option value="field">Field — delivery proof upload</option>
                  <option value="auditor">Auditor — investigations</option>
                  <option value="admin">Admin — users & rules</option>
                </select>
              </label>
              <button type="submit" className="rs-btn-accent w-full !min-h-[52px]" disabled={loading}>{loading ? <Loader2 size={16} className="animate-spin" /> : <>Login as {role} <ArrowRight size={16} aria-hidden /></>}</button>
              <p className="flex items-center justify-center gap-1.5 text-center text-xs" style={{ color: "var(--text-muted)" }}><ShieldCheck size={13} aria-hidden /> Auditor & admin open in dark control-room mode.</p>
            </form>
          </Reveal>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader eyebrow="Welcome back" title="Login" sub="Sign in with your RahatSetu account" />
      <div className="mx-auto grid max-w-md gap-4">
        <Reveal delay={0.08}>
          <form className="rs-card space-y-4 p-6 md:p-8" onSubmit={handleSubmit}>
            {justRegistered && <p role="status" className="rs-inset p-3.5 text-[13px] font-semibold" style={{ color: "var(--risk-low)" }}>Account created — sign in with your new credentials.</p>}
            {error && <p role="alert" className="rs-inset flex items-center gap-2.5 p-3.5 text-[13px] font-semibold text-red-400"><AlertCircle size={16} aria-hidden /> {error}</p>}
            <label className="block text-sm font-bold" htmlFor="login-email">
              Email              <input id="login-email" required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="rs-input mt-2" placeholder="you@example.org" autoComplete="email" />
            </label>
            <label className="block text-sm font-bold" htmlFor="login-pass">Password
              <input id="login-pass" required type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="rs-input mt-2" placeholder="••••••••" autoComplete="current-password" />
            </label>
            <button type="submit" className="rs-btn-accent w-full !min-h-[52px]" disabled={loading}>{loading ? <Loader2 size={16} className="animate-spin" /> : <>Sign in <ArrowRight size={16} aria-hidden /></>}</button>
            <p className="text-center text-xs" style={{ color: "var(--text-muted)" }}>Demo: use password123 with any registered email</p>
          </form>
        </Reveal>
        <Reveal delay={0.16}>
          <p className="text-center text-sm" style={{ color: "var(--text-secondary)" }}>Don't have an account? <Link to="/register" className="font-extrabold">Create one</Link></p>
        </Reveal>
        <Reveal delay={0.22}>
          <Link to="/admin" className="rs-card rs-card-lift flex items-center gap-4 p-5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-white" style={{ background: "var(--primary-600)" }}>
              <ShieldCheck size={20} aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[16px] font-extrabold tracking-tight">Administrator?</span>
              <span className="block text-[13px]" style={{ color: "var(--text-secondary)" }}>Open the admin console — approvals, people, invites.</span>
            </span>
            <ArrowRight size={17} aria-hidden style={{ color: "var(--text-muted)" }} />
          </Link>
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
  const nav = useNavigate();
  const [params] = useSearchParams();
  const inviteToken = params.get("invite") ?? "";
  const inviteEmail = params.get("email") ?? "";
  const inviteRole = (params.get("role") ?? "").toUpperCase();
  const invited = inviteToken.length > 0 && (inviteRole === "FIELD" || inviteRole === "GOVT");
  const [kind, setKind] = useState<"Donor" | "NGO" | "Vendor">("Donor");
  const [name, setName] = useState("");
  const [email, setEmail] = useState(inviteEmail);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    setLoading(true);
    try {
      if (invited) {
        await auth.signUp(email.trim(), password, name.trim(), inviteRole, undefined, { invitationToken: inviteToken });
        setError("");
        nav("/login?registered=true");
        return;
      }
      const roleMap = { Donor: "DONOR", NGO: "NGO", Vendor: "VENDOR" };
      await auth.signUp(email.trim(), password, name.trim(), roleMap[kind]);
      setError("");
      if (kind === "Donor") nav("/login?registered=true");
      else nav("/pending");
    } catch (err: any) {
      setError(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  if (!isAmplifyConfigured) {
    return (
      <div>
        <PageHeader eyebrow="Join (Demo Mode)" title="Create your account" sub="Cognito not configured - using mock registration. Set VITE_COGNITO_USER_POOL_ID and VITE_COGNITO_CLIENT_ID to enable real auth." />
        {invited && (
        <div className="rs-card mb-4 flex items-center gap-3 p-5" role="note" style={{ borderColor: "color-mix(in srgb, var(--accent-500) 40%, transparent)" }}>
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-white" style={{ background: "var(--primary-600)" }}>
        <ShieldCheck size={20} aria-hidden />
        </span>
        <p className="text-sm leading-6" style={{ color: "var(--text-secondary)" }}>
        <strong style={{ color: "var(--text-primary)" }}>You were invited as {inviteRole}.</strong> Email
        and role are locked to the invitation — just set your name and password.
        </p>
        </div>
        )}
        {invited ? (
        <div className="rs-card p-6 text-left" style={{ borderColor: "var(--accent-500)", boxShadow: "var(--shadow-2)" }}>
        <span className="block text-[20px] font-extrabold tracking-tight">{inviteRole}</span>
        <span className="mt-1 block text-sm" style={{ color: "var(--text-secondary)" }}>Invited role — locked</span>
        </div>
        ) : (
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
        )}
        <Reveal className="mt-4">
          <form className="rs-card mx-auto max-w-lg space-y-4 p-6 md:p-8" onSubmit={handleSubmit}>
            {error && <p role="alert" className="rs-inset flex items-center gap-2.5 p-3.5 text-[13px] font-semibold text-red-400"><AlertCircle size={16} aria-hidden /> {error}</p>}
            <label className="block text-sm font-bold">Organisation / full name<input required value={name} onChange={(e) => setName(e.target.value)} className="rs-input mt-2" autoComplete="organization" placeholder="Seva Sahyog Foundation" /></label>
            <label className="block text-sm font-bold">Email<input required value={email} onChange={(e) => setEmail(e.target.value)} type="email" disabled={invited} className="rs-input mt-2" autoComplete="email" placeholder="you@example.org" /></label>
            <label className="block text-sm font-bold">Password<input required value={password} onChange={(e) => setPassword(e.target.value)} type="password" className="rs-input mt-2" autoComplete="new-password" placeholder="Min 8 characters" /></label>
            <label className="block text-sm font-bold">Confirm Password<input required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} type="password" className="rs-input mt-2" autoComplete="new-password" placeholder="Confirm password" /></label>
            <button type="submit" className="rs-btn-accent w-full !min-h-[52px]" disabled={loading}>{loading ? <Loader2 size={16} className="animate-spin" /> : <>Create {invited ? inviteRole.charAt(0) + inviteRole.slice(1).toLowerCase() : kind} account <ArrowRight size={16} aria-hidden /></>}</button>
          </form>
        </Reveal>
      </div>
    );
  }

  return (
    <div>
      <PageHeader eyebrow="Join" title="Create your account" sub="Donor / NGO / Vendor self-registration. NGO & vendor go to pending approval." />
      {invited && (
      <div className="rs-card mb-4 flex items-center gap-3 p-5" role="note" style={{ borderColor: "color-mix(in srgb, var(--accent-500) 40%, transparent)" }}>
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-white" style={{ background: "var(--primary-600)" }}>
      <ShieldCheck size={20} aria-hidden />
      </span>
      <p className="text-sm leading-6" style={{ color: "var(--text-secondary)" }}>
      <strong style={{ color: "var(--text-primary)" }}>You were invited as {inviteRole}.</strong> Email
      and role are locked to the invitation — just set your name and password.
      </p>
      </div>
      )}
      {invited ? (
      <div className="rs-card p-6 text-left" style={{ borderColor: "var(--accent-500)", boxShadow: "var(--shadow-2)" }}>
      <span className="block text-[20px] font-extrabold tracking-tight">{inviteRole}</span>
      <span className="mt-1 block text-sm" style={{ color: "var(--text-secondary)" }}>Invited role — locked</span>
      </div>
      ) : (
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
      )}
      <Reveal className="mt-4">
        <form className="rs-card mx-auto max-w-lg space-y-4 p-6 md:p-8" onSubmit={handleSubmit}>
          {error && <p role="alert" className="rs-inset flex items-center gap-2.5 p-3.5 text-[13px] font-semibold text-red-400"><AlertCircle size={16} aria-hidden /> {error}</p>}
          <label className="block text-sm font-bold">Organisation / full name<input required value={name} onChange={(e) => setName(e.target.value)} className="rs-input mt-2" autoComplete="organization" placeholder="Seva Sahyog Foundation" /></label>
          <label className="block text-sm font-bold">Email<input required value={email} onChange={(e) => setEmail(e.target.value)} type="email" disabled={invited} className="rs-input mt-2" autoComplete="email" placeholder="you@example.org" /></label>
          <label className="block text-sm font-bold">Password<input required value={password} onChange={(e) => setPassword(e.target.value)} type="password" className="rs-input mt-2" autoComplete="new-password" placeholder="Min 8 characters" /></label>
          <label className="block text-sm font-bold">Confirm Password<input required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} type="password" className="rs-input mt-2" autoComplete="new-password" placeholder="Confirm password" /></label>
          <button type="submit" className="rs-btn-accent w-full !min-h-[52px]" disabled={loading}>{loading ? <Loader2 size={16} className="animate-spin" /> : <>Create {invited ? inviteRole.charAt(0) + inviteRole.slice(1).toLowerCase() : kind} account <ArrowRight size={16} aria-hidden /></>}</button>
          <p className="text-center text-sm" style={{ color: "var(--text-secondary)" }}>Have an account? <Link to="/login" className="font-extrabold">Sign in</Link></p>
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
            <p className="text-sm leading-6" style={{ color: "var(--text-secondary)" }}>We'll notify you once verified. Track public spending meanwhile on the <Link to="/dashboard" className="font-extrabold">public dashboard</Link>.</p>
          </div>
        </div>
      </Reveal>
    </div>
  );
}