import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { copyProblems } from "../lib/hq/copy.ts";
import { PUBLIC_PAGE_CATALOG } from "../lib/publicPageCatalog.ts";
import {
  AGENCY_HUB,
  AGENCY_PROCESS,
  AGENCY_SERVICES,
  CORE_AGENCY_SERVICES,
  OWNERSHIP_PROMISE,
  SPECIALTY_AGENCY_SERVICES,
  agencyOffer,
  agencyService,
  countWord,
} from "../lib/site/agency.ts";
import { CASE_STUDIES, renderableCaseStudies } from "../lib/site/caseStudies.ts";
import { TBD_PRICE_LABEL, offer } from "../lib/site/offers.ts";
import { MANAGED_COMMERCIAL_TERMS } from "../lib/site/managedPlans.ts";

const BANNED = ["guarantee", "guaranteed", "roas", "#1", "best in", "lowest", "only agency", "testimonial:", "% increase", "x return"];

test("ten agency services, each with one audience, one problem, inclusions, ownership, vendor costs, process, FAQ, and one CTA", () => {
  assert.deepEqual(
    AGENCY_SERVICES.map((s) => s.slug),
    ["meta-ads", "google-ads", "websites", "automation", "video", "content", "community-help-desk", "crypto-tax-intake", "xrpl-treasury-alerts", "crypto-checkout"],
  );
  for (const s of AGENCY_SERVICES) {
    assert.ok(s.audience.length > 30, s.slug);
    assert.ok(s.problem.length > 30, s.slug);
    assert.ok(s.included.length >= 4, s.slug);
    assert.ok(s.clientOwns.length >= 2, s.slug);
    assert.ok(s.clientPaysDirectly.length >= 1, s.slug);
    assert.ok(s.notIncluded.length >= 2, s.slug);
    assert.ok(s.faq.length >= 3, s.slug);
    assert.equal(s.intakeHref, `/agency/start?service=${s.slug}`, s.slug);
    assert.ok(!s.related.some((r) => r.href.startsWith("/free-build")), s.slug);
    assert.ok(agencyService(s.slug));
    const text = JSON.stringify(s).toLowerCase();
    for (const banned of BANNED) assert.ok(!text.includes(banned), `${s.slug} contains "${banned}"`);
    for (const f of s.faq) assert.deepEqual(copyProblems(f.a), [], `${s.slug}: ${f.q}`);
    // Every visible line of the page, not only the FAQ, passes the copy rules.
    for (const line of [s.promise, s.problem, s.audience, s.metaDescription, s.trustLine ?? "", ...s.included, ...s.clientOwns, ...s.clientPaysDirectly, ...s.notIncluded]) {
      assert.deepEqual(copyProblems(line), [], `${s.slug}: ${line}`);
    }
  }
  assert.equal(AGENCY_PROCESS.map((p) => p.name).join(" → "), "Map → Scope → Build → Launch → Measure");
  assert.equal(agencyService("nope"), null);
});

test("ads pages keep client ownership while advertising is included in the written plan allocation", () => {
  for (const slug of ["meta-ads", "google-ads"]) {
    const s = agencyService(slug)!;
    const owns = s.clientOwns.join(" ").toLowerCase();
    const pays = s.clientPaysDirectly.join(" ").toLowerCase();
    assert.match(owns, /account/, slug);
    assert.match(owns, /pixel|tag/, slug);
    assert.match(owns, /audience/, slug);
    assert.match(owns, /lead/, slug);
    assert.match(pays, /outside the included plan allocation/, slug);
    assert.ok(s.notIncluded.some((n) => /advertising allocation/i.test(n)), slug);
  }
  assert.ok(OWNERSHIP_PROMISE.points.some((p) => /Advertising spend is included/i.test(p)));
  assert.ok(OWNERSHIP_PROMISE.points.some((p) => /cross-client/i.test(p)));
});

test("legacy signed-scope offer mappings remain compatible while public plan terms come from the current registry", () => {
  for (const s of AGENCY_SERVICES) {
    const o = agencyOffer(s);
    if (s.slug === "websites") {
      assert.equal(o.status, "live");
      assert.equal(o.id, "website_launch");
    } else {
      assert.equal(o.status, "tbd_ryan", s.slug);
      assert.equal(o.priceUsd, null, s.slug);
      assert.equal(o.priceLabel, TBD_PRICE_LABEL, s.slug);
    }
  }
  assert.equal(offer("agency_meta_ads").href, "/agency/meta-ads");
});

