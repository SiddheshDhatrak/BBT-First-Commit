import { useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  Bell, ChevronLeft, HandCoins, HeartHandshake, Home, LayoutDashboard,
  Menu, Scale, Search, ShieldCheck, Sparkles, Users, FileWarning, X,
} from "lucide-react";
import { ThemeToggle, SyntheticRibbon } from "@/components/composite/Chrome";
import { useUI, type Role } from "@/lib/store";
import { alerts } from "@/lib/mock";

const NAV_BY_ROLE: Record<Role, { to: string; label: string; icon: typeof Home }[]> = {
  donor: [
    { to: "/app", label: "Donor Home", icon: Home },
    { to: "/donate", label: "Donate", icon: HandCoins },
    { to: "/donations", label: "My Donations", icon: HeartHandshake },
    { to: "/dashboard", label: "Public Dashboard", icon: LayoutDashboard },
  ],
  ngo: [
    { to: "/app", label: "Org Dashboard", icon: LayoutDashboard },
    { to: "/ngo/programs", label: "Programs", icon: Home },
    { to: "/ngo/invoices", label: "Invoices", icon: FileWarning },
    { to: "/ngo/alerts", label: "My Alerts", icon: ShieldCheck },
    { to: "/ngo/score", label: "Transparency Score", icon: Sparkles },
  ],
  vendor: [
    { to: "/app", label: "Vendor Home", icon: Home },
    { to: "/vendor/kyc", label: "KYC", icon: ShieldCheck },
    { to: "/vendor/invoices", label: "Submit Invoice", icon: FileWarning },
    { to: "/vendor/payments", label: "Payments", icon: HandCoins },
  ],
  auditor: [
    { to: "/app", label: "Command Centre", icon: LayoutDashboard },
    { to: "/auditor/queue", label: "Investigation Queue", icon: Scale },
    { to: "/auditor/copilot", label: "AI Copilot", icon: Sparkles },
    { to: "/auditor/approvals", label: "Approvals", icon: ShieldCheck },
    { to: "/auditor/funds", label: "All Funds", icon: FileWarning },
  ],
  admin: [
    { to: "/app", label: "Admin Home", icon: Home },
    { to: "/admin/users", label: "Users & Roles", icon: Users },
    { to: "/admin/rules", label: "Rule Thresholds", icon: Scale },
  ],
  guest: [
    { to: "/dashboard", label: "Public Dashboard", icon: LayoutDashboard },
    { to: "/donate", label: "Donate", icon: HandCoins },
    { to: "/methodology", label: "Methodology", icon: ShieldCheck },
  ],
};

function Brand() {
  return (
    <Link to="/" className="flex items-center gap-2" aria-label="RahatSetu home">
      <span className="flex h-8 w-8 items-center justify-center rounded-xl font-display text-sm font-extrabold text-white" style={{ background: "linear-gradient(135deg,#14499a,#0b2c5e)" }} aria-hidden>
        R<span style={{ color: "#e8a33d" }}>S</span>
      </span>
      <span className="font-display text-[17px] font-extrabold tracking-tight" style={{ color: "var(--text-primary)" }}>
        Rahat<span style={{ color: "var(--accent-500)" }}>Setu</span>
      </span>
    </Link>
  );
}

