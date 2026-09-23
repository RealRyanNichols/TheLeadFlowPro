import type { Metadata } from "next";
import { getEntitlement } from "@/lib/chaseSheet/accessServer";
import { TONE_OPTIONS } from "@/lib/chaseSheet/messages";
import { CHASE_SHEET } from "@/lib/chaseSheet/product";
import { TRADE_OPTIONS } from "@/lib/chaseSheet/trades";
import { PRIVATE_PAGE_METADATA } from "@/lib/publicPageMetadata";
import ChaseSheetApp from "./ChaseSheetApp";
import LockedSheet from "./LockedSheet";

// The sheet. Rendered per request, never prerendered: the page reads the
// identity cookie to decide whether this visitor holds a live plan, and a
// build-time render would freeze that answer.

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  ...PRIVATE_PAGE_METADATA,
  title: `Your ${CHASE_SHEET.name} | The LeadFlow Pro`,
  description: "Today's chase list, your quotes, and the ledger.",
};

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export default async function ChaseSheetAppPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const entitlement = await getEntitlement();
  if (!entitlement.entitled) {
    return (
      <LockedSheet
        reason={entitlement.reason}
        email={entitlement.email}
        claim={first(params.claim) || null}
        prefill={{ email: first(params.email).slice(0, 200), key: first(params.key).slice(0, 40) }}
      />
    );
  }
  return <ChaseSheetApp trades={TRADE_OPTIONS} tones={TONE_OPTIONS} welcome={first(params.welcome) === "1"} />;
}
