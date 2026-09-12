import "server-only";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import {
  PRO_ACCESS_COOKIE,
  PRO_ACCESS_MAX_AGE,
  isProKind,
  proAccessSecrets,
  verifyProAccess,
  type ProAccess,
} from "@/lib/proAccess";

// The server side of pro access: read the signed cookie, add whatever a
// logged-in buyer's purchase rows say, and hand pages one Set of kinds.

export type ProEntitlements = {
  kinds: Set<string>;
  /** The email the cookie was issued to, when there is one. */
  email: string | null;
  /** True when the visitor is logged in and purchases contributed kinds. */
  fromAccount: boolean;
};

export async function readProAccessCookie(): Promise<ProAccess | null> {
  const store = await cookies();
  return verifyProAccess(store.get(PRO_ACCESS_COOKIE)?.value, proAccessSecrets());
}

export function proAccessCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: PRO_ACCESS_MAX_AGE,
  };
}

/**
 * Cookie first, then the account. A buyer who logs in with the email they
 * paid with is unlocked without ever typing a key, because the webhook wrote
 * their purchase row and the purchases policy matches on login email.
 */
export async function getProEntitlements(): Promise<ProEntitlements> {
  const kinds = new Set<string>();
  let email: string | null = null;
  let fromAccount = false;

  const cookie = await readProAccessCookie();
  if (cookie) {
    for (const k of cookie.k) kinds.add(k);
    email = cookie.e || null;
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from("purchases")
        .select("kind")
        .eq("status", "paid")
        .like("kind", "pro_%");
      for (const row of data ?? []) {
        const kind = typeof row.kind === "string" ? row.kind : "";
        if (isProKind(kind)) {
          kinds.add(kind);
          fromAccount = true;
        }
      }
      // Every kit is included with the plugin subscription. A member of a
      // live plugin workspace holds the bundle for as long as the plan runs;
      // the membership policy scopes this read to their own workspaces.
      const { data: memberships } = await supabase
        .from("hq_members")
        .select("hq_workspaces(plan, trial_ends_at)")
        .eq("user_id", user.id);
      for (const m of (memberships ?? []) as Array<{ hq_workspaces: { plan?: string; trial_ends_at?: string | null } | { plan?: string; trial_ends_at?: string | null }[] | null }>) {
        const ws = Array.isArray(m.hq_workspaces) ? m.hq_workspaces[0] : m.hq_workspaces;
        const plan = ws?.plan ?? "none";
        const trialOk = plan !== "trial" || !ws?.trial_ends_at || new Date(ws.trial_ends_at).getTime() > Date.now();
        if ((plan === "active" || plan === "past_due" || plan === "trial") && trialOk) {
          kinds.add("pro_bundle");
          fromAccount = true;
        }
      }
      if (!email && user.email) email = user.email.toLowerCase();
    }
  } catch {
    // No session, or Supabase unreachable. The cookie already answered.
  }

  return { kinds, email, fromAccount };
}