export function PublicShell() {
  const { role } = useUI();
  const [open, setOpen] = useState(false);
  const nav = useNavigate();
  return (
    <div className="flex min-h-screen flex-col" style={{ background: "var(--bg-canvas)" }}>
      <header className="sticky top-0 z-40 border-b backdrop-blur" style={{ background: "color-mix(in srgb, var(--bg-surface) 88%, transparent)", borderColor: "var(--border-subtle)" }}>
        <div className="mx-auto flex h-16 max-w-[1280px] items-center gap-3 px-4">
          <button type="button" className="rs-btn-secondary rs-btn-sm !px-2.5 md:hidden" aria-label="Open menu" aria-expanded={open} onClick={() => setOpen(true)}>
            <Menu size={18} aria-hidden />
          </button>
          <Brand />
          <nav className="ml-4 hidden items-center gap-1 text-sm font-medium md:flex" aria-label="Primary">
            {[["/dashboard", "Public Dashboard"], ["/methodology", "Methodology"], ["/donate", "Donate"]].map(([to, label]) => (
              <NavLink key={to} to={to} className="rs-navlink !py-2">{label}</NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            {role === "guest" ? (
              <>
                <button type="button" onClick={() => nav("/login")} className="rs-btn-secondary rs-btn-sm">Login</button>
                <button type="button" onClick={() => nav("/register")} className="rs-btn-accent rs-btn-sm">Donate</button>
              </>
            ) : (
              <button type="button" onClick={() => nav("/app")} className="rs-btn-primary rs-btn-sm">Open app</button>
            )}
          </div>
        </div>
      </header>

      {open && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <button type="button" aria-label="Close menu" className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="rs-panel absolute left-0 top-0 flex h-full w-72 flex-col p-4">
            <div className="mb-3 flex items-center justify-between">
              <Brand />
              <button type="button" aria-label="Close menu" className="rs-btn-secondary rs-btn-sm !px-2.5" onClick={() => setOpen(false)}><X size={18} aria-hidden /></button>
            </div>
            {[["/dashboard", "Public Dashboard"], ["/methodology", "Methodology"], ["/donate", "Donate"], ["/donations", "My Donations"], ["/login", "Login"]].map(([to, label]) => (
              <NavLink key={to} to={to} className="rs-navlink" onClick={() => setOpen(false)}>{label}</NavLink>
            ))}
          </div>
        </div>
      )}

      <main className="rs-page mx-auto w-full max-w-[1280px] flex-1 px-4 py-6 md:py-8">
        <Outlet />
      </main>

      <footer className="border-t" style={{ borderColor: "var(--border-subtle)", background: "var(--bg-surface)" }}>
        <div className="mx-auto grid max-w-[1280px] gap-6 px-4 py-8 text-sm md:grid-cols-4">
          <div>
            <Brand />
            <p className="mt-2 max-w-xs" style={{ color: "var(--text-secondary)" }}>The bridge between a donated rupee and the receipt that proves where it went.</p>
          </div>
          <nav aria-label="Product"><p className="eyebrow mb-2">Product</p><ul className="space-y-1.5"><li><Link to="/dashboard">Public Dashboard</Link></li><li><Link to="/donate">Donate</Link></li><li><Link to="/methodology">Methodology</Link></li></ul></nav>
          <nav aria-label="Roles"><p className="eyebrow mb-2">Roles</p><ul className="space-y-1.5"><li><Link to="/login">Donor login</Link></li><li><Link to="/register">NGO registration</Link></li><li><Link to="/login">Auditor access</Link></li></ul></nav>
          <div><p className="eyebrow mb-2">Trust</p><p style={{ color: "var(--text-secondary)" }}>Signals, not verdicts. Every flag ships with evidence.</p></div>
        </div>
        <SyntheticRibbon />
      </footer>
    </div>
  );
}

export function AppShell() {
  const { role, sidebarOpen, toggleSidebar, mobileNavOpen, setMobileNav } = useUI();
  const nav = useNavigate();
  const [q, setQ] = useState("");
  const [bell, setBell] = useState(false);
  const items = NAV_BY_ROLE[role] ?? NAV_BY_ROLE.guest;

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    nav(q.trim() ? `/auditor/queue?q=${encodeURIComponent(q.trim())}` : "/auditor/queue");
    setMobileNav(false);
  };

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="mb-3 flex items-center justify-between">
        <Brand />
        <button type="button" onClick={toggleSidebar} aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"} aria-expanded={sidebarOpen} className="rs-btn-secondary rs-btn-sm !px-2.5">
          <ChevronLeft size={16} aria-hidden className={sidebarOpen ? "" : "rotate-180"} />
        </button>
      </div>
      <nav className="space-y-1" aria-label="Role navigation">
        {items.map((n) => (
          <NavLink key={n.to + n.label} to={n.to} className="rs-navlink" title={n.label} aria-label={n.label} onClick={() => setMobileNav(false)}>
            <n.icon size={17} aria-hidden className="shrink-0" />
            {sidebarOpen && <span className="truncate">{n.label}</span>}
          </NavLink>
        ))}
      </nav>
      <div className="rs-inset mt-auto p-3 text-xs" style={{ color: "var(--text-secondary)" }}>
        <p className="eyebrow">Signed in as</p>
        <p className="mt-0.5 font-semibold capitalize" style={{ color: "var(--text-primary)" }}>{role}</p>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen" style={{ background: "var(--bg-canvas)" }}>
      <aside className={`${sidebarOpen ? "w-64" : "w-[76px]"} hidden shrink-0 border-r p-3 md:block`} style={{ background: "var(--bg-surface)", borderColor: "var(--border-subtle)" }} aria-label="Role navigation">
        {sidebar}
      </aside>

      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="App navigation">
          <button type="button" aria-label="Close navigation" className="absolute inset-0 bg-black/40" onClick={() => setMobileNav(false)} />
          <div className="rs-panel absolute left-0 top-0 h-full w-72 p-4">{sidebar}</div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b px-3 md:px-4" style={{ background: "color-mix(in srgb, var(--bg-surface) 90%, transparent)", borderColor: "var(--border-subtle)" }}>
          <button type="button" className="rs-btn-secondary rs-btn-sm !px-2.5 md:hidden" onClick={() => setMobileNav(true)} aria-label="Open navigation" aria-expanded={mobileNavOpen}>
            <Menu size={18} aria-hidden />
          </button>
          <form onSubmit={submitSearch} role="search" className="hidden max-w-sm flex-1 sm:block">
            <div className="rs-input flex items-center gap-2 !py-2">
              <Search size={15} aria-hidden style={{ color: "var(--text-muted)" }} />
              <input value={q} onChange={(e) => setQ(e.target.value)} aria-label="Global search" placeholder="Search donations, invoices, alerts…" className="w-full bg-transparent text-sm outline-none" />
            </div>
          </form>
          <div className="ml-auto flex items-center gap-2">
            <div className="relative">
              <button type="button" aria-label={`Notifications, ${alerts.length} unread`} aria-expanded={bell} onClick={() => setBell((b) => !b)} className="rs-btn-secondary rs-btn-sm relative !px-2.5">
                <Bell size={17} aria-hidden />
                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold" style={{ background: "var(--accent-500)", color: "var(--accent-ink)" }}>{alerts.length}</span>
              </button>
              {bell && (
                <div className="rs-panel absolute right-0 mt-2 w-80 p-2 text-sm" role="menu" aria-label="Notifications">
                  {alerts.map((a) => (
                    <Link key={a.id} to={`/auditor/alerts/${a.id}`} onClick={() => setBell(false)} className="block rounded-xl px-3 py-2 hover:bg-[var(--bg-surface-alt)]">
                      <span className="font-semibold">{a.id}</span> <span style={{ color: "var(--text-secondary)" }}>· {a.title.slice(0, 60)}…</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
            <ThemeToggle />
          </div>
        </header>
        <main className="rs-page mx-auto w-full max-w-[1440px] flex-1 px-3 py-5 md:px-6 md:py-7">
          <Outlet />
        </main>
        <SyntheticRibbon />
      </div>
    </div>
  );
}
