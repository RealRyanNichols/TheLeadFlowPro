// Post Creator: the free idea engine.
//
// The page promises an honest count ("229 different post ideas for plumbing")
// and a shuffle that never shows the same idea twice until every idea for the
// settings has come up. These tests pin the library's shape, which angles fit
// which topics (so "Tool talk: how we train new people" is never an idea),
// the counts, the permutation, the no-repeat walk, the remixes, the month
// planner, and the spreadsheet export, all without a clock or a network.

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { copyProblems } from "../lib/hq/copy.ts";
import { postCopyProblems } from "../lib/postCreator/copyRules.ts";
import { ANGLES, angleById, angleFits, anglesForKind } from "../lib/postCreator/ideas/angles.ts";
import { CTA_LINES, ctaLine } from "../lib/postCreator/ideas/ctas.ts";
import {
  VIDEO_CLOSE,
  VIDEO_OPEN,
  cutAtWord,
  draftCopyText,
  fill,
  findBlanks,
  renderDraft,
  seasonForMonth,
  seasonOf,
  videoShotList,
} from "../lib/postCreator/ideas/drafts.ts";
import {
  DEFAULT_INPUT,
  MAX_SIGNATURES,
  buildCores,
  cardAt,
  cardSeason,
  ctasForAngle,
  drawNext,
  ideaSpace,
  inputFromProfile,
  inputSignature,
  makeCard,
  newShuffleState,
  normalizeInput,
  parseShuffleState,
  remixCard,
  tradeWords,
} from "../lib/postCreator/ideas/engine.ts";
import { coprimeStep, fnv1a, gcd, permuteIndex } from "../lib/postCreator/ideas/permute.ts";
import { planDayLabel, planMonth, planToCsv, planToText } from "../lib/postCreator/ideas/plan.ts";
import { SERVICE_TEMPLATES, TRADE_TOPICS, UNIVERSAL_TOPICS, topicId } from "../lib/postCreator/ideas/topics.ts";
import type { CoreRef, EngineInput, IdeaCard, PlanDay, ShuffleState, Topic, TopicKind, TopicTag } from "../lib/postCreator/ideas/types.ts";
import { ANGLE_IDS, ANGLE_META, CTA_IDS, PLATFORMS, PLATFORM_IDS, TRADE_IDS, VOICES, type TradeId } from "../lib/postCreator/options.ts";
import { seasonForMonth as planSeasonForMonth } from "../lib/postCreator/plan.ts";
import { ideaCountLine } from "../lib/postCreator/product.ts";
import { EMPTY_PROFILE } from "../lib/postCreator/profile.ts";

const NAMED_TRADES = TRADE_IDS.filter((t): t is Exclude<TradeId, "other"> => t !== "other");
const KINDS: readonly TopicKind[] = ["problem", "howto", "decision", "work", "team", "story", "local"];
const FALL = new Date(2026, 9, 1, 12);

function input(over: Partial<EngineInput> = {}): EngineInput {
  return normalizeInput({ ...DEFAULT_INPUT, ...over }).input;
}

function kindCounts(topics: readonly Topic[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const t of topics) out[t.kind] = (out[t.kind] ?? 0) + 1;
  return out;
}

/** Every string in the fixed library, with where it came from. */
function libraryStrings(): { where: string; text: string }[] {
  const out: { where: string; text: string }[] = [];
  for (const a of ANGLES) {
    out.push({ where: `${a.id}.label`, text: a.label }, { where: `${a.id}.title`, text: a.title });
    a.hooks.forEach((h, i) => out.push({ where: `${a.id}.hooks[${i}]`, text: h }));
    a.shots.forEach((s, i) => out.push({ where: `${a.id}.shots[${i}]`, text: s }));
    a.body.forEach((b, i) => out.push({ where: `${a.id}.body[${i}]`, text: b }));
  }
  for (const cta of CTA_IDS) for (const v of VOICES) out.push({ where: `cta.${cta}.${v.id}`, text: CTA_LINES[cta][v.id] });
  for (const trade of NAMED_TRADES) for (const t of TRADE_TOPICS[trade]) out.push({ where: `topic.${trade}.${t.id}`, text: t.noun });
  for (const t of UNIVERSAL_TOPICS) out.push({ where: `topic.universal.${t.id}`, text: t.noun });
  SERVICE_TEMPLATES.forEach((t, i) => out.push({ where: `service[${i}]`, text: t.template }));
  out.push({ where: "video.open", text: VIDEO_OPEN }, { where: "video.close", text: VIDEO_CLOSE });
  for (const a of ANGLES) out.push({ where: `${a.id}.clip`, text: a.clip });
  return out;
}

/** Draw n cards in a row from a fresh state. */
function drawMany(inp: EngineInput, seed: number, n: number): { cards: IdeaCard[]; wrapped: boolean[]; state: ShuffleState } {
  let state = newShuffleState(seed);
  const cards: IdeaCard[] = [];
  const wrapped: boolean[] = [];
  for (let i = 0; i < n; i++) {
    const next = drawNext(inp, state, FALL);
    cards.push(next.card);
    wrapped.push(next.wrapped);
    state = next.state;
  }
  return { cards, wrapped, state };
}

