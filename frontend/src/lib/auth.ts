// Frontend auth client — talks to the backend contract in
// backend/src/modules/auth (POST /api/v1/auth/*, GET /auth/me).
// When VITE_API_URL is unset, the mock implementation below is used so the
// demo UI keeps working offline; every mock result is labelled as such.

const BASE = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") ?? "";
const API = BASE.endsWith("/api/v1") ? BASE : `${BASE}/api/v1`;

export const isBackendAuthConfigured = () => BASE.length > 0;
/** Historic name kept for existing imports: true only when the real backend is wired. */
export const isAmplifyConfigured = isBackendAuthConfigured();

const ADMIN_EMAILS = ((import.meta.env.VITE_ADMIN_EMAILS as string | undefined) ?? "")
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

/**
 * Backend role → frontend console role. GOVT splits by allowlist:
 * listed emails become admin (approval queue + rules), everyone else
 * becomes auditor (investigations only). Unknown roles fall to guest so
 * RequireRole guards fail closed instead of rendering the wrong console.
 */
export function toFrontendRole(backendRole: string, email?: string): string {
  const r = (backendRole || "").toUpperCase();
  if (r === "GOVT") {
    return email && ADMIN_EMAILS.includes(email.toLowerCase()) ? "admin" : "auditor";
  }
  if (["DONOR", "NGO", "VENDOR", "FIELD", "AUDITOR", "ADMIN", "PENDING"].includes(r)) {
    return r.toLowerCase();
  }
  return "guest";
}

export type BackendRole = "DONOR" | "NGO" | "VENDOR" | "FIELD" | "GOVT";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  organizationId?: string | null;
  emailVerified?: boolean;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  idToken: string;
}

export interface SignInResult extends AuthTokens {
  user: AuthUser;
  expiresIn?: number;
}

const TOKENS_KEY = "rahatsetu_tokens";

export function loadTokens(): (AuthTokens & { expiresAt?: number }) | null {
  try {
    const raw = localStorage.getItem(TOKENS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AuthTokens & { expiresAt?: number };
    if (!parsed.accessToken) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveTokens(t: AuthTokens & { expiresIn?: number }) {
  try {
    localStorage.setItem(
      TOKENS_KEY,
      JSON.stringify({ ...t, expiresAt: Date.now() + (t.expiresIn ?? 3600) * 1000 })
    );
  } catch {
    /* private mode */
  }
}

export function clearTokens() {
  try {
    localStorage.removeItem(TOKENS_KEY);
  } catch {
    /* noop */
  }
}

function parseErrorMessage(status: number, body: unknown, fallback: string): string {
  const b = (body ?? {}) as Record<string, unknown>;
  const nested = (b.error ?? {}) as Record<string, unknown>;
  const msg =
    (typeof nested.message === "string" && nested.message) ||
    (typeof b.message === "string" && b.message);
  if (msg) return msg.slice(0, 300);
  if (status === 401) return "Invalid email or password.";
  if (status === 409) return "An account with this email already exists.";
  return fallback;
}

async function post<T>(path: string, body: unknown, accessToken?: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API}${path}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify(body ?? {}),
    });
  } catch {
    throw new Error("Backend unreachable — is the API running at VITE_API_URL?");
  }
  const data = (await res.json().catch(() => ({}))) as unknown;
  if (!res.ok) throw new Error(parseErrorMessage(res.status, data, `Request failed (${res.status}).`));
  return data as T;
}

