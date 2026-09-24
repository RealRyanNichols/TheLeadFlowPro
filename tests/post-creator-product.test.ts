// Post Creator: the contract every other part reads.
//
// The prices and plans checkout charges, the AI allowance and every
// buyer-facing line built from it, the fixed choices (platforms, trades,
// voices, calls to action, angles), the business profile rules, and the copy
// rules a post passes before an owner sees it.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";
import { CHASE_SHEET } from "../lib/chaseSheet/product.ts";
import { copyProblems } from "../lib/hq/copy.ts";
import { BLANK_SOURCE, NO_FACTS, blankPattern, cleanOwnerText, maskOwnerNames, postCopyProblems } from "../lib/postCreator/copyRules.ts";
import {
  ANGLE_IDS,
  ANGLE_META,
  CTAS,
  CTA_IDS,
  PLATFORMS,
  PLATFORM_IDS,
  TRADES,
  TRADE_IDS,
  VOICES,
  isAngleId,
  isCtaChoice,
  isCtaId,
  isPlatformId,
  isTradeId,
  isVoiceId,
  platformById,
  tradeLabel,
} from "../lib/postCreator/options.ts";
import * as product from "../lib/postCreator/product.ts";
import { CTA_EMAIL_ERROR, EMPTY_PROFILE, PROFILE_LIMITS, parseProfile, profileIsReady, validateProfileInput } from "../lib/postCreator/profile.ts";
import type { BrandProfile, PostCreatorPlan } from "../lib/postCreator/types.ts";
import { offer } from "../lib/site/offers.ts";
import { PRICES, usd, usdPerMonth } from "../lib/site/prices.ts";

const {
  POST_CREATOR,
  aiCapLine,
  aiLimitsFor,
  aiNotUnlimited,
  ideaCountLine,
  isPostCreatorKind,
  postCreatorCheckoutName,
  postCreatorKindForPlan,
  postCreatorPlanForKind,
  postCreatorPriceUsd,
  triesLine,
  unlimitedBody,
} = product;

// Assembled from pieces, so this file never trips the source guards that keep
// these words inside the honesty block of product.ts and out of our copy.
const w = (...parts: string[]) => parts.join("");
const UNLIMITED = w("un", "limited");
const PROMISE = w("guar", "antee");
const LIMIT_WORDS = new RegExp(
  `\\b(${[UNLIMITED, w("un", "ending"), w("end", "less"), w("infin", "ite"), w("never run", " out"), w("no", " limit")].join("|")})\\b`,
  "gi",
);
const AI_WITHOUT_LIMIT = new RegExp(`${UNLIMITED}\\s+(ai|writ|draft)`, "i");

const PLANS: PostCreatorPlan[] = ["monthly", "lifetime"];
const PLUMBING = { coreCount: 280, cardCount: 17_920, monthsAtThreeAWeek: 21 };
const OTHER = { coreCount: 142, cardCount: 9_088, monthsAtThreeAWeek: 10 };

// Every exported function, called at sample arguments. A new export has to be
// added here, so its output is checked too.
const FUNCTION_OUTPUTS: Record<string, () => unknown[]> = {
  aiCapLine: () => PLANS.map(aiCapLine),
  aiLimitsFor: () => PLANS.map(aiLimitsFor),
  aiNotUnlimited: () => [aiNotUnlimited()],
  ideaCountLine: () => [ideaCountLine(PLUMBING, "plumbing"), ideaCountLine(OTHER, "your business")],
  isPostCreatorKind: () => [isPostCreatorKind(POST_CREATOR.monthlyKind)],
  postCreatorCheckoutName: () => PLANS.map(postCreatorCheckoutName),
  postCreatorKindForPlan: () => PLANS.map(postCreatorKindForPlan),
  postCreatorPlanForKind: () => [postCreatorPlanForKind(POST_CREATOR.lifetimeKind)],
  postCreatorPriceUsd: () => PLANS.map(postCreatorPriceUsd),
  triesLine: () => PLANS.map(triesLine),
  unlimitedBody: () => [unlimitedBody(280), unlimitedBody(1_136)],
};

/** Every string product.ts exports, nested in POST_CREATOR, or returns. */
function productTexts(): string[] {
  const texts: string[] = [];
  for (const value of Object.values(product)) if (typeof value === "string") texts.push(value);
  for (const value of Object.values(POST_CREATOR)) if (typeof value === "string") texts.push(value);
  for (const outputs of Object.values(FUNCTION_OUTPUTS)) {
    for (const out of outputs()) if (typeof out === "string") texts.push(out);
  }
  return texts;
}

