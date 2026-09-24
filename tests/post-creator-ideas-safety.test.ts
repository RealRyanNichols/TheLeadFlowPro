// Post Creator: every free draft is safe to post under an owner's name.
//
// The free idea machine writes drafts with no AI and no review, so the
// library itself has to be clean. This sweep renders every core idea for all
// thirteen trades, every platform in every voice with every call to action,
// and a few thousand seeded random cards, and runs each draft through the
// same copy rules the AI writer's output passes. A draft may leave [blanks],
// but it never carries a number, a claim, a phone, a link, or an email, and it
// always fits the platform.

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { postCopyProblems } from "../lib/postCreator/copyRules.ts";
import { draftCopyText, renderDraft } from "../lib/postCreator/ideas/drafts.ts";
import { buildCores, drawNext, ideaSpace, inputSignature, makeCard, normalizeInput } from "../lib/postCreator/ideas/engine.ts";
import type { EngineInput } from "../lib/postCreator/ideas/types.ts";
import { CTA_IDS, PLATFORMS, TRADE_IDS, VOICES, platformById, type CtaChoice, type PlatformId, type VoiceId } from "../lib/postCreator/options.ts";
import type { DraftView } from "../lib/postCreator/types.ts";

const SAMPLE = { businessName: "Piney Woods Plumbing", town: "Longview", services: ["drain cleaning", "water heaters", "repipes"] };
const ALLOWED = { text: "", mask: [SAMPLE.businessName, SAMPLE.town, ...SAMPLE.services] };
const CLAIMS = /licensed|insured|bonded|certified|free estimate|no trip charge|guarante{2}|\bbest\b|#1|number one/i;
/** One day in each season, so the seasonal angle is checked all year. */
const SEASON_DAYS = [new Date(2027, 0, 15, 12), new Date(2027, 3, 15, 12), new Date(2027, 6, 15, 12), new Date(2027, 9, 15, 12)];

function sampleInput(trade: string, voice: VoiceId = "friendly", cta: CtaChoice = "mix", over: Partial<EngineInput> = {}): EngineInput {
  return normalizeInput({ ...SAMPLE, trade, voice, cta, ...over }).input;
}

/** Every reason a draft could not go out as it is. */
function draftFailures(d: DraftView, allowed = ALLOWED): string[] {
  const out: string[] = [];
  const copy = draftCopyText(d);
  const platform = platformById(d.platform);
  out.push(...postCopyProblems(copy, allowed));
  if (d.blanks.length > 3) out.push(`${d.blanks.length} blanks`);
  if (d.hashtags.length > platform.hashtags) out.push(`${d.hashtags.length} hashtags on ${d.platform}`);
  if ((d.platform === "google" || d.platform === "nextdoor") && d.hashtags.length) out.push(`hashtags on ${d.platform}`);
  for (const h of d.hashtags) if (!/^#[A-Za-z0-9]{2,40}$/.test(h)) out.push(`bad hashtag ${h}`);
  if (d.chars > platform.cap) out.push(`${d.chars} characters over the ${platform.cap} cap`);
  if (d.chars !== d.text.length) out.push("chars does not match the text");
  if (/\d/.test(copy)) out.push("contains a digit");
  const claim = CLAIMS.exec(copy);
  if (claim) out.push(`claim "${claim[0]}"`);
  if (/[{}]/.test(copy)) out.push("unfilled placeholder");
  if (/[\u2014\u2013]/.test(copy)) out.push("long dash");
  return out;
}

function check(d: DraftView, where: string, allowed = ALLOWED): void {
  const failures = draftFailures(d, allowed);
  if (failures.length) assert.fail(`${where}: ${failures.join("; ")}\n---\n${draftCopyText(d)}`);
}

/** mulberry32: a small seeded generator, so the random sweep is the same on every run. */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe("free draft safety sweep", () => {
  test("every core for all thirteen trades, with each of its four first lines, renders clean to Facebook", () => {
    let rendered = 0;
    for (const trade of TRADE_IDS) {
      const input = sampleInput(trade);
      const cores = buildCores(input);
      assert.equal(cores.length, ideaSpace(input).coreCount);
      cores.forEach((core, i) => {
        for (let hookIdx = 0; hookIdx < 4; hookIdx++) {
          const now = SEASON_DAYS[hookIdx];
          const card = makeCard(core, input, { hookIdx, shotIdx: hookIdx % 2, ctaIdx: (i + hookIdx) % CTA_IDS.length }, undefined, now);
          assert.deepEqual(postCopyProblems(`${card.title}\n${card.shot}`, ALLOWED), [], card.key);
          check(renderDraft(card, input, "facebook", now), `${trade} ${card.key}`);
          rendered++;
        }
      });
    }
    // 12 trades of 430 cores and "other" with 292, four first lines each.
    assert.equal(rendered, (12 * 430 + 292) * 4);
  });

  test("every platform in every voice with every call to action, at the first remix, for plumbing and other", () => {
    let rendered = 0;
    for (const trade of ["plumbing", "other"]) {
      for (const voice of VOICES) {
        for (const cta of CTA_IDS) {
          const input = sampleInput(trade, voice.id, cta);
          for (const core of buildCores(input)) {
            const card = makeCard(core, input, { hookIdx: 0, shotIdx: 0, ctaIdx: CTA_IDS.indexOf(cta) });
            for (const p of PLATFORMS) {
              check(renderDraft(card, input, p.id), `${trade} ${voice.id} ${cta} ${p.id} ${card.key}`);
              rendered++;
            }
          }
        }
      }
    }
    assert.equal(rendered, (430 + 292) * VOICES.length * CTA_IDS.length * PLATFORMS.length);
  });

  test("three thousand seeded random cards across trades, services, voices, calls to action, laps, and platforms", () => {
    const random = rng(20_260_924);
    const pick = <T>(list: readonly T[]): T => list[Math.floor(random() * list.length)];
    const ctas: readonly CtaChoice[] = ["mix", ...CTA_IDS];
    for (let n = 0; n < 3000; n++) {
      const services = SAMPLE.services.filter(() => random() < 0.5);
      const input = sampleInput(pick(TRADE_IDS), pick(VOICES).id, pick(ctas), { services });
      const space = ideaSpace(input);
      const seed = Math.floor(random() * 0x100000000);
      const cursor = Math.floor(random() * space.cardCount * 2);
      const state = { v: 1 as const, seed, cursors: { [inputSignature(input)]: cursor } };
      const now = pick(SEASON_DAYS);
      const { card } = drawNext(input, state, now);
      const platform: PlatformId = pick(PLATFORMS).id;
      const allowed = { text: "", mask: [SAMPLE.businessName, SAMPLE.town, ...services] };
      check(renderDraft(card, input, platform, now), `#${n} ${inputSignature(input)} ${card.key} ${platform}`, allowed);
    }
  });

  test("a business with no name, town, or services still gets clean drafts on every platform", () => {
    for (const trade of TRADE_IDS) {
      const input = normalizeInput({ trade }).input;
      for (const core of buildCores(input)) {
        const card = makeCard(core, input, { hookIdx: 3, shotIdx: 1, ctaIdx: CTA_IDS.indexOf("book") });
        for (const p of PLATFORMS) check(renderDraft(card, input, p.id), `${trade} bare ${card.key} ${p.id}`, { text: "", mask: [] });
      }
    }
  });
});
