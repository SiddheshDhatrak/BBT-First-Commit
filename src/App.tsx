import { lazy, Suspense, useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AppShell, PublicShell } from "@/layouts/Shells";
import { Landing, Methodology } from "@/routes/Public";
import { OrgProfile, DonorHome } from "@/routes/Dashboard";
import { DonateFlow, MyDonations, LineageDetail } from "@/routes/Donor";
import { Login, Register, Pending } from "@/routes/Auth";
import { useUI, type Role } from "@/lib/store";

const PUB = { PublicDashboard: lazy(() => import("@/routes/PublicDashboard")) };
const NGO = {
  OrgDashboard: lazy(() => import("@/routes/NGO").then((m) => ({ default: m.OrgDashboard }))),
  Programs: lazy(() => import("@/routes/NGO").then((m) => ({ default: m.Programs }))),
  InvoiceList: lazy(() => import("@/routes/NGO").then((m) => ({ default: m.InvoiceList }))),
  InvoiceUpload: lazy(() => import("@/routes/NGO").then((m) => ({ default: m.InvoiceUpload }))),
  InvoiceDetail: lazy(() => import("@/routes/NGO").then((m) => ({ default: m.InvoiceDetail }))),
  NgoAlerts: lazy(() => import("@/routes/NGO").then((m) => ({ default: m.NgoAlerts }))),
  OrgScore: lazy(() => import("@/routes/NGO").then((m) => ({ default: m.OrgScore }))),
};
const AUD = {
  CommandCentre: lazy(() => import("@/routes/Auditor").then((m) => ({ default: m.CommandCentre }))),
  InvestigationQueue: lazy(() => import("@/routes/Auditor").then((m) => ({ default: m.InvestigationQueue }))),
  FraudDetail: lazy(() => import("@/routes/Auditor").then((m) => ({ default: m.FraudDetail }))),
  Copilot: lazy(() => import("@/routes/Auditor").then((m) => ({ default: m.Copilot }))),
  Approvals: lazy(() => import("@/routes/Auditor").then((m) => ({ default: m.Approvals }))),
  AllFunds: lazy(() => import("@/routes/Auditor").then((m) => ({ default: m.AllFunds }))),
  GeoView: lazy(() => import("@/routes/Auditor").then((m) => ({ default: m.GeoView }))),
  AuditLog: lazy(() => import("@/routes/Auditor").then((m) => ({ default: m.AuditLog }))),
};
const MISC = {
  VendorHome: lazy(() => import("@/routes/Misc").then((m) => ({ default: m.VendorHome }))),
  VendorKYC: lazy(() => import("@/routes/Misc").then((m) => ({ default: m.VendorKYC }))),
  VendorInvoices: lazy(() => import("@/routes/Misc").then((m) => ({ default: m.VendorInvoices }))),
  VendorPayments: lazy(() => import("@/routes/Misc").then((m) => ({ default: m.VendorPayments }))),
  AdminUsers: lazy(() => import("@/routes/Misc").then((m) => ({ default: m.AdminUsers }))),
  AdminRules: lazy(() => import("@/routes/Misc").then((m) => ({ default: m.AdminRules }))),
  NotFound: lazy(() => import("@/routes/Misc").then((m) => ({ default: m.NotFound }))),
  Forbidden: lazy(() => import("@/routes/Misc").then((m) => ({ default: m.Forbidden }))),
};

function RequireRole({ allow, children }: { allow: Role[]; children: React.ReactElement }) {
  const { role } = useUI();
  const loc = useLocation();
  if (role === "guest") return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  if (!allow.includes(role)) return <MISC.Forbidden />;
  return children;
}

// Any signed-in role. Guests are sent to login and return afterwards.
const SIGNED_IN: Role[] = ["donor", "ngo", "vendor", "auditor", "admin"];

function RequireAuth({ children }: { children: React.ReactElement }) {
  return <RequireRole allow={SIGNED_IN}>{children}</RequireRole>;
}

function RoleHome() {
  const { role } = useUI();
  if (role === "guest") return <Navigate to="/login" replace />;
  if (role === "ngo") return <NGO.OrgDashboard />;
  if (role === "vendor") return <MISC.VendorHome />;
  if (role === "auditor") return <AUD.CommandCentre />;
  if (role === "admin") return <MISC.AdminUsers />;
  return <DonorHome />;
}

const PUBLIC_PREFIXES = ["/dashboard", "/methodology", "/login", "/register", "/pending", "/donate", "/donations", "/org"];

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    const isPublic = pathname === "/" || PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
    // Only reset window scroll for public marketing pages.
    // Inside /app console the sidebar layout preserves scroll so the board doesn't jump to top.
    if (!isPublic) return;
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [pathname]);
  return null;
}