function source(name: string): string {
  return readFileSync(new URL(`../lib/postCreator/${name}.ts`, import.meta.url), "utf8");
}

describe("product", () => {
  test("prices come from PRICES and the labels read $20/mo and $97 once", () => {
    assert.equal(POST_CREATOR.monthlyUsd, PRICES.postCreatorMonthly);
    assert.equal(POST_CREATOR.lifetimeUsd, PRICES.postCreatorLifetime);
    assert.equal(postCreatorPriceUsd("monthly"), PRICES.postCreatorMonthly);
    assert.equal(postCreatorPriceUsd("lifetime"), PRICES.postCreatorLifetime);
    assert.equal(POST_CREATOR.monthlyLabel, usdPerMonth(PRICES.postCreatorMonthly));
    assert.equal(POST_CREATOR.lifetimeLabel, `${usd(PRICES.postCreatorLifetime)} once`);
    assert.equal(POST_CREATOR.monthlyLabel, "$20/mo");
    assert.equal(POST_CREATOR.lifetimeLabel, "$97 once");
  });

  test("kinds are safe metadata values, never a Pro Kit or Chase Sheet kind", () => {
    const chase: string[] = [CHASE_SHEET.monthlyKind, CHASE_SHEET.lifetimeKind, CHASE_SHEET.accessKind];
    const kinds: string[] = [POST_CREATOR.monthlyKind, POST_CREATOR.lifetimeKind, POST_CREATOR.accessKind];
    assert.equal(new Set(kinds).size, 3);
    for (const kind of kinds) {
      assert.match(kind, /^[a-z0-9_-]{1,64}$/, kind);
      assert.ok(!kind.startsWith("pro"), kind);
      assert.ok(!chase.includes(kind), kind);
    }
    assert.equal(isPostCreatorKind(POST_CREATOR.monthlyKind), true);
    assert.equal(isPostCreatorKind(POST_CREATOR.lifetimeKind), true);
    assert.equal(isPostCreatorKind(POST_CREATOR.accessKind), false);
    for (const kind of chase) assert.equal(isPostCreatorKind(kind), false, kind);
  });

  test("kind and plan round-trip", () => {
    for (const plan of PLANS) assert.equal(postCreatorPlanForKind(postCreatorKindForPlan(plan)), plan);
    assert.equal(postCreatorKindForPlan("monthly"), "post_creator_monthly");
    assert.equal(postCreatorKindForPlan("lifetime"), "post_creator_lifetime");
    assert.equal(postCreatorPlanForKind(CHASE_SHEET.monthlyKind), null);
    assert.equal(postCreatorPlanForKind(""), null);
    assert.equal(postCreatorCheckoutName("monthly"), "Post Creator | monthly | The LeadFlow Pro");
    assert.equal(postCreatorCheckoutName("lifetime"), "Post Creator | one payment | The LeadFlow Pro");
  });

  test("aiLimitsFor adds the extra tries and converts the ceiling to micro-dollars", () => {
    assert.deepEqual(aiLimitsFor("monthly"), {
      perDay: 20,
      perMonth: 100,
      triesPerDay: 25,
      triesPerMonth: 120,
      costCeilingMicroUsd: 15e6,
      maxPlatforms: 3,
    });
    assert.deepEqual(aiLimitsFor("lifetime"), {
      perDay: 10,
      perMonth: 50,
      triesPerDay: 15,
      triesPerMonth: 70,
      costCeilingMicroUsd: 9e6,
      maxPlatforms: 3,
    });
  });

  test("the allowance lines are built from the same numbers the route meters", () => {
    assert.equal(
      aiCapLine("monthly"),
      "AI writing: up to 100 writes a month and 20 a day. Each write drafts one post for up to 3 platforms. Unused writes do not carry over.",
    );
    assert.equal(
      aiCapLine("lifetime"),
      "AI writing: up to 50 writes a month and 10 a day. Each write drafts one post for up to 3 platforms. Unused writes do not carry over.",
    );
    assert.equal(
      triesLine("monthly"),
      "A write that fails or is declined does not count. To keep costs fair, there is a ceiling of 25 tries a day and 120 a month, counting the ones that fail.",
    );
    assert.match(triesLine("lifetime"), /ceiling of 15 tries a day and 70 a month/);
    assert.equal(
      aiNotUnlimited(),
      `AI writing is not ${UNLIMITED}. Every AI write costs us money to make, so each plan includes a set number: up to 100 a month and 20 a day on the monthly plan, and up to 50 a month and 10 a day on the one payment plan. A write that fails does not count. A write counts when a draft comes back for at least one of the platforms you picked. Any platform without a draft is named on screen, so you can start a new write for it.`,
    );
    assert.equal(
      ideaCountLine(PLUMBING, "plumbing"),
      "280 different post ideas for plumbing with these settings, and 17,920 ways to word and shoot them. At three posts a week, that is about 21 months before an idea comes back on this device.",
    );
    assert.match(unlimitedBody(17_920), /until you have seen all 17,920 for your settings\./);
  });

  test("both offer rows carry the plan's allowance and the product's page", () => {
    const monthly = offer("post_creator_monthly");
    const lifetime = offer("post_creator_lifetime");
    assert.ok(monthly.terms.includes(aiCapLine("monthly")));
    assert.ok(lifetime.terms.includes(aiCapLine("lifetime")));
    assert.equal(monthly.priceLabel, POST_CREATOR.monthlyLabel);
    assert.equal(lifetime.priceLabel, usd(PRICES.postCreatorLifetime));
    assert.equal(monthly.href, POST_CREATOR.path);
    assert.equal(lifetime.href, POST_CREATOR.path);
    for (const row of [monthly, lifetime]) {
      assert.equal(row.source, "lib/postCreator/product.ts");
      assert.equal(row.stripeLink, undefined, row.id);
      assert.deepEqual(copyProblems(row.terms), [], row.id);
    }
  });

  test("every exported string and every function output passes the copy rules", () => {
    const exported = Object.entries(product)
      .filter(([, value]) => typeof value === "function")
      .map(([name]) => name)
      .sort();
    assert.deepEqual(exported, Object.keys(FUNCTION_OUTPUTS).sort(), "add new exports to FUNCTION_OUTPUTS");
    const texts = productTexts();
    assert.ok(texts.length > 30);
    // The only dollar amounts are the two prices, formatted from PRICES.
    const prices = [usd(PRICES.postCreatorMonthly), usd(PRICES.postCreatorLifetime)];
    for (const text of texts) {
      assert.deepEqual(copyProblems(text), [], text);
      for (const amount of text.match(/\$\d[\d,.]*/g) ?? []) assert.ok(prices.includes(amount), `${text} names ${amount}`);
    }
  });

  test("the filter line says what the rules catch, not that they catch every claim", () => {
    assert.match(product.FILTER_LINE, /the common claims, prices, and numbers you did not give us/);
    assert.match(product.FILTER_LINE, /do not catch everything, so read every draft/);
    assert.doesNotMatch(product.FILTER_LINE, /remove claims, prices/);
  });

  test("no line ever calls AI writing endless", () => {
    for (const text of productTexts()) assert.doesNotMatch(text, AI_WITHOUT_LIMIT, text);
  });

  test("the limit words live only inside the honesty block", () => {
    const src = source("product");
    const start = src.indexOf("// honesty:start");
    const end = src.indexOf("// honesty:end");
    assert.ok(start > 0 && end > start, "honesty markers");
    assert.ok(src.slice(start, end).match(LIMIT_WORDS), "the block holds the words");
    assert.equal((src.slice(0, start) + src.slice(end)).match(LIMIT_WORDS), null);
    for (const name of ["options", "types", "profile", "copyRules", "product"]) {
      const text = source(name);
      if (name !== "product") assert.equal(text.match(LIMIT_WORDS), null, name);
      assert.doesNotMatch(text, /[\u2014\u2013]/, `${name} has a long dash`);
      assert.ok(!text.toLowerCase().includes(PROMISE), `${name} makes a promise`);
      assert.doesNotMatch(text, AI_WITHOUT_LIMIT, name);
    }
  });
});

