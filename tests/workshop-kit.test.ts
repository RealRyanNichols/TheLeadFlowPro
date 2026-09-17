import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { PUBLIC_PAGE_CATALOG } from "../lib/publicPageCatalog.ts";
import { FEATURED_EVENT_SLUG, SITE_EVENTS, featuredEvent, type SiteEvent } from "../lib/site/events.ts";
import { DAY_TWO_OFFERS, KIT_TEMPLATE, WORKSHOP_KITS, kitCopyProblems, workshopKit, workshopKitOrDefault, worksheetPath } from "../lib/site/workshopKit.ts";
import { WORKSHOP_FOLLOW_UP_STEPS, buildWorkshopFollowUp, workshopFollowUpDedupeKey } from "../lib/workshopFollowUp.ts";
import { checkWorkshop } from "../scripts/check-workshop.ts";
import { PRICES, usd } from "../lib/site/prices.ts";

test("every SITE_EVENTS entry has a kit, and the featured kit is complete and clean", () => {
  for (const e of SITE_EVENTS) assert.ok(workshopKit(e.slug), e.slug);
  const kit = workshopKit(FEATURED_EVENT_SLUG)!;
  assert.deepEqual(kitCopyProblems(kit), []);
  assert.ok(kit.prep.items.length >= 3);
  assert.ok(kit.worksheet.sections.length >= 3);
  assert.equal(kit.followUp.recap.length, 3);
  assert.equal(WORKSHOP_KITS.length, SITE_EVENTS.length);
});

test("the template is refused until every placeholder is replaced", () => {
  const problems = kitCopyProblems(KIT_TEMPLATE);
  assert.ok(problems.some((p) => p.includes("placeholder")));
  assert.equal(workshopKit("nope"), null);
  const fallback = workshopKitOrDefault("nope");
  assert.equal(fallback.slug, "nope");
  assert.deepEqual(fallback.worksheet.sections, [], "a plain database event gets no worksheet link");
});

test("kit copy rules catch dates, prices, times, seat counts, claims, and dashes", () => {
  const kit = structuredClone(workshopKit(FEATURED_EVENT_SLUG)!);
  kit.registration.intro = "Join us September 17 at 6:30 PM for ten seats at $97, guaranteed — really.";
  const problems = kitCopyProblems(kit);
  for (const kind of ["date", "time", "seat count", "price", "banned claim", "dash"]) assert.ok(problems.some((p) => p.startsWith(kind)), kind);
});

test("the registration page, showcase, and portal read from the kit rather than literals", () => {
  const page = readFileSync(join(process.cwd(), "app/events/[slug]/page.tsx"), "utf8");
  assert.ok(page.includes("workshopKitOrDefault(slug)"));
  assert.ok(!page.includes('slug !== "chatgpt-for-business-owners-longview"'));
  assert.ok(!page.includes("https://workshop.theleadflowpro.com/"), "details URL comes from the kit or the event");
  assert.ok(!page.includes("access to your own ChatGPT"), "bring line comes from the kit");
  const showcase = readFileSync(join(process.cwd(), "app/events/WorkshopShowcase.tsx"), "utf8");
  assert.ok(showcase.includes("{featuredEvent().title}"));
  const confirmed = readFileSync(join(process.cwd(), "app/events/[slug]/confirmed/page.tsx"), "utf8");
  assert.ok(confirmed.includes("prep={kit?.prep"));
  assert.ok(confirmed.includes("worksheetHref="));
});

test("the worksheet page exists, is catalogued as noindex, and the follow-up can point at it", () => {
  const entry = PUBLIC_PAGE_CATALOG.find((p) => p.path === worksheetPath(FEATURED_EVENT_SLUG));
  assert.ok(entry && "index" in entry && entry.index === false);
  const src = readFileSync(join(process.cwd(), "app/events/[slug]/worksheet/page.tsx"), "utf8");
  assert.ok(src.includes('robots: { index: false, follow: false }'));
  assert.ok(src.includes("notFound()"), "an event without a kit or worksheet is a 404");
});

test("the follow-up builds per event: dates, recap, offer, and dedupe keys come from that event's config", () => {
  const featured = featuredEvent();
  const next: SiteEvent = { ...featured, slug: "claude-for-operators-longview", title: "Claude for Operators: Live in Longview", startsAt: "2026-11-05T18:30:00-06:00" };
  const kit = { ...workshopKit(FEATURED_EVENT_SLUG)!, slug: next.slug, followUp: { dayTwoOffer: "website_launch" as const, recapLead: "because the same three things showed up at every table:", recap: ["One.", "Two.", "Three."] as [string, string, string] } };
  const seq = buildWorkshopFollowUp(next, kit);
  const ctx = { first: "Dana", worksheetUrl: "https://x.example/w", unsubscribeUrl: "https://x.example/u" };
  const day2 = seq.steps[1].body(ctx);
  assert.ok(day2.includes("A quick recap of November 5,"));
  assert.ok(day2.includes("1. One.") && day2.includes("3. Three."));
  assert.ok(day2.includes(`${DAY_TWO_OFFERS.website_launch.name}, ${usd(PRICES.websiteLaunchTotal)}.`));
  assert.ok(day2.includes("/packages/launch?utm_source=email"));
  assert.equal(seq.dedupeKey("r1", 302), "workshop-follow-up-v1:claude-for-operators-longview:r1:302");
  assert.notEqual(seq.dedupeKey("r1", 302), workshopFollowUpDedupeKey("r1", 302));
  assert.equal(seq.sequence.activated, false);
  // The featured sequence is unchanged: same three steps, its own date, the content engine offer by default.
  const featuredDay2 = WORKSHOP_FOLLOW_UP_STEPS[1].body(ctx);
  assert.ok(featuredDay2.includes("A quick recap of September 17,"));
  assert.ok(featuredDay2.includes(DAY_TWO_OFFERS.content_engine.name));
  assert.ok(featuredDay2.includes("#pick"));
});

test("workshop:check passes for the featured event and fails for a missing one", () => {
  const ok = checkWorkshop(FEATURED_EVENT_SLUG);
  assert.ok(ok.ok, ok.checks.filter((c) => !c.ok).map((c) => `${c.name}: ${c.detail}`).join("\n"));
  assert.ok(ok.confirmInAdmin.some((l) => l.includes("events.date_confirmed")));
  const missing = checkWorkshop("not-a-workshop");
  assert.equal(missing.ok, false);
  assert.ok(missing.checks.some((c) => c.name === "SITE_EVENTS entry exists" && !c.ok));
});
