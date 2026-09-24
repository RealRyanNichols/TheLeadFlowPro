// The Owners Room: the community app on the DigitalOcean server
// (community.theleadflowpro.com). Members sign in with their LeadFlow Pro login.
//
// How: /community/open checks the LeadFlow Pro session, then signs a ticket with a
// secret the room also holds. A ticket names one person (Supabase user id, email,
// name), works for 60 seconds, and the room accepts it once. Nothing here reads or
// changes the room's data, and the room never sees a password or a session cookie.
import { createHmac, randomBytes } from "node:crypto";

/** How long a ticket works. The browser spends it on the very next request. */
export const COMMUNITY_TICKET_TTL_SECONDS = 60;

/** Mixed into every signature so this secret can never sign anything else. */
export const COMMUNITY_TICKET_CONTEXT = "owners-room-sso-v1";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,255}$/;

export type CommunityConfig = {
  /** Where the room lives, for example https://community.theleadflowpro.com */
  origin: string;
  secret: string;
};

export type CommunityMember = { id: string; email: string; name?: string | null };

/** Null until this server has an https origin and a long secret. */
export function readCommunityConfig(
  env: Record<string, string | undefined> = process.env,
): CommunityConfig | null {
  const origin = (env.COMMUNITY_ORIGIN ?? "").trim().replace(/\/+$/, "");
  const secret = (env.COMMUNITY_SSO_SECRET ?? "").trim();
  let url: URL;
  try {
    url = new URL(origin);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || url.origin !== origin) return null;
  if (secret.length < 32) return null;
  return { origin, secret };
}

/** Where to land inside the room. Only a path on the room itself, never another host. */
export function communityReturnPath(value: string | null | undefined): string {
  const fallback = "/feed";
  if (!value || value.length > 300 || !value.startsWith("/") || value.startsWith("//")) return fallback;
  if (/[\\\u0000-\u001f\u007f]/.test(value)) return fallback;
  try {
    const url = new URL(value, "https://room.internal");
    if (url.origin !== "https://room.internal" || url.pathname.startsWith("//")) return fallback;
    if (url.pathname === "/auth" || url.pathname.startsWith("/auth/")) return fallback;
    return `${url.pathname}${url.search}`;
  } catch {
    return fallback;
  }
}

export function signCommunityTicketPayload(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(`${COMMUNITY_TICKET_CONTEXT}.${payload}`).digest("base64url");
}

/** payload.signature, both base64url. The payload is {"sub","email","name","exp","n"}. */
export function mintCommunityTicket(
  member: CommunityMember,
  secret: string,
  now: number = Date.now(),
  nonce: string = randomBytes(16).toString("hex"),
): string {
  const email = member.email.trim().toLowerCase();
  if (!UUID.test(member.id)) throw new Error("not a user id");
  if (!EMAIL.test(email)) throw new Error("not an email");
  const payload = Buffer.from(
    JSON.stringify({
      sub: member.id,
      email,
      name: (member.name ?? "").trim().slice(0, 80),
      exp: Math.floor(now / 1000) + COMMUNITY_TICKET_TTL_SECONDS,
      n: nonce,
    }),
  ).toString("base64url");
  return `${payload}.${signCommunityTicketPayload(payload, secret)}`;
}

/** The room's sign-in address for one ticket. */
export function communitySsoUrl(origin: string, ticket: string, to: string): string {
  const url = new URL("/auth/sso", origin);
  url.searchParams.set("t", ticket);
  url.searchParams.set("to", communityReturnPath(to));
  return url.toString();
}
