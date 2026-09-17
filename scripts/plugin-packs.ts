// The vertical pack audit: which packs are real (every workflow exists)
// and which are drafts, with what is missing. This is the Phase 3.1 audit
// rule in code; a page for a pack renders only when this says real.
//
//   npm run plugin:packs

import { VERTICAL_PACKS, packAudit } from "../lib/hq/verticals.ts";
import { offer } from "../lib/site/offers.ts";

for (const pack of VERTICAL_PACKS) {
  const a = packAudit(pack);
  const o = offer(pack.offerId);
  console.log(`${a.status.toUpperCase().padEnd(6)} ${pack.name} (${a.existing}/${pack.workflows.length} workflows exist; price: ${o.status === "live" ? o.priceLabel : "TBD, Ryan"})`);
  for (const m of a.missing) console.log(`       missing: ${m.name}. ${m.missing ?? ""}`);
}
console.log("\nA pack is marketed only when every workflow exists and priced only when Ryan sets a number.");