test("agency public copy uses managed plan prices and no longer promotes the old website checkout", () => {
  assert.equal(MANAGED_COMMERCIAL_TERMS.startingUpfrontUsd, 7500);
  assert.equal(MANAGED_COMMERCIAL_TERMS.initialCampaignDays, 90);
  assert.equal(MANAGED_COMMERCIAL_TERMS.adSpendTreatment, "included");
  assert.match(AGENCY_HUB.budgetNote, /initial campaign|90/);
  assert.match(AGENCY_HUB.budgetNote, /\$7,500/);
  for (const service of AGENCY_SERVICES) {
    assert.ok(!JSON.stringify(service).includes("Website Launch"), service.slug);
    assert.ok(!service.related.some((link) => link.href === "/packages/launch"), service.slug);
    assert.ok(!JSON.stringify(service).includes("Ad spend is separate"), service.slug);
  }
});

test("the video page requires a signed release before anyone appears on camera", () => {
  const video = agencyService("video")!;
  const text = JSON.stringify(video).toLowerCase();
  assert.match(text, /signed release/);
  assert.match(text, /consent/);
  assert.ok(video.notIncluded.some((n) => /release/i.test(n)));
});

test("the community help desk starts with server safety, refuses price talk, and never promotes a token", () => {
  const desk = agencyService("community-help-desk")!;
  assert.equal(desk.specialty, "Online communities");
  assert.equal(offer("agency_community_help_desk").href, "/agency/community-help-desk");
  // The safe server setup is the first thing in scope, before any bot is trained.
  assert.match(desk.included[0], /^Safe server setup first/);
  assert.ok(desk.included.some((i) => /raid/i.test(i)), "a written raid and impersonation plan");
  assert.ok(desk.included.some((i) => /recovery phrase/i.test(i)), "scam warnings name the recovery phrase");
  assert.ok(desk.included.some((i) => /real moderator/i.test(i)), "a hand-off to a person");
  // Refusals are in scope and in the FAQ, so a buyer sees them before paying.
  assert.ok(desk.included.some((i) => /no price talk/i.test(i) && /no investment advice/i.test(i)));
  assert.match(desk.trustLine ?? "", /no price talk/i);
  assert.ok(desk.faq.some((f) => /token price/i.test(f.q) && /^No\./.test(f.a)));
  assert.ok(desk.notIncluded.some((n) => /promoting a token/i.test(n)));
  assert.ok(desk.notIncluded.some((n) => /shilling/i.test(n) && /rewards for posting/i.test(n)));
  assert.ok(desk.notIncluded.some((n) => /wallet keys/i.test(n) && /recovery phrase/i.test(n)));
  // The buyer owns the bot and pays the software maker directly.
  assert.match(desk.clientOwns.join(" "), /bot account/);
  assert.match(desk.clientPaysDirectly.join(" "), /billed to you by its maker/);
  // Nothing on the page reads as investment copy.
  const text = JSON.stringify(desk).toLowerCase();
  for (const phrase of ["to the moon", "moon", "100x", "profit", "passive income", "returns", "buy now", "presale", "airdrop", "financial advice"]) {
    assert.ok(!text.includes(phrase), `help desk copy contains "${phrase}"`);
  }
});

