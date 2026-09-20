// Real AWS Cognito auth for RahatSetu (no mocks).
// Uses amazon-cognito-identity-js embedded auth (USER_PASSWORD_AUTH) so the
// existing in-app Login/Register forms stay, but credentials verify against
// a real User Pool. Backend verifies the access token via aws-jwt-verify
// (backend/src/core/auth.js) — frontend only stores/forwards tokens.
//
// Required env (see .env.example):
//   VITE_COGNITO_USER_POOL_ID, VITE_COGNITO_CLIENT_ID
// Optional: VITE_COGNITO_DOMAIN + VITE_COGNITO_REDIRECT_URI for Hosted UI,
//   VITE_AWS_REGION (informational), VITE_ADMIN_EMAILS (comma list → admin role).

import {
  AuthenticationDetails,
  CognitoUser,
  CognitoUserAttribute,
  CognitoUserPool,
} from "amazon-cognito-identity-js";
import type { Role } from "@/lib/store";

const POOL_ID = (import.meta.env.VITE_COGNITO_USER_POOL_ID as string | undefined)?.trim() ?? "";
const CLIENT_ID = (import.meta.env.VITE_COGNITO_CLIENT_ID as string | undefined)?.trim() ?? "";
const ADMIN_EMAILS = ((import.meta.env.VITE_ADMIN_EMAILS as string | undefined) ?? "")
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

export const isCognitoConfigured = () => POOL_ID.length > 0 && CLIENT_ID.length > 0;

function requirePool(): CognitoUserPool {
  if (!isCognitoConfigured()) {
    throw new Error(
      "Cognito is not configured: set VITE_COGNITO_USER_POOL_ID and VITE_COGNITO_CLIENT_ID."
    );
  }
  return new CognitoUserPool({ UserPoolId: POOL_ID, ClientId: CLIENT_ID });
}

export interface CognitoSession {
  accessToken: string;
  idToken: string;
  refreshToken: string;
  email: string;
  sub: string;
  groups: string[];
  orgId: string | null;
  role: Role;
}