describe("library shape", () => {
  test("twelve named trades with sixteen topics each: five problems, four how-tos, three decisions, four looks at the work", () => {
    assert.deepEqual(Object.keys(TRADE_TOPICS), NAMED_TRADES);
    assert.equal(NAMED_TRADES.length, 12);
    for (const trade of NAMED_TRADES) {
      const list = TRADE_TOPICS[trade];
      assert.equal(list.length, 16, trade);
      assert.deepEqual(kindCounts(list), { problem: 5, howto: 4, decision: 3, work: 4 }, trade);
      // Listed problem ; howto ; decision ; work, in that order.
      assert.deepEqual(
        list.map((t) => t.kind),
        [...Array(5).fill("problem"), ...Array(4).fill("howto"), ...Array(3).fill("decision"), ...Array(4).fill("work")],
        trade,
      );
    }
  });

  test("twenty six universal topics and six service templates", () => {
    assert.equal(UNIVERSAL_TOPICS.length, 26);
    assert.deepEqual(kindCounts(UNIVERSAL_TOPICS), { team: 6, story: 4, local: 4, work: 6, decision: 3, howto: 3 });
    assert.equal(SERVICE_TEMPLATES.length, 6);
    assert.deepEqual(
      SERVICE_TEMPLATES.map((t) => t.kind),
      ["problem", "howto", "decision", "decision", "work", "work"],
    );
    for (const t of SERVICE_TEMPLATES) assert.equal(t.template.split("{s}").length, 2, t.template);
  });

  test("topic ids are the noun as a slug and unique within each list", () => {
    const lists: [string, readonly Topic[]][] = [...NAMED_TRADES.map((t) => [t, TRADE_TOPICS[t]] as [string, readonly Topic[]]), ["universal", UNIVERSAL_TOPICS]];
    for (const [name, list] of lists) {
      const ids = list.map((t) => t.id);
      assert.equal(new Set(ids).size, ids.length, `${name} has a repeated topic id`);
      for (const t of list) {
        assert.match(t.id, /^[a-z0-9]+(-[a-z0-9]+)*$/, t.id);
        assert.equal(t.id, topicId(t.noun));
      }
    }
    assert.equal(topicId("dry, brittle hair"), "dry-brittle-hair");
    assert.equal(topicId("what is in an HVAC tech's truck"), "what-is-in-an-hvac-techs-truck");
  });

  test("ANGLES follow ANGLE_IDS, take their labels from ANGLE_META, and have four hooks, two shots, and a short body", () => {
    assert.deepEqual(
      ANGLES.map((a) => a.id),
      [...ANGLE_IDS],
    );
    assert.deepEqual(
      ANGLES.map((a) => a.label),
      ANGLE_META.map((m) => m.label),
    );
    for (const a of ANGLES) {
      assert.equal(a.hooks.length, 4, a.id);
      assert.equal(new Set(a.hooks).size, 4, `${a.id} repeats a hook`);
      assert.equal(a.shots.length, 2, a.id);
      assert.ok(a.body.length >= 1 && a.body.length <= 3, `${a.id} body has ${a.body.length} lines`);
      const blanks = a.body.reduce((n, line) => n + findBlanks(line).length, 0);
      assert.ok(blanks <= 2, `${a.id} body has ${blanks} blanks`);
      assert.ok(a.kinds.length >= 1);
      assert.equal(angleById(a.id), a);
      // The short video's middle shot is the angle's own, with one blank.
      assert.ok(a.clip.startsWith("Shot: "), a.id);
      assert.equal(findBlanks(a.clip).length, 1, a.id);
      // Its calls to action are real ones, each once.
      assert.ok(a.ctas.length >= 1 && a.ctas.every((c) => CTA_IDS.includes(c)), a.id);
      assert.equal(new Set(a.ctas).size, a.ctas.length, a.id);
      for (const kind of Object.keys(a.needs ?? {})) assert.ok(a.kinds.includes(kind as TopicKind), `${a.id} needs something of a kind it never takes`);
    }
    assert.equal(new Set(ANGLES.map((a) => a.clip)).size, ANGLES.length, "every angle has its own clip");
  });

  test("angle fit per kind is 10, 8, 8, 7, 5, 2, 2: forty two pairs before the tags", () => {
    const fit = Object.fromEntries(KINDS.map((k) => [k, anglesForKind(k).length]));
    assert.deepEqual(fit, { problem: 10, howto: 8, decision: 8, work: 7, team: 5, story: 2, local: 2 });
    assert.equal(
      KINDS.reduce((n, k) => n + anglesForKind(k).length, 0),
      42,
    );
  });

  test("tags and seasons are real, and each tag sits on topics of the kind that uses it", () => {
    const TAGS: readonly TopicTag[] = ["visible", "gear", "visit", "choice", "early", "self", "trade"];
    const SEASONS = ["winter", "spring", "summer", "fall"];
    const all = [...NAMED_TRADES.flatMap((t) => TRADE_TOPICS[t]), ...UNIVERSAL_TOPICS];
    for (const t of all) {
      for (const tag of t.tags ?? []) assert.ok(TAGS.includes(tag), `${t.noun}: ${tag}`);
      for (const season of t.seasons ?? []) assert.ok(SEASONS.includes(season), `${t.noun}: ${season}`);
      if (t.seasons) assert.ok(t.seasons.length >= 1 && (t.kind === "problem" || t.kind === "howto"), `${t.noun} has seasons`);
      if (t.tags?.includes("gear") || t.tags?.includes("visit")) assert.equal(t.kind, "work", `${t.noun}`);
      if (t.tags?.includes("choice")) assert.equal(t.kind, "decision", `${t.noun}`);
      if (t.tags?.includes("early")) assert.equal(t.kind, "problem", `${t.noun}`);
      // A "choice" names two options.
      if (t.tags?.includes("choice")) assert.match(t.noun, / or /, t.noun);
    }
    // Every named trade has a before and after to show, a choice, a visit to walk through, and something seasonal.
    for (const trade of NAMED_TRADES) {
      const list = TRADE_TOPICS[trade];
      for (const tag of ["visible", "choice", "visit"] as const) assert.ok(list.some((t) => t.tags?.includes(tag)), `${trade} has a ${tag} topic`);
      assert.ok(list.some((t) => t.seasons?.length), `${trade} has a seasonal topic`);
    }
  });

  test("templates use only {topic}, {Topic}, {season}, and {Season}; topics use no braces; services use only {s}", () => {
    const allowed = new Set(["{topic}", "{Topic}", "{season}", "{Season}"]);
    for (const a of ANGLES) {
      for (const text of [a.title, ...a.hooks, ...a.shots, ...a.body]) {
        for (const brace of text.match(/[{}][^{}]*[{}]?/g) ?? []) assert.ok(allowed.has(brace), `${a.id}: "${brace}" in "${text}"`);
        assert.equal(text.replace(/\{(topic|Topic|season|Season)\}/g, "").replace(/[^{}]/g, ""), "", text);
      }
    }
    for (const cta of CTA_IDS) for (const v of VOICES) assert.doesNotMatch(CTA_LINES[cta][v.id], /[{}]/);
    for (const { where, text } of libraryStrings()) {
      if (where.startsWith("topic.")) assert.doesNotMatch(text, /[{}]/, where);
      if (where.startsWith("service[")) assert.equal(text.replace("{s}", "").replace(/[^{}]/g, ""), "", where);
    }
  });

  test("no library string has a digit, and every one passes the copy rules", () => {
    const strings = libraryStrings();
    assert.ok(strings.length > 400);
    for (const { where, text } of strings) {
      assert.doesNotMatch(text, /\d/, where);
      assert.deepEqual(copyProblems(text), [], where);
      assert.deepEqual(postCopyProblems(text), [], `${where}: ${text}`);
    }
  });

  test("every call to action line exists in all four voices", () => {
    assert.deepEqual(Object.keys(CTA_LINES), [...CTA_IDS]);
    for (const cta of CTA_IDS) {
      assert.deepEqual(Object.keys(CTA_LINES[cta]), VOICES.map((v) => v.id));
      for (const v of VOICES) assert.equal(ctaLine(cta, v.id), CTA_LINES[cta][v.id]);
    }
    assert.equal(ctaLine("book", "direct"), "Book here: [booking link]");
  });
});

