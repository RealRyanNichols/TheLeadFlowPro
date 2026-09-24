import "server-only";
import { aiStatusView, aiWritingStatus, postCreatorSalesOpen } from "./ai/config";
import { usageCounts, type Db } from "./db";
import { accountView, allowanceView } from "./plan";
import { profileIsReady } from "./profile";
import type { Allowance, Entitlement, SessionView } from "./types";

// Everything the buyer app needs in one answer: the plan (never the Stripe
// ids), whether it is entitled today and why not, the saved profile, what is
// left of this month's AI writes, and whether AI writing and sales are on.
// The app page renders it on the server; GET /api/post-creator/session sends
// the same shape to the browser after a save or a write.

/**
 * The session for an account the caller has already proven (see
 * requirePostCreator). Throws without an account. A usage read that fails
 * becomes `allowance: null`, so the meter says it could not load instead of
 * the whole app failing.
 */
export async function buildSessionView(
  client: Db,
  entitlement: Entitlement,
  env: Record<string, string | undefined>,
  now: Date,
): Promise<SessionView> {
  const account = entitlement.account;
  if (!account) throw new Error("buildSessionView needs an account");
  let allowance: Allowance | null = null;
  try {
    allowance = allowanceView(account.plan, await usageCounts(client, account.email), now);
  } catch (error) {
    console.error("Post Creator usage read failed:", error instanceof Error ? error.message : "unknown error");
  }
  return {
    account: accountView(account),
    entitled: entitlement.entitled,
    reason: entitlement.reason,
    profile: account.profile,
    profileReady: profileIsReady(account.profile),
    allowance,
    ai: aiStatusView(aiWritingStatus(env)),
    salesOpen: postCreatorSalesOpen(env),
  };
}
