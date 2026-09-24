// The Business dashboard: the owner dashboard on the DigitalOcean server
// (money moves, invoices, bank deposits, the month's forecast, every website
// and the server's health). The Back Office opens it already signed in.
//
// How: this server signs a ticket with a secret the dashboard server also
// holds. A ticket names one dashboard user, works for 60 seconds, and the
// dashboard accepts it once. Only Back Office admins get one, and only for the
// dashboard user their email is mapped to in BUSINESS_DASHBOARD_USERS.
// Nothing here reads or changes the dashboard's data.
import { createHmac, randomBytes } from "node:crypto";

/** How long a ticket works. The frame uses it the moment the page loads. */
export const BUSINESS_TICKET_TTL_SECONDS = 60;

/** Mixed into every signature so this secret can never sign anything else. */
export const BUSINESS_TICKET_CONTEXT = "lfp-business-sso-v1";

const DASHBOARD_USER = /^[a-z][a-z0-9_-]{0,31}$/;

export type BusinessDashboardConfig = {
  /** Where the dashboard lives, for example https://165-227-248-110.sslip.io */
  origin: string;
  secret: string;
  /** Back Office email (lowercase) to dashboard user. */
  users: Map<string, string>;
};

export type BusinessView = "frame" | "tab";

/** "hello@theleadflowpro.com:ryan, pat@example.com:pat" */
export function parseDashboardUsers(raw: string | undefined): Map<string, string> {
  const users = new Map<string, string>();
  for (const pair of (raw ?? "").split(",")) {
    const at = pair.lastIndexOf(":");
    if (at <= 0) continue;
    const email = pair.slice(0, at).trim().toLowerCase();
    const user = pair.slice(at + 1).trim().toLowerCase();
    if (email.includes("@") && DASHBOARD_USER.test(user)) users.set(email, user);
  }
  return users;
}

/** Null until this server has an https origin, a long secret, and at least one user. */
export function readBusinessDashboardConfig(
  env: Record<string, string | undefined> = process.env,
): BusinessDashboardConfig | null {
  const origin = (env.BUSINESS_DASHBOARD_ORIGIN ?? "").trim().replace(/\/+$/, "");
  const secret = (env.BUSINESS_DASHBOARD_SSO_SECRET ?? "").trim();
  const users = parseDashboardUsers(env.BUSINESS_DASHBOARD_USERS);
  let url: URL;
  try {
    url = new URL(origin);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || url.origin !== origin) return null;
  if (secret.length < 32 || users.size === 0) return null;
  return { origin, secret, users };
}

export function dashboardUserFor(
  config: BusinessDashboardConfig,
  email: string | null | undefined,
): string | null {
  if (!email) return null;
  return config.users.get(email.trim().toLowerCase()) ?? null;
}

export function signBusinessTicketPayload(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(`${BUSINESS_TICKET_CONTEXT}.${payload}`).digest("base64url");
}

/** payload.signature, both base64url. The payload is {"u","exp","n"}. */
export function mintBusinessTicket(
  user: string,
  secret: string,
  now: number = Date.now(),
  nonce: string = randomBytes(16).toString("hex"),
): string {
  if (!DASHBOARD_USER.test(user)) throw new Error("not a dashboard user name");
  const payload = Buffer.from(
    JSON.stringify({ u: user, exp: Math.floor(now / 1000) + BUSINESS_TICKET_TTL_SECONDS, n: nonce }),
  ).toString("base64url");
  return `${payload}.${signBusinessTicketPayload(payload, secret)}`;
}

/** The dashboard's sign-in address for one ticket. */
export function businessSsoUrl(origin: string, ticket: string, view: BusinessView): string {
  const url = new URL("/auth/sso", origin);
  url.searchParams.set("t", ticket);
  url.searchParams.set("m", view);
  return url.toString();
}