/** Every core's own card count: four first lines, two photo ideas, and each fitting call to action on "Mix it up". */
function remixesOf(core: CoreRef, inp: EngineInput): number {
  return inp.cta === "mix" ? 8 * ctasForAngle(angleById(core.angle)).length : 8;
}

/** Cores with no services, per trade. Each service adds SERVICE_CORES more. */
const BASE_CORES: Record<TradeId, number> = {
  roofing: 238,
  hvac: 233,
  plumbing: 229,
  electrical: 227,
  lawn: 238,
  cleaning: 227,
  pest: 230,
  painting: 230,
  remodeling: 229,
  handyman: 226,
  auto: 225,
  salon: 229,
  other: 72,
};
const SERVICE_CORES = 38;

describe("counting", () => {
  test("ideaSpace matches the pinned table exactly", () => {
    const rows: [Partial<EngineInput>, number, number, number][] = [
      [{ trade: "plumbing" }, 229, 13_136, 17],
      [{ trade: "other" }, 72, 3_600, 5],
      [{ trade: "plumbing", services: ["drain cleaning", "water heaters", "repipes"] }, 343, 19_952, 26],
      [{ trade: "plumbing", services: ["a", "b", "c", "d", "e"], cta: "call" }, 419, 3_352, 32],
    ];
    for (const [over, cores, cards, months] of rows) {
      const inp = input(over);
      const space = ideaSpace(inp);
      assert.equal(space.coreCount, cores, JSON.stringify(over));
      assert.equal(space.cardCount, cards, JSON.stringify(over));
      assert.equal(space.monthsAtThreeAWeek, months, JSON.stringify(over));
      const built = buildCores(inp);
      assert.equal(built.length, cores);
      assert.equal(
        built.reduce((n, c) => n + remixesOf(c, inp), 0),
        cards,
        "the card count adds up each core's own remixes",
      );
    }
  });

  test("C = the trade's base + 38 per service, for every trade", () => {
    const pool = ["one", "two", "three", "four", "five"];
    for (let s = 0; s <= 5; s++) {
      const services = pool.slice(0, s);
      for (const trade of TRADE_IDS) assert.equal(ideaSpace(input({ trade, services })).coreCount, BASE_CORES[trade] + SERVICE_CORES * s, `${trade} ${s}`);
    }
  });

  test("every core is an angle that fits its topic, and the misfits a reviewer found are gone", () => {
    for (const trade of TRADE_IDS) {
      const cores = buildCores(input({ trade, services: ["tile"] }));
      for (const c of cores) assert.ok(angleFits(angleById(c.angle), c.topic), c.key);
      const ids = new Set(cores.map((c) => c.key));
      for (const c of cores) {
        const a = angleById(c.angle);
        const tags = c.topic.tags ?? [];
        if (a.id === "before-after") assert.ok(tags.includes("visible"), c.key);
        if (a.id === "tool-talk") assert.ok(tags.includes("gear"), c.key);
        if (a.id === "this-or-that") assert.ok(tags.includes("choice"), c.key);
        if (a.id === "warning-signs") assert.ok(tags.includes("early"), c.key);
        if (a.id === "heads-up") assert.ok(c.topic.seasons?.length, c.key);
        if (a.id === "thank-you") assert.ok(!tags.includes("self"), c.key);
        if (a.id === "what-to-expect" && c.topic.kind === "work") assert.ok(tags.includes("visit"), c.key);
        if (a.id === "quick-tip" || a.id === "day-on-job") assert.ok(!tags.includes("gear"), c.key);
      }
      assert.equal(ids.size, cores.length);
      // "Something else" could be a bakery: nothing that assumes a service trade.
      if (trade === "other") assert.ok(cores.every((c) => !c.topic.tags?.includes("trade")), "other has no trade-only topics");
      else assert.ok(cores.some((c) => c.key === "u:hiring-a-pro-in-our-trade|myth-fact"));
    }
    const titles = (trade: TradeId) =>
      new Set(buildCores(input({ trade, services: ["balayage"] })).map((c) => makeCard(c, input({ trade }), { hookIdx: 0, shotIdx: 0, ctaIdx: 0 }, undefined, FALL).title));
    const misfits: [TradeId, string][] = [
      ["plumbing", "Tool talk: how we train new people"],
      ["plumbing", "Tool talk: what happens after you reach out"],
      ["plumbing", "Tool talk: what we check before we call it done"],
      ["plumbing", "Before and after: how we plan a busy day"],
      ["plumbing", "Before and after: how we train new people"],
      ["auto", "Before and after: the tools in the bay"],
      ["roofing", "Before and after: what a roof inspection looks like"],
      ["hvac", "Quick tip: what is in an HVAC tech's truck"],
      ["handyman", "What to expect: what is in the tool bag"],
      ["hvac", "This or that: heat pumps"],
      ["roofing", "This or that: roof inspections"],
      ["auto", "Warning signs: a check engine light"],
      ["cleaning", "Warning signs: pet hair on furniture"],
      ["plumbing", "Thank you: the owner"],
      ["hvac", "Fall heads-up: keeping records of work done"],
      ["hvac", "Fall heads-up: describing the problem when you reach out"],
      ["salon", "Myth vs fact: problems that call for balayage"],
      ["salon", "This or that: balayage"],
    ];
    for (const [trade, title] of misfits) assert.ok(!titles(trade).has(title), `${trade}: ${title}`);
    // The good pairings are still there.
    for (const [trade, title] of [
      ["hvac", "Tool talk: what is in an HVAC tech's truck"],
      ["hvac", "Before and after: cleaning a condenser coil"],
      ["plumbing", "This or that: tank or tankless water heaters"],
      ["plumbing", "Warning signs: slow drains"],
      ["plumbing", "Thank you: the crew"],
    ] as [TradeId, string][]) {
      assert.ok(titles(trade).has(title), `${trade}: ${title}`);
    }
  });

  test("core keys are unique and follow the key formats", () => {
    const cores = buildCores(input({ trade: "roofing", services: ["Metal Roofs", "gutters"] }));
    assert.equal(new Set(cores.map((c) => c.key)).size, cores.length);
    assert.equal(cores[0].key, "t:roofing:missing-shingles|quick-tip");
    assert.equal(cores[0].source, "trade");
    const universal = cores.find((c) => c.source === "universal");
    assert.equal(universal?.key, "u:the-owner|behind-scenes");
    const service = cores.filter((c) => c.source === "service");
    assert.equal(service.length, 2 * SERVICE_CORES);
    const hash = fnv1a("gutters").toString(36);
    assert.equal(service[0].key, `s:${hash}:0|quick-tip`);
    assert.equal(service[0].topic.noun, "signs it is time for gutters");
    assert.ok(service.some((c) => c.key === `s:${fnv1a("metal roofs").toString(36)}:2|cost-factors` && c.topic.noun === "Metal Roofs"));
    // What a service looks like is not known: no before and after, tool talk, or heads-up on it.
    assert.ok(service.every((c) => !["before-after", "tool-talk", "heads-up", "this-or-that", "warning-signs"].includes(c.angle)));
  });

  test("the signature ignores service case and order, and so does the core order", () => {
    const a = input({ trade: "hvac", services: ["Duct Cleaning", "heat pumps"] });
    const b = input({ trade: "hvac", services: ["heat pumps", "duct cleaning"] });
    assert.equal(inputSignature(a), "hvac|duct cleaning,heat pumps");
    assert.equal(inputSignature(a), inputSignature(b));
    assert.deepEqual(
      buildCores(a).map((c) => c.key),
      buildCores(b).map((c) => c.key),
    );
  });

  test("tradeWords and the count line read naturally", () => {
    assert.equal(tradeWords("other"), "your business");
    assert.equal(tradeWords("hvac"), "heating and air");
    assert.equal(tradeWords("plumbing"), "plumbing");
    assert.equal(tradeWords("handyman"), "handyman work");
    assert.equal(tradeWords("electrical"), "electrical work");
    assert.equal(tradeWords("salon"), "a salon or barbershop");
    for (const trade of TRADE_IDS) {
      assert.ok(tradeWords(trade).length > 3, trade);
      assert.doesNotMatch(`ideas for ${tradeWords(trade)} with these settings`, /for (handyman|electrical|salon and barber) with/, trade);
    }
    const line = ideaCountLine(ideaSpace(input({ trade: "plumbing" })), tradeWords("plumbing"));
    assert.ok(line.startsWith("229 different post ideas for plumbing"), line);
    assert.ok(line.includes("13,136 ways"), line);
  });
});

