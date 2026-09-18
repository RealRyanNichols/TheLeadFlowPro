import assert from "node:assert/strict";
import test from "node:test";
import { BUSINESS } from "../lib/site/business.ts";
import { CLAIMS, approvedClaim, approvedClaims, claimDateLabel } from "../lib/site/claims.ts";
import { EXTERNAL_LINKS } from "../lib/site/external-links.ts";
import { CONSULTATION } from "../lib/site/consultation.ts";
import {
  FOOTER_COLUMNS,
  HEADER_CTA,
  NAV_LINKS,
  chromeInternalHrefs,
  hidesSiteChrome,
} from "../lib/site/navigation.ts";
import {
  OFFERS,
  TBD_PRICE_LABEL,
  offer,
  offersAwaitingRyan,
  priceLabel,
} from "../lib/site/offers.ts";
import { PRICES, guardedPriceStrings, usd, usdFrom, usdPerMonth, usdRange } from "../lib/site/prices.ts";
import { WEBSITE_LAUNCH, WEBSITE_LAUNCH_CHECKOUT, OFFER_LADDER } from "../lib/offers.ts";
import { FREE_BUILD } from "../lib/freeBuild.ts";
import { LEAD_FOLLOW_UP } from "../lib/leadFollowUp.ts";
import { HQ_PLAN } from "../lib/hq/types.ts";

test("the fixed business facts never drift", () => {
  assert.equal(BUSINESS.name, "The LeadFlow Pro");
  assert.equal(BUSINESS.legalName, "Longview Training Center, LLC");
  assert.equal(BUSINESS.phone.display, "(903) 500-8898");
  assert.equal(BUSINESS.phone.e164, "+19035008898");
  assert.equal(BUSINESS.email.hello, "hello@theleadflowpro.com");
  assert.equal(BUSINESS.siteUrl, "https://www.theleadflowpro.com");
  assert.equal(BUSINESS.timezone, "America/Chicago");
  assert.equal(EXTERNAL_LINKS.workshopSite, "https://workshop.theleadflowpro.com/");
  assert.equal(EXTERNAL_LINKS.stripeWebsiteLaunchDeposit, "https://book.stripe.com/cNi6oG52y1kockE5oq5AQ0a");
});

test("the published price table is encoded once and formatted consistently", () => {
  assert.equal(usd(PRICES.websiteLaunchTotal), "$1,000");
  assert.equal(PRICES.websiteLaunchDeposit + PRICES.websiteLaunchFinal, PRICES.websiteLaunchTotal);
  assert.equal(usd(PRICES.systemMap), "$497");
  assert.equal(usdFrom(PRICES.trainingPlatformFrom), "$5,000+");
  assert.equal(usdFrom(PRICES.companyOsFrom), "$7,500+");
  assert.equal(usdFrom(PRICES.customPlatformFrom), "$15,000+");
  assert.equal(usd(PRICES.leadFollowUpCampaign), "$197");
  assert.equal(usdRange(PRICES.proKitMin, PRICES.proKitMax), "$10 to $29");
  assert.equal(usdPerMonth(PRICES.pluginMonthly), "$49/mo");
  assert.equal(usdPerMonth(PRICES.hostingManagedMonthly), "$49/mo");
  assert.equal(usdPerMonth(PRICES.hostingWithEditsMonthly), "$99/mo");
  assert.equal(usd(PRICES.workshopSeat), "$97");
  assert.deepEqual(
    [PRICES.freeBuildFollowUpPack, PRICES.freeBuildContentEngine, PRICES.freeBuildGrowthEngine],
    [197, 497, 997],
  );
  assert.ok(guardedPriceStrings().includes("$1,000"));
  assert.ok(guardedPriceStrings().includes("$7,500"));
  assert.ok(!guardedPriceStrings().includes("$0"));
});

test("checkout modules charge exactly what the registry advertises", () => {
  assert.equal(WEBSITE_LAUNCH.total, PRICES.websiteLaunchTotal);
  assert.equal(WEBSITE_LAUNCH.deposit, PRICES.websiteLaunchDeposit);
  assert.equal(WEBSITE_LAUNCH.priceLabel, offer("website_launch").priceLabel);
  assert.equal(WEBSITE_LAUNCH_CHECKOUT, offer("website_launch").stripeLink);
  assert.equal(LEAD_FOLLOW_UP.priceUsd, PRICES.leadFollowUpCampaign);
  assert.equal(LEAD_FOLLOW_UP.priceCents, PRICES.leadFollowUpCampaign * 100);
  assert.equal(HQ_PLAN.priceUsd, PRICES.pluginMonthly);
  assert.equal(HQ_PLAN.trialDays, PRICES.pluginTrialDays);
  for (const tier of FREE_BUILD.tiers) {
    assert.equal(tier.priceCents, tier.priceUsd * 100, tier.id);
    assert.equal(offer(tier.id).priceUsd, tier.priceUsd, tier.id);
  }
  for (const rung of OFFER_LADDER) {
    const registry = OFFERS.find((o) => o.href === rung.href && o.priceUsd === rung.priceValue);
    assert.ok(registry, `${rung.id} is missing from lib/site/offers.ts`);
    assert.equal(registry.priceLabel, rung.price, rung.id);
  }
});

