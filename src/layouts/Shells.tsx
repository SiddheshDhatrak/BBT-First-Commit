import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import {
  Bell, ChevronLeft, HandCoins, HeartHandshake, Home, LayoutDashboard,
  Menu, Scale, Search, ShieldCheck, Sparkles, Users, FileWarning, X, ArrowUpRight,
} from "lucide-react";
import { ThemeToggle, SyntheticRibbon } from "@/components/composite/Chrome";
import { Logo } from "@/components/brand/Logo";
import { useLenis } from "@/components/luxe/useLenis";
import { useUI, type Role } from "@/lib/store";
import { alerts } from "@/lib/mock";

const NAV_BY_ROLE: Record<Role, { to: string; label: string; hint: string; icon: typeof Home }[]> = {
  donor: [
    { to: "/app", label: "Donor Home", hint: "Overview", icon: Home },
    { to: "/donate", label: "Donate", hint: "Give", icon: HandCoins },
    { to: "/donations", label: "My Donations", hint: "Trace", icon: HeartHandshake },
    { to: "/dashboard", label: "Public Dashboard", hint: "Transparency", icon: LayoutDashboard },
  ],
  ngo: [
    { to: "/app", label: "Org Dashboard", hint: "Overview", icon: LayoutDashboard },
    { to: "/ngo/programs", label: "Programs", hint: "Budgets", icon: Home },
    { to: "/ngo/invoices", label: "Invoices", hint: "Pipeline", icon: FileWarning },
    { to: "/ngo/alerts", label: "My Alerts", hint: "Respond", icon: ShieldCheck },
    { to: "/ngo/score", label: "Transparency Score", hint: "Trust", icon: Sparkles },
  ],
  vendor: [
    { to: "/app", label: "Vendor Home", hint: "POs", icon: Home },
    { to: "/vendor/kyc", label: "KYC", hint: "Verify", icon: ShieldCheck },
    { to: "/vendor/invoices", label: "Submit Invoice", hint: "Upload", icon: FileWarning },
    { to: "/vendor/payments", label: "Payments", hint: "Settled", icon: HandCoins },
  ],
  auditor: [
    { to: "/app", label: "Command Centre", hint: "Control room", icon: LayoutDashboard },
    { to: "/auditor/queue", label: "Investigation Queue", hint: "Review", icon: Scale },
    { to: "/auditor/copilot", label: "AI Copilot", hint: "Ask", icon: Sparkles },
    { to: "/auditor/approvals", label: "Approvals", hint: "Sign off", icon: ShieldCheck },
    { to: "/auditor/funds", label: "All Funds", hint: "Ledger", icon: FileWarning },
  ],
  admin: [
    { to: "/app", label: "Admin Home", hint: "Overview", icon: Home },
    { to: "/admin/users", label: "Users & Roles", hint: "Access", icon: Users },
    { to: "/admin/rules", label: "Rule Thresholds", hint: "Tune", icon: Scale },
  ],
  guest: [
    { to: "/dashboard", label: "Public Dashboard", hint: "Transparency", icon: LayoutDashboard },
    { to: "/donate", label: "Donate", hint: "Give", icon: HandCoins },
    { to: "/methodology", label: "Methodology", hint: "Trust", icon: ShieldCheck },
  ],
};

export function Brand({ compact = false }: { compact?: boolean }) {
  return <Logo compact={compact} />;
}