describe("permutation", () => {
  test("fnv1a is 32-bit FNV-1a", () => {
    assert.equal(fnv1a(""), 0x811c9dc5);
    assert.equal(fnv1a("a"), 0xe40c292c);
    assert.equal(fnv1a("foobar"), 0xbf9cf968);
    assert.ok(Number.isInteger(fnv1a("plumbing|")) && fnv1a("plumbing|") >= 0);
  });

  test("gcd and coprimeStep", () => {
    assert.equal(gcd(12, 18), 6);
    assert.equal(gcd(7, 64), 1);
    assert.equal(gcd(7, 8), 1);
    assert.equal(gcd(0, 5), 5);
    assert.equal(coprimeStep(1, 99), 1);
    assert.equal(coprimeStep(2, 99), 1);
    for (const size of [3, 10, 142, 280, 430, 530, 700]) {
      for (const key of [0, 1, 0xffffffff, 2_654_435_761]) {
        const s = coprimeStep(size, key);
        assert.ok(s >= 1 && s <= size - 1, `${size} ${key}`);
        assert.equal(gcd(s, size), 1);
      }
    }
  });

  test("permuteIndex is a bijection for every size from 1 to 700 with three keys", () => {
    for (const key of [0, 0x9e3779b9, 0xffffffff]) {
      for (let size = 1; size <= 700; size++) {
        const seen = new Uint8Array(size);
        for (let p = 0; p < size; p++) {
          const i = permuteIndex(p, size, key);
          assert.ok(i >= 0 && i < size);
          if (seen[i]) assert.fail(`size ${size} key ${key}: ${i} twice`);
          seen[i] = 1;
        }
      }
    }
  });
});

