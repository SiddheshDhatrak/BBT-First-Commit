import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { Building2, HandCoins, Truck, ArrowRight, ShieldCheck } from "lucide-react";
import { useUI } from "@/lib/store";
import { PageHeader } from "@/components/composite/Chrome";
import { StatusTimeline } from "@/components/composite/Viz";
import { Reveal } from "@/components/luxe/Reveal";
import {
  confirmSignUp,
  isCognitoConfigured,
  signIn,
  signOut,
  signUp,
} from "@/lib/cognito";

function friendlyError(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  if (/not configured/i.test(msg)) return "Auth backend is not configured. Set Cognito env vars (see .env.example).";
  if (/UserNotFound|Incorrect.*password|NotAuthorized/i.test(msg)) return "Invalid email or password.";
  if (/UserNotConfirmed/i.test(msg)) return "Account not confirmed yet — enter the code sent to your email.";
  if (/UsernameExists|already/i.test(msg)) return "An account with this email already exists. Try signing in.";
  if (/CodeMismatch|ExpiredCode/i.test(msg)) return "Invalid or expired confirmation code.";
  return msg.slice(0, 300);
}

export function Login() {
  const { setRole, setUser, setOrgId, setTheme } = useUI();
  const nav = useNavigate();
  const loc = useLocation() as { state?: { from?: string } };
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fromDonate = (loc.state?.from ?? "").startsWith("/donat");
  const configured = isCognitoConfigured();
  return (
    <div>
      <PageHeader eyebrow="Welcome back" title="Login" sub={fromDonate ? "Sign in to donate — you'll return straight back to complete your gift." : "Sign in with your RahatSetu account. Role comes from your Cognito group."} />
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
            onSubmit={async (e) => {
              e.preventDefault();
              setError(null);
              setBusy(true);
              try {
                const session = await signIn(email.trim(), password);
                const name = session.email.split("@")[0].replace(/[._-]+/g, " ").trim() || session.role;
                setUser({ name: name.replace(/\b\w/g, (c) => c.toUpperCase()), email: session.email });
                setRole(session.role);
                setOrgId(session.orgId);
                if (session.role === "auditor" || session.role === "admin") {
                  try {
                    if (!localStorage.getItem("rahatsetu_theme")) setTheme("dark");
                  } catch { /* noop */ }
                }
                nav(loc.state?.from ?? "/app");
              } catch (err) {
                setError(friendlyError(err));
              } finally {
                setBusy(false);
              }
            }}
          >
            {!configured && (
              <p role="alert" className="rs-inset p-3.5 text-[13px] font-semibold" style={{ color: "var(--risk-high)" }}>
                Cognito is not configured. Set VITE_COGNITO_USER_POOL_ID and VITE_COGNITO_CLIENT_ID in .env (see .env.example).
              </p>
            )}
            {fromDonate && (
              <p role="note" className="rs-inset flex items-center gap-2.5 p-3.5 text-[13px] font-semibold" style={{ color: "var(--text-secondary)" }}>
                <HandCoins size={16} aria-hidden style={{ color: "var(--primary-600)", flexShrink: 0 }} />
                Donating needs an account. Sign in and we'll take you right back.
              </p>
            )}
            {error && <p role="alert" className="rs-inset p-3.5 text-[13px] font-semibold" style={{ color: "var(--risk-high)" }}>{error}</p>}
            <label className="block text-sm font-bold" htmlFor="login-email">
              Email              <input id="login-email" required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="rs-input mt-2" placeholder="you@example.org" autoComplete="email" />
            </label>
            <label className="block text-sm font-bold" htmlFor="login-pass">Password
              <input id="login-pass" required type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="rs-input mt-2" placeholder="••••••••" autoComplete="current-password" />
            </label>
            <button type="submit" disabled={busy || !configured} className="rs-btn-accent w-full !min-h-[52px]">
              {busy ? "Signing in…" : "Login"} <ArrowRight size={16} aria-hidden />
            </button>
            <p className="flex items-center justify-center gap-1.5 text-center text-xs" style={{ color: "var(--text-muted)" }}><ShieldCheck size={13} aria-hidden /> Auditor & admin open in dark control-room mode.</p>
            <p className="text-center text-sm">No account? <Link to="/register" className="font-extrabold">Create one</Link></p>
          </form>
        </Reveal>
      </div>
    </div>
  );
}

const KINDS = [
  { k: "Donor", icon: HandCoins, d: "Give and trace every rupee." },
  { k: "NGO", icon: Building2, d: "Run programs, manage vendors, submit invoices." },
  { k: "Vendor", icon: Truck, d: "Get onboarded, submit invoices, get paid." },
] as const;

