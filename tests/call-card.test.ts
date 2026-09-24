import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import test from "node:test";
import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";
import CallOutcomePanel, {
  EDITS_NOT_SAVED_WARNING,
  LogCallPrompt,
  NEXT_OUTCOMES,
  REACH_CHOICES,
  SavedCallView,
  SavingLock,
  UNCERTAIN_SAVE_MESSAGE,
  afterSave,
  classifySave,
  isTypingField,
  keyForSave,
  nextCallLink,
  nextStepLabel,
  outcomeForReach,
  pickHint,
  reachFor,
  readSaved,
  restoredFromCache,
  showsLogPrompt,
  type CallOutcomePanelProps,
  type Reach,
  type SaveMemory,
  type SavedCall,
  type SavedCallViewProps,
} from "../app/admin/call-sheet/CallOutcomePanel.tsx";
import * as businessTime from "../lib/businessTime.ts";
import * as callCloser from "../lib/callCloser.ts";
import * as callCloserFixtures from "../lib/callCloserFixtures.ts";
import * as callQueue from "../lib/callQueue.ts";
import * as callSheet from "../lib/callSheet.ts";
import * as contactGaps from "../lib/contactGaps.ts";
import * as hqPhone from "../lib/hq/phone.ts";
import * as leadMessageAuthor from "../lib/leadMessageAuthor.ts";
import * as leadTimeline from "../lib/leadTimeline.ts";
import * as payDoors from "../lib/payDoors.ts";
import * as proposalBuild from "../lib/proposals/build.ts";
import * as proposalFixtures from "../lib/proposals/fixtures.ts";
import * as proposalRender from "../lib/proposals/render.ts";
import * as quo from "../lib/quo.ts";
import * as speedToLead from "../lib/speedToLead.ts";
import {
  LOST_REASONS,
  MEETING_PLACES,
  OUTCOME_LABELS,
  PANEL_OUTCOMES,
  closerOffersFor,
  countPriorAttempts,
  isPayableToday,
  parseNextStepRequest,
  planCallOutcome,
  type CallOutcome,
  type PlannerLead,
} from "../lib/callCloser.ts";
import { SAMPLE_ACTOR_NAME, SAMPLE_CALL_ACTIVITY, SAMPLE_CALL_LEAD, SAMPLE_NOW } from "../lib/callCloserFixtures.ts";
import { copyProblems } from "../lib/hq/copy.ts";
import { buildLeadTimeline, stripActivityMarkers } from "../lib/leadTimeline.ts";

// The call card and the proposal page: authorization before any lead read,
// a client panel that cannot reach the database or a messaging provider, and
// markup that works with a thumb and a screen reader. Fixed clocks and the
// fictional sample lead only.

const src = (f: string) => readFileSync(join(process.cwd(), f), "utf8");

const CARD_PAGE = "app/admin/call-sheet/[leadId]/page.tsx";
const CARD_WRAPPER = "app/admin/call-sheet/[leadId]/CallCardPanel.tsx";
const PANEL = "app/admin/call-sheet/CallOutcomePanel.tsx";
const PROPOSAL_PAGE = "app/admin/proposals/[leadId]/page.tsx";
const SENT_BUTTON = "app/admin/proposals/[leadId]/ProposalSentButton.tsx";
const SALES_WORKSPACE = "app/sales/leads/[id]/SalesLeadWorkspace.tsx";
const ADMIN_LEAD_PAGE = "app/admin/leads/[id]/page.tsx";

/** The body of the page's default export, so helpers defined above it do not count. */
function defaultExportBody(file: string): string {
  const text = src(file);
  const start = text.indexOf("export default async function");
  assert.ok(start >= 0, `${file} has an async default export`);
  return text.slice(start);
}

function importsOf(text: string): string[] {
  return [...text.matchAll(/(?:^|\n)\s*import\s+(?:type\s+)?(?:[^"';]*?\s+from\s+)?["']([^"']+)["']/g)].map((m) => m[1]);
}

const { created_at: _c, source: _s, goals: _g, best_contact_method: _b, ...sampleLeadFields } = SAMPLE_CALL_LEAD;
const SAMPLE_LEAD: PlannerLead = { ...sampleLeadFields, diagnostic: null };
const SAMPLE_SUGGESTIONS = closerOffersFor(SAMPLE_CALL_LEAD.interest, SAMPLE_CALL_LEAD.diagnostic);
const SAMPLE_PRIOR = countPriorAttempts(SAMPLE_CALL_ACTIVITY);

function sampleProps(overrides: Partial<CallOutcomePanelProps> = {}): CallOutcomePanelProps {
  return {
    lead: SAMPLE_LEAD,
    suggestedOffers: SAMPLE_SUGGESTIONS,
    priorAttempts: SAMPLE_PRIOR,
    actorName: SAMPLE_ACTOR_NAME,
    smsHref: "sms:+19035550100",
    mailHref: "mailto:dana@example.test",
    canText: true,
    hasEmail: true,
    proposalAllowed: true,
    sample: true,
    fixedNow: SAMPLE_NOW.toISOString(),
    ...overrides,
  };
}

const render = (props: CallOutcomePanelProps) => renderToStaticMarkup(createElement(CallOutcomePanel, props));

/** Visible text, roughly: tags out, the few entities React writes decoded. */
function textOf(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function inputs(html: string, type: string): { id: string; tag: string }[] {
  return [...html.matchAll(/<input\b[^>]*>/g)]
    .map((m) => m[0])
    .filter((tag) => tag.includes(`type="${type}"`))
    .map((tag) => ({ id: /\bid="([^"]+)"/.exec(tag)?.[1] ?? "", tag }));
}

function assertLabelled(html: string, type: string, expected: number) {
  const found = inputs(html, type);
  assert.equal(found.length, expected, `${expected} ${type} inputs`);
  for (const { id, tag } of found) {
    assert.ok(id, `every ${type} has an id: ${tag}`);
    assert.ok(html.includes(`for="${id}"`), `a label points at ${type} ${id}`);
  }
}

/** Every radio tile in order: the label around it, its words, its group, and its tallest min-h class. */
function radioTiles(html: string) {
  return [...html.matchAll(/<label\b([^>]*)>\s*<input\b([^>]*)>\s*<span[^>]*>([^<]*)<\/span>\s*<\/label>/g)]
    .filter((m) => m[2].includes('type="radio"'))
    .map((m) => ({
      id: /\bid="([^"]+)"/.exec(m[2])?.[1] ?? "",
      forId: /\bfor="([^"]+)"/.exec(m[1])?.[1] ?? "",
      name: /\bname="([^"]+)"/.exec(m[2])?.[1] ?? "",
      value: /\bvalue="([^"]+)"/.exec(m[2])?.[1] ?? "",
      checked: /\bchecked=""/.test(m[2]),
      text: m[3],
      minH: Math.max(0, ...[...m[1].matchAll(/\bmin-h-\[(\d+)px\]/g)].map((x) => Number(x[1]))),
    }));
}

/** The two outcome questions only: step 1 ("-reach") and step 2 ("-outcome"). */
const outcomeTiles = (html: string) => radioTiles(html).filter((t) => /-(reach|outcome)$/.test(t.name));

/** The legend of every fieldset that opens with one, in order. */
const legends = (html: string) => [...html.matchAll(/<fieldset[^>]*>\s*<legend[^>]*>([^<]*)<\/legend>/g)].map((m) => m[1]);

/** The Save button's opening tag and its words. */
function saveButton(html: string): { tag: string; text: string } {
  const m = /(<button[^>]*type="submit"[^>]*>)([^<]*)<\/button>/.exec(html);
  assert.ok(m, "a submit button");
  return { tag: m[1], text: m[2] };
}

/** The body of a function in the panel source, up to its closing brace at two spaces in. */
function fnBody(text: string, head: string): string {
  const from = text.slice(text.indexOf(head));
  assert.ok(text.includes(head), head);
  return from.slice(0, from.indexOf("\n  }\n"));
}