describe("drawNext", () => {
  test("no core repeats within C draws, and positions count 1 to C", () => {
    for (const over of [{ trade: "plumbing" as const }, { trade: "other" as const, services: ["tile", "grout sealing"] }]) {
      const inp = input(over);
      const size = ideaSpace(inp).coreCount;
      const { cards } = drawMany(inp, 42, size);
      assert.equal(new Set(cards.map((c) => c.coreKey)).size, size);
      assert.deepEqual(
        cards.map((c) => c.position),
        Array.from({ length: size }, (_, i) => i + 1),
      );
      assert.ok(cards.every((c) => c.lap === 0));
    }
  });

  test("exhaustive: other, no services, a fixed call to action gives 576 distinct cards, then the cycle starts over", () => {
    const inp = input({ trade: "other", cta: "call" });
    const space = ideaSpace(inp);
    assert.equal(space.cardCount, 576);
    const { cards } = drawMany(inp, 7, space.cardCount + 20);
    const first = cards.slice(0, space.cardCount);
    assert.equal(new Set(first.map((c) => c.key)).size, space.cardCount);
    assert.ok(first.every((c) => c.cta === "call" && c.ctaIdx === CTA_IDS.indexOf("call")));
    for (let i = 0; i < 20; i++) assert.equal(cards[space.cardCount + i].key, cards[i].key);
  });

  test("plumbing with a mix: 20,000 draws, no card twice before every core has used all its remixes, wrapped exactly at each lap", () => {
    const inp = input({ trade: "plumbing" });
    const space = ideaSpace(inp);
    const size = space.coreCount;
    const { cards, wrapped } = drawMany(inp, 20_260_924, 20_000);
    // A core takes 48 remixes (six calls to action) or 64 (all eight). For the
    // first 48 laps nothing repeats; by lap 64 every card has come up once.
    const cores = buildCores(inp);
    const remixes = new Map(cores.map((c) => [c.key, remixesOf(c, inp)]));
    assert.deepEqual([...new Set(remixes.values())].sort((a, b) => a - b), [48, 64]);
    const early = cards.slice(0, size * 48);
    assert.equal(new Set(early.map((c) => c.key)).size, early.length);
    const full = cards.slice(0, size * 64);
    assert.equal(new Set(full.map((c) => c.key)).size, space.cardCount);
    // A core comes back to the same card after exactly its own remix count of laps.
    for (let i = 0; i < cards.length; i++) {
      const back = size * (remixes.get(cards[i].coreKey) ?? 0);
      if (i >= back) assert.equal(cards[i].key, cards[i - back].key, `draw ${i}`);
    }
    for (let i = 0; i < cards.length; i++) {
      assert.equal(wrapped[i], i > 0 && i % size === 0, `draw ${i}`);
      assert.equal(cards[i].lap, Math.floor(i / size));
      assert.equal(cards[i].position, (i % size) + 1);
    }
    // Every lap after the first brings each core back with a different first line.
    const hooksByCore = new Map<string, number[]>();
    for (const c of cards) hooksByCore.set(c.coreKey, [...(hooksByCore.get(c.coreKey) ?? []), c.hookIdx]);
    for (const [core, hooks] of hooksByCore) {
      for (let lap = 1; lap < hooks.length; lap++) assert.notEqual(hooks[lap], hooks[lap - 1], core);
    }
  });

  test("the same seed gives the same order; another seed gives another", () => {
    const inp = input({ trade: "lawn", services: ["aeration"] });
    const a = drawMany(inp, 99, 60).cards.map((c) => c.key);
    const b = drawMany(inp, 99, 60).cards.map((c) => c.key);
    const c = drawMany(inp, 100, 60).cards.map((c) => c.key);
    assert.deepEqual(a, b);
    assert.notDeepEqual(a, c);
  });

  test("a card has its angle, topic, filled wording, and a matching call to action", () => {
    const inp = input({ trade: "pest", voice: "playful" });
    const { card } = drawNext(inp, newShuffleState(3), FALL);
    const a = angleById(card.angle);
    assert.equal(card.angleLabel, a.label);
    assert.equal(card.title, fill(a.title, { topic: card.topic, season: "fall" }));
    assert.equal(card.hook, fill(a.hooks[card.hookIdx], { topic: card.topic, season: "fall" }));
    assert.equal(card.shot, a.shots[card.shotIdx]);
    assert.equal(card.cta, CTA_IDS[card.ctaIdx]);
    assert.equal(card.ctaLine, ctaLine(card.cta, "playful"));
    assert.equal(card.key, `${card.coreKey}#h${card.hookIdx}s${card.shotIdx}c${card.ctaIdx}`);
    assert.doesNotMatch(`${card.title} ${card.hook} ${card.shot} ${card.ctaLine}`, /[{}]/);
  });

  test("each set of settings keeps its own place, the state is never mutated, and cardAt repeats a draw", () => {
    const plumbing = input({ trade: "plumbing" });
    const roofing = input({ trade: "roofing" });
    const start = newShuffleState(5);
    const one = drawNext(plumbing, start, FALL);
    assert.deepEqual(start.cursors, {});
    const two = drawNext(roofing, one.state, FALL);
    const three = drawNext(plumbing, two.state, FALL);
    assert.deepEqual(three.state.cursors, { "plumbing|": 2, "roofing|": 1 });
    assert.equal(three.card.position, 2);
    assert.equal(cardAt(plumbing, start, 0, FALL).key, one.card.key);
    assert.equal(cardAt(plumbing, start, 1, FALL).key, three.card.key);
    // Case and order of services do not start a new shuffle.
    const s1 = drawNext(input({ trade: "auto", services: ["Brakes", "tires"] }), start, FALL);
    const s2 = drawNext(input({ trade: "auto", services: ["TIRES", "brakes"] }), s1.state, FALL);
    assert.equal(s2.card.position, 2);
  });

  test(`at most ${MAX_SIGNATURES} settings keep their place, oldest dropped first`, () => {
    let state = newShuffleState(1);
    for (let i = 0; i < MAX_SIGNATURES + 5; i++) state = drawNext(input({ trade: "handyman", services: [`fence ${String.fromCharCode(97 + (i % 26))}${i >= 26 ? "x" : ""}${i >= 52 ? "y" : ""}`] }), state, FALL).state;
    const keys = Object.keys(state.cursors);
    assert.equal(keys.length, MAX_SIGNATURES);
    assert.ok(!keys.includes("handyman|fence a"), "the oldest was dropped");
    assert.ok(keys.includes("handyman|fence cxy"), "the newest was kept");
  });

  test("the seasonal angle names a season the topic matters in: now if it does, else the next one", () => {
    const JAN = new Date(2027, 0, 15, 12);
    const JUL = new Date(2027, 6, 15, 12);
    const headsUp = (trade: TradeId, noun: string) => {
      const inp = input({ trade });
      const core = buildCores(inp).find((c) => c.angle === "heads-up" && c.topic.noun === noun);
      assert.ok(core, `${trade}: ${noun}`);
      return (now: Date, hookIdx = 0) => makeCard(core, inp, { hookIdx, shotIdx: 0, ctaIdx: 0 }, undefined, now);
    };
    const pipes = headsUp("plumbing", "protecting pipes in cold weather");
    assert.equal(pipes(JAN).title, "Winter heads-up: protecting pipes in cold weather");
    assert.equal(pipes(JAN).hook, "Winter is a good time to think about protecting pipes in cold weather.");
    // Never "This summer, keep an eye on protecting pipes in cold weather."
    assert.equal(pipes(JUL).title, "Fall heads-up: protecting pipes in cold weather");
    assert.equal(pipes(JUL, 2).hook, "Something to think about this fall: protecting pipes in cold weather.");
    assert.equal(pipes(JUL).season, "fall");
    const mowing = headsUp("lawn", "mowing height");
    assert.equal(mowing(JAN).title, "Spring heads-up: mowing height");
    assert.equal(mowing(JUL).title, "Summer heads-up: mowing height");
    const ac = headsUp("hvac", "an AC that runs but does not cool");
    assert.equal(ac(JAN, 1).hook, "A summer heads-up about an AC that runs but does not cool.");
    // The draft's body says the same season as the title.
    const inp = input({ trade: "plumbing" });
    assert.ok(renderDraft(pipes(JUL), inp, "facebook").text.includes("[what to watch for this fall]"));
    assert.equal(cardSeason({ seasons: ["winter"] }, JUL), "winter");
    assert.equal(cardSeason({}, JUL), "summer");
    // Other angles use the date's season.
    const tip = makeCard(buildCores(inp).find((c) => c.key === "t:plumbing:protecting-pipes-in-cold-weather|quick-tip")!, inp, { hookIdx: 0, shotIdx: 0, ctaIdx: 0 }, undefined, JUL);
    assert.equal(tip.season, "summer");
    // Topics with no season in them never get a heads-up.
    for (const trade of TRADE_IDS) {
      for (const c of buildCores(input({ trade, services: ["tile"] }))) if (c.angle === "heads-up") assert.ok(c.topic.seasons?.length, c.key);
    }
  });

  test("calls to action fit the angle: no save or share after a thank you, a story, or a question", () => {
    for (const trade of ["plumbing", "salon", "other"] as const) {
      const inp = input({ trade });
      const { cards } = drawMany(inp, 5, 3000);
      for (const card of cards) assert.ok(ctasForAngle(angleById(card.angle)).includes(card.cta), `${card.title}: ${card.cta}`);
      const people = cards.filter((c) => ["thank-you", "our-story", "meet-team", "local-love", "your-turn", "behind-scenes", "day-on-job"].includes(c.angle));
      assert.ok(people.length > 100);
      assert.ok(people.every((c) => c.cta !== "save" && c.cta !== "share"));
      if (trade !== "other") assert.ok(cards.some((c) => c.angle === "checklist" && c.cta === "save"), "a checklist can still be saved");
    }
    // No reach-out line asks for a question or an answer the post never asked for, or promises round-the-clock service.
    for (const cta of CTA_IDS) {
      for (const v of VOICES) assert.doesNotMatch(CTA_LINES[cta][v.id], /your question|your answer|any time|anytime|talk it through/i, `${cta}.${v.id}`);
    }
  });
});