describe("options", () => {
  const unique = (ids: readonly string[]) => new Set(ids).size === ids.length;

  test("ids are unique and the lists have the documented sizes and order", () => {
    assert.equal(PLATFORMS.length, 5);
    assert.deepEqual(PLATFORM_IDS, ["facebook", "instagram", "google", "nextdoor", "video"]);
    assert.equal(TRADES.length, 13);
    assert.deepEqual(TRADE_IDS, [
      "roofing",
      "hvac",
      "plumbing",
      "electrical",
      "lawn",
      "cleaning",
      "pest",
      "painting",
      "remodeling",
      "handyman",
      "auto",
      "salon",
      "other",
    ]);
    assert.equal(ANGLE_IDS.length, 20);
    assert.deepEqual(ANGLE_IDS, ANGLE_META.map((a) => a.id));
    assert.equal(VOICES.length, 4);
    assert.equal(CTAS.length, 8);
    for (const ids of [PLATFORM_IDS, TRADE_IDS, ANGLE_IDS, CTA_IDS, VOICES.map((v) => v.id)]) assert.ok(unique(ids), ids.join());
    assert.ok(unique(TRADES.map((t) => t.label)));
    assert.ok(unique(ANGLE_META.map((a) => a.label)));
  });

  test("platform caps, and only Google and Instagram show a platform limit", () => {
    assert.deepEqual(
      PLATFORMS.filter((p) => p.limit !== null).map((p) => p.id),
      ["instagram", "google"],
    );
    assert.equal(platformById("google").cap, 1500);
    assert.equal(platformById("video").cap, 150);
    assert.equal(platformById("google").hashtags, 0);
    assert.equal(platformById("nextdoor").hashtags, 0);
    for (const p of PLATFORMS) assert.ok(p.cap > 0 && (p.limit === null || p.limit === p.cap), p.id);
  });

  test("trades carry a hashtag stem, except Something else", () => {
    for (const t of TRADES) {
      if (t.id === "other") assert.equal(t.tag, "");
      else assert.match(t.tag, /^[A-Za-z]{2,40}$/, t.id);
    }
    assert.equal(tradeLabel("hvac"), "Heating and air");
    assert.equal(tradeLabel("other"), "Something else");
  });

  test("the guards accept only known ids", () => {
    assert.equal(isPlatformId("facebook"), true);
    assert.equal(isPlatformId("tiktok"), false);
    assert.equal(isTradeId("salon"), true);
    assert.equal(isTradeId("plumber"), false);
    assert.equal(isTradeId(null), false);
    assert.equal(isVoiceId("playful"), true);
    assert.equal(isVoiceId("angry"), false);
    assert.equal(isCtaId("book"), true);
    assert.equal(isCtaId("mix"), false);
    assert.equal(isCtaChoice("mix"), true);
    assert.equal(isCtaChoice("book"), true);
    assert.equal(isCtaChoice(3), false);
    assert.equal(isAngleId("myth-fact"), true);
    assert.equal(isAngleId("myth_fact"), false);
  });

  test("every label, hint, and brief is clean copy with no digits", () => {
    const texts = [
      ...PLATFORMS.map((p) => p.label),
      ...TRADES.map((t) => t.label),
      ...VOICES.flatMap((v) => [v.label, v.hint]),
      ...CTAS.map((c) => c.label),
      ...ANGLE_META.flatMap((a) => [a.label, a.brief]),
    ];
    for (const text of texts) {
      assert.deepEqual(copyProblems(text), [], text);
      assert.doesNotMatch(text, /\d/, text);
    }
  });
});