async function get<T>(path: string, accessToken: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API}${path}`, {
      headers: { authorization: `Bearer ${accessToken}` },
    });
  } catch {
    throw new Error("Backend unreachable — is the API running at VITE_API_URL?");
  }
  const data = (await res.json().catch(() => ({}))) as unknown;
  if (!res.ok) throw new Error(parseErrorMessage(res.status, data, `Request failed (${res.status}).`));
  return data as T;
}

// --- Mock fallback (offline demo only, used when VITE_API_URL is unset) ---

const mockAuth = {
  async signUp(email: string, password: string, name: string, role: string, _organizationId?: string) {
    void password;
    void _organizationId;
    return {
      user: { id: `mock-${Date.now()}`, email, name, role, organizationId: null, emailVerified: true },
      message: "Mock registration (backend not configured).",
    };
  },
  async signIn(email: string, _password: string, roleHint = "DONOR") {
    void _password;
    return {
      user: {
        id: `mock-${Date.now()}`,
        email,
        name: email.split("@")[0],
        role: roleHint.toUpperCase(),
        organizationId: null,
        emailVerified: true,
      },
      accessToken: `mock-access-token-${Date.now()}`,
      refreshToken: `mock-refresh-token-${Date.now()}`,
      idToken: `mock-id-token-${Date.now()}`,
    };
  },
};

export interface CognitoUser {
  id: string;
  email: string;
  name: string;
  role: string;
  organizationId?: string;
  accessToken: string;
  refreshToken: string;
  idToken: string;
}

function toCognitoUser(user: AuthUser, tokens: AuthTokens): CognitoUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    organizationId: user.organizationId ?? undefined,
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    idToken: tokens.idToken,
  };
}

export const auth = {
  async signUp(email: string, password: string, name: string, role: string, organizationId?: string, opts?: { invitationToken?: string }) {
    if (!isBackendAuthConfigured()) return mockAuth.signUp(email, password, name, role, organizationId);
    return post<{ user: AuthUser; message: string }>("/auth/register", {
      email,
      password,
      name,
      role,
      ...(organizationId ? { organizationId } : {}),
      ...(opts?.invitationToken ? { invitationToken: opts.invitationToken } : {}),
    });
  },
  async confirmSignUp(email: string, code: string) {
    if (!isBackendAuthConfigured()) return { message: "Email verified successfully (mock)" };
    return post<{ message: string }>("/auth/verify-email", { email, code });
  },
  async resendConfirmationCode(email: string) {
    if (!isBackendAuthConfigured()) return { message: "Verification code sent (mock)" };
    return post<{ message: string }>("/auth/resend-verification", { email });
  },
  async signIn(email: string, password: string, roleHint = "DONOR") {
    if (!isBackendAuthConfigured()) {
      const r = await mockAuth.signIn(email, password, roleHint);
      return { user: toCognitoUser(r.user, r), accessToken: r.accessToken, refreshToken: r.refreshToken, idToken: r.idToken };
    }
    const r = await post<SignInResult>("/auth/login", { email, password });
    saveTokens(r);
    return { user: toCognitoUser(r.user, r), accessToken: r.accessToken, refreshToken: r.refreshToken, idToken: r.idToken };
  },
  async confirmSignIn(_email: string, _code: string) {
    void _email;
    void _code;
    throw new Error("MFA is not enabled on this project.");
  },
  async forgotPassword(email: string) {
    if (!isBackendAuthConfigured()) return { message: "If the email exists, a reset code has been sent (mock)" };
    return post<{ message: string }>("/auth/forgot-password", { email });
  },
  async forgotPasswordSubmit(email: string, code: string, newPassword: string) {
    if (!isBackendAuthConfigured()) return { message: "Password reset successfully (mock)" };
    return post<{ message: string }>("/auth/reset-password", { email, code, newPassword });
  },
  async signOut() {
    const tokens = loadTokens();
    clearTokens();
    if (tokens && isBackendAuthConfigured()) {
      try {
        await post("/auth/logout", {}, tokens.accessToken);
      } catch {
        /* session already gone server-side */
      }
    }
    return { message: "Signed out successfully" };
  },
  async getCurrentUser() {
    const tokens = loadTokens();
    if (!tokens || !isBackendAuthConfigured()) return null;
    try {
      const r = await get<{ user: AuthUser }>("/auth/me", tokens.accessToken);
      return toCognitoUser(r.user, tokens);
    } catch {
      return null;
    }
  },
  async refreshSession() {
    const tokens = loadTokens();
    if (!tokens) throw new Error("No saved session.");
    if (!isBackendAuthConfigured()) return tokens;
    const r = await post<AuthTokens & { expiresIn?: number }>("/auth/refresh", {
      refreshToken: tokens.refreshToken,
    });
    const merged = { ...tokens, ...r };
    saveTokens(merged);
    return merged;
  },
  async changePassword(currentPassword: string, newPassword: string) {
    const tokens = loadTokens();
    if (!tokens || !isBackendAuthConfigured()) throw new Error("Sign in required.");
    return post<{ message: string }>("/auth/change-password", { currentPassword, newPassword }, tokens.accessToken);
  },
  async completeNewPassword(_password: string, _requiredAttributes = {}) {
    void _password;
    void _requiredAttributes;
    throw new Error("Not supported: contact an administrator to reset your password.");
  },
};

export default auth;