describe("remixCard", () => {
  test("each part cycles through all its options and comes back around", () => {
    const inp = input({ trade: "salon", voice: "direct" });
    const { card } = drawNext(inp, newShuffleState(11), FALL);
    const cycles: ["hook" | "shot" | "cta", number][] = [
      ["hook", 4],
      ["shot", 2],
      ["cta", 8],
    ];
    for (const [part, all] of cycles) {
      const size = part === "cta" ? ctasForAngle(angleById(card.angle)).length : all;
      let current = card;
      const seen = new Set<string>();
      for (let i = 0; i < size; i++) {
        seen.add(part === "hook" ? current.hook : part === "shot" ? current.shot : current.ctaLine);
        const next = remixCard(current, inp, part);
        assert.equal(next.coreKey, card.coreKey);
        assert.equal(next.title, card.title);
        assert.equal(next.position, card.position);
        assert.notEqual(next.key, current.key);
        current = next;
      }
      assert.equal(seen.size, size, part);
      assert.equal(current.key, card.key, `${part} came back around`);
      assert.equal(current.hook, card.hook);
      assert.equal(current.shot, card.shot);
      assert.equal(current.ctaLine, card.ctaLine);
    }
    const swapped = remixCard(card, inp, "cta");
    assert.equal(swapped.ctaLine, ctaLine(swapped.cta, "direct"));
    assert.equal(swapped.hook, card.hook);
    // A thank you never cycles into "Save this post", even from a fixed choice that does not fit.
    const thanks = buildCores(input({ trade: "salon" })).find((c) => c.angle === "thank-you")!;
    let t = makeCard(thanks, inp, { hookIdx: 0, shotIdx: 0, ctaIdx: CTA_IDS.indexOf("save") }, undefined, FALL);
    for (let i = 0; i < 8; i++) {
      t = remixCard(t, inp, "cta");
      assert.ok(t.cta !== "save" && t.cta !== "share", t.cta);
    }
  });
});

describe("normalizeInput", () => {
  test("cleans and clamps owner text and reports the fields that ran long", () => {
    const { input: n, problems } = normalizeInput({
      trade: "painting",
      businessName: `  <b>Brush</b> \u2014 Co ${"x".repeat(100)}`,
      town: "Tyler",
      services: ["Cabinets", "cabinets", "", `  trim\u2013work  `, "doors", "fences", "decks", "sheds"],
      voice: "loud",
      cta: "shout",
    });
    assert.equal(n.trade, "painting");
    assert.ok(n.businessName.startsWith("Brush - Co x"));
    assert.equal(n.businessName.length, 80);
    assert.equal(n.town, "Tyler");
    assert.deepEqual(n.services, ["Cabinets", "trim-work", "doors", "fences", "decks"]);
    assert.equal(n.voice, "friendly");
    assert.equal(n.cta, "mix");
    assert.deepEqual(problems, [
      { field: "businessName", message: "Keep it under 80 characters." },
      { field: "services", message: "Up to 5 services." },
    ]);
  });

  test("junk falls back to the defaults, one-per-line services work, and it is idempotent", () => {
    assert.deepEqual(normalizeInput(null), { input: DEFAULT_INPUT, problems: [] });
    assert.deepEqual(normalizeInput("plumbing").input, DEFAULT_INPUT);
    const { input: n, problems } = normalizeInput({ trade: "hvac", services: "duct cleaning\nheat pumps\n\n", cta: "text", voice: "professional" });
    assert.deepEqual(problems, []);
    assert.deepEqual(n.services, ["duct cleaning", "heat pumps"]);
    assert.equal(n.cta, "text");
    assert.deepEqual(normalizeInput(n).input, n);
    const long = normalizeInput({ town: "t".repeat(61), services: ["s".repeat(61)] });
    assert.deepEqual(long.problems, [
      { field: "town", message: "Keep it under 60 characters." },
      { field: "services", message: "Keep it under 60 characters." },
    ]);
    assert.equal(long.input.services[0].length, 60);
    // A service sits mid-sentence, so trailing punctuation comes off.
    assert.deepEqual(normalizeInput({ services: ["Drain cleaning.", "drain cleaning", "tile, "] }).input.services, ["Drain cleaning", "tile"]);
  });

  test("inputFromProfile uses the saved profile with its fixed call to action", () => {
    const n = inputFromProfile({ ...EMPTY_PROFILE, businessName: "Piney Woods Plumbing", town: "Longview", trade: "plumbing", services: ["drain cleaning"], voice: "direct", cta: "call" });
    assert.deepEqual(n, { trade: "plumbing", businessName: "Piney Woods Plumbing", town: "Longview", services: ["drain cleaning"], voice: "direct", cta: "call" });
    assert.equal(ideaSpace(n).cardCount, ideaSpace(n).coreCount * 8);
  });
});

describe("parseShuffleState", () => {
  test("rejects junk", () => {
    const junk: unknown[] = [
      null,
      undefined,
      5,
      "x",
      "{",
      "[]",
      [],
      {},
      { v: 2, seed: 1, cursors: {} },
      { v: 1, seed: -1, cursors: {} },
      { v: 1, seed: 1.5, cursors: {} },
      { v: 1, seed: 2 ** 32, cursors: {} },
      { v: 1, seed: "5", cursors: {} },
      { v: 1, seed: 5, cursors: null },
      { v: 1, seed: 5, cursors: [] },
      { v: 1, seed: 5 },
    ];
    for (const raw of junk) assert.equal(parseShuffleState(raw), null, JSON.stringify(raw));
  });

  test("accepts a saved state or its JSON, and drops bad cursors", () => {
    const good: ShuffleState = { v: 1, seed: 123, cursors: { "plumbing|": 4, "other|tile": 0 } };
    assert.deepEqual(parseShuffleState(good), good);
    assert.deepEqual(parseShuffleState(JSON.stringify(good)), good);
    const messy = parseShuffleState(
      '{"v":1,"seed":9,"cursors":{"plumbing|":3,"roofing|":-1,"lawn|":2.5,"auto|":"4","__proto__":7,"nope":1,"salon|":1e20}}',
    );
    assert.deepEqual(messy, { v: 1, seed: 9, cursors: { "plumbing|": 3 } });
    assert.equal(Object.getPrototypeOf(messy?.cursors), Object.prototype);
    const many: Record<string, number> = {};
    for (let i = 0; i < 60; i++) many[`other|s${String.fromCharCode(65 + i)}`] = i;
    const kept = parseShuffleState({ v: 1, seed: 1, cursors: many });
    assert.equal(Object.keys(kept?.cursors ?? {}).length, MAX_SIGNATURES);
    assert.equal(kept?.cursors[`other|s${String.fromCharCode(65 + 59)}`], 59);
    assert.equal(newShuffleState(-1).seed, 0xffffffff);
    assert.equal(newShuffleState(Number.NaN).seed, 0);
  });
});