test("every offer has a name, a status, a URL, terms, and a review date; only TBD offers lack a price", () => {
  const ids = new Set<string>();
  for (const o of OFFERS) {
    assert.ok(!ids.has(o.id), `duplicate offer id ${o.id}`);
    ids.add(o.id);
    assert.ok(o.name.length > 3, o.id);
    assert.ok(["live", "tbd_ryan", "retired"].includes(o.status), o.id);
    assert.match(o.href, /^\//, o.id);
    assert.ok(o.terms.length > 20, o.id);
    assert.match(o.effectiveDate, /^\d{4}-\d{2}-\d{2}$/, o.id);
    assert.match(o.reviewDate, /^\d{4}-\d{2}-\d{2}$/, o.id);
    assert.ok(o.reviewDate > o.effectiveDate, o.id);
    if (o.status === "live") {
      assert.equal(typeof o.priceUsd, "number", `${o.id} is live without a price`);
      assert.match(o.priceLabel, /^\$/, o.id);
    }
    if (o.status === "tbd_ryan") {
      assert.equal(o.priceUsd, null, `${o.id} must not carry a guessed price`);
      assert.equal(o.priceLabel, TBD_PRICE_LABEL, o.id);
      assert.equal(priceLabel(o.id), TBD_PRICE_LABEL, o.id);
    }
  }
  assert.throws(() => offer("not-an-offer"));
  // Agency services and the plugin vertical packs (lib/hq/verticals.ts) wait on Ryan for a number.
  assert.ok(offersAwaitingRyan().every((o) => o.category === "agency" || o.id.startsWith("plugin_pack_")));
  assert.ok(offersAwaitingRyan().length >= 5);
});

test("every approved claim names a business, source, definition, window, and dates", () => {
  const ids = new Set<string>();
  for (const claim of CLAIMS) {
    assert.ok(!ids.has(claim.id), claim.id);
    ids.add(claim.id);
    assert.ok(claim.source.length > 10, claim.id);
    assert.ok(claim.definition.length > 20, claim.id);
    assert.ok(claim.window.length > 3, claim.id);
    assert.match(claim.asOf, /^\d{4}-\d{2}-\d{2}$/, claim.id);
    assert.match(claim.reviewBy, /^\d{4}-\d{2}-\d{2}$/, claim.id);
    assert.ok(claim.reviewBy > claim.asOf, claim.id);
    if (claim.business === "premier") {
      assert.match(claim.disclosure ?? "", /common ownership/, `${claim.id} needs the Premier disclosure`);
    }
    const text = `${claim.label} ${claim.definition}`.toLowerCase();
    for (const banned of ["guarantee", "best", "#1", "roas", "roi", "testimonial"]) {
      assert.ok(!text.includes(banned), `${claim.id} contains "${banned}"`);
    }
  }
  assert.equal(claimDateLabel("2026-09-01"), "September 1, 2026");
  const fresh = approvedClaim("pda_leads_30d", new Date("2026-09-17T12:00:00Z"));
  assert.ok(fresh);
  assert.equal(fresh.stale, false);
  assert.equal(fresh.asOfLabel, "September 1, 2026");
  const later = approvedClaim("pda_leads_30d", new Date("2026-10-02T12:00:00Z"));
  assert.equal(later?.stale, true);
  assert.equal(approvedClaim("nothing_here"), null);
  assert.equal(approvedClaims("premier").length, 6);
});

test("header and footer are defined once and only link to site paths or known off-site addresses", () => {
  assert.ok(NAV_LINKS.some((l) => l.href === "/agency"));
  assert.ok(!NAV_LINKS.some((l) => l.href === "/events"), "events are off the primary nav");
  assert.equal(HEADER_CTA.href, CONSULTATION.href);
  assert.equal(FOOTER_COLUMNS.length, 3);
  const plugin = FOOTER_COLUMNS[0].links.find((l) => l.href === "/plugin");
  assert.equal(plugin?.label, `Plugin for ChatGPT and Claude | ${usdPerMonth(PRICES.pluginMonthly)}`);
  const followUp = FOOTER_COLUMNS[2].links.find((l) => l.href === "/go/lead-follow-up");
  assert.equal(followUp?.label, `Follow-Up Campaign | ${usd(PRICES.leadFollowUpCampaign)}`);
  for (const href of chromeInternalHrefs()) assert.match(href, /^\/[a-z0-9\-/#?=&_]*$/i, href);
  assert.equal(hidesSiteChrome("/start"), true);
  assert.equal(hidesSiteChrome("/agency/start"), true);
  assert.equal(hidesSiteChrome("/admin/leads"), true);
  assert.equal(hidesSiteChrome("/agency"), false);
  assert.equal(hidesSiteChrome("/"), false);
});