describe("profile", () => {
  const TEXT_FIELDS = [
    "businessName",
    "town",
    "tradeLabel",
    "difference",
    "facts",
    "wordsToUse",
    "wordsToAvoid",
    "audience",
    "ctaDetail",
    "samplePost",
  ] as const;

  const good: BrandProfile = {
    ...EMPTY_PROFILE,
    businessName: "Piney Woods Plumbing",
    town: "Longview",
    trade: "plumbing",
    services: ["Drain cleaning", "Water heaters"],
    facts: "Licensed in Texas",
  };

  test("the empty profile is the documented default and parse never shares its list", () => {
    assert.equal(EMPTY_PROFILE.trade, "other");
    assert.equal(EMPTY_PROFILE.voice, "friendly");
    assert.equal(EMPTY_PROFILE.cta, "message");
    assert.deepEqual(EMPTY_PROFILE.services, []);
    for (const field of TEXT_FIELDS) assert.equal(EMPTY_PROFILE[field], "", field);
    for (const raw of [null, undefined, "text", 7, ["a"]]) {
      const p = parseProfile(raw);
      assert.deepEqual(p, EMPTY_PROFILE);
      assert.notEqual(p.services, EMPTY_PROFILE.services);
    }
  });

  test("every field clamps to its limit", () => {
    const raw: Record<string, unknown> = { trade: "plumbing", voice: "direct", cta: "call" };
    for (const field of TEXT_FIELDS) raw[field] = "a".repeat(PROFILE_LIMITS[field] + 25);
    raw.services = Array.from({ length: 8 }, (_, i) => `${i} ${"s".repeat(80)}`);
    const p = parseProfile(raw);
    for (const field of TEXT_FIELDS) assert.equal(p[field].length, PROFILE_LIMITS[field], field);
    assert.equal(p.services.length, PROFILE_LIMITS.services);
    for (const s of p.services) assert.equal(s.length, PROFILE_LIMITS.service);
    assert.equal(p.trade, "plumbing");
    assert.equal(p.voice, "direct");
    assert.equal(p.cta, "call");
  });

  test("bad choices fall back, services are cleaned and deduped, dashes become hyphens", () => {
    const p = parseProfile({
      trade: "plumber",
      voice: "angry",
      cta: "fax",
      businessName: "  Piney Woods \u2014 Plumbing  ",
      facts: "Open 8\u20135 on weekdays\n\n\n\nFamily owned",
      services: ["Drain cleaning", " drain  cleaning ", "", 42, "Water heaters"],
    });
    assert.equal(p.trade, "other");
    assert.equal(p.voice, "friendly");
    assert.equal(p.cta, "message");
    assert.equal(p.businessName, "Piney Woods - Plumbing");
    assert.equal(p.facts, "Open 8-5 on weekdays\n\nFamily owned");
    assert.deepEqual(p.services, ["Drain cleaning", "Water heaters"]);
    assert.deepEqual(parseProfile({ services: "Drain cleaning\nRepipes\n" }).services, ["Drain cleaning", "Repipes"]);
  });

  test("angle brackets and tags are stripped from every field", () => {
    const raw: Record<string, unknown> = { trade: "plumbing" };
    for (const field of TEXT_FIELDS) raw[field] = "<b>Piney</b> Woods > Plumbing";
    raw.services = ["<i>Drain</i> cleaning >"];
    const p = parseProfile(raw);
    for (const field of TEXT_FIELDS) assert.equal(p[field], "Piney Woods Plumbing", field);
    assert.deepEqual(p.services, ["Drain cleaning"]);
    const facts = parseProfile({ facts: "Licensed <script>alert(1)</script>in Texas" }).facts;
    assert.doesNotMatch(facts, /[<>]/);
    assert.doesNotMatch(facts, /script/);
  });

  test("validateProfileInput names the field and says what to fix", () => {
    const ok = validateProfileInput(good);
    assert.deepEqual(ok, { ok: true, profile: parseProfile(good) });

    for (const field of TEXT_FIELDS) {
      const max = PROFILE_LIMITS[field];
      assert.deepEqual(
        validateProfileInput({ ...good, [field]: "a".repeat(max + 1) }),
        { ok: false, field, error: `Keep it under ${max} characters.` },
        field,
      );
      assert.equal(validateProfileInput({ ...good, [field]: "a".repeat(max) }).ok, true, field);
    }

    const six = ["one", "two", "three", "four", "five", "six"].map((s) => `${s} job`);
    assert.deepEqual(validateProfileInput({ ...good, services: six }), { ok: false, field: "services", error: "Up to 5 services." });
    assert.equal(validateProfileInput({ ...good, services: [...six.slice(0, 5), "ONE JOB"] }).ok, true, "a repeat is not a sixth service");
    assert.deepEqual(validateProfileInput({ ...good, services: ["a".repeat(61)] }), {
      ok: false,
      field: "services",
      error: "Keep it under 60 characters.",
    });

    for (const trade of ["plumber", "", null, 3]) {
      assert.deepEqual(validateProfileInput({ ...good, trade }), { ok: false, field: "trade", error: "Pick your trade from the list." });
    }
    const noTrade: Record<string, unknown> = { ...good };
    delete noTrade.trade;
    const fallback = validateProfileInput(noTrade);
    assert.equal(fallback.ok && fallback.profile.trade, "other");

    for (const raw of [null, "profile", []]) assert.equal(validateProfileInput(raw).ok, false);
  });

  test("an email as the call to action detail is turned away with a way forward, since drafts always leave emails out", () => {
    for (const ctaDetail of ["hello@pineywoods.com", "Email us at Hello@PineyWoods.co", "book: jo.smith+jobs@mail.example.org"]) {
      assert.deepEqual(validateProfileInput({ ...good, ctaDetail }), { ok: false, field: "ctaDetail", error: CTA_EMAIL_ERROR }, ctaDetail);
    }
    for (const ctaDetail of ["https://pineywoods.com/book", "Call or text 903-555-0142", "@pineywoodsplumbing on Instagram", ""]) {
      assert.equal(validateProfileInput({ ...good, ctaDetail }).ok, true, ctaDetail);
    }
    assert.deepEqual(copyProblems(CTA_EMAIL_ERROR), []);
    // The same email the drafts would drop: the filter and the form agree.
    assert.ok(postCopyProblems("Email hello@pineywoods.com today.", { text: "hello@pineywoods.com", mask: [] }).includes("contains an email address"));
  });

  test("every profile message is clean copy", () => {
    const messages: string[] = [];
    for (const raw of [null, { ...good, trade: "x" }, { ...good, services: ["a", "b", "c", "d", "e", "f"] }, { ...good, town: "a".repeat(99) }]) {
      const result = validateProfileInput(raw);
      if (!result.ok) messages.push(result.error);
    }
    assert.equal(messages.length, 4);
    for (const m of messages) assert.deepEqual(copyProblems(m), [], m);
  });

  test("profileIsReady needs a name and a trade, in the owner's words for Something else", () => {
    assert.equal(profileIsReady(EMPTY_PROFILE), false);
    assert.equal(profileIsReady(good), true);
    assert.equal(profileIsReady({ ...good, businessName: "  " }), false);
    assert.equal(profileIsReady({ ...good, trade: "other" }), false);
    assert.equal(profileIsReady({ ...good, trade: "other", tradeLabel: "Pool cleaning" }), true);
  });
});