describe("renderDraft", () => {
  const sample = input({ trade: "plumbing", businessName: "Piney Woods Plumbing", town: "Longview", services: ["drain cleaning"] });
  const core = buildCores(sample).find((c) => c.key === "t:plumbing:slow-drains|checklist");
  assert.ok(core);
  const card = makeCard(core, sample, { hookIdx: 0, shotIdx: 1, ctaIdx: CTA_IDS.indexOf("book") }, { lap: 0, position: 1 }, FALL);

  test("Facebook: greeting for a friendly voice, body lines, call to action, sign-off, one hashtag", () => {
    const d = renderDraft(card, sample, "facebook");
    assert.equal(
      d.text,
      "Hey everyone. Here is a short checklist for slow drains.\n\nCheck: [the first thing to look at]\nCheck: [the second thing to look at]\nAnything look off? Ask us.\n\nBook a time here: [booking link]\n\nPiney Woods Plumbing, Longview",
    );
    assert.deepEqual(d.hashtags, ["#LongviewPlumbing"]);
    assert.deepEqual(d.shotList, []);
    assert.deepEqual(d.blanks, ["[the first thing to look at]", "[the second thing to look at]", "[booking link]"]);
    assert.equal(d.chars, d.text.length);
    assert.equal(d.limit, null);
    const direct = renderDraft(card, { ...sample, voice: "direct", town: "" }, "facebook");
    assert.ok(direct.text.startsWith("Here is a short checklist"));
    assert.ok(direct.text.endsWith("\n\nPiney Woods Plumbing"));
    assert.deepEqual(direct.hashtags, []);
  });

  test("Instagram, Google, Nextdoor, and short video follow their layouts", () => {
    const ig = renderDraft(card, sample, "instagram");
    assert.ok(ig.text.startsWith("Here is a short checklist for slow drains.\n\nCheck: [the first thing to look at]\n\nCheck:"));
    assert.deepEqual(ig.hashtags, ["#LongviewPlumbing", "#PlumbingTips"]);
    assert.equal(ig.limit, 2200);

    const google = renderDraft(card, sample, "google");
    assert.equal(
      google.text,
      "A short checklist: slow drains.\n\nCheck: [the first thing to look at]\nCheck: [the second thing to look at]\nAnything look off? Ask us.\n\nBook a time here: [booking link]",
    );
    assert.equal(google.blanks.length, 3);
    assert.deepEqual(google.hashtags, []);
    assert.equal(google.limit, 1500);

    const nextdoor = renderDraft(card, sample, "nextdoor");
    assert.ok(nextdoor.text.startsWith("Hi neighbors. Here is a short checklist for slow drains.\n\n"));
    assert.deepEqual(nextdoor.hashtags, []);

    const video = renderDraft(card, sample, "video");
    assert.equal(video.text, "Here is a short checklist for slow drains. Book a time here: [booking link]");
    assert.deepEqual(video.shotList, [`Shot: ${card.shot}`, VIDEO_OPEN, "Shot: Show [each thing to check]", VIDEO_CLOSE]);
    assert.deepEqual(video.shotList, videoShotList(card));
    assert.deepEqual(video.hashtags, ["#LongviewPlumbing", "#PlumbingTips"]);
    assert.deepEqual(video.blanks, ["[booking link]", "[each thing to check]"]);
    assert.equal(
      draftCopyText(video),
      `${video.text}\n\n#LongviewPlumbing #PlumbingTips\n\n${video.shotList.join("\n")}`,
    );
    assert.equal(draftCopyText(google), google.text);
  });

  test("Google keeps every body line: a myth with its fact, a question with its answer, all three steps", () => {
    const inp = input({ trade: "plumbing", services: ["drain cleaning"] });
    const seen = new Set<string>();
    for (const c of buildCores(inp)) {
      if (seen.has(c.angle)) continue;
      seen.add(c.angle);
      const k = makeCard(c, inp, { hookIdx: 0, shotIdx: 0, ctaIdx: CTA_IDS.indexOf("call") }, undefined, FALL);
      const google = renderDraft(k, inp, "google");
      const facebook = renderDraft(k, inp, "facebook");
      for (const line of angleById(c.angle).body) assert.ok(google.text.includes(fill(line, { topic: k.topic, season: k.season })), `${c.angle}: ${line}`);
      assert.equal(google.blanks.length, facebook.blanks.length, `${c.angle}: Google asks for as many blanks as Facebook`);
    }
    assert.equal(seen.size, ANGLES.length, "every angle was rendered");
    const myth = makeCard(buildCores(inp).find((c) => c.key === "t:plumbing:slow-drains|myth-fact")!, inp, { hookIdx: 0, shotIdx: 0, ctaIdx: CTA_IDS.indexOf("call") }, undefined, FALL);
    assert.ok(renderDraft(myth, inp, "google").text.includes("The fact: [what is actually true, in a sentence or two]."));
  });

  test("the short video's middle shot is the angle's own", () => {
    const inp = input({ trade: "plumbing" });
    const story = buildCores(inp).find((c) => c.angle === "our-story")!;
    const k = makeCard(story, inp, { hookIdx: 0, shotIdx: 0, ctaIdx: CTA_IDS.indexOf("call") }, undefined, FALL);
    const video = renderDraft(k, inp, "video");
    assert.deepEqual(video.shotList, [`Shot: ${k.shot}`, VIDEO_OPEN, "Shot: Show [a photo from the early days]", VIDEO_CLOSE]);
    assert.ok(!video.shotList.join("\n").includes("the answer or the fix"));
  });

  test("long owner text is cut at a word, within every cap, never through a blank", () => {
    const service = "whole house repiping with new shutoff valves and pressure checks";
    const long = input({ trade: "plumbing", town: "Longview", services: [service.slice(0, 60)] });
    for (const c of buildCores(long).filter((x) => x.source === "service")) {
      for (let h = 0; h < 4; h++) {
        const k = makeCard(c, long, { hookIdx: h, shotIdx: 0, ctaIdx: CTA_IDS.indexOf("visit") }, undefined, FALL);
        for (const p of PLATFORMS) {
          const d = renderDraft(k, long, p.id);
          assert.ok(d.chars <= p.cap, `${p.id} ${d.chars}`);
          assert.equal((d.text.match(/\[/g) ?? []).length, (d.text.match(/\]/g) ?? []).length, d.text);
          if (p.id === "instagram") assert.ok(d.text.split("\n\n")[0].length <= 125);
          if (p.id === "video") assert.ok(d.text.endsWith(k.ctaLine), d.text);
        }
      }
    }
    assert.equal(cutAtWord("one two three", 9), "one two");
    assert.equal(cutAtWord("one two three", 11, "..."), "one two...");
    assert.equal(cutAtWord("Book here: [booking link]", 20), "Book here");
    assert.equal(cutAtWord("short", 10), "short");
  });

  test("hashtags are letters and digits only, and skipped when they would run long", () => {
    const fortWorth = renderDraft(card, { ...sample, town: "fort worth", trade: "hvac" }, "instagram");
    assert.deepEqual(fortWorth.hashtags, ["#FortWorthHVAC", "#HVACTips"]);
    const accents = renderDraft(card, { ...sample, town: "San Jos\u00e9" }, "facebook");
    assert.deepEqual(accents.hashtags, ["#SanJosePlumbing"]);
    const long = renderDraft(card, { ...sample, town: "Llanfairpwllgwyngyll Gogerychwyrndrobwll", trade: "cleaning" }, "instagram");
    assert.deepEqual(long.hashtags, ["#HouseCleaningTips"]);
    const other = renderDraft(card, { ...sample, trade: "other" }, "video");
    assert.deepEqual(other.hashtags, []);
  });

  test("fill runs once, findBlanks, and the season matches the account calendar", () => {
    assert.equal(fill("{Topic} in {season}, {Season}", { topic: "{season} leaks", season: "spring" }), "{season} leaks in spring, Spring");
    assert.equal(fill("About {topic}.", { topic: "$& and $'", season: "fall" }), "About $& and $'.");
    assert.deepEqual(findBlanks("a [one] b [two]\n[three"), ["[one]", "[two]"]);
    for (let m = 1; m <= 12; m++) assert.equal(seasonForMonth(m), planSeasonForMonth(m), `month ${m}`);
    assert.equal(seasonOf(new Date(2026, 11, 1, 12)), "winter");
    assert.equal(seasonOf(new Date(2026, 2, 1, 12)), "spring");
  });
});