export function Register() {
  const nav = useNavigate();
  const [kind, setKind] = useState<(typeof KINDS)[number]["k"]>("Donor");
  const [name, setName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [stage, setStage] = useState<"form" | "confirm">("form");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const configured = isCognitoConfigured();
  return (
    <div>
      <PageHeader eyebrow="Join" title="Create your account" sub="Real Cognito registration. NGO & vendor go to pending approval until a GOVT admin assigns the group." />
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
        {stage === "form" ? (
          <form
            className="rs-card mx-auto max-w-lg space-y-4 p-6 md:p-8"
            onSubmit={async (e) => {
              e.preventDefault();
              setError(null);
              setBusy(true);
              try {
                const res = await signUp(regEmail.trim(), password, { name: name.trim(), kind });
                if (res.needsConfirmation) setStage("confirm");
                else if (kind === "Donor") nav("/login");
                else nav("/pending");
              } catch (err) {
                setError(friendlyError(err));
              } finally {
                setBusy(false);
              }
            }}
          >
            {!configured && (
              <p role="alert" className="rs-inset p-3.5 text-[13px] font-semibold" style={{ color: "var(--risk-high)" }}>
                Cognito is not configured. Set VITE_COGNITO_USER_POOL_ID and VITE_COGNITO_CLIENT_ID in .env.
              </p>
            )}
            {error && <p role="alert" className="rs-inset p-3.5 text-[13px] font-semibold" style={{ color: "var(--risk-high)" }}>{error}</p>}
            <label className="block text-sm font-bold">Organisation / full name<input required value={name} onChange={(e) => setName(e.target.value)} className="rs-input mt-2" autoComplete="organization" placeholder="Seva Sahyog Foundation" /></label>
            <label className="block text-sm font-bold">Email<input required value={regEmail} onChange={(e) => setRegEmail(e.target.value)} type="email" className="rs-input mt-2" autoComplete="email" placeholder="you@example.org" /></label>
            <label className="block text-sm font-bold">Password (min 8 chars)<input required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} type="password" className="rs-input mt-2" autoComplete="new-password" placeholder="••••••••" /></label>
            <button type="submit" disabled={busy || !configured} className="rs-btn-accent w-full !min-h-[52px]">{busy ? "Creating…" : `Create ${kind} account`} <ArrowRight size={16} aria-hidden /></button>
          </form>
        ) : (
          <form
            className="rs-card mx-auto max-w-lg space-y-4 p-6 md:p-8"
            onSubmit={async (e) => {
              e.preventDefault();
              setError(null);
              setBusy(true);
              try {
                await confirmSignUp(regEmail.trim(), code.trim());
                if (kind === "Donor") nav("/login");
                else nav("/pending");
              } catch (err) {
                setError(friendlyError(err));
              } finally {
                setBusy(false);
              }
            }}
          >
            {error && <p role="alert" className="rs-inset p-3.5 text-[13px] font-semibold" style={{ color: "var(--risk-high)" }}>{error}</p>}
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>We sent a confirmation code to <strong>{regEmail}</strong>. Enter it below.</p>
            <label className="block text-sm font-bold">Confirmation code<input required value={code} onChange={(e) => setCode(e.target.value)} className="rs-input mt-2" inputMode="numeric" placeholder="123456" /></label>
            <button type="submit" disabled={busy} className="rs-btn-accent w-full !min-h-[52px]">{busy ? "Confirming…" : "Confirm account"} <ArrowRight size={16} aria-hidden /></button>
          </form>
        )}
      </Reveal>
    </div>
  );
}

export function Pending() {
  return (
    <div>
      <PageHeader eyebrow="Application received" title="Pending approval" sub="Your NGO / vendor Cognito account exists; a government reviewer must assign the group before console access." />
      <Reveal>
        <div className="rs-card mx-auto max-w-lg overflow-hidden">
          <div className="h-1.5" style={{ background: "var(--primary-600)" }} aria-hidden />
          <div className="p-6 md:p-8">
            <StatusTimeline items={["Account created — done", "Email confirmed — done", "Government group approval — pending"]} />
            <div className="luxe-divider my-5" aria-hidden />
            <p className="text-sm leading-6" style={{ color: "var(--text-secondary)" }}>Track public spending meanwhile on the <Link to="/dashboard" className="font-extrabold">public dashboard</Link>.</p>
          </div>
        </div>
      </Reveal>
    </div>
  );
}

export function SignOutButton() {
  const { signOut: clearUI } = useUI();
  const nav = useNavigate();
  return (
    <button
      type="button"
      className="rs-btn-ghost rs-btn-sm"
      onClick={() => {
        signOut();
        clearUI();
        nav("/login");
      }}
    >
      Sign out
    </button>
  );
}
