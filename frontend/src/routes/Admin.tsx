import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, CheckCircle2, Copy, Inbox, Mail, TicketX, UserPlus, Users as UsersIcon } from "lucide-react";
import { api } from "@/lib/api";
import {
  useAssignRole,
  useCreateInvite,
  useDeleteUser,
  useInvites,
  useOrganizations,
  useResendInvite,
  useRevokeInvite,
  useUsers,
  type Invite,
  type ManagedUser,
} from "@/lib/queries";
import { PageHeader } from "@/components/composite/Chrome";
import { Reveal, Stagger, StaggerItem } from "@/components/luxe/Reveal";
import { CountUp } from "@/components/luxe/CountUp";

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message.slice(0, 300) : "Request failed.";
}

function useBackendHealth() {
  return useQuery({
    queryKey: ["live", "backend-health"],
    queryFn: () => api.health(),
    retry: false,
    staleTime: 30_000,
  });
}

function registrationLink(invite: { email: string; role: string; token?: string }): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const qs = new URLSearchParams({ invite: invite.token ?? "", email: invite.email, role: invite.role });
  return `${origin}/register?${qs.toString()}`;
}

export function AdminHome() {
  const usersQ = useUsers();
  const invitesQ = useInvites();
  const healthQ = useBackendHealth();
  const users = usersQ.data?.users ?? [];
  const pending = users.filter((u) => (u.role ?? "").toUpperCase() === "PENDING");
  const byRole = (r: string) => users.filter((u) => (u.role ?? "").toUpperCase() === r).length;
  const outstanding = (invitesQ.data?.invites ?? []).filter((i) => !i.consumedAt);
  return (
    <div>
      <PageHeader eyebrow="Admin console" title="Command Deck" sub="Everything an administrator handles — approvals, people, invites, and system health — from one place." />
      <Stagger className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          ["Pending approvals", pending.length, "NGO / vendor waiting", "/admin/approvals", "var(--risk-med)"],
          ["Active users", users.length - pending.length, "Across all roles", "/admin/users", "var(--primary-600)"],
          ["Outstanding invites", outstanding.length, "FIELD / GOVT tokens live", "/admin/invites", "var(--accent-600)"],
          ["Backend", healthQ.isPending ? "…" : healthQ.isError ? "DOWN" : "LIVE", "API health", "/admin/users", "var(--risk-low)"],
        ].map(([k, v, hint, to, color]) => (
          <StaggerItem key={k as string}>
            <Link to={to as string} className="rs-card rs-card-lift block p-6">
              <p className="eyebrow !text-[10px]">{k}</p>
              <p className="kpi mt-2 text-[32px] font-semibold leading-none" style={{ color: color as string }}>
                {typeof v === "number" ? <CountUp to={v} format={(x) => String(Math.round(x))} /> : v}
              </p>
              <p className="mt-1.5 flex items-center gap-1 text-[13px] font-bold" style={{ color: "var(--text-muted)" }}>{hint} <ArrowUpRight size={13} aria-hidden /></p>
            </Link>
          </StaggerItem>
        ))}
      </Stagger>
      <Reveal className="mt-4">
        <div className="rs-card flex flex-wrap items-center gap-3 p-5 md:p-6">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl text-white" style={{ background: "var(--primary-600)" }}>
            <UserPlus size={21} aria-hidden />
          </span>
          <div className="min-w-0 flex-1 basis-60">
            <p className="text-[16px] font-extrabold">Onboard auditors & field staff</p>
            <p className="text-[13px]" style={{ color: "var(--text-secondary)" }}>Issue a single-use invite — emailed automatically when SES is configured, always copyable.</p>
          </div>
          <Link to="/admin/invites" className="rs-btn-primary rs-btn-sm">Issue invite →</Link>
          <Link to="/admin/approvals" className="rs-btn-secondary rs-btn-sm">Review queue ({pending.length}) →</Link>
        </div>
      </Reveal>
      <Reveal className="mt-4">
        <div className="rs-card flex flex-wrap gap-x-8 gap-y-2 p-5 text-[13px]" style={{ color: "var(--text-secondary)" }}>
          {[["DONOR", byRole("DONOR")], ["NGO", byRole("NGO")], ["VENDOR", byRole("VENDOR")], ["FIELD", byRole("FIELD")], ["GOVT", byRole("GOVT")]].map(([r, n]) => (
            <span key={r as string}><strong className="kpi text-[16px]">{n as number}</strong> <span className="mono text-[11px]">{r as string}</span></span>
          ))}
        </div>
      </Reveal>
    </div>
  );
}

