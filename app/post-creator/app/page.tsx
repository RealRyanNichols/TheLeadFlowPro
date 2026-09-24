import type { Metadata } from "next";
import { getEntitlement } from "@/lib/postCreator/accessServer";
import { aiWritingStatus, postCreatorSalesOpen } from "@/lib/postCreator/ai/config";
import { serviceDb } from "@/lib/postCreator/db";
import { accountView } from "@/lib/postCreator/plan";
import { buildSessionView } from "@/lib/postCreator/session";
import type { Entitlement } from "@/lib/postCreator/types";
import { PRIVATE_PAGE_METADATA } from "@/lib/publicPageMetadata";
import { isClaimCode } from "./copy";
import LockedPostCreator from "./LockedPostCreator";
import PostCreatorApp from "./PostCreatorApp";

// The buyer app. Rendered per request, never prerendered: the page reads the
// identity cookie to decide whether this device holds a live plan, and a
// build-time render would freeze that answer. Private: noindex, no referrer,
// and kept out of analytics (lib/analytics/privacy.ts).
//
// Anyone without a live plan on this device gets the locked screen, which
// says why (signed out, lapsed, not switched on) and how to open it. The
// email and key in a receipt link only prefill that form; the key is checked
// by the restore route, never here.

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  ...PRIVATE_PAGE_METADATA,
  title: "Your Post Creator | The LeadFlow Pro",
  description: "Post ideas, AI drafts in your voice, and your business profile.",
};

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export default async function PostCreatorAppPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const claimParam = first(params.claim);
  const claim = isClaimCode(claimParam) ? claimParam : null;
  const welcome = first(params.welcome) === "1";
  const salesOpen = postCreatorSalesOpen(process.env);
  const aiOn = aiWritingStatus(process.env).on;

  const emailParam = first(params.email).slice(0, 200);
  const keyParam = first(params.key).slice(0, 40);

  let entitlement: Entitlement;
  try {
    entitlement = await getEntitlement();
  } catch (error) {
    // The database did not answer. Nothing is decided on a guess: the locked
    // screen says to try again in a minute, and the key form works once it is back.
    console.error("Post Creator app could not check access:", error instanceof Error ? error.message : "unknown error");
    return (
      <LockedPostCreator
        reason="visitor"
        claim="unavailable"
        prefill={{ email: emailParam, key: keyParam }}
        salesOpen={salesOpen}
        aiOn={aiOn}
        canManageBilling={false}
      />
    );
  }

  const prefill = { email: (emailParam || entitlement.email || "").slice(0, 200), key: keyParam };
  const canManageBilling = entitlement.account ? accountView(entitlement.account).canManageBilling : false;
  const locked = (reason: Entitlement["reason"]) => (
    <LockedPostCreator reason={reason} claim={claim} prefill={prefill} salesOpen={salesOpen} aiOn={aiOn} canManageBilling={canManageBilling} />
  );

  if (!entitlement.entitled || !entitlement.account) return locked(entitlement.reason);

  const client = serviceDb();
  if (!client) return locked("unconfigured");

  const initial = await buildSessionView(client, entitlement, process.env, new Date());
  return <PostCreatorApp initial={initial} welcome={welcome} claim={claim} />;
}
