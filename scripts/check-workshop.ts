// Readiness check for a workshop: is everything the kit needs in place?
//
//   npm run workshop:check -- --slug chatgpt-for-business-owners-longview
//
// Checks the SITE_EVENTS entry, the kit, artwork on disk, the catalog
// entries, kit copy rules, and that the follow-up renders for this event.
// It cannot see the database row; it prints the row fields to confirm in
// /admin/events instead. Exit 1 means do not announce.

import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { PUBLIC_PAGE_CATALOG } from "../lib/publicPageCatalog.ts";
import { eventWhen, siteEvent } from "../lib/site/events.ts";
import { kitCopyProblems, workshopKit, worksheetPath } from "../lib/site/workshopKit.ts";
import { buildWorkshopFollowUp, canSendWorkshopFollowUp } from "../lib/workshopFollowUp.ts";
import { copyProblems } from "../lib/hq/copy.ts";

export type WorkshopCheck = { ok: boolean; checks: { name: string; ok: boolean; detail?: string }[]; confirmInAdmin: string[] };

export function checkWorkshop(slug: string): WorkshopCheck {
  const checks: WorkshopCheck["checks"] = [];
  const add = (name: string, ok: boolean, detail?: string) => checks.push({ name, ok, detail });

  const event = siteEvent(slug);
  add("SITE_EVENTS entry exists", Boolean(event), event ? undefined : `add ${slug} to lib/site/events.ts`);
  const kit = workshopKit(slug);
  add("kit entry exists", Boolean(kit), kit ? undefined : `add ${slug} to lib/site/workshopKit.ts (copy KIT_TEMPLATE)`);
  if (!event || !kit) return { ok: false, checks, confirmInAdmin: [] };

  const start = new Date(event.startsAt);
  add("start time parses with a Central offset", !Number.isNaN(start.getTime()) && /[-+]\d{2}:\d{2}$/.test(event.startsAt), event.startsAt);
  add("artwork file exists", existsSync(join(process.cwd(), "public", event.artwork.src)), event.artwork.src);
  add("artwork alt is not empty", event.artwork.alt.trim().length > 20);
  add("registration path matches the slug", event.registrationPath === `/events/${slug}`);
  add("catalog has the registration page", PUBLIC_PAGE_CATALOG.some((p) => p.path === `/events/${slug}`), "add it to lib/publicPageCatalog.ts with index: false");
  add("catalog has the worksheet page", PUBLIC_PAGE_CATALOG.some((p) => p.path === worksheetPath(slug)), "add it to lib/publicPageCatalog.ts with index: false");

  const kitProblems = kitCopyProblems(kit);
  add("kit copy has no dates, prices, seat counts, claims, dashes, or placeholders", kitProblems.length === 0, kitProblems.join("; "));

  const followUp = buildWorkshopFollowUp(event, kit);
  const ctx = { first: "Dana", worksheetUrl: `https://example.com${worksheetPath(slug)}`, unsubscribeUrl: "https://example.com/unsubscribe?token=x" };
  const rendered = followUp.steps.map((s) => s.body(ctx));
  const when = eventWhen(event);
  add("follow-up renders three steps for this event", followUp.steps.length === 3 && followUp.steps.every((s) => canSendWorkshopFollowUp(s, ctx)));
  add("follow-up day-2 names this event's date", rendered[1].includes(when.shortDate), when.shortDate);
  add("follow-up dedupe key carries this slug", followUp.dedupeKey("r1", 301).includes(`:${slug}:`));
  const copyIssues = rendered.flatMap((body, i) => copyProblems(body).map((p) => `step ${followUp.steps[i].step}: ${p}`));
  add("follow-up copy passes the copy rules", copyIssues.length === 0, copyIssues.join("; "));
  add("marketing steps carry an unsubscribe line", followUp.steps.filter((s) => s.kind === "marketing").every((s, i) => rendered[i + 1].includes("Unsubscribe:")));
  add("status is auto or an explicit state", ["auto", "upcoming", "sold_out", "past"].includes(event.status));

  const confirmInAdmin = [
    `events.slug = ${slug}`,
    `events.starts_at = ${event.startsAt} (${when.dateLabel}, ${when.timeRange})`,
    `events.price_usd = ${event.priceUsd}`,
    `events.capacity = ${event.seats}`,
    "events.date_confirmed = true before registration opens",
    "events.is_published = true when the page may go live",
    "events.address_line and address_visibility set; arrival_notes written",
    "events.cancellation_policy and recording_notice reviewed",
  ];
  return { ok: checks.every((c) => c.ok), checks, confirmInAdmin };
}

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

if (process.argv[1] && resolve(process.argv[1]).endsWith("check-workshop.ts")) {
  const slug = arg("slug");
  if (!slug) {
    console.error("usage: npm run workshop:check -- --slug <event-slug>");
    process.exit(2);
  }
  const r = checkWorkshop(slug);
  for (const c of r.checks) console.log(`${c.ok ? "PASS" : "FAIL"}  ${c.name}${c.detail && !c.ok ? `  (${c.detail})` : ""}`);
  if (r.confirmInAdmin.length) {
    console.log("\nConfirm in /admin/events (the database row is the authority for these):");
    for (const line of r.confirmInAdmin) console.log(`  - ${line}`);
  }
  console.log("");
  console.log(r.ok ? `${slug}: config is complete. Review the copy, then confirm the database row.` : `${slug}: fix the failures above.`);
  process.exit(r.ok ? 0 : 1);
}