test("crypto tax intake gathers paperwork for the firm: no tax advice, no credentials, texts only with consent", () => {
  const tax = agencyService("crypto-tax-intake")!;
  assert.equal(tax.specialty, "CPA and tax firms");
  assert.equal(offer("agency_crypto_tax_intake").href, "/agency/crypto-tax-intake");
  assert.match(tax.seoTitle, /East Texas/);
  // The firm does the tax work; the page says so where a buyer reads first.
  assert.match(tax.trustLine ?? "", /never tax advice/i);
  assert.ok(tax.faq.some((f) => /tax advice/i.test(f.q) && /^No\./.test(f.a)));
  assert.ok(tax.notIncluded.some((n) => /tax advice/i.test(n) && /return preparation/i.test(n)));
  assert.ok(tax.faq.some((f) => /approves every question/i.test(f.a)), "the firm approves the questionnaire");
  // Public addresses and exported files only, never anything that moves money.
  for (const secret of ["password", "api key", "private key", "recovery phrase"]) {
    assert.ok(tax.notIncluded.some((n) => n.toLowerCase().includes(secret)), `refuses ${secret}`);
  }
  assert.ok(tax.included.some((i) => /public wallet addresses/i.test(i)));
  // Texts only to clients who agreed, and STOP is honored.
  const reminders = tax.included.find((i) => /reminders/i.test(i)) ?? "";
  assert.match(reminders, /only to clients who agreed/);
  assert.match(reminders, /STOP/);
  // Client data stays the firm's and is used for nothing else.
  assert.ok(tax.notIncluded.some((n) => /our own marketing/i.test(n)));
  assert.ok(tax.notIncluded.some((n) => /keeping copies/i.test(n)));
  assert.match(tax.clientOwns.join(" "), /every uploaded file/);
  // The 1099-DA explanation stays general and dated to the rule, not advice.
  const form = tax.faq.find((f) => /1099-DA/.test(f.q))!;
  assert.match(form.a, /from 2025/);
  assert.match(form.a, /before 2026/);
  const text = JSON.stringify(tax).toLowerCase();
  for (const phrase of ["save you", "lower your tax", "audit-proof", "irs approved", "irs-approved", "compliant", "certified"]) {
    assert.ok(!text.includes(phrase), `tax intake copy contains "${phrase}"`);
  }
});

test("XRPL treasury alerts are watch-only: no keys, no prices or trading calls, no tracking other people, texts only with consent", () => {
  const alerts = agencyService("xrpl-treasury-alerts")!;
  assert.equal(alerts.specialty, "XRP Ledger projects and merchants");
  assert.equal(offer("agency_xrpl_treasury_alerts").href, "/agency/xrpl-treasury-alerts");
  assert.match(alerts.trustLine ?? "", /watch-only/i);
  assert.match(alerts.trustLine ?? "", /no keys/i);
  assert.match(alerts.trustLine ?? "", /no price alerts/i);
  assert.match(alerts.included[0], /public XRP Ledger addresses you name/);
  assert.ok(alerts.notIncluded.some((n) => /holding, moving, or signing/i.test(n)));
  assert.ok(alerts.notIncluded.some((n) => /price alerts/i.test(n) && /buy or sell/i.test(n)));
  assert.ok(alerts.notIncluded.some((n) => /other people/i.test(n)));
  assert.ok(alerts.notIncluded.some((n) => /not agreed/i.test(n)));
  assert.ok(alerts.faq.some((f) => /keys/i.test(f.q) && /^No\./.test(f.a)));
  assert.ok(alerts.faq.some((f) => /buy or sell/i.test(f.q) && /^No\./.test(f.a)));
  assert.ok(alerts.faq.some((f) => /STOP is honored/.test(f.a)));
  assert.ok(alerts.faq.some((f) => /written permission/.test(f.a)));
  assert.match(alerts.clientOwns.join(" "), /keys/);
  // It reports what moved; nothing on the page sells a price view or a trade.
  const text = JSON.stringify(alerts).toLowerCase();
  for (const phrase of ["moon", "100x", "profit", "passive income", "buy now", "presale", "airdrop", "financial advice", "whale", "pump"]) {
    assert.ok(!text.includes(phrase), `treasury alerts copy contains "${phrase}"`);
  }
  // "signals" only ever appears as something it does not do.
  for (const line of [alerts.promise, alerts.trustLine ?? "", alerts.metaDescription]) {
    if (/signal/i.test(line)) assert.match(line, /(never|no) [^.]*signals/i, line);
  }
});