describe("copy rules", () => {
  const facts = (text: string, mask: string[] = []) => ({ text: text.toLowerCase(), mask });
  const flagged = (text: string, allowed = NO_FACTS) => postCopyProblems(text, allowed).length > 0;

  test("cleanOwnerText is one clean line with hyphens for long dashes", () => {
    assert.equal(cleanOwnerText("  Piney\n Woods \u2014 Plumbing \u2013 Longview ", 80), "Piney Woods - Plumbing - Longview");
    assert.equal(cleanOwnerText("<b>Joe</b>", 80), "Joe");
    assert.equal(cleanOwnerText("abcdef", 3), "abc");
    assert.equal(cleanOwnerText(42, 10), "");
    // Every look-alike, and "--", becomes one plain hyphen in what the owner typed.
    for (const dash of ["\u2010", "\u2011", "\u2012", "\u2015", "\u2212", "\u2E3A", "\u2E3B", "\uFE31", "\uFE32", "\uFE58", "\uFE63", "\uFF0D", "--", "---"]) {
      assert.equal(cleanOwnerText(`Piney Woods ${dash} Plumbing`, 80), "Piney Woods - Plumbing", `U+${dash.codePointAt(0)?.toString(16)}`);
    }
  });

  test("postCopyProblems flags every long dash look-alike and '--', not a plain hyphen", () => {
    for (const dash of ["\u2012", "\u2013", "\u2014", "\u2015", "\u2212", "\u2E3A", "\u2E3B", "\uFE31", "\uFE32", "\uFE58", "--", " -- "]) {
      assert.ok(postCopyProblems(`Slow drain${dash}call us today.`).length > 0, `U+${dash.codePointAt(0)?.toString(16)}`);
    }
    assert.deepEqual(postCopyProblems("A well-known fix for a slow drain."), []);
    assert.deepEqual(postCopyProblems("Slow drain\u2014call us today."), ["contains an em or en dash"], "reported once");
    assert.deepEqual(postCopyProblems("Slow drain\u2015call us today."), ["contains a long dash"]);
  });

  test("maskOwnerNames replaces whole names, longest first, ignoring case", () => {
    assert.equal(
      maskOwnerNames("Call BEST ROOFING's crew in Longview.", ["Longview", "Best Roofing", "x"]),
      "Call the business crew in the business.",
    );
    assert.equal(maskOwnerNames("the best plumbers", ["st"]), "the best plumbers");
    assert.equal(maskOwnerNames("AC units and back rooms", ["AC"]), "the business units and back rooms");
  });

  test("the house rules always apply, even inside brackets", () => {
    assert.ok(flagged(`${w("Guar", "anteed")} results every time.`));
    assert.ok(flagged(`We ${PROMISE} it.`, facts(`we ${PROMISE} it`)));
    assert.ok(flagged(`Fill in [${PROMISE} details].`));
    assert.ok(flagged("Fast \u2014 and friendly."));
    assert.ok(flagged("Are you struggling with slow drains?", facts("are you struggling")));
    assert.ok(flagged("Track your ROI this spring."));
    assert.ok(flagged("See a big % increase."));
  });

  test("a claim passes only when the owner wrote it", () => {
    assert.ok(flagged("We are licensed in Texas."));
    assert.deepEqual(postCopyProblems("We are licensed in Texas.", facts("Licensed in Texas")), []);
    assert.ok(flagged("Family owned since 2009."));
    assert.deepEqual(postCopyProblems("Family owned since 2009.", facts("Family-owned since 2009")), []);
    assert.ok(flagged("We offer same day service."));
    assert.deepEqual(postCopyProblems("We offer same day service.", facts("same-day service")), []);
    assert.ok(flagged("We are #1 in town."));
    assert.ok(flagged("Rated 5 star by neighbors."));
    assert.ok(flagged("Five star service."));
    assert.ok(flagged("Don't miss this one."));
    assert.ok(flagged("Don\u2019t miss this one."));
    assert.ok(flagged("Hurry, spots are going."));
  });

  test("the owner's own names are masked before the checks", () => {
    assert.ok(flagged("Call Best Roofing today."));
    assert.deepEqual(postCopyProblems("Call Best Roofing today.", { text: "", mask: ["Best Roofing"] }), []);
    assert.deepEqual(postCopyProblems("Five Star Cleaning is ready.", { text: "", mask: ["Five Star Cleaning"] }), []);
    assert.ok(flagged("The best plumbers around.", { text: "", mask: ["st"] }));
  });

  test("numbers pass only when the owner wrote them, or as small counting words", () => {
    assert.deepEqual(postCopyProblems("Here are 3 tips for slow drains."), []);
    assert.deepEqual(postCopyProblems("Step 2. Check the filter."), []);
    assert.ok(flagged("15 years on the job."));
    assert.deepEqual(postCopyProblems("15 years on the job.", facts("15 years in business")), []);
    assert.ok(flagged("Done in 2 hours."));
    assert.ok(flagged("Over 5+ jobs a week."));
    assert.ok(flagged("Save $5 on a tune up."));
    assert.deepEqual(postCopyProblems("Save $5 on a tune up.", facts("$5 off a tune up this fall")), []);
    assert.deepEqual(postCopyProblems("Tune ups are $1,500 less.", facts("tune up special 1500")), []);
    assert.ok(flagged("A 20% discount."));
  });

  test("emails are always flagged (the Settings help says so); phones and links only when not in the facts", () => {
    assert.ok(flagged("Email owner@example.com with questions."));
    assert.ok(flagged("Email owner@example.com with questions.", facts("owner@example.com")));

    assert.ok(flagged("Call 903-555-0142 today."));
    assert.deepEqual(postCopyProblems("Call 903-555-0142 today.", facts("Call or text 903-555-0142")), []);
    assert.deepEqual(postCopyProblems("Call 903.555.0142.", facts("(903) 555-0142")), []);
    assert.ok(flagged("Call 903.555.0199.", facts("(903) 555-0142")));

    assert.ok(flagged("Book at pineywoodsplumbing.com/book."));
    assert.ok(flagged("Visit www.example.org for more."));
    const link = facts("https://pineywoodsplumbing.com/book");
    assert.deepEqual(postCopyProblems("Book at pineywoodsplumbing.com/book.", link), []);
    assert.deepEqual(postCopyProblems("Book here: https://pineywoodsplumbing.com/book.", link), []);
    assert.ok(flagged("Book here: https://otherplace.com/book.", link));
  });

  test("bracketed blanks are ignored by the claim and number checks", () => {
    assert.deepEqual(postCopyProblems("Our team is [licensed, if true] and ready to help."), []);
    assert.deepEqual(postCopyProblems("We have done [15] of these [this year]."), []);
    assert.deepEqual(postCopyProblems("Book here: [booking link]"), []);
  });

  test("a bracket longer than a blank is checked like any other text", () => {
    const long = "[Rated five stars by 500 neighbors, 25 years in business, call 903-555-0199]";
    assert.ok(long.length > 62);
    assert.ok(postCopyProblems(`Spring is here. ${long} Book a visit.`).length >= 3);
    assert.deepEqual(`a [short blank] b ${long}`.match(blankPattern()), ["[short blank]"]);
    assert.equal(BLANK_SOURCE, "\\[[^\\]\\n]{1,60}\\]");
  });
});

