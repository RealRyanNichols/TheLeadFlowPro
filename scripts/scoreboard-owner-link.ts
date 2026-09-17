// Print the private owner link for a client's scoreboard.
//
//   HQ_SECRET=... npm run scoreboard:owner-link -- --business premier-dental-academy-of-longview
//
// Needs the same signing secret Vercel has (HQ_SECRET or the older names),
// so run it locally with the value exported for this shell only. Nothing
// is stored. Send the link to the client owner directly; it stays valid
// until the secret rotates or their ownerView flag is turned off.

import { resolve } from "node:path";
import { BUSINESS } from "../lib/site/business.ts";
import { scoreboardBusiness } from "../lib/scoreboard.ts";
import { ownerKey, ownerViewPath } from "../lib/scoreboardOwner.ts";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

if (process.argv[1] && resolve(process.argv[1]).endsWith("scoreboard-owner-link.ts")) {
  const slug = arg("business");
  const business = slug ? scoreboardBusiness(slug) : null;
  if (!slug || !business) {
    console.error("usage: npm run scoreboard:owner-link -- --business <slug>");
    process.exit(2);
  }
  if (!business.optIn.ownerView) {
    console.error(`${slug} has not opted in to the owner view (optIn.ownerView is false).`);
    process.exit(1);
  }
  try {
    const key = ownerKey(slug);
    console.log(`${BUSINESS.siteUrl}${ownerViewPath(slug, key)}`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    console.error("Export HQ_SECRET for this shell (the value Vercel uses) and run again.");
    process.exit(1);
  }
}