export function PublicShell() {
  const { role } = useUI();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const nav = useNavigate();
  const location = useLocation();
  const closeRef = useRef<HTMLButtonElement>(null);
  useLenis(true);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Drawer hygiene: close on route change, Escape closes, lock scroll, focus close btn
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open ]);

  return (
    <div className="flex min-h-screen flex-col" style={{ background: "var(--bg-canvas)" }}>
      {/* macOS glass floating nav */}
      <div className="sticky top-0 z-40 px-3 pt-3 md:px-6 md:pt-4">
        <header
          className={`glass mx-auto flex h-[64px] max-w-[1280px] items-center gap-3 rounded-2xl px-3 transition-all duration-300 md:px-4 ${scrolled ? "shadow-[var(--shadow-2)]" : "shadow-[var(--shadow-1)]"}`}
        >
          <button type="button" className="rs-btn-secondary rs-btn-sm !px-2.5 md:hidden" aria-label="Open menu" aria-expanded={open} onClick={() => setOpen(true)}>
            <Menu size={18} aria-hidden />
          </button>
          <Brand />
          <nav className="ml-2 hidden items-center gap-1 md:flex" aria-label="Primary">
            {[
              ["/dashboard", "Dashboard"],
              ["/methodology", "Methodology"],
              ["/donate", "Donate"],
              ["/donations", "Trace"],
            ].map(([to, label]) => (
              <NavLink key={to} to={to} className="rs-navlink !border-0 !py-2 !text-[13.5px]">
                {label}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <span className="mono hidden items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-medium tracking-[0.14em] lg:inline-flex" style={{ borderColor: "var(--border-subtle)", color: "var(--text-muted)" }}>
              <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full" style={{ background: "#16a34a" }} />
              LIVE LEDGER
            </span>
            <ThemeToggle />
            {role === "guest" ? (
              <>
                <button type="button" onClick={() => nav("/login")} className="rs-btn-secondary rs-btn-sm hidden sm:inline-flex">Login</button>
                <button type="button" onClick={() => nav("/donate")} className="rs-btn-accent rs-btn-sm">Donate <ArrowUpRight size={14} aria-hidden /></button>
              </>
            ) : (
              <button type="button" onClick={() => nav("/app")} className="rs-btn-primary rs-btn-sm">Open app <ArrowUpRight size={14} aria-hidden /></button>
            )}
          </div>
        </header>
      </div>

      {/* Mobile drawer — always mounted, driven by `open` so it can never fail to mount */}
      <div
        className="fixed inset-0 z-50 md:hidden"
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        aria-hidden={!open}
        inert={!open}
        style={{
          visibility: open ? "visible" : "hidden",
          transition: open ? "visibility 0s" : "visibility 0s 0.4s",
          pointerEvents: open ? "auto" : "none",
        }}
      >
        <motion.button
          type="button"
          aria-label="Close menu"
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          initial={false}
          animate={{ opacity: open ? 1 : 0 }}
          transition={{ duration: 0.2 }}
          onClick={() => setOpen(false)}
          tabIndex={open ? 0 : -1}
          style={{ pointerEvents: open ? "auto" : "none" }}
        />
        <motion.div
          className="glass absolute left-3 top-3 flex h-[calc(100%-24px)] w-80 flex-col rounded-3xl p-5"
          initial={false}
          animate={{ x: open ? 0 : -70, opacity: open ? 1 : 0 }}
          transition={{ type: "spring", damping: 30, stiffness: 300 }}
        >
          <div className="mb-5 flex items-center justify-between">
            <Brand />
            <button ref={closeRef} type="button" aria-label="Close menu" className="rs-btn-secondary rs-btn-sm !px-2.5" onClick={() => setOpen(false)} tabIndex={open ? 0 : -1}><X size={18} aria-hidden /></button>
          </div>
          {[["/", "Home"], ["/dashboard", "Public Dashboard"], ["/methodology", "Methodology"], ["/donate", "Donate"], ["/donations", "My Donations"], ["/login", "Login"]].map(([to, label]) => (
            <NavLink key={to} to={to} className="rs-navlink !py-3 !text-[15px]" onClick={() => setOpen(false)} tabIndex={open ? 0 : -1}>{label}</NavLink>
          ))}
          <div className="rs-inset mt-auto p-4">
            <p className="eyebrow">Trust note</p>
            <p className="mt-1 text-[13px] font-medium" style={{ color: "var(--text-secondary)" }}>Every rupee traceable to its receipt. Signals, never verdicts.</p>
          </div>
        </motion.div>
      </div>

      <main className="rs-page mx-auto w-full max-w-[1280px] flex-1 px-3 py-6 md:px-6 md:py-10">
        <Outlet />
      </main>

      <footer className="mt-10 border-t px-3 pb-3 md:px-6" style={{ borderColor: "var(--border-subtle)" }}>
        <div className="mx-auto max-w-[1280px]">
          <div className="rs-card mt-6 grid gap-8 p-7 md:grid-cols-[1.3fr_1fr_1fr_1fr] md:p-10">
            <div>
              <Brand />
              <p className="mt-4 max-w-xs text-[20px] font-extrabold leading-snug tracking-tight">
                The bridge between a donated rupee and the receipt that proves it.
              </p>
              <div className="mono mt-4 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[10.5px] tracking-[0.12em]" style={{ borderColor: "var(--border-subtle)", color: "var(--text-muted)" }}>
                <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: "var(--accent-500)" }} />
                SYNTHETIC DEMO · SIMULATED RAIL
              </div>
            </div>
            <nav aria-label="Product"><p className="eyebrow mb-3">Product</p><ul className="space-y-2.5 text-sm font-semibold"><li><Link to="/dashboard">Public Dashboard</Link></li><li><Link to="/donate">Donate</Link></li><li><Link to="/donations">Trace a gift</Link></li><li><Link to="/methodology">Methodology</Link></li></ul></nav>
            <nav aria-label="Roles"><p className="eyebrow mb-3">Roles</p><ul className="space-y-2.5 text-sm font-semibold"><li><Link to="/login">Donor login</Link></li><li><Link to="/register">NGO registration</Link></li><li><Link to="/login">Auditor access</Link></li><li><Link to="/app">Open console</Link></li></ul></nav>
            <div><p className="eyebrow mb-3">Trust</p><p className="text-sm leading-6" style={{ color: "var(--text-secondary)" }}>Signals, not verdicts. Every flag ships with evidence, a reason code and a visible resolve path.</p>
              <Link to="/donate" className="rs-btn-accent rs-btn-sm mt-4">Donate now <ArrowUpRight size={14} aria-hidden /></Link>
            </div>
          </div>
        </div>
        <SyntheticRibbon />
      </footer>
    </div>
  );
}