describe("copy rules: the common invented claims", () => {
  const facts = (text: string, mask: string[] = []) => ({ text: text.toLowerCase(), mask });
  const flagged = (text: string, allowed = NO_FACTS) => postCopyProblems(text, allowed).length > 0;

  test("ratings, rank, tenure, offers, promises, crowds, and quotes are claims", () => {
    for (const text of [
      "Smith Plumbing has been clearing them for over fifteen years.",
      "Our neighbors rate us five stars.",
      "Rated five stars by our neighbors.",
      "Top rated plumber in East Texas.",
      "We are the No. 1 plumber in Longview.",
      "The number 1 plumber in Longview.",
      "Book this week for a free camera inspection.",
      "Get a free inspection with every visit.",
      "Book this week and get half off.",
      "Ask about our senior discount.",
      "We promise you will love the results.",
      "Money back if you are not happy.",
      "Trusted by hundreds of local families.",
      "Serving Longview for over two decades.",
      "Drain cleaning for just ninety nine dollars.",
      "Sarah from Kilgore said we saved her kitchen.",
      "Proudly the region's premier plumbing company.",
      "Use our coupon this month.",
    ]) {
      assert.ok(flagged(text), text);
    }
  });

  test("small numbers with a unit, a rank, or a time are claims; plain counts are not", () => {
    for (const text of [
      "Drain cleaning for 9 dollars this week.",
      "9 out of 10 homeowners wait too long to call.",
      "Our 6 trucks cover the whole county.",
      "Open 8 to 5, Monday to Saturday.",
      "Open 7 am to 6 pm.",
      "Rated 5 on Google.",
      "Serving the county for 3 generations.",
      "We have 4 locations in the county.",
      "Our 8 techs are on call.",
    ]) {
      assert.ok(flagged(text), text);
    }
    assert.deepEqual(postCopyProblems("Here are 3 tips for slow drains."), []);
    assert.deepEqual(postCopyProblems("Step 2. Check the filter."), []);
    assert.deepEqual(postCopyProblems("One day your water heater will need a look."), []);
  });

  test("the owner's phone never lets its digit groups through as numbers", () => {
    const phone = facts("Call 903-555-0100");
    assert.deepEqual(postCopyProblems("Call 903-555-0100 today.", phone), []);
    for (const text of ["A 555 point inspection on every visit.", "Over 903 homes served.", "We answer 0100 calls a day."]) {
      assert.ok(flagged(text, phone), text);
    }
  });

  test("the claim words that are everyday phrases pass", () => {
    const owner = facts("Licensed and insured. 15 years in business. Call 903-555-0100", ["Mike's Emergency Plumbing"]);
    for (const text of [
      "Best of all, the fix takes about an hour.",
      "The best way to keep a drain clear is a strainer.",
      "Do your best to keep grease out of the sink.",
      "If you smell gas, leave the house and call the gas company emergency line.",
      "With over 15 years of experience, we know drains.",
      "Mike\u2019s Emergency Plumbing can help.",
      "Mike's Emergency Plumbing can help.",
      "Hands-free faucets are worth a look.",
      "Feel free to message us.",
    ]) {
      assert.deepEqual(postCopyProblems(text, owner), [], text);
    }
    assert.ok(flagged("We offer emergency service all night.", owner), "an emergency service claim is still a claim");
    assert.ok(flagged("With over 20 years of experience, we know drains.", owner), "the number must still match");
    assert.ok(flagged("With 15 years of experience, we know drains."), "no fact, no claim");
  });

  test("a shot line may open with its timing", () => {
    assert.deepEqual(postCopyProblems("0 to 3 seconds: close up of the slow drain"), []);
    assert.deepEqual(postCopyProblems("Shot: 8 to 12 seconds: the clean drain"), []);
    assert.ok(flagged("Close up. 0 to 3 seconds is all it takes to fix."));
  });

  test("a link matches the owner's with or without its scheme and www", () => {
    for (const [owner, draft] of [
      ["smithplumbing.com/book", "Book online at https://smithplumbing.com/book."],
      ["smithplumbing.com", "Book online at www.smithplumbing.com."],
      ["https://www.smithplumbing.com/book", "Book at smithplumbing.com/book today."],
    ]) {
      assert.deepEqual(postCopyProblems(draft, facts(owner)), [], draft);
    }
    assert.ok(flagged("Book at smithplumbing.com/deals today.", facts("smithplumbing.com")), "a path the owner did not write");
  });
});