test("call card page: signed in and admin before any lead read; the sample reads no lead data", () => {
  const body = defaultExportBody(CARD_PAGE);
  const getUser = body.indexOf("auth.getUser()");
  const role = body.indexOf('profile?.role !== "admin"');
  const firstLeadRead = body.indexOf('.from("leads")');
  const sample = body.indexOf('leadId === "sample"');
  assert.ok(getUser > 0, "reads the signed-in user");
  assert.ok(role > getUser, "checks the admin role after reading the user");
  assert.ok(firstLeadRead > role, "reads the lead only after the role check");
  assert.ok(sample > role && sample < firstLeadRead, "the sample returns after auth and before any lead read");
  // Nothing above the page function reads the database either.
  const whole = src(CARD_PAGE);
  assert.ok(whole.indexOf('.from("leads")') > whole.indexOf("auth.getUser()"), "no lead read anywhere before auth");
  assert.ok(whole.indexOf('.from("lead_notes")') > whole.indexOf('profile?.role !== "admin"'));
  assert.ok(whole.indexOf('.from("lead_activity")') > whole.indexOf('profile?.role !== "admin"'));
  // Same redirects as the call sheet, with this card as the way back.
  assert.match(body, /redirect\(`\/login\?next=\$\{encodeURIComponent\(`\/admin\/call-sheet\/\$\{leadId\}`\)\}`\)/);
  assert.match(body, /redirect\("\/dashboard"\)/);
  assert.match(whole, /export const dynamic = "force-dynamic"/);
  assert.match(whole, /title: "Call card \| The LeadFlow Pro"/);
  assert.match(whole, /This is a connection problem, not an empty lead\./);
  // Read-only: the page never writes.
  assert.ok(!/\.(insert|update|upsert|delete|rpc)\(/.test(whole), "the call card page only reads");
  assert.ok(!/lib\/supabase\/service|lead_calls/.test(whole), "no service client and no scoreboard call log");
});

test("proposal page: signed in and admin before intakeFor() reads the lead", () => {
  const body = defaultExportBody(PROPOSAL_PAGE);
  const getUser = body.indexOf("auth.getUser()");
  const role = body.indexOf('profile?.role !== "admin"');
  const intake = body.indexOf("intakeFor(");
  assert.ok(getUser > 0 && role > getUser && intake > role, `order: getUser ${getUser}, role ${role}, intakeFor ${intake}`);
  assert.match(body, /redirect\("\/dashboard"\)/);
  assert.match(body, /searchParams/);
  assert.match(body, /buildProposal\(found\.intake, now, \{ selection \}\)/);
  assert.match(body, /<ProposalSentButton/);
  assert.match(body, /Back to call card/);
  // The page itself still never sends anything (tests/proposals.test.ts guards the same words).
  assert.ok(!/resend|sendEmail|sendSms|channels|leadNotify|api\.resend|fetch\(/i.test(src(PROPOSAL_PAGE)));
});

test("the panel and the proposal button reach no database, provider, or call sheet code, and post only to the save route", () => {
  for (const file of [PANEL, SENT_BUTTON]) {
    const text = src(file);
    assert.ok(text.startsWith('"use client";'), `${file} is a client component`);
    const imports = importsOf(text);
    assert.ok(imports.length > 0, file);
    for (const spec of imports) {
      assert.ok(!/callSheet|\/quo$|lib\/quo|leadNotify|supabase|resend|nurture|smsPolicy/i.test(spec), `${file} imports ${spec}`);
    }
    const fetches = [...text.matchAll(/\bfetch\(/g)];
    assert.equal(fetches.length, 1, `${file} has exactly one fetch`);
    const call = text.slice(fetches[0].index, fetches[0].index! + 120);
    assert.match(call, /fetch\(`\/api\/admin\/leads\/\$\{encodeURIComponent\(lead\.id\)\}\/next-step`/, call);
    assert.ok(!/XMLHttpRequest|sendBeacon|EventSource|WebSocket/.test(text), `${file} has no other network path`);
  }
  // The panel imports only the pure Call Closer modules and the copy button.
  const libs = importsOf(src(PANEL)).filter((s) => s.startsWith("@/lib/"));
  assert.deepEqual(libs.sort(), ["@/lib/businessTime", "@/lib/callCloser", "@/lib/payDoors"]);
  // No Next.js router in the panel, so it renders in a plain React test. The call card wrapper refreshes instead.
  assert.ok(!importsOf(src(PANEL)).some((s) => s.startsWith("next/")));
  assert.match(src(CARD_WRAPPER), /router\.refresh\(\)/);
});

test("sample panel markup: two questions, each a fieldset with a legend, a label on every radio, 44px targets, and a Save that cannot post", () => {
  const html = render(sampleProps());
  // The card is still "How did the call go?", and what it promises shows before any tap.
  assert.match(html, /^<section[^>]*aria-labelledby="([^"]+)"[^>]*><h3 id="\1"[^>]*>How did the call go\?<\/h3>/);
  assert.ok(textOf(html).includes("Nothing is sent to Dana."), textOf(html));
  // Step 1 only, until "Yes, we talked".
  assert.deepEqual(legends(html), ["Did you reach them?"]);
  assert.match(html, /<legend[^>]*tabindex="-1"[^>]*>Did you reach them\?<\/legend>/, "the legend can take focus when Ryan comes back from a call");
  assert.ok(!html.includes("What happens next?"));
  assertLabelled(html, "radio", REACH_CHOICES.length);
  const step1 = outcomeTiles(html);
  assert.deepEqual(step1.map((t) => t.text), ["Yes, we talked", "No answer", "Left a voicemail"]);
  assert.deepEqual(step1.map((t) => t.value), ["talked", "no_answer", "voicemail"]);
  assert.equal(new Set(step1.map((t) => t.name)).size, 1, "one radio group");
  for (const t of step1) {
    assert.equal(t.forId, t.id, `${t.text} is labelled by its own tile`);
    assert.ok(t.minH >= 44, `${t.text} is ${t.minH}px tall`);
    assert.ok(!t.checked, `${t.text} starts unpicked`);
  }
  const save = saveButton(html);
  assert.match(save.tag, /\sdisabled=""/);
  assert.match(save.tag, /min-h-\[44px\]/);
  assert.equal(save.text, "Sample only, nothing is saved");
  assert.ok(!html.includes("Pick whether you reached them."), "the sample's button already says why it never saves");
  assert.match(html, /focus-visible:outline/);
  assert.ok(!/role="alert"/.test(html), "no error before anything happened");
  assert.deepEqual(copyProblems(textOf(html)), []);

  // "Yes, we talked": step 2 opens under it, with nothing picked.
  const talked = render(sampleProps({ initialReach: "talked" }));
  assert.deepEqual(legends(talked), ["Did you reach them?", "What happens next?"]);
  assert.match(talked, /<legend[^>]*tabindex="-1"[^>]*>What happens next\?<\/legend>/);
  assertLabelled(talked, "radio", REACH_CHOICES.length + NEXT_OUTCOMES.length);
  const tiles = outcomeTiles(talked);
  const step2 = tiles.slice(REACH_CHOICES.length);
  assert.deepEqual(step2.map((t) => t.text), ["Booked the sit-down", "Wants a proposal", "Ready to pay now", "Call back later", "Not a fit"]);
  assert.deepEqual(step2.map((t) => t.value), ["booked", "wants_proposal", "ready_to_pay", "call_back", "not_a_fit"]);
  assert.equal(new Set(step2.map((t) => t.name)).size, 1);
  assert.notEqual(step2[0].name, tiles[0].name, "two separate radio groups");
  assert.deepEqual(tiles.filter((t) => t.checked).map((t) => t.value), ["talked"], "nothing in step 2 is picked yet");
  for (const t of tiles) {
    assert.equal(t.forId, t.id);
    assert.ok(t.minH >= 44, `${t.text} is ${t.minH}px tall`);
  }
  assert.ok(!talked.includes(OUTCOME_LABELS.proposal_sent), "proposal sent is logged from the proposal page");
  assert.ok(!talked.includes("What saving does"), "no preview until there is an outcome");
  assert.match(saveButton(talked).tag, /\sdisabled=""/);
  assert.deepEqual(copyProblems(textOf(talked)), []);

  // The Sales Desk's compact panel keeps its heading level.
  assert.match(render(sampleProps({ compact: true })), /<h2 id="[^"]+"[^>]*>How did the call go\?<\/h2>/);
});

test("step 1 then step 2: every talked outcome is under Yes, a miss or a voicemail is one tap, and a switch never keeps a stale pick", () => {
  // The two steps together are exactly the call card's outcomes.
  assert.deepEqual([...NEXT_OUTCOMES], PANEL_OUTCOMES.filter((o) => o !== "no_answer" && o !== "voicemail"));
  for (const o of NEXT_OUTCOMES) assert.equal(nextStepLabel(o), o === "call_back" ? "Call back later" : OUTCOME_LABELS[o], o);
  assert.deepEqual(REACH_CHOICES.slice(1).map((r) => r.label), [OUTCOME_LABELS.no_answer, OUTCOME_LABELS.voicemail]);
  for (const o of PANEL_OUTCOMES) assert.equal(reachFor(o), o === "no_answer" || o === "voicemail" ? o : "talked", o);
  assert.equal(reachFor(null), null);
  assert.equal(reachFor("proposal_sent"), null, "not a call card outcome");

  // A run of taps: Yes, Booked, Voicemail, Yes. Booked does not come back unseen.
  type Picked = { reach: Reach | null; outcome: callCloser.CallOutcome | null };
  const tapStep1 = (reach: Reach): Picked => ({ reach, outcome: outcomeForReach(reach) });
  let picked: Picked = tapStep1("talked");
  assert.deepEqual(picked, { reach: "talked", outcome: null });
  picked = { ...picked, outcome: "booked" };
  picked = tapStep1("voicemail");
  assert.deepEqual(picked, { reach: "voicemail", outcome: "voicemail" });
  picked = tapStep1("talked");
  assert.deepEqual(picked, { reach: "talked", outcome: null }, "step 2 starts empty again");
  assert.deepEqual(tapStep1("no_answer"), { reach: "no_answer", outcome: "no_answer" });

  // Save waits for an outcome, and says so in words.
  assert.equal(pickHint(null, null), "Pick whether you reached them.");
  assert.equal(pickHint("talked", null), "Pick what happens next.");
  assert.equal(pickHint("talked", "booked"), null);
  assert.equal(pickHint("no_answer", "no_answer"), null);
  for (const hint of [pickHint(null, null), pickHint("talked", null)]) assert.deepEqual(copyProblems(hint ?? ""), []);

  // The panel runs step 1 through outcomeForReach and leaves the note and every other field alone.
  const panel = src(PANEL);
  const step1 = fnBody(panel, "function chooseReach(");
  assert.match(step1, /setReach\(next\);\s*setOutcome\(outcomeForReach\(next\)\);/);
  assert.ok(!/setNote|setOffers|setPayOffers|setTalkedOffers|setMeeting|setCallback|setLostReason/.test(step1), step1);
  assert.ok(step1.includes("disarmLogPrompt()"));
  assert.match(panel, /onChange=\{\(\) => chooseReach\(r\.id\)\}/);
  assert.match(panel, /onChange=\{\(\) => choose\(o\)\}/);

  // The note shows from step 1 on, whatever the answer, so a switch never hides what was typed.
  for (const reach of ["talked", "no_answer", "voicemail"] as const) {
    const html = render(sampleProps({ initialReach: reach }));
    assert.match(html, /<textarea\b[^>]*maxLength="2000"/, reach);
    assert.deepEqual(copyProblems(textOf(html)), [], reach);
  }
  assert.ok(!/<textarea\b/.test(render(sampleProps())), "nothing to type before step 1");

  // A miss or a voicemail is one tap: no step 2, and the retry preview shows at once.
  for (const reach of ["no_answer", "voicemail"] as const) {
    const html = render(sampleProps({ initialReach: reach }));
    assert.ok(!html.includes("What happens next?"), reach);
    assert.deepEqual(outcomeTiles(html).filter((t) => t.checked).map((t) => t.value), [reach]);
    assert.ok(html.includes("What saving does") && textOf(html).includes("Try again"), reach);
  }

  // An outcome given up front checks its step 1 answer and, after a talk, its own step 2 tile.
  for (const o of PANEL_OUTCOMES) {
    const checked = outcomeTiles(render(sampleProps({ initialOutcome: o }))).filter((t) => t.checked).map((t) => t.value);
    assert.deepEqual(checked, o === "no_answer" || o === "voicemail" ? [o] : ["talked", o], o);
  }
});

test("a real panel keeps Save off, with a hint in words, until there is an outcome", () => {
  const described = (html: string, hint: string) => {
    const save = saveButton(html);
    assert.equal(save.text, "Save the call");
    assert.match(save.tag, /\sdisabled=""/, hint);
    const id = /aria-describedby="([^"]+)"/.exec(save.tag)?.[1];
    assert.ok(id, `Save is described by the hint: ${save.tag}`);
    assert.ok(html.includes(`<p id="${id}"`) && textOf(html).includes(hint), hint);
  };
  described(render(sampleProps({ sample: false })), "Pick whether you reached them.");
  described(render(sampleProps({ sample: false, initialReach: "talked" })), "Pick what happens next.");
  // Once there is an outcome, Save is on and the hint is gone.
  for (const o of PANEL_OUTCOMES) {
    const html = render(sampleProps({ sample: false, initialOutcome: o }));
    assert.ok(!/\sdisabled=""/.test(saveButton(html).tag), o);
    assert.ok(!html.includes("Pick whether you reached them.") && !html.includes("Pick what happens next."), o);
  }
  // Save stays off while an outcome is missing, busy, or in the sample.
  assert.match(src(PANEL), /disabled=\{sample \|\| busy \|\| !outcome\}/);
});

test("while a save is in flight the form is frozen, so nothing typed during Saving... is lost", () => {
  // The lock itself: every control inside is disabled, and inert also stops the <details> toggles.
  const child = createElement(
    "div",
    null,
    createElement("input", { type: "radio", name: "o", id: "r" }),
    createElement("textarea", { id: "n" }),
    createElement("details", null, createElement("summary", null, "Pick the next try yourself")),
  );
  // SavingLock types children as a required prop, so it is passed as one here.
  // eslint-disable-next-line react/no-children-prop
  const locked = renderToStaticMarkup(createElement(SavingLock, { busy: true, children: child }));
  assert.match(locked, /^<fieldset[^>]*\sdisabled=""/);
  assert.match(locked, /^<fieldset[^>]*\sinert=""/);
  assert.match(locked, /^<fieldset[^>]*aria-busy="true"/);
  // eslint-disable-next-line react/no-children-prop
  const open = renderToStaticMarkup(createElement(SavingLock, { busy: false, children: child }));
  assert.ok(!/^<fieldset[^>]*\s(disabled|inert)=/.test(open), open);

  // The panel puts every field inside the lock: both steps' tiles, the times, the offers, the
  // reasons, the note, and both optional toggles. Save and the error stay outside it.
  const panel = src(PANEL);
  const from = panel.indexOf("<SavingLock busy={busy}>");
  const to = panel.indexOf("</SavingLock>");
  assert.ok(from > 0 && to > from, "the form is wrapped");
  const inside = panel.slice(from, to);
  for (const part of ["Did you reach them?", "REACH_CHOICES.map", "What happens next?", "NEXT_OUTCOMES.map", "timeFields(\"meeting\")", "{quickChips}", "offerPicker", "LOST_REASONS.map", "id={ids.note}", "Pick the next try yourself", "Talked about an offer?"]) {
    assert.ok(inside.includes(part), `${part} is inside the lock`);
  }
  assert.ok(panel.indexOf('type="submit"') > to, "Save is outside, so Saving... still shows");
  assert.ok(panel.indexOf('role="alert"', to) > to, "the error is outside");
  // Belt and braces: the toggles ignore a change while busy.
  assert.equal((panel.match(/if \(!busy\) set(Retry|Talked)Open\(e\.currentTarget\.open\)/g) ?? []).length, 2);
  // A panel that is not saving renders enabled controls.
  const idle = render(sampleProps({ sample: false, initialOutcome: "call_back" }));
  assert.ok(!/<fieldset[^>]*\sdisabled=""/.test(idle));
  assert.ok(!/<textarea[^>]*\sdisabled=""/.test(idle));
});

test("a real panel has an enabled Save, and shows nothing that depends on the clock until the browser reads it", () => {
  const html = render(sampleProps({ sample: false, fixedNow: null, initialOutcome: "call_back" }));
  const save = /<button[^>]*type="submit"[^>]*>([^<]*)<\/button>/.exec(html);
  assert.ok(save);
  assert.ok(!/\sdisabled=""/.test(save[0]), save[0]);
  assert.equal(save[1], "Save the call");
  // No clock on the server render: no quick picks and no preview yet, so hydration cannot disagree.
  assert.ok(!html.includes("What saving does"));
  assert.ok(!html.includes('aria-pressed'));
});

test("booked: labelled day and time in Central, the place chips, and dates bounded to the next 90 days", () => {
  const html = render(sampleProps({ initialOutcome: "booked" }));
  assertLabelled(html, "date", 1);
  assertLabelled(html, "time", 1);
  assertLabelled(html, "radio", REACH_CHOICES.length + NEXT_OUTCOMES.length + MEETING_PLACES.length + 1);
  assert.match(html, /When is the sit-down\?/);
  assert.match(html, /Time \(Central\)/);
  assert.match(html, new RegExp(`type="date"[^>]*min="${businessTime.centralDate(SAMPLE_NOW)}"`));
  assert.match(html, /max="2026-12-21"/);
  // Nothing chosen yet, so the planner says what is missing instead of a preview.
  assert.match(html, /Before you save:/);
});

test("the preview is the planner's own list, drawn from the same JSON Save would post", () => {
  const html = render(sampleProps({ initialOutcome: "no_answer" }));
  const parsed = parseNextStepRequest({ outcome: "no_answer", idempotency_key: "preview-only-key-not-saved", offers: [] });
  assert.ok(parsed.ok);
  const plan = planCallOutcome({ lead: SAMPLE_LEAD, request: parsed.request, actorName: SAMPLE_ACTOR_NAME, now: SAMPLE_NOW, priorAttempts: SAMPLE_PRIOR });
  assert.ok(plan.ok);
  assert.match(html, /<p[^>]*>What saving does<\/p>/);
  assert.ok(!html.includes("When you save"), "the preview heading says what saving does");
  const text = textOf(html);
  for (const line of plan.preview) assert.ok(text.includes(line), line);
  // One unanswered try already: the second one comes back in two business days, in the afternoon.
  assert.ok(text.includes("Thu, Sep 24 at 4:00 PM"), text);
  assert.ok(text.includes("Nothing is sent to Dana."));
  assert.deepEqual(copyProblems(text), []);
});

test("ready to pay lists what can be paid today first and never starts on an offer that takes no money", () => {
  // The sample is a free-website lead: none of its suggestions takes money online today.
  assert.ok(SAMPLE_SUGGESTIONS.every((id) => !isPayableToday(payDoors.payDoorFor(id)!, SAMPLE_LEAD.status)), "fixture assumption");
  const html = render(sampleProps({ initialOutcome: "ready_to_pay" }));
  assert.match(html, /What are they paying for\? Pick up to three\./);
  const boxes = inputs(html, "checkbox");
  for (const { id } of boxes) assert.ok(html.includes(`for="${id}"`), id);
  // Nothing unpayable starts checked, so the hint asks for what they are paying for today.
  assert.equal(boxes.filter((b) => /\bchecked=""/.test(b.tag)).length, 0);
  assert.match(textOf(html), /Before you save: Pick what they are paying for today\./);
  assert.ok(!/Before you save: No online payment for/.test(textOf(html)), "not blocked by default");
  // Every offer payable today is listed before the fold, in order, ahead of every one that is not.
  const order = boxes.map((b) => b.id.replace(/^.*-offer-/, ""));
  const payable = order.filter((id) => isPayableToday(payDoors.payDoorFor(id)!, SAMPLE_LEAD.status));
  assert.ok(payable.length >= 3, order.join());
  assert.deepEqual(order.slice(0, payable.length), payable, "payable offers come first");
  for (const id of ["website_launch", "system_map"]) assert.ok(payable.includes(id), id);
  // Each payable line says "online today" and "Pays" once, never as a stutter.
  const listed = textOf(html);
  assert.ok(!/online today\.\s*Pays [^.]*online today/i.test(listed), listed);
  assert.ok(!/\bPays online today\.\s*Pays\b/.test(listed), listed);
  // The rest wait under a summary that says why, still one tap away.
  assert.match(html, /<summary[^>]*>Offers that cannot be paid online today/);
  const fold = html.indexOf("Offers that cannot be paid online today");
  for (const id of SAMPLE_SUGGESTIONS) assert.ok(html.indexOf(`-offer-${id}`) > fold, `${id} is under the fold`);
  // A lead whose suggestions include a payable offer starts with the first payable one checked.
  const withPayable = render(sampleProps({ initialOutcome: "ready_to_pay", suggestedOffers: ["free_website_program", "system_map", "website_launch"] }));
  const checked = inputs(withPayable, "checkbox").filter((b) => /\bchecked=""/.test(b.tag));
  assert.equal(checked.length, 1);
  assert.ok(checked[0].id.endsWith("-offer-system_map"), checked[0].id);
  assert.ok(textOf(withPayable).includes("Shows the pay link and a message you can send Dana yourself."), textOf(withPayable));
  // Offers named on the last call still start checked; one that takes no money online is explained, never saved.
  const named = textOf(render(sampleProps({ initialOutcome: "ready_to_pay", initialOffers: ["free_website_program"] })));
  assert.match(named, /Before you save: No online payment for .+ yet\. Choose Wants a proposal so the number goes in writing first\./);
  // Wants a proposal keeps its own list: the primary suggestion, checked.
  const proposal = inputs(render(sampleProps({ initialOutcome: "wants_proposal" })), "checkbox").filter((b) => /\bchecked=""/.test(b.tag));
  assert.equal(proposal.length, 1);
  assert.ok(proposal[0].id.endsWith(`-offer-${SAMPLE_SUGGESTIONS[0]}`), proposal[0].id);
});

test("ready to pay for an agency service: the link once the number is in writing, never a false no online payment", () => {
  const early = textOf(render(sampleProps({ initialOutcome: "ready_to_pay", initialOffers: ["agency_meta_ads"] })));
  assert.ok(early.includes("Pays online once the number is in writing."), early);
  assert.ok(!/No online payment for Meta ads management/.test(early), early);
  assert.match(early, /Before you save: Meta ads management has no set price\./);
  const atProposal = textOf(
    render(sampleProps({ initialOutcome: "ready_to_pay", initialOffers: ["agency_meta_ads"], lead: { ...SAMPLE_LEAD, status: "proposal" } })),
  );
  assert.ok(atProposal.includes("Pays online against the written scope."), atProposal);
  assert.ok(!atProposal.includes("Before you save:"), atProposal);
  assert.ok(atProposal.includes("Shows the pay link and a message you can send Dana yourself."), atProposal);
  assert.deepEqual(copyProblems(atProposal), []);
  // An offer with no payment at all keeps its plain answer.
  const free = textOf(render(sampleProps({ initialOutcome: "ready_to_pay", initialOffers: ["free_website_program"] })));
  assert.ok(free.includes("Cannot be paid online today."), free);
});

test("Mark the proposal sent: retry advice only when a retry can help", async () => {
  const { pathToFileURL } = await import("node:url");
  const mod = (await import(pathToFileURL(join(process.cwd(), SENT_BUTTON)).href)) as {
    sentFailureMessage: (status: number, data: unknown) => string;
  };
  const retry = "Tap the button again to retry. It will not be recorded twice.";
  // The lead was marked lost from the Sales Desk after the page loaded: the route's own sentence, no retry advice.
  const closed = mod.sentFailureMessage(409, {
    ok: false,
    error: "This lead is already marked lost. Reopen it on the lead page before logging a call.",
  });
  assert.equal(closed, "This lead is already marked lost. Reopen it on the lead page before logging a call. Nothing was recorded.");
  assert.ok(!closed.includes(retry));
  for (const [status, error] of [
    [404, "Lead not found. It may have been deleted."],
    [403, "Sales access required."],
    [400, "Send the call outcome as JSON."],
  ] as const) {
    const said = mod.sentFailureMessage(status, { ok: false, error });
    assert.ok(said.startsWith(error) && !said.includes(retry), said);
  }
  // A retryable failure and an unreadable answer keep the retry advice.
  assert.equal(
    mod.sentFailureMessage(500, { ok: false, error: "This is a connection problem, not a problem with the lead. Try saving again.", retryable: true }),
    `This is a connection problem, not a problem with the lead. Try saving again. ${retry}`,
  );
  assert.equal(mod.sentFailureMessage(502, null), `It may not have been recorded. ${retry}`);
  assert.equal(mod.sentFailureMessage(500, { ok: false }), `It may not have been recorded. ${retry}`);
  assert.match(mod.sentFailureMessage(401, { ok: false, error: "Sign in to log a call." }), /^You are signed out/);
  for (const m of [closed, mod.sentFailureMessage(502, null)]) assert.deepEqual(copyProblems(m), []);
  // The button uses it.
  assert.match(src(SENT_BUTTON), /setError\(sentFailureMessage\(response\.status, data\)\)/);
});

test("offers named on the last call start checked instead of the suggestion, up to three", () => {
  const html = render(sampleProps({ initialOutcome: "wants_proposal", initialOffers: ["website_launch", "lead_followup_campaign"] }));
  const checked = inputs(html, "checkbox").filter((b) => /\bchecked=""/.test(b.tag)).map((b) => b.id.replace(/^.*-offer-/, ""));
  assert.deepEqual(checked.sort(), ["lead_followup_campaign", "website_launch"]);
  // A two-tap proposal from the sample names only the offer the lead came in for.
  const plain = textOf(render(sampleProps({ initialOutcome: "wants_proposal" })));
  assert.ok(plain.includes("Adds a task: Write the proposal for Sample Pressure Washing (fictional): Free Website Program, due "), plain);
});

test("Talked about an offer? starts with nothing ticked, so opening it never records an offer nobody mentioned", () => {
  const lastCall: payDoors.CloserOfferId[] = ["website_launch", "system_map"];
  for (const outcome of ["call_back", "booked"] as const) {
    for (const initialOffers of [undefined, lastCall]) {
      const html = render(sampleProps({ initialOutcome: outcome, initialOffers }));
      const label = `${outcome}${initialOffers ? " after a call that named offers" : ""}`;
      assert.match(html, /Talked about an offer\? Add it to the note \(optional\)/, label);
      const boxes = inputs(html, "checkbox");
      assert.ok(boxes.length > 0, `${label}: the offers are listed`);
      assert.equal(boxes.filter((b) => /\bchecked=""/.test(b.tag)).length, 0, `${label}: nothing starts ticked`);
      // The likely picks are still first, one tap away.
      assert.ok(boxes[0].id.endsWith(`-offer-${(initialOffers ?? SAMPLE_SUGGESTIONS)[0]}`), `${label}: ${boxes[0].id}`);
    }
  }
  // The required pickers keep their preselection (see the ready to pay and proposal tests above): the
  // offers named on the last call, and for Ready to pay now nothing that takes no money online.
  assert.equal(inputs(render(sampleProps({ initialOutcome: "ready_to_pay" })), "checkbox").filter((b) => /\bchecked=""/.test(b.tag)).length, 0);
  assert.equal(inputs(render(sampleProps({ initialOutcome: "ready_to_pay", initialOffers: lastCall })), "checkbox").filter((b) => /\bchecked=""/.test(b.tag)).length, 2);
  assert.equal(inputs(render(sampleProps({ initialOutcome: "wants_proposal", initialOffers: lastCall })), "checkbox").filter((b) => /\bchecked=""/.test(b.tag)).length, 2);
  // What Save sends: the optional list for a sit-down or a call back, Ready to pay now's own list, the proposal
  // list otherwise. Log another call resets all three.
  const panel = src(PANEL);
  assert.match(panel, /offers: !sendsOffers \? \[\] : outcome === "ready_to_pay" \? payOffers : OFFER_REQUIRED\.has\(outcome\) \? offers : talkedOffers/);
  assert.match(panel, /const \[talkedOffers, setTalkedOffers\] = useState<CloserOfferId\[\]>\(\[\]\);/);
  assert.match(panel, /const \[payOffers, setPayOffers\] = useState<CloserOfferId\[\]>\(payStartingOffers\);/);
  const reset = panel.slice(panel.indexOf("function reset()"));
  const resetBody = reset.slice(0, reset.indexOf("\n  }\n"));
  assert.ok(resetBody.includes("setTalkedOffers([])"));
  assert.ok(resetBody.includes("setPayOffers(payStartingOffers)"));
  assert.ok(resetBody.includes("setOffers(startingOffers)"));
});

test("coming back from a call never moves the page; a button offers the way to log it", () => {
  // Armed by a tap on a call link, shown on every return until step 1 is answered.
  assert.equal(showsLogPrompt({ visible: true, called: true, outcome: null }), true);
  assert.equal(showsLogPrompt({ visible: true, called: true, outcome: null, reach: null }), true);
  assert.equal(showsLogPrompt({ visible: false, called: true, outcome: null }), false);
  assert.equal(showsLogPrompt({ visible: true, called: false, outcome: null }), false);
  assert.equal(showsLogPrompt({ visible: true, called: true, outcome: "call_back" }), false);
  assert.equal(showsLogPrompt({ visible: true, called: true, outcome: null, reach: "talked" }), false, "step 1 is answered, step 2 is not yet");

  const panel = src(PANEL);
  const handler = panel.slice(panel.indexOf("function onVisibility()"), panel.indexOf('document.addEventListener("click"'));
  assert.ok(handler.includes("showsLogPrompt("), handler);
  assert.ok(!/\.focus\(|scrollIntoView|scrollTo/.test(handler), `returning to the page must not move it: ${handler}`);
  assert.ok(!/calledRef\.current = false/.test(handler), "a glance during the call does not use up the tap");
  assert.match(handler, /setLogPrompt\(true\)/);
  // Choosing an outcome, Log another call, and a save disarm it, so a later tab switch shows nothing.
  const bodyOf = (fn: string) => {
    const from = panel.slice(panel.indexOf(fn));
    return from.slice(0, from.indexOf("\n  }\n"));
  };
  assert.ok(bodyOf("function choose(").includes("disarmLogPrompt()"));
  assert.ok(bodyOf("function chooseReach(").includes("disarmLogPrompt()"));
  assert.ok(bodyOf("function reset(").includes("disarmLogPrompt()"));
  assert.ok(bodyOf("function reset(").includes("setReach(null)"), "Log another call starts again at step 1");
  assert.match(panel, /disarmLogPrompt\(\);\s+setSaved\(shown\)/);
  assert.match(bodyOf("function disarmLogPrompt("), /calledRef\.current = false;\s+setLogPrompt\(false\)/);
  assert.match(handler, /reach: reachRef\.current/);
  assert.match(panel, /\{logPrompt && !reach \? \(\s*<LogCallPrompt/);

  // The button, Log another call, and an early Save go to "Did you reach them?", never out of a field being typed in.
  assert.match(panel, /<legend id=\{ids\.reach\} ref=\{legendRef\} tabIndex=\{-1\}[^>]*>\s*Did you reach them\?/);
  assert.match(panel, /<legend id=\{ids\.next\} ref=\{nextLegendRef\} tabIndex=\{-1\}[^>]*>\s*What happens next\?/);
  const prompt = panel.slice(panel.indexOf("<LogCallPrompt"), panel.indexOf("/>", panel.indexOf("<LogCallPrompt")));
  assert.match(prompt, /focusQuestion\(legendRef\)/);
  assert.match(bodyOf("function reset("), /focusQuestion\(legendRef\)/);
  assert.match(bodyOf("async function save("), /focusQuestion\(reach === "talked" \? nextLegendRef : legendRef\)/);
  assert.ok(!/(legendRef|nextLegendRef)\.current\?\.focus\(\)/.test(panel), "every move to a question goes through focusQuestion");
  assert.match(bodyOf("function focusQuestion("), /if \([^)]*isTypingField\(document\.activeElement[^)]*\)\) return;\s*ref\.current\?\.focus\(\);/);
  for (const [el, typing] of [
    [{ tagName: "TEXTAREA" }, true],
    [{ tagName: "INPUT" }, true],
    [{ tagName: "INPUT", type: "text" }, true],
    [{ tagName: "INPUT", type: "date" }, true],
    [{ tagName: "INPUT", type: "time" }, true],
    [{ tagName: "SELECT" }, true],
    [{ tagName: "DIV", isContentEditable: true }, true],
    [{ tagName: "INPUT", type: "radio" }, false],
    [{ tagName: "INPUT", type: "checkbox" }, false],
    [{ tagName: "BUTTON", type: "submit" }, false],
    [{ tagName: "A" }, false],
    [{ tagName: "BODY" }, false],
    [null, false],
  ] as const) {
    assert.equal(isTypingField(el), typing, JSON.stringify(el));
  }

  // The button: a real button, 44px tall, fixed clear of the iPhone home bar, plain copy.
  const html = renderToStaticMarkup(createElement(LogCallPrompt, { onClick: () => {} }));
  assert.match(html, /<button type="button"[^>]*min-h-\[44px\][^>]*>Log how the call went<\/button>/);
  assert.match(html, /class="[^"]*\bfixed\b[^"]*safe-area-inset-bottom/);
  assert.deepEqual(copyProblems(textOf(html)), []);
  // Nothing shows before a call.
  assert.ok(!render(sampleProps()).includes("Log how the call went"));
});

test("after a save on the call card, Next call is the first thing to tap; without a queue nothing changes", () => {
  // The link and its words: a count only when it is a whole number above 0.
  const NEXT = "/admin/call-sheet/next?skip=abc";
  assert.deepEqual(nextCallLink({ nextHref: NEXT, left: 4 }, false), { href: NEXT, label: "Next call · 4 left" });
  assert.equal(nextCallLink({ nextHref: NEXT, left: 1 }, false)?.label, "Next call · 1 left");
  for (const left of [null, -2, 2.5, Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.equal(nextCallLink({ nextHref: NEXT, left }, false)?.label, "Next call", String(left));
  }
  // The last person of a run: nobody after this one, so the same link says the list is done.
  assert.deepEqual(nextCallLink({ nextHref: NEXT, left: 0 }, false), { href: NEXT, label: "Finish the list" });
  assert.equal(nextCallLink({ nextHref: NEXT, left: 0 }, true), null, "the sample never offers it");
  assert.equal(nextCallLink({ nextHref: "https://example.test/next", left: 0 }, false), null, "still a same-site path only");
  // No queue (the Sales Desk), the sample, and anything but a same-site path show nothing new.
  assert.equal(nextCallLink(null, false), null);
  assert.equal(nextCallLink(undefined, false), null);
  assert.equal(nextCallLink({ nextHref: NEXT, left: 4 }, true), null, "the sample never offers it");
  for (const href of ["https://example.test/next", "//example.test/next", "/\\example.test", "javascript:void(0)", ""]) {
    assert.equal(nextCallLink({ nextHref: href, left: 3 }, false), null, href);
  }

  const saved: SavedCall = {
    ok: true,
    outcome: "call_back",
    duplicate: false,
    landed: [],
    warnings: [],
    summary: "Call back set for Thu, Sep 24 at 10:00 AM.",
    nextFollowUpAt: "2026-09-24T15:00:00.000Z",
    nextFollowUpLabel: "Thu, Sep 24 at 10:00 AM",
    preview: [],
    payDoors: [],
    payMessage: null,
    proposalHref: null,
  };
  const view = (overrides: Partial<SavedCallViewProps>) =>
    renderToStaticMarkup(
      createElement(SavedCallView, {
        saved,
        leadFirstName: "Dana",
        canText: true,
        smsHref: "sms:+19035550100",
        hasEmail: true,
        mailHref: "mailto:dana@example.test",
        nextCall: null,
        backHref: "/admin/call-sheet",
        backLabel: "Back to the call sheet",
        onLogAnother: () => {},
        ...overrides,
      }),
    );
  const order = (html: string, needles: string[]) => {
    const at = needles.map((n) => html.indexOf(n));
    at.forEach((i, k) => assert.ok(i >= 0, needles[k]));
    for (let k = 1; k < at.length; k += 1) assert.ok(at[k - 1] < at[k], `${needles[k - 1]} before ${needles[k]}`);
  };
  const primaries = (html: string) => (html.match(/class="btn-primary\b/g) ?? []).length;

  // With a queue: announced and focusable first, then Next call, then the two quiet ways out.
  const queued = view({ nextCall: nextCallLink({ nextHref: NEXT, left: 3 }, false) });
  assert.match(queued, /role="status" tabindex="-1"/);
  order(queued, ['role="status"', "data-next-call", ">Log another call<", ">Back to the call sheet<"]);
  const link = /<a href="([^"]+)" data-next-call=""[^>]*class="([^"]*)"[^>]*>([^<]*)</.exec(queued);
  assert.ok(link, queued);
  assert.equal(link[1].replace(/&amp;/g, "&"), NEXT);
  assert.equal(link[3], "Next call · 3 left");
  assert.match(link[2], /\bbtn-primary\b/);
  assert.match(link[2], /\bmin-h-\[56px\]/);
  assert.match(link[2], /\bw-full\b/);
  assert.equal(primaries(queued), 1, "one primary action");
  assert.deepEqual(copyProblems(textOf(queued)), []);

  // The last call of a run: the same big first button, saying the list is done instead of Next call.
  const last = view({ nextCall: nextCallLink({ nextHref: NEXT, left: 0 }, false) });
  order(last, ['role="status"', "data-next-call", ">Log another call<", ">Back to the call sheet<"]);
  const finish = /<a href="([^"]+)" data-next-call=""[^>]*class="([^"]*)"[^>]*>([^<]*)</.exec(last);
  assert.ok(finish, last);
  assert.equal(finish[1].replace(/&amp;/g, "&"), NEXT);
  assert.equal(finish[3], "Finish the list");
  assert.match(finish[2], /\bbtn-primary\b/);
  assert.match(finish[2], /\bmin-h-\[56px\]/);
  assert.ok(!textOf(last).includes("Next call"), textOf(last));
  assert.equal(primaries(last), 1, "one primary action");
  assert.deepEqual(copyProblems(textOf(last)), []);

  // With a proposal to draft too, Next call still comes first and the proposal steps back.
  const proposal = { ...saved, outcome: "wants_proposal" as const, proposalHref: "/admin/proposals/lead-a?offers=website_launch" };
  const both = view({ saved: proposal, proposalAllowed: true, nextCall: nextCallLink({ nextHref: NEXT, left: null }, false) });
  order(both, ["data-next-call", ">Draft the proposal now<", ">Log another call<"]);
  assert.ok(textOf(both).includes("Next call") && !textOf(both).includes("left"), textOf(both));
  assert.equal(primaries(both), 1);

  // Without a queue the saved view is what it was: no Next call, and the proposal is the primary.
  const plain = view({ saved: proposal, proposalAllowed: true });
  assert.ok(!plain.includes("Next call") && !plain.includes("data-next-call"), plain);
  assert.match(plain, /<a href="\/admin\/proposals\/[^"]+" class="btn-primary\b[^"]*">Draft the proposal now<\/a>/);
  order(plain, ['role="status"', ">Draft the proposal now<", ">Log another call<", ">Back to the call sheet<"]);
  assert.deepEqual(copyProblems(textOf(plain)), []);

  // The panel wires it: the queue prop through nextCallLink (so the sample never shows it). Before a
  // save a queue changes nothing, and the Sales Desk's compact panel passes none.
  assert.match(src(PANEL), /nextCall=\{nextCallLink\(queue, sample\)\}/);
  assert.match(src(PANEL), /queue\?: CallQueueHandoff \| null;/);
  assert.equal(render(sampleProps({ queue: { nextHref: NEXT, left: 2 } })), render(sampleProps()));
  assert.equal(render(sampleProps({ sample: false, queue: { nextHref: NEXT, left: 2 } })), render(sampleProps({ sample: false })));
  assert.ok(!/\bqueue[=:]/.test(src(SALES_WORKSPACE)), "the Sales Desk panel has no queue");
});

test("an 'already saved' answer carries the outcome that was saved, and the warning says how to log a different one", () => {
  const dup = readSaved(
    { ok: true, duplicate: true, outcome: "call_back", summary: "This call was already saved. Nothing was saved twice.", payDoors: [], payMessage: null, proposalHref: null },
    "ready_to_pay",
  );
  assert.ok(dup);
  assert.equal(dup.outcome, "call_back", "the saved outcome, not the edit on screen");
  assert.deepEqual(dup.payDoors, []);
  // An answer without a readable outcome keeps the one on screen.
  assert.equal(readSaved({ ok: true, summary: "Saved.", outcome: "sold" }, "no_answer")?.outcome, "no_answer");
  assert.equal(readSaved({ ok: true, summary: "Saved." }, "no_answer")?.outcome, "no_answer");
  assert.match(EDITS_NOT_SAVED_WARNING, /Anything below is for the call that was saved\./);
  assert.match(EDITS_NOT_SAVED_WARNING, /tap Log another call/);
  assert.match(src(PANEL), />\s*Log another call\s*</, "the warning names a real button");
});

test("save keys: a refused save changes key when edited; an unanswered save keeps its key until one succeeds", () => {
  let n = 0;
  const mint = () => `key-${(n += 1).toString().padStart(20, "0")}`;
  const start: SaveMemory = { key: "key-start-000000000000000", failedPayload: null, uncertainPayloads: [] };
  const A = JSON.stringify({ outcome: "booked", note: "first" });
  const B = JSON.stringify({ outcome: "booked", note: "first, and one more line" });

  // The first save uses the key minted on mount.
  assert.equal(keyForSave(start, A, mint), start.key);

  // The route refused it with its own error: nothing landed, so an edit is a new save.
  const refused = afterSave(start, A, { kind: "refused" }, mint).memory;
  assert.equal(keyForSave(refused, A, mint), start.key, "the same save again keeps its key");
  assert.notEqual(keyForSave(refused, B, mint), start.key, "an edited save after a refusal gets a new key");

  // The connection dropped: the save may have landed, so even an edited save keeps the key.
  const dropped = afterSave(start, A, { kind: "unknown" }, mint).memory;
  assert.deepEqual(dropped.uncertainPayloads, [A]);
  assert.equal(keyForSave(dropped, B, mint), start.key);
  // Still true after a later refusal: only a success clears it.
  const thenRefused = afterSave(dropped, B, { kind: "refused" }, mint).memory;
  assert.equal(keyForSave(thenRefused, B, mint), start.key);

  // The edited retry comes back "already saved": the edits were not saved, and the panel says so.
  const dup = afterSave(dropped, B, { kind: "saved", duplicate: true }, mint);
  assert.equal(dup.editsLost, true);
  assert.notEqual(dup.memory.key, start.key, "a success mints a new key");
  assert.deepEqual(dup.memory.uncertainPayloads, []);
  // The unchanged retry coming back "already saved" lost nothing.
  assert.equal(afterSave(dropped, A, { kind: "saved", duplicate: true }, mint).editsLost, false);
  // A fresh save (not a duplicate) lost nothing either.
  assert.equal(afterSave(dropped, B, { kind: "saved", duplicate: false }, mint).editsLost, false);

  // What counts as which.
  assert.deepEqual(classifySave(null, null), { kind: "unknown" }, "fetch threw");
  assert.deepEqual(classifySave({ ok: false }, null), { kind: "unknown" }, "a platform error page");
  assert.deepEqual(classifySave({ ok: false }, { ok: false, error: "x" }), { kind: "refused" });
  assert.deepEqual(classifySave({ ok: true }, { ok: true, summary: "Saved.", duplicate: true }), { kind: "saved", duplicate: true });
  assert.deepEqual(classifySave({ ok: true }, "<html>"), { kind: "unknown" });

  // The wording never claims nothing was saved when that is not known.
  for (const message of [UNCERTAIN_SAVE_MESSAGE, EDITS_NOT_SAVED_WARNING]) assert.deepEqual(copyProblems(message), [], message);
  assert.match(UNCERTAIN_SAVE_MESSAGE, /may already be saved/);
  for (const file of [PANEL, SENT_BUTTON]) {
    assert.ok(!/nothing was (saved|recorded) yet/.test(src(file)), `${file} does not promise nothing landed after a dropped connection`);
  }
});

test("the panel's typing fields are 16px on phones so iOS does not zoom, and 14px from sm up", () => {
  const booked = render(sampleProps({ initialOutcome: "booked" }));
  for (const type of ["date", "time"]) {
    for (const { tag } of inputs(booked, type)) assert.match(tag, /class="[^"]*\btext-base sm:text-sm\b/, tag);
  }
  const textarea = /<textarea\b[^>]*>/.exec(booked)?.[0] ?? "";
  assert.match(textarea, /class="[^"]*\btext-base sm:text-sm\b/, textarea);
  assert.match(src(PANEL), /className="input min-h-\[44px\] text-base sm:text-sm"\s+value=\{placeOther\}/, "the Where exactly field");
});

test("not a fit lists every reason as a labelled radio", () => {
  const html = render(sampleProps({ initialOutcome: "not_a_fit" }));
  assertLabelled(html, "radio", REACH_CHOICES.length + NEXT_OUTCOMES.length + LOST_REASONS.length);
  for (const r of LOST_REASONS) assert.ok(html.includes(r.label), r.id);
  assert.match(html, /maxLength="2000"|maxlength="2000"/);
});

test("every panel outcome renders clean copy with the sample lead", () => {
  for (const outcome of PANEL_OUTCOMES as readonly CallOutcome[]) {
    const text = textOf(render(sampleProps({ initialOutcome: outcome })));
    assert.deepEqual(copyProblems(text), [], outcome);
    assert.ok(!/\bundefined\b|\bNaN\b|\[object Object\]/.test(text), outcome);
  }
});

test("stripActivityMarkers hides the Call Closer's bookkeeping, and only at the end", () => {
  const detail = "Call: wants a proposal for Website Launch. Proposal due Thu, Sep 24. Outcome: wants_proposal. Offer ids: website_launch. Ref 3f2b8c1e-5a4d-4e6f-9b7a-0c1d2e3f4a5b";
  assert.equal(stripActivityMarkers(detail), "Call: wants a proposal for Website Launch. Proposal due Thu, Sep 24.");
  assert.equal(stripActivityMarkers(SAMPLE_CALL_ACTIVITY[0]), "Call: no answer. Try again Tue, Sep 22 at 10:00 AM.");
  assert.equal(stripActivityMarkers("Stage: New to Contacted"), "Stage: New to Contacted");
  assert.equal(stripActivityMarkers("They said Outcome: great. Call Friday."), "They said Outcome: great. Call Friday.");
  const timeline = buildLeadTimeline({
    lead: { id: "lead-a", created_at: "2026-09-21T19:12:00Z", full_name: "Dana Sample", source: "meta_lead_ad", notes: null },
    activity: [{ id: "a1", lead_id: "lead-a", kind: "call", detail, created_at: "2026-09-22T15:05:00Z" }],
  });
  const entry = timeline.find((e) => e.id === "activity:a1");
  assert.ok(entry);
  assert.ok(!/Outcome:|Offer ids:|Ref /.test(entry.body), entry.body);
});

// ------------------------------------------------------------------------
// The two server pages, run for real against a fake database. Each page is
// compiled the way Next compiles it, its imports are handed the same modules
// the app uses (Next itself and the database are stubs), and every table read
// is recorded, so "auth before any lead read" is checked by behaviour, not
// only by where the words sit in the file.

const requireReal = createRequire(import.meta.url);
const LEAD_ID = "5b0f3a52-8f4e-4c0e-9a3d-2f1e6c7d8a90";

type Harness = {
  signedIn?: boolean;
  role?: string;
  lead?: Record<string, unknown> | null;
  leadError?: boolean;
  notes?: Record<string, unknown>[];
  notesError?: boolean;
  activity?: Record<string, unknown>[];
  activityError?: boolean;
  /** lead_calls rows (Quo calls). */
  quoCalls?: Record<string, unknown>[];
  quoCallsError?: boolean;
  /** lead_messages rows (the thread). */
  messages?: Record<string, unknown>[];
  messagesError?: boolean;
};

class Redirect extends Error {
  url: string;
  constructor(url: string) {
    super(`redirect ${url}`);
    this.url = url;
  }
}
class NotFound extends Error {}

function fakeDb(h: Harness, reads: string[]) {
  return {
    auth: {
      getUser: async () => ({ data: { user: h.signedIn === false ? null : { id: "staff-ryan", email: "owner@example.test" } } }),
    },
    from(table: string) {
      reads.push(table);
      const result = () => {
        if (table === "profiles") return { data: { role: h.role ?? "admin", full_name: "Ryan Sample" }, error: null };
        if (table === "leads") return h.leadError ? { data: null, error: { message: "offline" } } : { data: h.lead ?? null, error: null };
        if (table === "lead_notes") return h.notesError ? { data: null, error: { message: "offline" } } : { data: h.notes ?? [], error: null };
        if (table === "lead_activity") return h.activityError ? { data: null, error: { message: "offline" } } : { data: h.activity ?? [], error: null };
        if (table === "lead_calls") return h.quoCallsError ? { data: null, error: { message: "offline" } } : { data: h.quoCalls ?? [], error: null };
        if (table === "lead_messages") return h.messagesError ? { data: null, error: { message: "offline" } } : { data: h.messages ?? [], error: null };
        return { data: null, error: { message: `unexpected table ${table}` } };
      };
      const query: Record<string, unknown> = {};
      for (const method of ["select", "eq", "is", "order", "limit", "in", "gte", "ilike"]) query[method] = () => query;
      for (const write of ["insert", "update", "upsert", "delete", "rpc"]) {
        query[write] = () => {
          throw new Error(`the page tried to ${write} ${table}`);
        };
      }
      query.single = async () => result();
      query.maybeSingle = async () => result();
      query.then = (resolve: (value: unknown) => unknown) => Promise.resolve(result()).then(resolve);
      return query;
    },
  };
}

/** The real call sheet loader, compiled the same way, with "server-only" stubbed. */
function callSheetServerModule(): Record<string, unknown> {
  const code = ts.transpileModule(src("lib/callSheetServer.ts"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const modules: Record<string, unknown> = { "server-only": {}, "@/lib/callSheet": callSheet, "@/lib/speedToLead": speedToLead };
  const mod = { exports: {} as Record<string, unknown> };
  new Function("require", "module", "exports", code)(
    (name: string) => {
      if (!(name in modules)) throw new Error(`lib/callSheetServer.ts imports ${name}, which this harness does not expect`);
      return modules[name];
    },
    mod,
    mod.exports,
  );
  return mod.exports;
}

// next/link's prefetch is a router option, not an attribute of the <a>.
const StubLink = ({ href, children, prefetch: _prefetch, ...rest }: { href: string; children?: ReactNode; prefetch?: boolean | null }) =>
  createElement("a", { href, ...rest }, children);

function loadPage(file: string, h: Harness, extra: Record<string, unknown>) {
  const reads: string[] = [];
  const code = ts.transpileModule(src(file), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  const modules: Record<string, unknown> = {
    "react/jsx-runtime": requireReal("react/jsx-runtime"),
    "next/link": { __esModule: true, default: StubLink },
    "next/navigation": {
      redirect: (url: string) => {
        throw new Redirect(url);
      },
      notFound: () => {
        throw new NotFound("not found");
      },
    },
    "@/lib/supabase/server": { createClient: async () => fakeDb(h, reads) },
    "@/lib/businessTime": businessTime,
    "@/lib/callCloser": callCloser,
    "@/lib/callCloserFixtures": callCloserFixtures,
    "@/lib/callQueue": callQueue,
    "@/lib/callSheet": callSheet,
    "@/lib/callSheetServer": callSheetServerModule(),
    "@/lib/contactGaps": contactGaps,
    "@/lib/hq/phone": hqPhone,
    "@/lib/leadMessageAuthor": leadMessageAuthor,
    "@/lib/leadTimeline": leadTimeline,
    "@/lib/payDoors": payDoors,
    "@/lib/quo": quo,
    ...extra,
  };
  const mod: { exports: { default?: (props: unknown) => Promise<unknown> } } = { exports: {} };
  new Function("require", "module", "exports", code)(
    (name: string) => {
      if (!(name in modules)) throw new Error(`${file} imports ${name}, which this harness does not expect`);
      return modules[name];
    },
    mod,
    mod.exports,
  );
  assert.equal(typeof mod.exports.default, "function");
  return { page: mod.exports.default!, reads };
}

/** `query` is the card's URL query (a "Start calling" run). Left out, the page gets no searchParams at all. */
async function callCard(leadId: string, h: Harness = {}, query?: Record<string, string | string[]>) {
  const panels: CallOutcomePanelProps[] = [];
  const { page, reads } = loadPage(CARD_PAGE, h, {
    "./CallCardPanel": {
      __esModule: true,
      default: (props: CallOutcomePanelProps) => {
        panels.push(props);
        return createElement(CallOutcomePanel, props);
      },
    },
  });
  try {
    const element = await page(
      query === undefined ? { params: Promise.resolve({ leadId }) } : { params: Promise.resolve({ leadId }), searchParams: Promise.resolve(query) },
    );
    return { html: renderToStaticMarkup(element as never), reads, panels, redirect: null as string | null, notFound: false };
  } catch (e) {
    if (e instanceof Redirect) return { html: "", reads, panels, redirect: e.url, notFound: false };
    if (e instanceof NotFound) return { html: "", reads, panels, redirect: null, notFound: true };
    throw e;
  }
}

function realLead(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: LEAD_ID,
    created_at: "2026-09-21T19:12:00.000Z",
    full_name: "Riley Example",
    business_name: "Example Lawn Care (fictional)",
    email: "riley@example.test",
    phone: "(903) 555-0142",
    status: "contacted",
    interest: "website_launch",
    source: "website",
    utm_source: null,
    best_contact_method: "call",
    goals: "Free 30-minute consultation. Meet: Come to my business. Reach me by: Call me.\n\nWe need a site that brings in mowing quotes.",
    sms_consent: true,
    sms_unsubscribed_at: null,
    next_follow_up_at: "2026-09-25T15:00:00.000Z",
    last_contacted_at: "2026-09-21T20:00:00.000Z",
    is_test: false,
    diagnostic: { api_token: "fixture-secret", source: "website" },
    ...overrides,
  };
}

test("call card harness: signed out or not an admin, nothing about the lead is read", async () => {
  const out = await callCard(LEAD_ID, { signedIn: false });
  assert.equal(out.redirect, `/login?next=${encodeURIComponent(`/admin/call-sheet/${LEAD_ID}`)}`);
  assert.deepEqual(out.reads, []);
  const sales = await callCard(LEAD_ID, { role: "sales", lead: realLead() });
  assert.equal(sales.redirect, "/dashboard");
  assert.deepEqual(sales.reads, ["profiles"]);
  const bad = await callCard("not-a-lead-id");
  assert.ok(bad.notFound);
  assert.deepEqual(bad.reads, ["profiles"]);
});

test("call card harness: the sample renders the fictional lead in sample mode and reads no lead data", async () => {
  const out = await callCard("sample");
  assert.deepEqual(out.reads, ["profiles"]);
  const text = textOf(out.html);
  assert.ok(text.includes("Dana Sample") && text.includes("Sample Pressure Washing (fictional)"));
  assert.ok(text.includes("Sample call card."));
  assert.ok(out.html.includes('href="tel:+19035550100"'), "a dialable Call button");
  assert.ok(out.html.includes('href="sms:+19035550100"'), "texting is consented on the sample");
  assert.ok(out.html.includes('href="mailto:dana@example.test"'));
  // The sample's time came from its no-answer save (the planner's next try), not from a call back Ryan
  // picked, so the card names the time without claiming he set it.
  assert.ok(text.includes("Follow-up due now. It came due Tue, Sep 22 at 10:00 AM Central."), text);
  assert.ok(!text.includes("You set it") && !text.includes("Call back due now"), text);
  assert.ok(text.includes("In their words") && text.includes("Pressure washing, mostly driveways and house washes"));
  assert.ok(text.includes("What you can offer") && text.includes("Show every published offer"));
  assert.ok(text.includes("Last time") && text.includes("Call: no answer. Try again Tue, Sep 22 at 10:00 AM."));
  assert.ok(text.includes("Sample only, nothing is saved"));
  assert.ok(!out.html.includes("/admin/leads/sample"), "no link to a lead record that does not exist");
  assert.deepEqual(copyProblems(text), []);
});

test("call card harness: a real lead is read after auth, and links follow consent", async () => {
  const detail = "Call: talked, call back Fri, Sep 25 at 10:00 AM. Talked about Website Launch. Outcome: call_back. Offer ids: website_launch, system_map. Ref 3f2b8c1e-5a4d-4e6f-9b7a-0c1d2e3f4a5b";
  const out = await callCard(LEAD_ID, {
    lead: realLead(),
    notes: [{ body: "Call: talked, call back Fri, Sep 25 at 10:00 AM.\n\nWants mowing quotes online.", author: "Ryan", created_at: "2026-09-21T20:00:00.000Z" }],
    activity: [{ kind: "call", detail }],
  });
  assert.equal(out.redirect, null);
  assert.deepEqual(out.reads, ["profiles", "leads", "lead_notes", "lead_activity", "lead_calls", "lead_messages"]);
  const text = textOf(out.html);
  assert.ok(out.html.includes('href="tel:+19035550142"'));
  assert.ok(out.html.includes('href="sms:+19035550142"'));
  // A time still ahead is named without saying who set it: it is as often the next try after no answer.
  assert.ok(text.includes("Next follow-up: Fri, Sep 25 at 10:00 AM Central."), text);
  assert.ok(!text.includes("Call back set for"), text);
  // The consultation form's own sentence is split out of their words.
  assert.ok(text.includes("We need a site that brings in mowing quotes."));
  assert.ok(text.includes("Wants to meet: Come to my business"));
  assert.ok(!text.includes("Free 30-minute consultation."));
  // A credential-shaped diagnostic key never reaches the page.
  assert.ok(!out.html.includes("fixture-secret"));
  // The panel gets plain props: links built here, offers named on the last call, and no diagnostic.
  const panel = out.panels[0];
  assert.ok(panel);
  assert.deepEqual(panel.initialOffers, ["website_launch", "system_map"]);
  assert.deepEqual(panel.suggestedOffers, callCloser.closerOffersFor("website_launch", null).slice(0, 4));
  assert.equal(panel.priorAttempts, 0, "the last call was a conversation");
  assert.equal(panel.smsHref, "sms:+19035550142");
  assert.equal(panel.mailHref, "mailto:riley@example.test");
  assert.equal(panel.canText, true);
  assert.equal(panel.lead.diagnostic, null);
  assert.equal(panel.defaultMeetingPlace, "at their business");
  assert.equal(panel.actorName, "Ryan Sample");
  assert.equal(panel.sample, false);
  assert.equal(panel.fixedNow, null);
  assert.equal(panel.proposalAllowed, true);
  assert.ok(text.includes("Save the call"));
  assert.ok(out.html.includes(`href="/admin/leads/${LEAD_ID}"`));
});

test("call card harness: no text link after STOP or without consent, no email link for a placeholder address", async () => {
  const stopped = await callCard(LEAD_ID, { lead: realLead({ sms_unsubscribed_at: "2026-09-21T21:00:00.000Z", email: "x@no-email.facebook.lead" }) });
  assert.ok(!stopped.html.includes('href="sms:'));
  assert.ok(textOf(stopped.html).includes("Replied STOP. Call instead."));
  assert.ok(!stopped.html.includes('href="mailto:'));
  // A missing email button says why, in muted text.
  assert.ok(textOf(stopped.html).includes("Facebook did not share an email"), textOf(stopped.html));
  assert.equal(stopped.panels[0].noTextReason, "they replied STOP");
  assert.equal(stopped.panels[0].noEmailReason, "Facebook did not share an email");
  const noConsent = await callCard(LEAD_ID, { lead: realLead({ sms_consent: false }) });
  assert.ok(!noConsent.html.includes('href="sms:'));
  assert.ok(textOf(noConsent.html).includes("No text consent"));
  assert.equal(noConsent.panels[0].noTextReason, "there is no text consent on file");
  assert.equal(noConsent.panels[0].noEmailReason, null, "a real address has an email button");
  const noEmail = await callCard(LEAD_ID, { lead: realLead({ email: null }) });
  assert.ok(!noEmail.html.includes('href="mailto:'));
  assert.ok(textOf(noEmail.html).includes("No email on file"));
  assert.equal(noEmail.panels[0].noEmailReason, "there is no email on file");
});

test("contact gaps: the call sheet's texting words, and the two email cases that happen", () => {
  assert.equal(contactGaps.textGap({ phone: "(903) 555-0101", sms_consent: true, sms_unsubscribed_at: null }), null);
  assert.deepEqual(contactGaps.textGap({ phone: "(903) 555-0101", sms_consent: true, sms_unsubscribed_at: "2026-09-21T21:00:00.000Z" }), {
    label: "Replied STOP. Call instead.",
    reason: "they replied STOP",
  });
  assert.deepEqual(contactGaps.textGap({ phone: "(903) 555-0101", sms_consent: false, sms_unsubscribed_at: null }), {
    label: "No text consent",
    reason: "there is no text consent on file",
  });
  assert.equal(contactGaps.textGap({ phone: null, sms_consent: true, sms_unsubscribed_at: null })?.label, "No phone on file");
  assert.equal(contactGaps.emailGap("dana@example.test"), null);
  assert.equal(contactGaps.emailGap("123@no-email.facebook.lead")?.label, "Facebook did not share an email");
  assert.equal(contactGaps.emailGap(null)?.label, "No email on file");
  assert.equal(contactGaps.emailGap("not an email")?.label, "No email on file");
});

test("the pay-link card says why a text or an email button is missing", () => {
  const panel = src(PANEL);
  assert.match(panel, /There is no text button because \$\{noTextReason \|\| "there is no text consent on file"\}\./);
  assert.match(panel, /There is no email button because \$\{noEmailReason \|\| "there is no email on file"\}\./);
});

test("a save error takes focus; a success is a success by icon and heading, not by color alone", () => {
  const panel = src(PANEL);
  assert.match(panel, /useEffect\(\(\) => \{\s*if \(error\) alertRef\.current\?\.focus\(\);\s*\}, \[error\]\);/);
  assert.match(panel, /ref=\{alertRef\}\s*role="alert"\s*tabIndex=\{-1\}/);
  assert.match(panel, /<CheckCircle2 aria-hidden="true"/);
  assert.match(panel, /border-2 border-\[var\(--green\)\]/);
  const button = src(SENT_BUTTON);
  assert.match(button, /useEffect\(\(\) => \{\s*if \(error\) alertRef\.current\?\.focus\(\);\s*\}, \[error\]\);/);
  assert.match(button, /<CheckCircle2 aria-hidden="true"/);
});

test("the keyboard focus ring outlines the whole outcome tile, not only the small radio", () => {
  const html = render(sampleProps({ initialOutcome: "ready_to_pay" }));
  const tiles = [...html.matchAll(/<label\b[^>]*class="([^"]*)"[^>]*>\s*<input[^>]*type="(radio|checkbox)"/g)];
  // Both steps' tiles, then the offers.
  assert.ok(tiles.length > REACH_CHOICES.length + NEXT_OUTCOMES.length, String(tiles.length));
  assert.equal(tiles.filter((t) => t[2] === "radio").length, REACH_CHOICES.length + NEXT_OUTCOMES.length);
  for (const [, cls] of tiles) {
    assert.ok(cls.includes("has-[:focus-visible]:outline-2"), cls);
    assert.ok(cls.includes("has-[:focus-visible]:outline-[var(--blue)]"), cls);
  }
  for (const input of [...html.matchAll(/<input\b[^>]*type="(?:radio|checkbox)"[^>]*>/g)]) {
    assert.ok(input[0].includes("focus-visible:outline-none"), "no second ring on the control itself");
  }
});

test("call card harness: on a phone, How did the call go? comes before the offers reference", async () => {
  for (const out of [await callCard("sample"), await callCard(LEAD_ID, { lead: realLead() })]) {
    const html = out.html;
    const at = (needle: string) => {
      const i = html.indexOf(needle);
      assert.ok(i >= 0, needle);
      return i;
    };
    const header = at("Call card</p>");
    const words = at('id="call-card-words"');
    const last = at('id="call-card-last"');
    const panel = at("How did the call go?");
    const offers = at('id="call-card-offers"');
    assert.ok(header < words && words < last && last < panel && panel < offers, [header, words, last, panel, offers].join());
    // The offers reference is compact: each offer is one summary row, its terms behind it.
    const section = html.slice(offers);
    assert.ok(/<details><summary[^>]*>[\s\S]*?<\/summary><p[^>]*>/.test(section), "terms sit behind each offer's summary");
  }
});

test("call card harness: a failed read says it is a connection problem, never an empty lead", async () => {
  const down = await callCard(LEAD_ID, { leadError: true });
  assert.match(down.html, /role="alert"/);
  assert.ok(textOf(down.html).includes("This is a connection problem, not an empty lead."));
  assert.deepEqual(down.reads, ["profiles", "leads"]);
  const gone = await callCard(LEAD_ID, { lead: null });
  assert.ok(gone.notFound);
  const partial = await callCard(LEAD_ID, { lead: realLead(), notesError: true });
  assert.match(partial.html, /role="alert"/);
  assert.ok(textOf(partial.html).includes("Some of this lead's history did not load."), textOf(partial.html));
  const untouched = await callCard(LEAD_ID, { lead: realLead({ last_contacted_at: null }) });
  assert.ok(textOf(untouched.html).includes("Nobody has logged a call or a note yet. This is the first call."));
});

test("call card harness: the due banner follows the call sheet's rule, never a time nobody promised", async () => {
  // A diagnostic-style lead: next_follow_up_at is the diagnostic's stamp, and a note came after it.
  const stamp = "2025-09-19T15:00:00.000Z";
  const laterNote = { body: "Looked at their questionnaire. Calling tomorrow.", author: "Ryan", created_at: "2025-09-20T15:00:00.000Z" };
  const stamped = await callCard(LEAD_ID, { lead: realLead({ next_follow_up_at: stamp }), notes: [laterNote] });
  const stampedText = textOf(stamped.html);
  assert.ok(!stampedText.includes("Call back due now"), stampedText);
  assert.ok(!stampedText.includes("You set it"), stampedText);
  assert.ok(stampedText.includes("No call back is set."), stampedText);
  // The call sheet agrees: the time was kept, so it is not a call back.
  const sheetLead: callSheet.CallSheetLead = {
    id: LEAD_ID,
    created_at: "2025-09-19T14:00:00.000Z",
    full_name: "Riley Example",
    business_name: null,
    email: "riley@example.test",
    phone: "(903) 555-0142",
    interest: "website_launch",
    status: "contacted",
    source: "website",
    utm_source: null,
    best_contact_method: "call",
    sms_consent: false,
    sms_unsubscribed_at: null,
    is_test: false,
    next_follow_up_at: stamp,
  };
  const sheet = callSheet.buildCallSheet([sheetLead], [{ lead_id: LEAD_ID, at: laterNote.created_at, kind: "note" }], new Date());
  assert.ok(!sheet.rows.some((r) => r.tier === "callback"));

  // A logged call after the time counts as keeping it too.
  const kept = await callCard(LEAD_ID, {
    lead: realLead({ next_follow_up_at: stamp }),
    activity: [{ kind: "call", detail: "Call: talked, call back later. Outcome: call_back. Ref 3f2b8c1e-5a4d-4e6f-9b7a-0c1d2e3f4a5b", created_at: "2025-09-20T15:00:00.000Z" }],
  });
  assert.ok(!textOf(kept.html).includes("Call back due now"), textOf(kept.html));

  // A promise saved from the card (its note came before the time) is still owed once the time passes.
  const owed = await callCard(LEAD_ID, {
    lead: realLead({ next_follow_up_at: stamp }),
    notes: [{ body: "Call: talked, call back Fri, Sep 19 at 10:00 AM.", author: "Ryan", created_at: "2025-09-16T15:00:00.000Z" }],
  });
  assert.ok(textOf(owed.html).includes("Call back due now. You set it for Fri, Sep 19 at 10:00 AM Central."), textOf(owed.html));

  // With history missing, the card cannot tell, so it names the time without claiming who set it.
  const partial = await callCard(LEAD_ID, { lead: realLead({ next_follow_up_at: stamp }), notesError: true });
  const partialText = textOf(partial.html);
  assert.ok(partialText.includes("Follow-up time on file: Fri, Sep 19 at 10:00 AM Central."), partialText);
  assert.ok(!partialText.includes("You set it"), partialText);
  assert.deepEqual(copyProblems(partialText), []);
});

test("call card harness: when history fails to load, the card never claims a first call or an empty record", async () => {
  // Two missed calls on file (they do not move last_contacted_at), then both history reads fail.
  const pastStamp = "2025-09-19T15:00:00.000Z";
  const both = await callCard(LEAD_ID, {
    lead: realLead({ last_contacted_at: null, next_follow_up_at: pastStamp }),
    notesError: true,
    activityError: true,
  });
  const text = textOf(both.html);
  assert.ok(!text.includes("This is the first call"), text);
  assert.ok(!text.includes("No notes yet."), text);
  assert.ok(text.includes("The notes did not load. Open the full record to check."), text);
  assert.ok(text.includes("Follow-up time on file: Fri, Sep 19 at 10:00 AM Central."), text);
  assert.ok(text.includes("Some of this lead's history did not load."), text);
  assert.deepEqual(copyProblems(text), []);

  // Only the call entries failed: the notes read worked and came back empty, so "No notes yet." is true.
  const callsOnly = await callCard(LEAD_ID, { lead: realLead({ last_contacted_at: null }), activityError: true });
  const callsText = textOf(callsOnly.html);
  assert.ok(callsText.includes("No notes yet."), callsText);
  assert.ok(!callsText.includes("This is the first call"), callsText);

  // The Quo calls or texts failing is a partial load too.
  const quoDown = await callCard(LEAD_ID, { lead: realLead({ last_contacted_at: null }), quoCallsError: true });
  assert.ok(!textOf(quoDown.html).includes("This is the first call"));
  assert.ok(textOf(quoDown.html).includes("Some of this lead's history did not load."));
  const threadDown = await callCard(LEAD_ID, { lead: realLead({ last_contacted_at: null }), messagesError: true });
  assert.ok(!textOf(threadDown.html).includes("This is the first call"));
});

test("call card harness: a Quo call or a text a person sent is a touch, the same as on the call sheet", async () => {
  const promised = "2025-09-19T15:00:00.000Z"; // Fri, Sep 19, 2025 at 10:00 AM CDT
  const promiseNote = { body: "Call: talked, call back Fri, Sep 19 at 10:00 AM.", author: "Ryan", created_at: "2025-09-16T15:00:00.000Z" };
  const quoCall = { lead_id: LEAD_ID, started_at: "2025-09-19T15:05:00.000Z", direction: "outgoing", outcome: "answered", scope_status: "company" };
  const personText = {
    lead_id: LEAD_ID,
    direction: "out",
    channel: "sms",
    body: "Hi Riley, Ryan here. Still good for a quick call?",
    created_at: "2025-09-19T15:05:00.000Z",
    delivered: true,
  };
  const sheetLead: callSheet.CallSheetLead = {
    id: LEAD_ID,
    created_at: "2025-09-10T14:00:00.000Z",
    full_name: "Riley Example",
    business_name: null,
    email: "riley@example.test",
    phone: "(903) 555-0142",
    interest: "website_launch",
    status: "contacted",
    source: "website",
    utm_source: null,
    best_contact_method: "call",
    sms_consent: true,
    sms_unsubscribed_at: null,
    is_test: false,
    next_follow_up_at: promised,
  };
  const noteRow = { lead_id: LEAD_ID, created_at: promiseNote.created_at, body: promiseNote.body };
  const sheetRow = (calls: Record<string, unknown>[], messages: Record<string, unknown>[]) =>
    callSheet.buildCallSheet(
      [sheetLead],
      callSheet.touchesFromRows({
        notes: [noteRow],
        calls: calls as callSheet.CallSheetCallRow[],
        messages: messages as callSheet.CallSheetMessageRow[],
      }),
      new Date("2025-09-22T15:00:00.000Z"),
    ).rows[0];

  // Called from the Quo app after the promised time and they talked: kept, on the card and on the sheet.
  const called = await callCard(LEAD_ID, { lead: realLead({ next_follow_up_at: promised }), notes: [promiseNote], quoCalls: [quoCall] });
  assert.ok(!textOf(called.html).includes("Call back due now"), textOf(called.html));
  assert.ok(called.reads.includes("lead_calls") && called.reads.includes("lead_messages"));
  assert.equal(sheetRow([quoCall], []), undefined, "kept, and touched three days ago");

  // A text from the thread after the time: kept too.
  const texted = await callCard(LEAD_ID, { lead: realLead({ next_follow_up_at: promised }), notes: [promiseNote], messages: [personText] });
  assert.ok(!textOf(texted.html).includes("Call back due now"), textOf(texted.html));
  assert.equal(sheetRow([], [personText]), undefined);

  // What the sheet does not count does not keep the promise on the card either: a rejected text, the
  // automatic text-back, a missed call from the lead, and a personal call.
  const notTouches = {
    quoCalls: [
      { ...quoCall, direction: "incoming", outcome: "missed" },
      { ...quoCall, scope_status: "personal" },
    ],
    messages: [
      { ...personText, delivered: false },
      { ...personText, body: quo.INBOUND_AUTO_REPLY },
    ],
  };
  const owed = await callCard(LEAD_ID, { lead: realLead({ next_follow_up_at: promised }), notes: [promiseNote], ...notTouches });
  assert.ok(textOf(owed.html).includes("Call back due now. You set it for Fri, Sep 19 at 10:00 AM Central."), textOf(owed.html));
  // The sheet agrees the promise is owed. The missed call from the lead puts it under "They reached out", naming the time.
  const row = sheetRow(notTouches.quoCalls, notTouches.messages);
  assert.equal(row?.tier, "reply");
  assert.match(row?.reason ?? "", /Follow-up due since Fri, Sep 19 at 10:00 AM\.$/);
  assert.equal(sheetRow([], notTouches.messages)?.tier, "callback", "without the missed call it is a plain call back");

  // A Quo call before a time set on the lead page, with no note or logged call: the time is owed, not "No call back is set".
  const earlier = await callCard(LEAD_ID, {
    lead: realLead({ next_follow_up_at: promised, last_contacted_at: null }),
    quoCalls: [{ ...quoCall, started_at: "2025-09-18T15:00:00.000Z" }],
  });
  const earlierText = textOf(earlier.html);
  assert.ok(earlierText.includes("Call back due now. You set it for Fri, Sep 19 at 10:00 AM Central."), earlierText);
  assert.ok(!earlierText.includes("This is the first call"), earlierText);
  assert.deepEqual(copyProblems(earlierText), []);
});

test("call card harness: a text or a missed call from the lead since the last touch is shown before Ryan dials", async () => {
  const text = {
    lead_id: LEAD_ID,
    direction: "in",
    channel: "sms",
    body: "Can you do a quote for\n3 acres Thursday?",
    created_at: "2026-09-22T13:00:00.000Z", // Tue 8:00 AM CDT
    delivered: null,
  };
  const out = await callCard(LEAD_ID, { lead: realLead({ last_contacted_at: null }), messages: [text] });
  const t = textOf(out.html);
  assert.ok(t.includes("They reached out. They texted you Tue, Sep 22 at 8:00 AM Central, and nobody has answered since."), t);
  assert.ok(t.includes("Can you do a quote for 3 acres Thursday?"), t);
  assert.ok(t.includes("Open the thread in the full record"), t);
  assert.ok(out.html.includes(`href="/admin/leads/${LEAD_ID}"`));
  assert.deepEqual(copyProblems(t), []);

  // An email says so.
  const emailed = await callCard(LEAD_ID, { lead: realLead(), messages: [{ ...text, channel: "email" }] });
  assert.ok(textOf(emailed.html).includes("They emailed you Tue, Sep 22 at 8:00 AM Central"), textOf(emailed.html));

  // A note after it answered them: nothing to show.
  const answered = await callCard(LEAD_ID, {
    lead: realLead(),
    messages: [text],
    notes: [{ body: "Called back, quoting Thursday.", author: "Ryan", created_at: "2026-09-22T14:00:00.000Z" }],
  });
  assert.ok(!textOf(answered.html).includes("They reached out"), textOf(answered.html));

  // A missed call from the lead.
  const missedCall = { lead_id: LEAD_ID, started_at: "2026-09-22T13:30:00.000Z", direction: "incoming", outcome: "missed", scope_status: "company" };
  const missed = await callCard(LEAD_ID, { lead: realLead(), quoCalls: [missedCall] });
  const mt = textOf(missed.html);
  assert.ok(mt.includes("They reached out. They called Tue, Sep 22 at 8:30 AM Central and nobody picked up. Nobody has reached them since."), mt);
  assert.deepEqual(copyProblems(mt), []);
  // The newest wins: the missed call came after the text.
  assert.ok(textOf((await callCard(LEAD_ID, { lead: realLead(), messages: [text], quoCalls: [missedCall] })).html).includes("They called Tue, Sep 22 at 8:30 AM"));

  // A reply logged by hand is a person's note, and a personal call is not about the lead: neither is the lead reaching out.
  const logged = await callCard(LEAD_ID, { lead: realLead(), messages: [{ ...text, channel: "note" }], quoCalls: [{ ...missedCall, scope_status: "personal" }] });
  assert.ok(!textOf(logged.html).includes("They reached out"), textOf(logged.html));

  // With history missing, it names what they sent without claiming nobody answered.
  const partial = await callCard(LEAD_ID, { lead: realLead(), messages: [text], notesError: true });
  const pt = textOf(partial.html);
  assert.ok(pt.includes("They reached out. They texted you Tue, Sep 22 at 8:00 AM Central."), pt);
  assert.ok(!pt.includes("nobody has answered since"), pt);

  // The sample reads no thread and shows none.
  assert.ok(!textOf((await callCard("sample")).html).includes("They reached out"));
});

test("call card harness: a sent proposal ends the run of missed calls; other Sales Desk entries are not calls", async () => {
  const ref = (c: string) => `Ref ${c.repeat(36)}`;
  const activity = [
    {
      kind: "sales",
      detail: `Proposal sent for Website Launch. Follow up Thu, Sep 24 at 9:00 AM. Outcome: proposal_sent. Offer ids: website_launch. ${ref("e")}`,
      created_at: "2026-09-22T14:00:00.000Z",
    },
    { kind: "call", detail: `Call: left a voicemail. Outcome: voicemail. ${ref("f")}`, created_at: "2026-09-21T20:00:00.000Z" },
    { kind: "call", detail: `Call: no answer. Outcome: no_answer. ${ref("a")}`, created_at: "2026-09-21T15:00:00.000Z" },
  ];
  const withProposal = await callCard(LEAD_ID, { lead: realLead(), activity });
  assert.equal(withProposal.panels[0].priorAttempts, 0, "the proposal ended the run");
  assert.deepEqual(withProposal.panels[0].initialOffers, ["website_launch"], "the proposal's offers start checked");
  const misses = await callCard(LEAD_ID, { lead: realLead(), activity: activity.slice(1) });
  assert.equal(misses.panels[0].priorAttempts, 2);

  // A stage or priority change on the Sales Desk is neither a call nor a touch.
  const desk = await callCard(LEAD_ID, {
    lead: realLead({ last_contacted_at: null }),
    activity: [{ kind: "sales", detail: "Ryan Sample: Priority set to high", created_at: "2026-09-22T14:30:00.000Z" }],
  });
  assert.ok(textOf(desk.html).includes("Nobody has logged a call or a note yet. This is the first call."), textOf(desk.html));
  // The Sales Desk counts tries from the same entries.
  const workspace = src(SALES_WORKSPACE);
  assert.ok(workspace.includes("isCallHistoryEntry(item.kind, item.detail)"));
  assert.ok(!workspace.includes('item.kind === "call"'));
});

test("call card layout: one column that cannot grow past the phone, and long words wrap anywhere", () => {
  const page = src(CARD_PAGE);
  assert.match(page, /className="mx-auto grid max-w-2xl grid-cols-1 gap-4"/);
  assert.ok(!/className="mx-auto grid max-w-2xl gap-4"/.test(page), "every wrapper grid has an explicit single column");
  assert.match(page, /<blockquote[^>]*\[overflow-wrap:anywhere\]/);
  assert.match(src(PANEL), /whitespace-pre-wrap[^"]*\[overflow-wrap:anywhere\]/, "the pay message wraps a long link");
});

test("call card harness: a Start calling run shows the bar, skips forward, and hands the panel the next person", async () => {
  const earlier = ["0a1b2c3d-0000-4000-8000-000000000001", "0a1b2c3d-0000-4000-8000-000000000002"];
  const next = `/admin/call-sheet/next?skip=${[...earlier, LEAD_ID].join(",")}`;
  const run = await callCard(LEAD_ID, { lead: realLead() }, { queue: "1", left: "5", skip: earlier.join(",") });
  assert.equal(run.redirect, null);
  // The run reads nothing extra, and auth still comes first.
  assert.deepEqual(run.reads, ["profiles", "leads", "lead_notes", "lead_activity", "lead_calls", "lead_messages"]);
  const text = textOf(run.html);
  assert.ok(text.includes("Going down today's list · 5 left"), text);
  assert.match(run.html, /<a href="[^"]*"[^>]*min-h-\[44px\][^>]*>Skip for now<\/a>/, "Skip for now is a 44px link");
  assert.ok(run.html.includes(`href="${next}"`), "Skip for now adds this person to the run's skip list");
  // The bar is the first thing on the card.
  assert.ok(run.html.indexOf("Going down today") < run.html.indexOf("Back to the call sheet"));
  assert.ok(run.html.indexOf("Going down today") < run.html.indexOf("Call card</p>"));
  // After a save, Next call goes the same way, counting the people after this one.
  assert.deepEqual(run.panels[0].queue, { nextHref: next, left: 4 });
  assert.deepEqual(copyProblems(text), []);

  // Opened from the list: no bar, and Next call still never comes back to this person.
  const plain = await callCard(LEAD_ID, { lead: realLead() });
  assert.ok(!plain.html.includes("Going down today") && !plain.html.includes("Skip for now"));
  assert.deepEqual(plain.panels[0].queue, { nextHref: `/admin/call-sheet/next?skip=${LEAD_ID}`, left: null });

  // Junk in the URL is dropped, never echoed, and an unreadable count is left off.
  const junk = await callCard(LEAD_ID, { lead: realLead() }, { queue: "1", left: "lots", skip: `"><script>x</script>,${earlier[0].toUpperCase()}` });
  assert.ok(!junk.html.includes("<script>"));
  assert.ok(textOf(junk.html).includes("Going down today's list Skip for now"), textOf(junk.html));
  assert.deepEqual(junk.panels[0].queue, { nextHref: `/admin/call-sheet/next?skip=${earlier[0]},${LEAD_ID}`, left: null });

  // The sample never joins a run and passes the panel nothing.
  const sample = await callCard("sample", {}, { queue: "1", left: "3" });
  assert.ok(!sample.html.includes("Going down today"));
  assert.ok(!("queue" in sample.panels[0]), "no queue prop in sample mode");

  // A failed read keeps the run's place: Try again returns to this card in the run, Skip for now moves on.
  const down = await callCard(LEAD_ID, { leadError: true }, { queue: "1", left: "5", skip: earlier.join(",") });
  assert.ok(textOf(down.html).includes("This is a connection problem, not an empty lead."));
  assert.ok(down.html.includes(`href="/admin/call-sheet/${LEAD_ID}?queue=1&amp;left=5&amp;skip=${earlier.join("%2C")}"`), down.html);
  assert.ok(down.html.includes(`href="${next}"`));
  assert.deepEqual(down.reads, ["profiles", "leads"]);
});

test("call card harness: the last card of a run hands the panel a count of 0, so its button says Finish the list", async () => {
  const lastCard = await callCard(LEAD_ID, { lead: realLead() }, { queue: "1", left: "1" });
  assert.ok(textOf(lastCard.html).includes("Going down today's list · 1 left"));
  const queue = lastCard.panels[0].queue;
  assert.ok(queue);
  assert.equal(queue.left, 0);
  assert.equal(nextCallLink(queue, false)?.label, "Finish the list");
  // Outside a run the count is unknown, so it stays Next call.
  const plain = await callCard(LEAD_ID, { lead: realLead() });
  assert.equal(nextCallLink(plain.panels[0].queue, false)?.label, "Next call");
});

test("call card harness: Back after a save says the call is already logged, plainly, above the panel", async () => {
  const REF = "Ref 3f2b8c1e-5a4d-4e6f-9b7a-0c1d2e3f4a5b";
  const ago = (minutes: number, seconds = 5) => new Date(Date.now() - minutes * 60_000 - seconds * 1000).toISOString();
  const noAnswer = (created_at: string) => ({ kind: "call", detail: `Call: no answer. Try again Fri, Sep 25 at 10:00 AM. Outcome: no_answer. ${REF}`, created_at });
  const recentTag = (html: string) => /<p([^>]*)data-recent-call=""[^>]*>([^<]*)<\/p>/.exec(html);

  const out = await callCard(LEAD_ID, { lead: realLead(), activity: [noAnswer(ago(4))] });
  const line = "You logged a call with Riley 4 minutes ago: No answer. Only log again if you called again.";
  const text = textOf(out.html);
  assert.ok(text.includes(line), text);
  // Right above "How did the call go?", after what was said last time.
  assert.ok(out.html.indexOf("You logged a call") > out.html.indexOf('id="call-card-last"'));
  assert.ok(out.html.indexOf("You logged a call") < out.html.indexOf("How did the call go?"));
  // Plain: no alert, no live region, no alarm color.
  const tag = recentTag(out.html);
  assert.ok(tag, out.html);
  assert.ok(!/\brole=/.test(tag[1]), tag[1]);
  assert.ok(!/warn|danger|red|amber/.test(tag[1]), tag[1]);
  assert.equal((out.html.match(/You logged a call/g) ?? []).length, 1);
  assert.deepEqual(copyProblems(text), []);
  // The page reads nothing extra for it.
  assert.deepEqual(out.reads, ["profiles", "leads", "lead_notes", "lead_activity", "lead_calls", "lead_messages"]);

  // The words follow the minutes and the outcome saved.
  const said = async (activity: Record<string, unknown>[], lead = realLead()) => textOf((await callCard(LEAD_ID, { lead, activity })).html);
  assert.ok((await said([noAnswer(ago(0, 10))])).includes("You logged a call with Riley less than a minute ago: No answer."));
  assert.ok((await said([noAnswer(ago(1))])).includes("You logged a call with Riley 1 minute ago: No answer."));
  assert.ok((await said([noAnswer(ago(29))])).includes("29 minutes ago: No answer."));
  // The newest call wins.
  const both = await said([
    { kind: "call", detail: `Call: talked, call back Fri, Sep 25 at 10:00 AM. Outcome: call_back. ${REF}`, created_at: ago(20) },
    { kind: "call", detail: `Call: left a voicemail. Try again Fri, Sep 25 at 10:00 AM. Outcome: voicemail. ${REF}`, created_at: ago(3) },
  ]);
  assert.ok(both.includes("You logged a call with Riley 3 minutes ago: Left a voicemail. Only log again if you called again."), both);
  assert.ok((await said([{ kind: "call", detail: `Call: talked, call back Fri, Sep 25 at 10:00 AM. Outcome: call_back. ${REF}`, created_at: ago(6) }])).includes(
    "6 minutes ago: Talked, call back later.",
  ));
  // No usable name: never "with Facebook".
  assert.ok((await said([noAnswer(ago(2))], realLead({ full_name: "Facebook lead" }))).includes("You logged a call with this lead 2 minutes ago"));

  // Thirty minutes or older, a sent proposal (not a call), or an entry without a time: no line.
  for (const activity of [
    [noAnswer(ago(30, 0))],
    [noAnswer(ago(45))],
    [{ kind: "sales", detail: `Proposal sent for Website Launch. Follow up Thu, Sep 24 at 9:00 AM. Outcome: proposal_sent. Offer ids: website_launch. ${REF}`, created_at: ago(2) }],
    [{ kind: "call", detail: `Call: no answer. Outcome: no_answer. ${REF}` }],
  ]) {
    const quiet = await callCard(LEAD_ID, { lead: realLead(), activity });
    assert.ok(!quiet.html.includes("You logged a call"), JSON.stringify(activity));
  }
  // The sample never shows it.
  assert.ok(!(await callCard("sample")).html.includes("You logged a call"));
  // The wording in the source has no long dashes and no alert.
  const page = src(CARD_PAGE);
  assert.ok(page.includes("Only log again if you called again."));
  const block = page.slice(page.indexOf("{recentLine ? ("), page.indexOf("<CallCardPanel"));
  assert.ok(block.length > 0 && !/role=|warn|danger/.test(block), block);
});

test("call card harness: the header names a follow-up time without claiming Ryan set it, unless he picked it", async () => {
  const REF = "Ref 3f2b8c1e-5a4d-4e6f-9b7a-0c1d2e3f4a5b";
  // A no-answer retry still ahead: neutral.
  const ahead = "2027-01-15T16:00:00.000Z";
  const retryAhead = await callCard(LEAD_ID, {
    lead: realLead({ next_follow_up_at: ahead }),
    activity: [{ kind: "call", detail: `Call: no answer. Try again ${businessTime.formatCentral(new Date(ahead))}. Outcome: no_answer. ${REF}`, created_at: "2026-09-21T20:00:00.000Z" }],
  });
  const aheadText = textOf(retryAhead.html);
  assert.ok(aheadText.includes(`Next follow-up: ${businessTime.formatCentral(new Date(ahead))} Central.`), aheadText);
  assert.ok(!aheadText.includes("Call back set for") && !aheadText.includes("You set it"), aheadText);
  assert.deepEqual(copyProblems(aheadText), []);

  // The planner's time came due (the next try after no answer, a proposal due date): neutral, still due.
  const stamp = "2025-09-19T15:00:00.000Z";
  for (const detail of [
    `Call: no answer. Try again Fri, Sep 19 at 10:00 AM. Outcome: no_answer. ${REF}`,
    `Call: left a voicemail. Try again Fri, Sep 19 at 10:00 AM. Outcome: voicemail. ${REF}`,
    `Call: wants a proposal for Website Launch. Proposal due Fri, Sep 19. Outcome: wants_proposal. Offer ids: website_launch. ${REF}`,
  ]) {
    const due = await callCard(LEAD_ID, {
      lead: realLead({ next_follow_up_at: stamp }),
      activity: [{ kind: "call", detail, created_at: "2025-09-16T15:00:00.000Z" }],
    });
    const dueText = textOf(due.html);
    assert.ok(dueText.includes("Follow-up due now. It came due Fri, Sep 19 at 10:00 AM Central."), dueText);
    assert.ok(!dueText.includes("You set it") && !dueText.includes("Call back due now"), dueText);
    assert.deepEqual(copyProblems(dueText), []);
  }

  // A call back Ryan picked, logged by the Call Closer, keeps "You set it" once it is due.
  const picked = await callCard(LEAD_ID, {
    lead: realLead({ next_follow_up_at: stamp }),
    activity: [{ kind: "call", detail: `Call: talked, call back Fri, Sep 19 at 10:00 AM. Outcome: call_back. ${REF}`, created_at: "2025-09-16T15:00:00.000Z" }],
  });
  assert.ok(textOf(picked.html).includes("Call back due now. You set it for Fri, Sep 19 at 10:00 AM Central."), textOf(picked.html));
});

test("call card harness: the Call button reads the number it dials, formatted like the rest of the back office", async () => {
  const us = await callCard(LEAD_ID, { lead: realLead({ phone: "+19035550105" }) });
  assert.ok(us.html.includes('href="tel:+19035550105"'));
  assert.match(us.html, /<a href="tel:\+19035550105"[^>]*>Call \(903\) 555-0105<\/a>/);
  assert.ok(!textOf(us.html).includes("Call +19035550105"));
  // Stored in another shape, the same number and the same label.
  const typed = await callCard(LEAD_ID, { lead: realLead({ phone: "903.555.0105" }) });
  assert.match(typed.html, /<a href="tel:\+19035550105"[^>]*>Call \(903\) 555-0105<\/a>/);
  // A number outside the US is shown as dialed, never reshaped into a different one.
  const abroad = await callCard(LEAD_ID, { lead: realLead({ phone: "+447911123456" }) });
  assert.match(abroad.html, /<a href="tel:\+447911123456"[^>]*>Call \+447911123456<\/a>/);
  // No phone: the reason, no link.
  const none = await callCard(LEAD_ID, { lead: realLead({ phone: null }) });
  assert.ok(!none.html.includes('href="tel:') && textOf(none.html).includes("No phone on file"));
});

test("Back to a card the browser kept in its back-forward cache refreshes the server state, and nothing else", () => {
  assert.equal(restoredFromCache({ persisted: true }), true);
  for (const event of [{ persisted: false }, {}, null, undefined, { persisted: "true" }, { persisted: 1 }]) {
    assert.equal(restoredFromCache(event as never), false, JSON.stringify(event));
  }
  const panel = src(PANEL);
  const listener = panel.slice(panel.indexOf("function onPageShow("), panel.indexOf('window.removeEventListener("pageshow"'));
  assert.ok(listener.includes("if (restoredFromCache(event)) onRestoredRef.current?.();"), listener);
  assert.ok(listener.includes('window.addEventListener("pageshow", onPageShow);'), listener);
  // It only asks for fresh server state: no focus move, no scroll, no reset, no save.
  assert.ok(!/\.focus\(|scrollIntoView|scrollTo|reset\(\)|setSaved|fetch\(/.test(listener), listener);
  // The panel still has no router of its own; the call card wrapper refreshes, after a save and on a restore.
  assert.ok(!importsOf(panel).some((s) => s.startsWith("next/")));
  const wrapper = src(CARD_WRAPPER);
  assert.match(wrapper, /onSaved=\{\(\) => router\.refresh\(\)\}/);
  assert.match(wrapper, /onRestored=\{\(\) => router\.refresh\(\)\}/);
  // The prop changes nothing that renders.
  assert.equal(render(sampleProps({ onRestored: () => {} })), render(sampleProps()));
  assert.equal(render(sampleProps({ sample: false, onRestored: () => {} })), render(sampleProps({ sample: false })));
});

async function proposalPage(leadId: string, offers: string | undefined, h: Harness = {}) {
  const sent: { offers?: string[]; sample?: boolean; callCardHref?: string | null }[] = [];
  const { page, reads } = loadPage(PROPOSAL_PAGE, h, {
    "@/lib/proposals/build": proposalBuild,
    "@/lib/proposals/render": proposalRender,
    "@/lib/proposals/fixtures": proposalFixtures,
    "@/app/hq/_components/CopyButton": { __esModule: true, default: () => createElement("button", { type: "button" }, "Copy text") },
    "./ProposalSentButton": {
      __esModule: true,
      default: (props: { offers: string[]; sample: boolean; callCardHref: string | null }) => {
        sent.push(props);
        return createElement("section", { "data-sent-button": "" }, "Mark the proposal sent");
      },
    },
  });
  try {
    const element = await page({ params: Promise.resolve({ leadId }), searchParams: Promise.resolve(offers === undefined ? {} : { offers }) });
    return { html: renderToStaticMarkup(element as never), reads, sent, redirect: null as string | null };
  } catch (e) {
    if (e instanceof Redirect) return { html: "", reads, sent, redirect: e.url };
    throw e;
  }
}

test("proposal page harness: auth before intakeFor, the call's offers replace the guess, and a way back to the call card", async () => {
  const out = await proposalPage(LEAD_ID, "website_launch", { signedIn: false, lead: realLead() });
  assert.equal(out.redirect, `/login?next=${encodeURIComponent(`/admin/proposals/${LEAD_ID}`)}`);
  assert.deepEqual(out.reads, []);
  const sales = await proposalPage(LEAD_ID, undefined, { role: "sales", lead: realLead() });
  assert.equal(sales.redirect, "/dashboard");
  assert.deepEqual(sales.reads, ["profiles"]);

  const sample = await proposalPage("sample-build", "website_launch,not_an_offer,website_launch", {});
  assert.deepEqual(sample.reads, ["profiles"], "a sample reads no lead");
  assert.deepEqual(sample.sent[0].offers?.[0], "website_launch");
  assert.equal(sample.sent[0].sample, true);
  assert.equal(sample.sent[0].callCardHref, null);
  assert.ok(textOf(sample.html).includes("Offers chosen with the lead on the call."));
  assert.ok(!sample.html.includes("Back to call card"));

  const real = await proposalPage(LEAD_ID, "system_map,website_launch,lead_followup_campaign,company_os", { lead: realLead() });
  assert.deepEqual(real.reads, ["profiles", "leads"]);
  assert.deepEqual(real.sent[0].offers, ["system_map", "website_launch", "lead_followup_campaign"], "at most three, in the order chosen");
  assert.equal(real.sent[0].sample, false);
  assert.equal(real.sent[0].callCardHref, `/admin/call-sheet/${LEAD_ID}`);
  assert.ok(real.html.includes(`href="/admin/call-sheet/${LEAD_ID}"`) && textOf(real.html).includes("Back to call card"));
});

test("the sales workspace logs calls through the panel, and the lead page links to the call card", () => {
  const sales = src(SALES_WORKSPACE);
  assert.ok(!sales.includes("Log completed call") && !/\blogCall\b/.test(sales), "the old one-tap call log is gone");
  assert.match(sales, /<CallOutcomePanel\s+compact/);
  assert.match(sales, /onSaved=\{\(\) => router\.refresh\(\)\}/);
  assert.ok(!/proposalAllowed/.test(sales), "no proposal link in the sales workspace");
  assert.ok(
    !importsOf(sales).some((spec) => /lib\/quo|lib\/callSheet|leadNotify/.test(spec)),
    "the client workspace does not load Quo, call sheet, or notification code",
  );
  const admin = src(ADMIN_LEAD_PAGE);
  assert.match(admin, /href=\{`\/admin\/call-sheet\/\$\{id\}`\}[^>]*className="hq-btn hq-btn-sm"[^>]*>\s*Log a call/);
});

test("new UI files keep the house style: no long dashes, even in comments", () => {
  for (const file of [CARD_PAGE, CARD_WRAPPER, PANEL, SENT_BUTTON]) {
    assert.ok(!/[\u2013\u2014]/.test(src(file)), file);
  }
});