function Fallback() {
  return (
    <div className="mx-auto w-full max-w-[1280px] space-y-4 p-6" aria-busy="true" aria-label="Loading">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl text-white" style={{ background: "linear-gradient(135deg,#2E7CF6,#1A3FA0)" }} aria-hidden>
          <svg width="24" height="24" viewBox="0 0 64 64" aria-hidden><rect x="12" y="33" width="40" height="4" rx="2" fill="#fff"/><path d="M16 33 C 22 20, 42 20, 48 33" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round"/><rect x="15" y="37" width="4" height="11" rx="2" fill="#fff" opacity=".92"/><rect x="45" y="37" width="4" height="11" rx="2" fill="#fff" opacity=".92"/><circle cx="32" cy="22.5" r="5.5" fill="#fff"/></svg>
        </div>
        <div className="rs-skeleton h-5 w-40 rounded-full" />
      </div>
      <div className="rs-skeleton h-56 rounded-[24px]" />
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rs-skeleton h-32 rounded-[22px]" />
        <div className="rs-skeleton h-32 rounded-[22px]" />
        <div className="rs-skeleton h-32 rounded-[22px]" />
      </div>
      <p className="mono text-center text-[11px] tracking-[0.24em]" style={{ color: "var(--text-muted)" }}>LOADING LEDGER…</p>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Suspense fallback={<Fallback />}>
        <Routes>
          <Route element={<PublicShell />}>
            <Route index element={<Landing />} />
            <Route path="dashboard" element={<PUB.PublicDashboard />} />
            <Route path="org/:id" element={<OrgProfile />} />
            <Route path="methodology" element={<Methodology />} />
            <Route path="login" element={<Login />} />
            <Route path="register" element={<Register />} />
            <Route path="pending" element={<Pending />} />
            <Route path="donate" element={<RequireAuth><DonateFlow /></RequireAuth>} />
            <Route path="donations" element={<RequireAuth><MyDonations /></RequireAuth>} />
            <Route path="donations/:id" element={<RequireAuth><LineageDetail /></RequireAuth>} />
            <Route path="403" element={<MISC.Forbidden />} />
            <Route path="404" element={<MISC.NotFound />} />
          </Route>

          <Route element={<AppShell />}>
            <Route path="app" element={<RoleHome />} />
            <Route path="ngo/programs" element={<RequireRole allow={["ngo", "auditor", "admin"]}><NGO.Programs /></RequireRole>} />
            <Route path="ngo/invoices" element={<RequireRole allow={["ngo", "vendor", "auditor", "admin"]}><NGO.InvoiceList /></RequireRole>} />
            <Route path="ngo/invoices/upload" element={<RequireRole allow={["ngo", "vendor"]}><NGO.InvoiceUpload /></RequireRole>} />
            <Route path="ngo/invoices/:id" element={<RequireRole allow={["ngo", "vendor", "auditor", "admin"]}><NGO.InvoiceDetail /></RequireRole>} />
            <Route path="ngo/alerts" element={<RequireRole allow={["ngo"]}><NGO.NgoAlerts /></RequireRole>} />
            <Route path="ngo/score" element={<RequireRole allow={["ngo", "auditor"]}><NGO.OrgScore /></RequireRole>} />
            <Route path="vendor/kyc" element={<RequireRole allow={["vendor", "ngo", "auditor"]}><MISC.VendorKYC /></RequireRole>} />
            <Route path="vendor/invoices" element={<RequireRole allow={["vendor", "ngo"]}><MISC.VendorInvoices /></RequireRole>} />
            <Route path="vendor/payments" element={<RequireRole allow={["vendor", "ngo", "auditor"]}><MISC.VendorPayments /></RequireRole>} />
            <Route path="auditor/queue" element={<RequireRole allow={["auditor", "admin"]}><AUD.InvestigationQueue /></RequireRole>} />
            <Route path="auditor/alerts/:id" element={<RequireRole allow={["auditor", "admin"]}><AUD.FraudDetail /></RequireRole>} />
            <Route path="auditor/copilot" element={<RequireRole allow={["auditor", "admin"]}><AUD.Copilot /></RequireRole>} />
            <Route path="auditor/approvals" element={<RequireRole allow={["auditor", "admin"]}><AUD.Approvals /></RequireRole>} />
            <Route path="auditor/funds" element={<RequireRole allow={["auditor", "admin"]}><AUD.AllFunds /></RequireRole>} />
            <Route path="auditor/geo" element={<RequireRole allow={["auditor", "admin"]}><AUD.GeoView /></RequireRole>} />
            <Route path="auditor/audit" element={<RequireRole allow={["auditor", "admin"]}><AUD.AuditLog /></RequireRole>} />
            <Route path="admin/users" element={<RequireRole allow={["admin"]}><MISC.AdminUsers /></RequireRole>} />
            <Route path="admin/rules" element={<RequireRole allow={["admin"]}><MISC.AdminRules /></RequireRole>} />
            <Route path="403" element={<MISC.Forbidden />} />
            <Route path="404" element={<MISC.NotFound />} />
          </Route>

          <Route path="/home" element={<Navigate to="/" replace />} />
          <Route path="*" element={<MISC.NotFound />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