export function Approvals() {
  const usersQ = useUsers();
  const users = ((usersQ.data?.users ?? []) as ManagedUser[]);
  const pending = users.filter((u) => (u.role ?? "").toUpperCase() === "PENDING");
  const assign = useAssignRole();
  const remove = useDeleteUser();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [roleDraft, setRoleDraft] = useState<Record<string, string>>({});

  const approve = async (u: ManagedUser) => {
    const role = (roleDraft[u.id] || u.requestedRole || "NGO").toUpperCase();
    setBusyId(u.id);
    setNote(null);
    try {
      await assign.mutateAsync({ userId: u.id, role });
      setNote(`Approved ${u.email} as ${role}. They can now sign in to the console.`);
    } catch (e) {
      setNote(errMsg(e));
    } finally {
      setBusyId(null);
    }
  };

  const reject = async (u: ManagedUser) => {
    if (!window.confirm(`Reject and remove ${u.email}? They will have to register again.`)) return;
    setBusyId(u.id);
    setNote(null);
    try {
      await remove.mutateAsync(u.id);
      setNote(`Removed ${u.email} from the pool.`);
    } catch (e) {
      setNote(errMsg(e));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <PageHeader eyebrow="Admin console" title="Approvals" sub="Pending NGO and vendor registrations. Approving assigns their group — they enter the console on next sign-in." />
      {usersQ.isPending ? (
        <div className="rs-card p-6 text-sm" style={{ color: "var(--text-secondary)" }} aria-busy="true">Loading queue…</div>
      ) : usersQ.isError ? (
        <div className="rs-card p-6 text-sm font-bold" style={{ color: "var(--risk-high)" }} role="alert">Could not load the queue — admin sign-in required.</div>
      ) : pending.length === 0 ? (
        <div className="rs-card flex items-center gap-4 p-7">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl" style={{ background: "color-mix(in srgb, var(--risk-low) 12%, transparent)", color: "var(--risk-low)" }}>
            <Inbox size={22} aria-hidden />
          </span>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}><strong className=" text-[17px]" style={{ color: "var(--text-primary)" }}>Queue is clear. </strong>New NGO and vendor sign-ups will appear here.</p>
        </div>
      ) : (
        <Stagger className="space-y-3">
          {pending.map((u) => (
            <StaggerItem key={u.id}>
              <div className="rs-card p-5 md:p-6">
                <div className="flex flex-wrap items-center gap-4">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl font-extrabold text-white" style={{ background: "var(--primary-600)" }} aria-hidden>
                    {(u.name || u.email).trim().charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1 basis-56">
                    <p className="truncate text-[17px] font-extrabold tracking-tight">{u.name || u.email}</p>
                    <p className="mono mt-0.5 truncate text-[11.5px]" style={{ color: "var(--text-muted)" }}>
                      {u.email} · requested {(u.requestedRole || "NGO").toUpperCase()}
                      {u.createdAt ? ` · ${u.createdAt.slice(0, 10)}` : ""}
                    </p>
                  </div>
                  <label className="flex items-center gap-2 text-[13px] font-bold" style={{ color: "var(--text-secondary)" }}>
                    Approve as
                    <select
                      value={roleDraft[u.id] || u.requestedRole || "NGO"}
                      onChange={(e) => setRoleDraft((d) => ({ ...d, [u.id]: e.target.value }))}
                      className="rs-input !w-auto !min-h-[40px] !rounded-full !py-2 text-[13px]"
                      aria-label={`Role for ${u.email}`}
                    >
                      {["NGO", "VENDOR", "DONOR", "FIELD"].map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </label>
                </div>
                <div className="mt-4 flex flex-col gap-2.5 sm:flex-row">
                  <button type="button" disabled={busyId === u.id} onClick={() => approve(u)} className="rs-btn-primary rs-btn-sm flex-1">
                    <CheckCircle2 size={15} aria-hidden /> {busyId === u.id ? "Saving…" : "Approve"}
                  </button>
                  <button type="button" disabled={busyId === u.id} onClick={() => reject(u)} className="rs-btn-secondary rs-btn-sm flex-1">
                    <TicketX size={15} aria-hidden /> Reject & remove
                  </button>
                </div>
              </div>
            </StaggerItem>
          ))}
        </Stagger>
      )}
      {note && <p role="status" className="mt-3 text-[13px] font-bold" style={{ color: "var(--risk-low)" }}>{note}</p>}
    </div>
  );
}

export function Users() {
  const usersQ = useUsers();
  const orgsQ = useOrganizations();
  const users = ((usersQ.data?.users ?? []) as ManagedUser[]);
  const orgs = ((orgsQ.data ?? []) as { id: string; name: string }[]);
  const assign = useAssignRole();
  const remove = useDeleteUser();
  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const rows = users.filter((u) => {
    const hit = `${u.name ?? ""} ${u.email} ${u.role ?? ""}`.toLowerCase().includes(q.toLowerCase());
    const rf = roleFilter === "ALL" || (u.role ?? "").toUpperCase() === roleFilter;
    return hit && rf;
  });

  const changeRole = async (u: ManagedUser, role: string) => {
    if (role === (u.role ?? "").toUpperCase()) return;
    if ((role === "GOVT" || role === "FIELD") && !window.confirm(`Grant ${role} to ${u.email}? Privileged access — confirm.`)) return;
    setBusyId(u.id);
    setNotice(null);
    try {
      await assign.mutateAsync({ userId: u.id, role });
      setNotice(`Updated ${u.email} → ${role}.`);
    } catch (e) {
      setNotice(errMsg(e));
    } finally {
      setBusyId(null);
    }
  };

  const removeUser = async (u: ManagedUser) => {
    if (!window.confirm(`Remove ${u.email} from the pool?`)) return;
    setBusyId(u.id);
    setNotice(null);
    try {
      await remove.mutateAsync(u.id);
      setNotice(`Removed ${u.email}.`);
    } catch (e) {
      setNotice(errMsg(e));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <PageHeader eyebrow="Admin console" title="Users & Roles" sub="Everyone on the ledger. Change roles, remove accounts, and see participating organisations." />
      <div className="mb-4 flex flex-wrap gap-2.5">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, email, role…" aria-label="Search users" className="rs-input max-w-md flex-1 !rounded-full" />
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="rs-input !w-auto !min-h-[40px] !rounded-full !py-2 text-[13px]" aria-label="Filter by role">
          {["ALL", "PENDING", "DONOR", "NGO", "VENDOR", "FIELD", "GOVT"].map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>
      <Reveal>
        <div className="rs-card overflow-x-auto">
          {usersQ.isPending ? (
            <p className="p-6 text-sm" style={{ color: "var(--text-secondary)" }} aria-busy="true">Loading users…</p>
          ) : usersQ.isError ? (
            <p className="p-6 text-sm font-bold" style={{ color: "var(--risk-high)" }} role="alert">Could not load users — admin sign-in required.</p>
          ) : rows.length === 0 ? (
            <p className="p-6 text-sm" style={{ color: "var(--text-secondary)" }}>No users match.</p>
          ) : (
            <table className="rs-table min-w-[720px]">
              <caption className="sr-only">All users</caption>
              <thead><tr><th scope="col">User</th><th scope="col">Role</th><th scope="col">Status</th><th scope="col"><span className="sr-only">Actions</span></th></tr></thead>
              <tbody>
                {rows.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <span className="block font-bold">{u.name || u.email}</span>
                      <span className="mono block text-[11.5px]" style={{ color: "var(--text-muted)" }}>{u.email}</span>
                    </td>
                    <td>
                      <select
                        value={(u.role ?? "PENDING").toUpperCase()}
                        disabled={busyId === u.id}
                        onChange={(e) => changeRole(u, e.target.value)}
                        className="rs-input !w-auto !min-h-[38px] !rounded-full !py-1.5 text-[12.5px] font-bold"
                        aria-label={`Role for ${u.email}`}
                      >
                        {["PENDING", "DONOR", "NGO", "VENDOR", "FIELD", "GOVT"].map((r) => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </td>
                    <td className="mono text-[12px]" style={{ color: "var(--text-secondary)" }}>
                      {(u.role ?? "").toUpperCase() === "PENDING" ? "awaiting approval" : "active"}
                    </td>
                    <td className="text-right">
                      <button type="button" disabled={busyId === u.id} onClick={() => removeUser(u)} className="rs-btn-secondary rs-btn-sm">
                        {busyId === u.id ? "…" : "Remove"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Reveal>
      {notice && <p role="status" className="mt-3 text-[13px] font-bold" style={{ color: "var(--risk-low)" }}>{notice}</p>}
      <h2 className="mb-2 mt-8 text-[22px] font-extrabold tracking-tight">Organisations on the ledger</h2>
      <Reveal>
        <div className="rs-card overflow-x-auto">
          {orgsQ.isPending ? (
            <p className="p-6 text-sm" style={{ color: "var(--text-secondary)" }} aria-busy="true">Loading organisations…</p>
          ) : orgsQ.isError || orgs.length === 0 ? (
            <p className="p-6 text-sm" style={{ color: "var(--text-secondary)" }}>No organisations yet.</p>
          ) : (
            <table className="rs-table min-w-[600px]">
              <caption className="sr-only">Live organisations</caption>
              <thead><tr><th scope="col">Organisation</th><th scope="col">ID</th></tr></thead>
              <tbody>
                {orgs.map((o) => (
                  <tr key={o.id}>
                    <td className="font-bold">{o.name}</td>
                    <td className="mono text-xs" style={{ color: "var(--text-muted)" }}>{o.id}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Reveal>
    </div>
  );
}

export function Invites() {
  const invitesQ = useInvites();
  const invites = invitesQ.data?.invites ?? [];
  const create = useCreateInvite();
  const resend = useResendInvite();
  const revoke = useRevokeInvite();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("FIELD");
  const [sendEmail, setSendEmail] = useState(true);
  const [result, setResult] = useState<null | { email: string; role: string; token?: string; emailSent: boolean; emailReason?: string }>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);
    setCopied(false);
    try {
      const r = await create.mutateAsync({ email: email.trim(), role, sendEmail });
      setResult({ email: r.email, role: r.role, token: r.token, emailSent: r.emailSent, emailReason: r.emailReason });
      setEmail("");
    } catch (err) {
      setError(errMsg(err));
    }
  };

  const copyLink = async () => {
    if (!result?.token) return;
    const link = registrationLink({ email: result.email, role: result.role, token: result.token });
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Clipboard blocked — copy the token manually.");
    }
  };

  const doResend = async (id: string) => {
    setBusyId(id);
    setError(null);
    try {
      const r = await resend.mutateAsync(id);
      setResult({ email: "", role: "", token: ("token" in r ? (r as { token?: string }).token : undefined), emailSent: (r as { emailSent?: boolean }).emailSent ?? false, emailReason: (r as { emailReason?: string }).emailReason });
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusyId(null);
    }
  };

  const doRevoke = async (id: string) => {
    if (!window.confirm("Revoke this invitation? The token stops working immediately.")) return;
    setBusyId(id);
    setError(null);
    try {
      await revoke.mutateAsync(id);
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusyId(null);
    }
  };

  const live = invites.filter((i) => !i.consumedAt);
  const used = invites.filter((i) => i.consumedAt);

  return (
    <div>
      <PageHeader eyebrow="Admin console" title="Invitations" sub="Onboard auditors and field staff. Emailed automatically when SES is configured — always copyable as backup." />
      <div className="grid gap-4 lg:grid-cols-[.9fr_1.1fr]">
        <Reveal>
          <form onSubmit={submit} className="rs-card h-fit space-y-4 p-6">
            <p className="eyebrow">Issue invite</p>
            <label className="block text-sm font-bold">Email<input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="rs-input mt-2" placeholder="auditor@example.org" autoComplete="email" /></label>
            <label className="block text-sm font-bold">Role
              <select value={role} onChange={(e) => setRole(e.target.value)} className="rs-input mt-2">
                <option value="FIELD">Field — delivery proof upload</option>
                <option value="GOVT">Govt — auditor & admin access</option>
              </select>
            </label>
            <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border px-3.5 py-3 text-sm font-bold" style={{ borderColor: "var(--border-subtle)" }}>
              <span className="inline-flex items-center gap-2"><Mail size={15} aria-hidden /> Also send email</span>
              <input type="checkbox" checked={sendEmail} onChange={(e) => setSendEmail(e.target.checked)} className="h-5 w-5 accent-[#2E7CF6]" aria-label="Also send invitation email" />
            </label>
            {error && <p role="alert" className="text-sm font-bold" style={{ color: "var(--risk-high)" }}>{error}</p>}
            <button type="submit" disabled={create.isPending} className="rs-btn-primary w-full !min-h-[52px]">
              <UserPlus size={16} aria-hidden /> {create.isPending ? "Issuing…" : "Issue invitation"}
            </button>
            {result && (
              <div className="rs-inset space-y-2 p-4 text-sm" role="status">
                <p className="flex items-center gap-2 font-bold" style={{ color: "var(--risk-low)" }}>
                  <CheckCircle2 size={16} aria-hidden />
                  {result.emailSent ? `Emailed to ${result.email}.` : "Copy the token below — email not sent."}
                </p>
                {!result.emailSent && result.emailReason && (
                  <p className="text-[12.5px]" style={{ color: "var(--text-muted)" }}>{result.emailReason}</p>
                )}
                {result.token && (
                  <>
                    <p className="mono break-all rounded-xl border p-3 text-[12px]" style={{ borderColor: "var(--border-subtle)", background: "var(--bg-surface)" }}>{result.token}</p>
                    <button type="button" onClick={copyLink} className="rs-btn-secondary rs-btn-sm w-full">
                      <Copy size={14} aria-hidden /> {copied ? "Copied!" : "Copy registration link"}
                    </button>
                  </>
                )}
              </div>
            )}
          </form>
        </Reveal>
        <Reveal delay={0.08}>
          <div className="rs-card h-fit p-6">
            <p className="eyebrow">Outstanding ({live.length})</p>
            {invitesQ.isPending ? (
              <p className="mt-3 text-sm" style={{ color: "var(--text-secondary)" }} aria-busy="true">Loading invites…</p>
            ) : invitesQ.isError ? (
              <p className="mt-3 text-sm font-bold" style={{ color: "var(--risk-high)" }} role="alert">Could not load invites.</p>
            ) : live.length === 0 ? (
              <p className="mt-3 flex items-center gap-2 text-sm" style={{ color: "var(--text-secondary)" }}><UsersIcon size={15} aria-hidden /> No outstanding invites.</p>
            ) : (
              <ul className="mt-3 space-y-2.5">
                {live.map((i: Invite) => (
                  <li key={i.id} className="rs-inset flex flex-wrap items-center gap-2.5 p-3.5">
                    <div className="min-w-0 flex-1 basis-48">
                      <p className="truncate text-[14px] font-extrabold">{i.email}</p>
                      <p className="mono text-[11px]" style={{ color: "var(--text-muted)" }}>{i.role} · {i.createdAt ? i.createdAt.slice(0, 10) : "recent"}</p>
                    </div>
                    <button type="button" disabled={busyId === i.id} onClick={() => doResend(i.id)} className="rs-btn-secondary rs-btn-sm">{busyId === i.id ? "…" : "Resend"}</button>
                    <button type="button" disabled={busyId === i.id} onClick={() => doRevoke(i.id)} className="rs-btn-ghost rs-btn-sm">Revoke</button>
                  </li>
                ))}
              </ul>
            )}
            {used.length > 0 && (
              <details className="mt-4 text-sm" style={{ color: "var(--text-secondary)" }}>
                <summary className="cursor-pointer font-bold">Used / revoked ({used.length})</summary>
                <ul className="mt-2 space-y-1.5">
                  {used.map((i: Invite) => (
                    <li key={i.id} className="mono text-[12px]" style={{ color: "var(--text-muted)" }}>{i.email} · {i.role} · used</li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        </Reveal>
      </div>
    </div>
  );
}