describe("planMonth", () => {
  const inp = input({ trade: "electrical", town: "Marshall" });
  const cases: ["daily" | "weekdays" | "three", number, number[]][] = [
    ["daily", 30, [0, 1, 2, 3, 4, 5, 6]],
    ["weekdays", 22, [1, 2, 3, 4, 5]],
    ["three", 13, [1, 3, 5]],
  ];

  for (const [cadence, count, weekdays] of cases) {
    test(`${cadence}: the right dates, distinct ideas, and the cursor moves on`, () => {
      // 2026-09-28 is a Monday; 30 days runs through 2026-10-27.
      const start = newShuffleState(77);
      const plan = planMonth(inp, start, "2026-09-28", cadence);
      assert.equal(plan.days.length, count);
      assert.equal(plan.days[0].date, "2026-09-28");
      for (const day of plan.days) {
        const [y, m, d] = day.date.split("-").map(Number);
        const date = new Date(y, m - 1, d, 12);
        assert.ok(weekdays.includes(date.getDay()), day.date);
        assert.ok(day.date >= "2026-09-28" && day.date <= "2026-10-27", day.date);
      }
      assert.equal(new Set(plan.days.map((d) => d.date)).size, count);
      assert.equal(new Set(plan.days.map((d) => d.card.coreKey)).size, count);
      assert.equal(plan.state.cursors[inputSignature(inp)], count);
      assert.deepEqual(start.cursors, {});
      const after = drawNext(inp, plan.state, FALL);
      assert.ok(!plan.days.some((d) => d.card.coreKey === after.card.coreKey));
    });
  }

  test("every calendar day once, across a daylight saving change and a month end", () => {
    for (const start of ["2026-11-01", "2026-03-08", "2026-01-31"]) {
      const plan = planMonth(inp, newShuffleState(1), start, "daily");
      assert.equal(plan.days.length, 30);
      for (let i = 1; i < plan.days.length; i++) {
        const [y1, m1, d1] = plan.days[i - 1].date.split("-").map(Number);
        const [y2, m2, d2] = plan.days[i].date.split("-").map(Number);
        const gap = Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86_400_000);
        assert.equal(gap, 1, `${plan.days[i - 1].date} to ${plan.days[i].date}`);
      }
    }
    assert.equal(planMonth(inp, newShuffleState(1), "2026-01-31", "daily").days[1].date, "2026-02-01");
  });

  test("a bad start date plans nothing and leaves the state alone", () => {
    const state = newShuffleState(1);
    for (const bad of ["", "2026-02-30", "09/28/2026", "2026-9-28", "tomorrow"]) {
      const plan = planMonth(inp, state, bad, "daily");
      assert.deepEqual(plan.days, []);
      assert.equal(plan.state, state);
    }
    assert.equal(planMonth(inp, state, "2026-09-28", "daily", 7).days.length, 7);
    assert.equal(planDayLabel("2026-09-28"), "Monday, September 28");
  });
});

describe("plan export", () => {
  const inp = input({ trade: "auto", businessName: "Bayou Auto", town: "Longview" });
  const plan = planMonth(inp, newShuffleState(8), "2026-09-28", "three");

  test("CSV headers, one row per day, and the draft for the chosen platform", () => {
    const { headers, rows } = planToCsv(plan.days, inp, "google");
    assert.deepEqual(headers, ["Date", "Idea", "Angle", "First line", "What to show", "Draft (Google Business Profile)"]);
    assert.equal(rows.length, plan.days.length);
    const first = rows[0];
    const day = plan.days[0];
    assert.deepEqual(first.slice(0, 5), [day.date, day.card.title, day.card.angleLabel, day.card.hook, day.card.shot]);
    assert.ok(first[5].startsWith(`${day.card.title}.\n\n`));
    for (const row of rows) assert.equal(row.length, headers.length);
  });

  test("CSV neutralizes formula characters at the start of a cell", () => {
    const base = plan.days[0];
    const tricky: PlanDay = {
      date: base.date,
      card: { ...base.card, title: "=HYPERLINK(evil)", angleLabel: "+cmd", hook: "-sum", shot: "@calc" },
    };
    const [row] = planToCsv([tricky], inp, "facebook").rows;
    assert.deepEqual(row.slice(1, 5), ["'=HYPERLINK(evil)", "'+cmd", "'-sum", "'@calc"]);
    assert.equal(row[0], base.date);
    assert.ok(!row[5].startsWith("'"));
  });

  test("the whole month as text, one block per day", () => {
    const text = planToText(plan.days, inp, "video");
    const blocks = text.split("\n\n----------\n\n");
    assert.equal(blocks.length, plan.days.length);
    assert.ok(blocks[0].startsWith(`Monday, September 28 | ${plan.days[0].card.title}\n\n`));
    assert.ok(blocks[0].includes("Shot: Say the first line to the camera"));
    assert.deepEqual(copyProblems(text), []);
  });
});