test("crypto checkout keeps the money out of LeadFlow's hands: the shop's own processor, no investing or tax advice, no coin promotion", () => {
  const checkout = agencyService("crypto-checkout")!;
  assert.equal(checkout.specialty, "Shops that want to take crypto");
  assert.equal(offer("agency_crypto_checkout").href, "/agency/crypto-checkout");
  assert.match(checkout.seoTitle, /Longview, TX/);
  assert.match(checkout.trustLine ?? "", /never passes through The LeadFlow Pro/);
  assert.match(checkout.promise, /We never touch the money/);
  assert.ok(checkout.included.some((i) => /open the account in your business's name/.test(i)));
  assert.ok(checkout.included.some((i) => /test payment/i.test(i)));
  assert.match(checkout.clientOwns.join(" "), /in your business's name/);
  assert.match(checkout.clientPaysDirectly.join(" "), /charged by the processor/);
  assert.ok(checkout.notIncluded.some((n) => /receiving, holding, or moving any payment/i.test(n)));
  assert.ok(checkout.notIncluded.some((n) => /investing/i.test(n)));
  assert.ok(checkout.notIncluded.some((n) => /^Tax advice/.test(n)));
  assert.ok(checkout.notIncluded.some((n) => /promoting any coin/i.test(n)));
  assert.ok(checkout.faq.some((f) => /who holds the money/i.test(f.q) && /never passes through/.test(f.a)));
  // No processor is named or ranked on the page, and no fee is quoted: those are checked at scoping.
  const text = JSON.stringify(checkout).toLowerCase();
  for (const name of ["bitpay", "coinbase", "stripe", "strike", "opennode", "cash app", "paypal"]) {
    assert.ok(!text.includes(name), `crypto checkout names a processor: "${name}"`);
  }
  assert.ok(!/\d+(\.\d+)?\s?%/.test(text), "crypto checkout quotes a percentage fee");
  for (const phrase of ["moon", "profit", "passive income", "buy now", "presale", "airdrop", "financial advice", "invest in"]) {
    assert.ok(!text.includes(phrase), `crypto checkout copy contains "${phrase}"`);
  }
});

test("service counts in copy come from the list; specialty builds sit in their own band and off the Longview grid", () => {
  assert.equal(countWord(AGENCY_SERVICES.length), "ten");
  assert.equal(countWord(CORE_AGENCY_SERVICES.length, true), "Six");
  assert.equal(countWord(99), "99");
  assert.deepEqual(
    CORE_AGENCY_SERVICES.map((s) => s.slug),
    ["meta-ads", "google-ads", "websites", "automation", "video", "content"],
  );
  assert.deepEqual(
    SPECIALTY_AGENCY_SERVICES.map((s) => s.slug),
    ["community-help-desk", "crypto-tax-intake", "xrpl-treasury-alerts", "crypto-checkout"],
  );
  for (const s of SPECIALTY_AGENCY_SERVICES) assert.ok((s.specialty ?? "").length > 3, s.slug);
  assert.match(AGENCY_HUB.lead, /online communities, CPA firms, XRP Ledger projects, and shops that take crypto/);
});

test("case studies render only approved entries with approved, dated metrics and the Premier disclosure", () => {
  const rendered = renderableCaseStudies(new Date("2026-09-17T12:00:00Z"));
  assert.equal(rendered.length, CASE_STUDIES.filter((c) => c.approved).length);
  for (const study of rendered) {
    assert.ok(existsSync(path.join(process.cwd(), "public", study.shot)), study.shot);
    for (const m of study.metrics) {
      assert.equal(m.status, "approved", m.id);
      assert.match(m.asOfLabel, /2026/, m.id);
      assert.ok(m.definition.length > 20, m.id);
    }
    if (study.id === "premier") {
      assert.match(study.disclosure ?? "", /common ownership/);
      assert.equal(study.kind, "common_ownership");
    }
    // The Premier disclosure legitimately says "not an independent client
    // testimonial"; everything else that smells like invented proof is banned.
    const text = JSON.stringify({
      ...study,
      disclosure: null,
      metrics: study.metrics.map((m) => ({ ...m, disclosure: null })),
    }).toLowerCase();
    for (const banned of ["testimonial", "roas", "guarantee", "%"]) {
      assert.ok(!text.includes(banned), `${study.id} contains "${banned}"`);
    }
  }
  const unapproved = renderableCaseStudies().find((c) => !c.approved);
  assert.equal(unapproved, undefined);
});

test("every agency page and the plugin docs are catalogued so they get metadata, a social card, and a sitemap entry", () => {
  const paths = new Set<string>(PUBLIC_PAGE_CATALOG.map((p) => p.path));
  for (const expected of ["/agency", "/agency/start", "/plugin/docs", ...AGENCY_SERVICES.map((s) => `/agency/${s.slug}`)]) {
    assert.ok(paths.has(expected), `${expected} is missing from PUBLIC_PAGE_CATALOG`);
  }
  const intake = PUBLIC_PAGE_CATALOG.find((p) => p.path === "/agency/start");
  assert.equal("index" in intake! && intake.index, false);
});