export function AppShell() {
  const { role, sidebarOpen, toggleSidebar, mobileNavOpen, setMobileNav } = useUI();
  const nav = useNavigate();
  const location = useLocation();
  const [q, setQ] = useState("");
  const [bell, setBell] = useState(false);
  const items = NAV_BY_ROLE[role] ?? NAV_BY_ROLE.guest;

  // Drawer hygiene: close on route change, Escape closes, lock scroll
  useEffect(() => {
    setMobileNav(false);
  }, [location.pathname, setMobileNav]);
  useEffect(() => {
    if (!mobileNavOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileNav(false);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [mobileNavOpen, setMobileNav]);

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    nav(q.trim() ? `/auditor/queue?q=${encodeURIComponent(q.trim())}` : "/auditor/queue");
    setMobileNav(false);
  };

  const sidebarBody = (
    <div className="flex h-full flex-col">
      <div className="mb-4 flex items-center justify-between">
        {sidebarOpen ? <Brand /> : <Brand compact />}
        <button type="button" onClick={toggleSidebar} aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"} aria-expanded={sidebarOpen} className="rs-btn-secondary rs-btn-sm !px-2.5">
          <ChevronLeft size={16} aria-hidden className={`transition-transform duration-300 ${sidebarOpen ? "" : "rotate-180"}`} />
        </button>
      </div>
      <p className="eyebrow mb-2 !text-[10px]">{sidebarOpen ? "Console" : "·"}</p>
      <nav className="space-y-1.5" aria-label="Role navigation">
        {items.map((n) => (
          <NavLink key={n.to + n.label} to={n.to} end={n.to === "/app"} className="rs-navlink group" title={n.label} aria-label={n.label} onClick={() => setMobileNav(false)}>
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-all" style={{ background: "var(--bg-surface-alt)" }} aria-hidden>
              <n.icon size={16} />
            </span>
            {sidebarOpen && (
              <span className="min-w-0 flex-1 truncate">
                <span className="block truncate leading-tight">{n.label}</span>
                <span className="mono block text-[10px] font-medium tracking-wide" style={{ color: "var(--text-muted)" }}>{n.hint}</span>
              </span>
            )}
          </NavLink>
        ))}
      </nav>
      <div className="mt-auto space-y-2.5">
        <div className="rs-inset overflow-hidden p-0">
          <div className="h-1" style={{ background: "var(--primary-600)" }} aria-hidden />
          <div className="p-3.5">
            <p className="eyebrow !text-[10px]">Signed in as</p>
            <p className="mt-1 text-[17px] font-extrabold capitalize">{role}</p>
            <p className="mono mt-0.5 text-[10.5px]" style={{ color: "var(--text-muted)" }}>SIMULATED RAIL · SYNTHETIC</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen" style={{ background: "var(--bg-canvas)" }}>
      <aside
        className={`${sidebarOpen ? "w-[280px]" : "w-[92px]"} sticky top-0 hidden h-screen shrink-0 border-r p-4 transition-all duration-300 md:block`}
        style={{ background: "color-mix(in srgb, var(--bg-surface) 80%, transparent)", borderColor: "var(--border-subtle)", backdropFilter: "blur(20px) saturate(1.5)", WebkitBackdropFilter: "blur(20px) saturate(1.5)" }}
        aria-label="Role navigation"
      >
        {sidebarBody}
      </aside>

      {/* Mobile drawer — always mounted, driven by store state */}
      <div
        className="fixed inset-0 z-50 md:hidden"
        role="dialog"
        aria-modal="true"
        aria-label="App navigation"
        aria-hidden={!mobileNavOpen}
        inert={!mobileNavOpen}
        style={{
          visibility: mobileNavOpen ? "visible" : "hidden",
          transition: mobileNavOpen ? "visibility 0s" : "visibility 0s 0.35s",
          pointerEvents: mobileNavOpen ? "auto" : "none",
        }}
      >
        <motion.button
          type="button"
          aria-label="Close navigation"
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          initial={false}
          animate={{ opacity: mobileNavOpen ? 1 : 0 }}
          transition={{ duration: 0.2 }}
          onClick={() => setMobileNav(false)}
          tabIndex={mobileNavOpen ? 0 : -1}
          style={{ pointerEvents: mobileNavOpen ? "auto" : "none" }}
        />
        <motion.div
          className="glass absolute left-3 top-3 h-[calc(100%-24px)] w-80 overflow-y-auto rounded-3xl p-5"
          initial={false}
          animate={{ x: mobileNavOpen ? 0 : -70, opacity: mobileNavOpen ? 1 : 0 }}
          transition={{ type: "spring", damping: 30, stiffness: 300 }}
        >
          {sidebarBody}
        </motion.div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="sticky top-0 z-30 px-3 pt-3 md:px-5 md:pt-4">
          <header className="glass mx-auto flex h-[62px] w-full max-w-[1440px] items-center gap-2 rounded-2xl px-3">
            <button type="button" className="rs-btn-secondary rs-btn-sm !px-2.5 md:hidden" onClick={() => setMobileNav(true)} aria-label="Open navigation" aria-expanded={mobileNavOpen}>
              <Menu size={18} aria-hidden />
            </button>
            <form onSubmit={submitSearch} role="search" className="hidden max-w-md flex-1 sm:block">
              <div className="rs-input flex items-center gap-2 !rounded-full !py-2.5">
                <Search size={15} aria-hidden style={{ color: "var(--text-muted)" }} />
                <input value={q} onChange={(e) => setQ(e.target.value)} aria-label="Global search" placeholder="Search donations, invoices, alerts…" className="w-full bg-transparent text-sm font-medium outline-none" />
                <kbd className="mono hidden rounded-md border px-1.5 py-0.5 text-[10px] lg:block" style={{ borderColor: "var(--border-subtle)", color: "var(--text-muted)" }}>↵</kbd>
              </div>
            </form>
            <div className="ml-auto flex items-center gap-2">
              <span className="mono hidden rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] xl:inline-block" style={{ borderColor: "var(--border-subtle)", color: "var(--text-secondary)", background: "var(--bg-surface-alt)" }}>
                {role} console
              </span>
              <div className="relative">
                <button type="button" aria-label={`Notifications, ${alerts.length} unread`} aria-expanded={bell} onClick={() => setBell((b) => !b)} className="rs-btn-secondary rs-btn-sm relative !rounded-full !px-3">
                  <Bell size={17} aria-hidden />
                  <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-black" style={{ background: "var(--primary-600)", color: "#fff" }}>{alerts.length}</span>
                </button>
                <AnimatePresence>
                  {bell && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.98 }}
                      transition={{ duration: 0.2 }}
                      className="glass absolute right-0 mt-2 w-80 overflow-hidden rounded-2xl p-2 text-sm"
                      role="menu" aria-label="Notifications"
                    >
                      <p className="eyebrow px-3 pb-1 pt-2">Signals</p>
                      {alerts.map((a) => (
                        <Link key={a.id} to={`/auditor/alerts/${a.id}`} onClick={() => setBell(false)} className="block rounded-xl px-3 py-2.5 transition-colors hover:bg-[var(--bg-surface-alt)]">
                          <span className="mono text-[11px] font-bold" style={{ color: "var(--primary-600)" }}>{a.id}</span>
                          <span className="block text-[13px] font-semibold leading-snug" style={{ color: "var(--text-primary)" }}>{a.title.slice(0, 70)}…</span>
                        </Link>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <ThemeToggle />
            </div>
          </header>
        </div>
        <main className="rs-page mx-auto w-full max-w-[1440px] flex-1 px-3 py-5 md:px-6 md:py-8">
          <Outlet />
        </main>
        <SyntheticRibbon />
      </div>
    </div>
  );
}