function decodePayload(token: string): Record<string, unknown> {
  try {
    const parts = token.split(".");
    if (parts.length < 2 || !parts[1]) return {};
    const json = atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function roleFromGroups(groups: string[], email: string): Role {
  const upper = groups.map((g) => g.toUpperCase());
  if (upper.includes("GOVT")) {
    return ADMIN_EMAILS.includes(email.toLowerCase()) ? "admin" : "auditor";
  }
  if (upper.includes("NGO")) return "ngo";
  if (upper.includes("FIELD")) return "field";
  if (upper.includes("VENDOR")) return "vendor";
  return "donor";
}

export function sessionFromTokens(accessToken: string, idToken: string, refreshToken: string): CognitoSession {
  const payload = decodePayload(accessToken);
  const idPayload = decodePayload(idToken);
  const groups = (Array.isArray(payload["cognito:groups"]) ? payload["cognito:groups"] : []) as string[];
  const email = String(payload.email ?? idPayload.email ?? "");
  const sub = String(payload.sub ?? idPayload.sub ?? "");
  const orgId =
    (payload["custom:orgId"] as string | undefined) ??
    (payload["custom:organizationId"] as string | undefined) ??
    (idPayload["custom:orgId"] as string | undefined) ??
    null;
  return {
    accessToken,
    idToken,
    refreshToken,
    email,
    sub,
    groups,
    orgId,
    role: roleFromGroups(groups, email),
  };
}

export function persistSession(s: CognitoSession) {
  try {
    localStorage.setItem("rahatsetu_access_token", s.accessToken);
    localStorage.setItem("rahatsetu_id_token", s.idToken);
    localStorage.setItem("rahatsetu_refresh_token", s.refreshToken);
    localStorage.setItem("rahatsetu_cognito_sub", s.sub);
    if (s.orgId) localStorage.setItem("rahatsetu_org_id", s.orgId);
    else localStorage.removeItem("rahatsetu_org_id");
  } catch {
    /* private mode */
  }
}

export function clearSession() {
  try {
    localStorage.removeItem("rahatsetu_access_token");
    localStorage.removeItem("rahatsetu_id_token");
    localStorage.removeItem("rahatsetu_refresh_token");
    localStorage.removeItem("rahatsetu_cognito_sub");
    localStorage.removeItem("rahatsetu_org_id");
  } catch {
    /* noop */
  }
}

export function loadStoredSession(): CognitoSession | null {
  try {
    const accessToken = localStorage.getItem("rahatsetu_access_token");
    const idToken = localStorage.getItem("rahatsetu_id_token") ?? "";
    const refreshToken = localStorage.getItem("rahatsetu_refresh_token") ?? "";
    if (!accessToken) return null;
    return sessionFromTokens(accessToken, idToken, refreshToken);
  } catch {
    return null;
  }
}

/** Map requested frontend signup kind → Cognito group (backend role source of truth). */
export function groupForSignupKind(kind: "Donor" | "NGO" | "Vendor" | "Field"): string {
  switch (kind) {
    case "NGO":
      return "NGO";
    case "Vendor":
      return "VENDOR";
    case "Field":
      return "FIELD";
    default:
      return "DONOR";
  }
}

export function signUp(
  email: string,
  password: string,
  attrs: { name: string; orgId?: string; kind: "Donor" | "NGO" | "Vendor" | "Field" }
): Promise<{ userSub: string; needsConfirmation: boolean }> {
  const pool = requirePool();
  const attributes = [
    new CognitoUserAttribute({ Name: "email", Value: email }),
    new CognitoUserAttribute({ Name: "name", Value: attrs.name }),
    // Requested group is stored as a custom attribute; a PostConfirmation
    // Lambda (or admin) assigns the real cognito:groups membership.
    new CognitoUserAttribute({ Name: "custom:requested_group", Value: groupForSignupKind(attrs.kind) }),
    ...(attrs.orgId ? [new CognitoUserAttribute({ Name: "custom:orgId", Value: attrs.orgId })] : []),
  ];
  return new Promise((resolve, reject) => {
    pool.signUp(email, password, attributes, [], (err, result) => {
      if (err) return reject(err instanceof Error ? err : new Error(String(err)));
      resolve({
        userSub: result?.userSub ?? "",
        needsConfirmation: !result?.userConfirmed,
      });
    });
  });
}

export function confirmSignUp(email: string, code: string): Promise<void> {
  const pool = requirePool();
  const user = new CognitoUser({ Username: email, Pool: pool });
  return new Promise((resolve, reject) => {
    user.confirmRegistration(code, true, (err) => {
      if (err) return reject(err instanceof Error ? err : new Error(String(err)));
      resolve();
    });
  });
}

export function signIn(email: string, password: string): Promise<CognitoSession> {
  const pool = requirePool();
  const user = new CognitoUser({ Username: email, Pool: pool });
  const details = new AuthenticationDetails({ Username: email, Password: password });
  return new Promise((resolve, reject) => {
    user.authenticateUser(details, {
      onSuccess: (result) => {
        try {
          const s = sessionFromTokens(
            result.getAccessToken().getJwtToken(),
            result.getIdToken().getJwtToken(),
            result.getRefreshToken().getToken()
          );
          persistSession(s);
          resolve(s);
        } catch (e) {
          reject(e instanceof Error ? e : new Error(String(e)));
        }
      },
      onFailure: (err) => reject(err instanceof Error ? err : new Error(String((err as { message?: string })?.message ?? err))),
    });
  });
}

export function signOut(): void {
  try {
    const email = loadStoredSession()?.email;
    if (email) new CognitoUser({ Username: email, Pool: requirePool() }).signOut();
  } catch {
    /* noop */
  }
  clearSession();
}
