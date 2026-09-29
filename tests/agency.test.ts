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
  LOCAL_AGENCY_SERVICES,
  OWNERSHIP_PROMISE,
  agencyOffer,
  agencyService,
  countWord,
} from "../lib/site/agency.ts";
import { CASE_STUDIES, renderableCaseStudies } from "../lib/site/caseStudies.ts";
import { TBD_PRICE_LABEL, offer } from "../lib/site/offers.ts";

const BANNED = ["guarantee", "guaranteed", "roas", "#1", "best in", "lowest", "only agency", "testimonial:", "% increase", "x return"];

test("seven agency services, each with one audience, one problem, inclusions, ownership, vendor costs, process, FAQ, and one CTA", () => {
  assert.deepEqual(
    AGENCY_SERVICES.map((s) => s.slug),
    ["meta-ads", "google-ads", "websites", "automation", "video", "content", "community-help-desk"],
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

test("ads pages keep the ownership promise: client pays the platform, owns account, pixel, audiences, leads", () => {
  for (const slug of ["meta-ads", "google-ads"]) {
    const s = agencyService(slug)!;
    const owns = s.clientOwns.join(" ").toLowerCase();
    const pays = s.clientPaysDirectly.join(" ").toLowerCase();
    assert.match(owns, /account/, slug);
    assert.match(owns, /pixel|tag/, slug);
    assert.match(owns, /audience/, slug);
    assert.match(owns, /lead/, slug);
    assert.match(pays, /ad spend/, slug);
    assert.ok(s.notIncluded.some((n) => /passing through/i.test(n)), slug);
  }
  assert.ok(OWNERSHIP_PROMISE.points.some((p) => /never passes through/i.test(p)));
  assert.ok(OWNERSHIP_PROMISE.points.some((p) => /cross-client/i.test(p)));
});

test("agency prices are TBD until Ryan sets them; the websites page reuses the live Website Launch offer", () => {
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

test("the video page requires a signed release before anyone appears on camera", () => {
  const video = agencyService("video")!;
  const text = JSON.stringify(video).toLowerCase();
  assert.match(text, /signed release/);
  assert.match(text, /consent/);
  assert.ok(video.notIncluded.some((n) => /release/i.test(n)));
});

test("the community help desk starts with server safety, refuses price talk, and never promotes a token", () => {
  const desk = agencyService("community-help-desk")!;
  assert.equal(desk.online, true);
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

test("service counts in copy come from the list, and the Longview page keeps to local services", () => {
  assert.equal(countWord(AGENCY_SERVICES.length), "seven");
  assert.equal(countWord(LOCAL_AGENCY_SERVICES.length, true), "Six");
  assert.equal(countWord(99), "99");
  assert.deepEqual(
    LOCAL_AGENCY_SERVICES.map((s) => s.slug),
    AGENCY_SERVICES.filter((s) => s.slug !== "community-help-desk").map((s) => s.slug),
  );
  assert.match(AGENCY_HUB.lead, /community help desks/);
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
