import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import test from "node:test";
import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";
import Client360, { type Client360Props } from "../app/admin/leads/[id]/Client360.tsx";
import * as client360 from "../lib/client360.ts";
import {
  NOT_LINKED_YET,
  buildClientStory,
  failed,
  formatCents,
  notLinkedYet,
  planLine,
  ready,
  type StoryInput,
  type StoryInvoice,
  type StoryPurchase,
  type StoryReachSet,
} from "../lib/client360.ts";
import * as client360Fixtures from "../lib/client360Fixtures.ts";
import { SAMPLE_360_LEAD, SAMPLE_360_NOW, SAMPLE_360_VIEWS, sampleContact, sampleStoryInput } from "../lib/client360Fixtures.ts";
import * as client360Server from "../lib/client360Server.ts";
import { followUpForStory, reachForStory } from "../lib/client360Server.ts";
import { isCallHistoryEntry } from "../lib/callCloser.ts";
import { copyProblems } from "../lib/hq/copy.ts";
import type { LeadMessageRecord, LeadNoteRecord } from "../lib/leadTimeline.ts";
import { INBOUND_AUTO_REPLY } from "../lib/quo.ts";
import { PRICES } from "../lib/site/prices.ts";

// The Client 360: one person's whole story at the top of the lead record.
// The story builder, the server's follow-up and reach rules, the screen
// itself (every state in words, 44px targets, nothing real in the sample),
// the sample page's authorization, and the lead page's wiring (nothing new
// read from Supabase). Fictional people and fixed clocks only. The call
// card's tap-to-talk note is in tests/call-card-dictation.test.ts.

const src = (f: string) => readFileSync(join(process.cwd(), f), "utf8");

function importsOf(text: string): string[] {
  return [...text.matchAll(/(?:^|\n)\s*import\s+(?:type\s+)?(?:[^"';]*?\s+from\s+)?["']([^"']+)["']/g)].map((m) => m[1]);
}

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

const story = (view: (typeof SAMPLE_360_VIEWS)[number] = "client") => buildClientStory(sampleStoryInput(view));

const REAL_REACH: StoryReachSet = {
  call: { label: "Call (903) 555-0147", href: "tel:+19035550147" },
  text: { label: "Text (consented)", href: "sms:+19035550147" },
  email: { label: "Email", href: "mailto:jordan@example.test" },
};

const ANCHORS = { history: "#lead-history", reply: "#lead-reply", note: "#lead-team-note", tasks: "#lead-tasks" };

const render = (props: Client360Props) => renderToStaticMarkup(createElement(Client360, props));

/** The sample input with real-record settings: not the sample, same records. */
function realInput(overrides: Partial<StoryInput> = {}): StoryInput {
  return { ...sampleStoryInput("client"), sample: false, ...overrides };
}

// ---------------------------------------------------------------------------
// The builder

test("the full sample reads as one story: follow-up, money, builds, conversations, notes", () => {
  const s = story("client");
  assert.equal(s.name, "Jordan Sample");
  assert.equal(s.business, "Sample Lawn & Landscape (fictional)");
  assert.equal(s.sample, true);
  assert.equal(s.asOf, "Mon, Sep 28 at 9:30 AM");

  assert.equal(s.followUp.tone, "later");
  assert.equal(s.followUp.headline, "Next follow-up");
  assert.equal(s.followUp.detail, "Tue, Sep 29 at 10:00 AM Central.");
  assert.equal(s.followUp.reachedOut, null);
  // Open tasks: the overdue one first, the finished one left out.
  assert.equal(s.followUp.tasks.openCount, 2);
  assert.deepEqual(
    s.followUp.tasks.open.map((t) => [t.title, t.meta, t.tone]),
    [
      ["Confirm the domain login", "Overdue · was due Fri, Sep 25", "attention"],
      ["Send the build preview link", "Due Tue, Sep 29", "neutral"],
    ],
  );

  // Money comes from the published price list, summed in whole cents.
  const paid = formatCents(PRICES.systemMap * 100 + PRICES.websiteLaunchDeposit * 100);
  const owed = formatCents(PRICES.websiteLaunchFinal * 100);
  assert.equal(s.money.paid, paid);
  assert.equal(s.money.owed, owed);
  assert.equal(s.money.summary, `${paid} paid · ${owed} owed · no monthly plan`);
  assert.deepEqual(s.money.attention, []);
  assert.equal(s.money.plan.line, "No monthly plan on this record.");
  assert.deepEqual(
    s.money.purchases.lines.map((l) => [l.title, l.amount, l.meta]),
    [
      ["Website launch deposit", formatCents(PRICES.websiteLaunchDeposit * 100), "Mon, Sep 14 at 11:00 AM · Paid"],
      ["System map", formatCents(PRICES.systemMap * 100), "Thu, Sep 10 at 10:30 AM · Paid"],
    ],
  );
  assert.deepEqual(
    s.money.invoices.lines.map((l) => [l.title, l.meta]),
    [["Invoice SAMPLE-0001", "Made Mon, Sep 21 at 10:05 AM · Sent · due Mon, Oct 5"]],
  );

  assert.equal(s.builds.summary, "Website Launch · Building · 2 of 6 milestones done");
  assert.equal(s.builds.projects[0].next, "Site and funnel built");
  assert.deepEqual(
    s.builds.projects[0].milestones.map((m) => m.label),
    ["Done", "Done", "In progress", "Not started", "Not started", "Not started"],
  );

  assert.equal(s.conversations.summary, "Latest: website message from lead, Fri, Sep 25 at 4:40 PM");
  assert.deepEqual(
    s.conversations.recent.map((l) => l.id),
    ["website:w1", "message:m2", "message:m1", "message:m3"],
  );
  assert.deepEqual(Object.fromEntries(s.conversations.counts.map((c) => [c.label, c.value])), {
    Texts: "2",
    "Calls on the business line": "1",
    "Calls logged on the call card": "1",
    Emails: "1",
    // Step zero is the enrollment record, never an email send.
    "Automated follow-up emails": "1",
    "Replies logged by hand": "0",
    "Website messages": "1",
  });
  assert.deepEqual(s.conversations.problems, []);

  assert.equal(s.notes.summary, "3 notes · last Sat, Sep 26 at 11:00 AM by Ryan");
  assert.deepEqual(
    s.notes.latest.map((n) => n.id),
    ["note:n3", "note:n2"],
  );
});

test("today's lead record: money, builds, and website messages say they are not linked, and link to their pages", () => {
  const s = story("today");
  assert.equal(s.money.paid, null, "no total from records that are not linked");
  assert.equal(s.money.owed, null);
  assert.equal(s.money.summary, "No monthly plan · purchases and invoices not linked here yet");
  assert.equal(s.money.purchases.state, "not_linked");
  assert.deepEqual(s.money.purchases.link, NOT_LINKED_YET.purchases.link);
  assert.deepEqual(s.money.invoices.link, NOT_LINKED_YET.invoices.link);
  assert.equal(s.builds.part.state, "not_linked");
  assert.equal(s.builds.summary, "Projects are not linked to leads yet");
  assert.deepEqual(s.builds.part.link, NOT_LINKED_YET.projects.link);
  assert.equal(s.conversations.counts.find((c) => c.label === "Website messages")?.value, "Not linked yet");
  assert.deepEqual(s.conversations.problems, [{ kind: "not_linked", text: NOT_LINKED_YET.websiteMessages.why, link: NOT_LINKED_YET.websiteMessages.link }]);
  assert.equal(s.conversations.summary, "Latest: text to lead, Tue, Sep 22 at 10:02 AM");
  // Each call hands out its own link object, so a page cannot change the shared wording.
  const a = notLinkedYet("purchases");
  const b = notLinkedYet("purchases");
  assert.ok(a.status === "not_linked" && b.status === "not_linked" && a.link !== b.link);
});

test("a new lead who texted and has not been answered: they reached out, nothing set, nothing yet", () => {
  const s = story("new");
  assert.equal(s.name, "Casey Sample");
  assert.equal(s.followUp.tone, "none");
  assert.equal(s.followUp.headline, "No follow-up set");
  assert.equal(s.followUp.detail, null);
  assert.equal(s.followUp.reachedOut?.sentence, "They texted you Mon, Sep 28 at 8:20 AM Central, and nobody has answered since.");
  assert.equal(s.followUp.reachedOut?.said, "Do you build sites for detailers? I mostly get customers from Facebook right now.");
  assert.equal(s.followUp.tasks.openCount, 0);
  assert.equal(s.notes.summary, "No notes yet");
  assert.equal(s.conversations.summary, "Latest: text from lead, Mon, Sep 28 at 8:20 AM");
});

test("a connection problem is never shown as an empty record or a partial total", () => {
  const s = story("problem");
  assert.equal(s.followUp.tone, "unknown");
  assert.equal(s.followUp.headline, "Follow-up time on file");
  assert.equal(s.followUp.detail, "Fri, Sep 25 at 10:00 AM Central. Some history did not load, so check it before you call.");
  assert.equal(s.followUp.tasks.state, "failed");
  assert.equal(s.money.paid, null);
  assert.equal(s.money.owed, null);
  assert.match(s.money.summary, /some money records did not load/);
  assert.equal(s.money.invoices.state, "failed");
  assert.equal(s.conversations.counts.find((c) => c.label === "Texts")?.value, "Did not load");
  assert.equal(s.conversations.counts.find((c) => c.label === "Calls on the business line")?.value, "Did not load");
  assert.deepEqual(s.conversations.problems, [
    { kind: "failed", text: "Texts, emails, and logged replies did not load. That is a connection problem, not an empty history.", link: null },
    { kind: "failed", text: "Business line calls did not load. That is a connection problem, not an empty history.", link: null },
  ]);
  // The newest line shown may not be the newest there is.
  assert.match(s.conversations.summary, /^Latest that loaded: /);
  // Failed notes keep what they have and say they failed.
  const noNotes = buildClientStory(realInput({ notes: failed() }));
  assert.equal(noNotes.notes.state, "failed");
  assert.equal(noNotes.notes.summary, "Notes did not load");
});

test("records for another lead never enter the story", () => {
  const base = sampleStoryInput("client");
  const other = "someone-else";
  const rows = <T extends { lead_id: string | null }>(source: client360.Source<T[]>, extra: T[]) =>
    ready([...(source.status === "ready" ? source.rows : []), ...extra]);
  const note: LeadNoteRecord = { id: "x-note", lead_id: other, body: "Not this lead", author: "Ryan", created_at: "2026-09-27T20:00:00.000Z" };
  const text: LeadMessageRecord = { id: "x-text", lead_id: other, direction: "in", channel: "sms", body: "Wrong person", author: null, delivered: true, created_at: "2026-09-27T21:00:00.000Z" };
  const purchase: StoryPurchase = { id: "x-p", lead_id: other, created_at: "2026-09-27T21:00:00.000Z", kind: "system_map", amount_cents: 99_900, status: "paid" };
  const invoice: StoryInvoice = {
    id: "x-i",
    lead_id: other,
    invoice_number: "OTHER-1",
    status: "open",
    subtotal_cents: 12_300,
    due_date: "2026-10-01",
    sent_at: null,
    created_at: "2026-09-27T21:00:00.000Z",
  };
  const mixed = buildClientStory({
    ...base,
    notes: rows(base.notes, [note]),
    messages: rows(base.messages, [text]),
    purchases: rows(base.purchases, [purchase]),
    invoices: rows(base.invoices, [invoice]),
  });
  const clean = buildClientStory(base);
  assert.equal(mixed.money.paid, clean.money.paid);
  assert.equal(mixed.money.owed, clean.money.owed);
  assert.deepEqual(mixed.conversations.counts, clean.conversations.counts);
  assert.equal(mixed.notes.summary, clean.notes.summary);
  assert.ok(!JSON.stringify(mixed).includes("Wrong person") && !JSON.stringify(mixed).includes("OTHER-1"));
});

test("money: exact cents, every status in words, owed only on sent or failed invoices, and no total with an amount missing", () => {
  assert.equal(formatCents(0), "$0.00");
  assert.equal(formatCents(50), "$0.50");
  assert.equal(formatCents(123_456), "$1,234.56");
  assert.equal(formatCents(PRICES.websiteLaunchTotal * 100), `$${PRICES.websiteLaunchTotal.toLocaleString("en-US")}.00`);

  const lead = SAMPLE_360_LEAD.id;
  const p = (id: string, status: string, amount_cents: number | null): StoryPurchase => ({ id, lead_id: lead, created_at: "2026-09-20T15:00:00.000Z", kind: "system_map", amount_cents, status });
  const i = (id: string, status: string, subtotal_cents: number, due_date = "2026-10-05"): StoryInvoice => ({
    id,
    lead_id: lead,
    invoice_number: id,
    status,
    subtotal_cents,
    due_date,
    sent_at: null,
    created_at: "2026-09-20T15:00:00.000Z",
  });
  const s = buildClientStory(
    realInput({
      purchases: ready([p("paid", "paid", 49_700), p("refunded", "refunded", 50_000), p("disputed", "disputed", 10_000)]),
      invoices: ready([
        i("INV-OPEN", "open", 50_000),
        i("INV-LATE", "open", 25_000, "2026-09-20"),
        i("INV-FAILED", "payment_failed", 10_000),
        i("INV-PAID", "paid", 20_000),
        i("INV-DRAFT", "draft", 99_900),
        i("INV-VOID", "void", 99_900),
        i("INV-NOSEND", "send_failed", 99_900),
      ]),
    }),
  );
  // Paid: the paid purchase and the paid invoice. Refunds and disputes are not money in hand.
  assert.equal(s.money.paid, formatCents(49_700 + 20_000));
  // Owed: sent (on time or late) and failed payments. Drafts, voids, and failed sends are not owed.
  assert.equal(s.money.owed, formatCents(50_000 + 25_000 + 10_000));
  assert.deepEqual(s.money.attention, [
    "System map: Disputed · needs attention",
    "Invoice INV-LATE: Overdue · was due Sun, Sep 20",
    "Invoice INV-FAILED: Payment failed · needs attention",
    "Invoice INV-NOSEND: Did not send · needs attention",
  ]);
  assert.match(s.money.summary, /^Needs attention · /);
  const meta = Object.fromEntries(s.money.invoices.lines.map((l) => [l.title, l.meta.split(" · ").slice(1).join(" · ")]));
  assert.equal(meta["Invoice INV-DRAFT"], "Draft · not sent");
  assert.equal(meta["Invoice INV-VOID"], "Voided");
  assert.equal(meta["Invoice INV-PAID"], "Paid");

  // One paid row with no amount: no paid total, and the summary says why.
  const missing = buildClientStory(realInput({ purchases: ready([p("a", "paid", 49_700), p("b", "paid", null)]), invoices: ready([]) }));
  assert.equal(missing.money.paid, null);
  assert.match(missing.money.summary, /an amount or status is not recorded, so no total/);
  assert.equal(missing.money.purchases.lines.find((l) => l.id === "purchase:b")?.amount, "Amount not recorded");
  // A status nobody can place: no totals, never a total that skips the row.
  const odd = buildClientStory(realInput({ purchases: ready([p("a", "paid", 49_700), p("b", null as never, 49_700)]), invoices: ready([i("X", "mystery", 10_000)]) }));
  assert.equal(odd.money.paid, null);
  assert.equal(odd.money.owed, null);
  assert.match(odd.money.summary, /an amount or status is not recorded, so no total/);
  // Fractions of a cent are not an amount either.
  assert.equal(buildClientStory(realInput({ purchases: ready([p("c", "paid", 10.5)]), invoices: ready([]) })).money.paid, null);

  // Loaded and empty: said plainly, not as zero dollars.
  const none = buildClientStory(realInput({ purchases: ready([]), invoices: ready([]) }));
  assert.equal(none.money.summary, "Nothing bought or invoiced yet · no monthly plan");
});

test("the monthly plan line follows what the Stripe webhook stamped: renewing, set to end, ended", () => {
  const base = {
    service: "Meta ads",
    reference: null,
    sessionId: null,
    subscriptionId: "sub_sample000000",
    cancelScheduledAt: null,
    cancelledBy: null,
    currentPeriodEnd: "2026-10-15T05:00:00.000Z",
    endedAt: null,
  };
  assert.deepEqual(planLine(null), { line: "No monthly plan on this record.", short: "no monthly plan", tone: "neutral" });
  assert.deepEqual(planLine(base), { line: "Monthly Meta ads retainer · renewing · paid through Thu, Oct 15", short: "plan renewing", tone: "good" });
  const ending = planLine({ ...base, cancelScheduledAt: "2026-09-20T15:00:00.000Z", cancelledBy: "Ryan" });
  assert.equal(ending.line, "Monthly Meta ads retainer · set to end on Thu, Oct 15");
  assert.equal(ending.tone, "attention");
  assert.equal(planLine({ ...base, endedAt: "2026-10-15T05:00:00.000Z" }).line, "Monthly Meta ads retainer · ended Thu, Oct 15");
  // A plan set to end is something to look at.
  const s = buildClientStory(realInput({ plan: ready({ ...base, cancelScheduledAt: "2026-09-20T15:00:00.000Z" }) }));
  assert.ok(s.money.attention.includes("Monthly Meta ads retainer · set to end on Thu, Oct 15"));
});

test("follow-up words: due now, later, none", () => {
  const due = buildClientStory(realInput({ followUp: { state: "due", at: "2026-09-25T15:00:00.000Z", partial: false, reachedOut: null } }));
  assert.equal(due.followUp.tone, "due");
  assert.equal(due.followUp.headline, "Follow-up due now");
  assert.equal(due.followUp.detail, "It came due Fri, Sep 25 at 10:00 AM Central.");
  const none = buildClientStory(realInput({ followUp: { state: "none", at: "2026-09-25T15:00:00.000Z", partial: false, reachedOut: null } }));
  assert.equal(none.followUp.headline, "No follow-up set", "a past time a person already acted on is not owed");
  const first = buildClientStory(realInput({ followUp: { state: "first_call", at: "2026-09-29T14:00:00.000Z", partial: false, reachedOut: null } }));
  assert.deepEqual([first.followUp.tone, first.followUp.headline, first.followUp.detail], ["first", "This is the first call", "Nobody has logged a call or a note yet."]);
  // A missed call and an email use the call card's own sentences.
  const called = client360.reachedOutSentence({ kind: "call_in", at: "2026-09-27T20:00:00.000Z", channel: null, said: null }, false);
  assert.equal(called, "They called Sun, Sep 27 at 3:00 PM Central and nobody picked up. Nobody has reached them since.");
  const emailed = client360.reachedOutSentence({ kind: "message_in", at: "2026-09-27T20:00:00.000Z", channel: "email", said: "Hi" }, true);
  assert.equal(emailed, "They emailed you Sun, Sep 27 at 3:00 PM Central.");
});

test("a proposal marked sent reads as a proposal, never as a call, and the marker rule matches the Call Closer's", () => {
  const base = sampleStoryInput("client");
  const activity = base.activity.status === "ready" ? base.activity.rows : [];
  const s = buildClientStory({
    ...base,
    activity: ready([
      ...activity,
      { id: "a9", lead_id: SAMPLE_360_LEAD.id, kind: "sales", detail: "Proposal sent: Website Launch. Outcome: proposal_sent. Ref sample-ref-0000-0000-0011", created_at: "2026-09-27T16:00:00.000Z" },
      { id: "a10", lead_id: SAMPLE_360_LEAD.id, kind: "sales", detail: "Stage: proposal to won", created_at: "2026-09-27T17:00:00.000Z" },
    ]),
  });
  assert.equal(s.conversations.summary, "Latest: proposal marked sent, Sun, Sep 27 at 11:00 AM");
  assert.equal(s.conversations.recent[0].title, "Proposal marked sent");
  assert.equal(s.conversations.counts.find((c) => c.label === "Calls logged on the call card")?.value, "1", "still one call");
  assert.ok(!s.conversations.recent.some((l) => l.detail.includes("Stage:")), "a stage change is not a conversation");
  // The browser-safe rule and the Call Closer's own agree on every shape the Call Closer writes.
  const cases: [string, string][] = [
    ["call", "Call: no answer. Outcome: no_answer. Ref sample-ref-0000-0000-0001"],
    ["call", "Call: talked. Outcome: call_back."],
    ["sales", "Proposal sent. Outcome: proposal_sent. Ref x"],
    ["sales", "Stage: New to Won"],
    ["sales", "Priority set. Outcome: booked."],
    ["stage_change", "Stage: New to Won"],
    ["call", "They said Outcome: great. then Outcome: no_answer."],
  ];
  for (const [kind, detail] of cases) {
    assert.equal(client360.callCloserEntry(kind, detail) !== null, isCallHistoryEntry(kind, detail) && /\bOutcome: [a-z_]+\./.test(detail), `${kind}: ${detail}`);
  }
});

test("clip counts characters, not code units, and cuts at a word break when one is near", () => {
  assert.equal(client360.clip("  short  text "), "short text");
  const emoji = "🙂".repeat(300);
  const cut = client360.clip(emoji, 10);
  assert.equal(Array.from(cut).length, 10);
  assert.ok(!cut.includes("\uFFFD") && !/[\uD800-\uDBFF]$/.test(cut.slice(0, -1)), "no half emoji before the ellipsis");
  assert.equal(client360.clip("one two three four five six seven", 20), "one two three four…");
  assert.equal(client360.clip("x".repeat(30), 10), `${"x".repeat(9)}…`, "no word break near: a hard cut");
});

// ---------------------------------------------------------------------------
// The server's rules: the call card's follow-up and reach, unchanged

test("followUpForStory: the call card's callback rule over the last human touch, and they reached out", () => {
  const leadId = "L1";
  const now = SAMPLE_360_NOW; // Mon, Sep 28, 9:30 AM Central
  const time = "2026-09-25T15:00:00.000Z"; // Fri, Sep 25, 10:00 AM Central
  const note = (at: string, lead = leadId): LeadNoteRecord => ({ id: `n-${at}-${lead}`, lead_id: lead, body: "Called.", author: "Ryan", created_at: at });
  const msg = (at: string, direction: "in" | "out", body: string, channel: "sms" | "email" | "note" = "sms"): LeadMessageRecord => ({
    id: `m-${at}`,
    lead_id: leadId,
    direction,
    channel,
    body,
    author: direction === "out" ? "Ryan" : null,
    delivered: true,
    created_at: at,
  });
  const base = { leadId, nextFollowUpAt: time, lastContactedAt: null, notes: [], calls: [], messages: [], activity: [], now };

  // Touched before the time and not since: owed now.
  assert.equal(followUpForStory({ ...base, notes: [note("2026-09-24T15:00:00.000Z")] }).state, "due");
  // Touched after the time: the promise was kept.
  assert.equal(followUpForStory({ ...base, notes: [note("2026-09-26T15:00:00.000Z")] }).state, "none");
  // A note on another lead does not keep this lead's promise.
  assert.equal(followUpForStory({ ...base, notes: [note("2026-09-24T15:00:00.000Z"), note("2026-09-26T15:00:00.000Z", "L2")] }).state, "due");
  // Nobody has touched the lead at all: the call card's first call, whatever time is stamped on it.
  assert.equal(followUpForStory(base).state, "first_call");
  assert.equal(followUpForStory({ ...base, nextFollowUpAt: "2026-09-29T15:00:00.000Z" }).state, "first_call", "a stamp ahead is not a promise either");
  // Something touched the record (an inbound text moves last_contacted_at): not the first call, and a past stamp is not owed.
  assert.equal(followUpForStory({ ...base, lastContactedAt: "2026-09-27T14:00:00.000Z" }).state, "none");
  // With history missing, "first call" cannot be told.
  assert.equal(followUpForStory({ ...base, notes: null }).state, "none");
  // A time ahead is later once a person has acted.
  const later = followUpForStory({ ...base, notes: [note("2026-09-24T15:00:00.000Z")], nextFollowUpAt: "2026-09-29T15:00:00.000Z" });
  assert.deepEqual([later.state, later.at], ["later", "2026-09-29T15:00:00.000Z"]);
  // A call saved on the call card is a touch.
  const saved = followUpForStory({
    ...base,
    notes: [note("2026-09-24T15:00:00.000Z")],
    activity: [{ id: "a", lead_id: leadId, kind: "call", detail: "Call: no answer. Outcome: no_answer. Ref sample-ref-0000-0000-0009", created_at: "2026-09-26T15:00:00.000Z" }],
  });
  assert.equal(saved.state, "none");

  // They texted after the last touch: a reply is owed, with what they said.
  const texted = followUpForStory({ ...base, notes: [note("2026-09-26T15:00:00.000Z")], messages: [msg("2026-09-27T14:00:00.000Z", "in", "Are we still on?")] });
  assert.deepEqual(texted.reachedOut, { kind: "message_in", at: "2026-09-27T14:00:00.000Z", channel: "sms", said: "Are we still on?" });
  // The automatic text-back is software, not a person answering.
  const autoOnly = followUpForStory({
    ...base,
    notes: [note("2026-09-26T15:00:00.000Z")],
    messages: [msg("2026-09-27T14:00:00.000Z", "in", "Are we still on?"), msg("2026-09-27T14:00:05.000Z", "out", INBOUND_AUTO_REPLY)],
  });
  assert.ok(autoOnly.reachedOut, "still owed after the auto-reply");
  // A person answered: nothing owed.
  const answered = followUpForStory({
    ...base,
    notes: [note("2026-09-26T15:00:00.000Z")],
    messages: [msg("2026-09-27T14:00:00.000Z", "in", "Are we still on?"), msg("2026-09-27T16:00:00.000Z", "out", "Yes, see you at 10.")],
  });
  assert.equal(answered.reachedOut, null);

  // A proposal marked sent is a Call Closer entry too, so it counts as a touch.
  const proposed = followUpForStory({
    ...base,
    notes: [note("2026-09-24T15:00:00.000Z")],
    activity: [{ id: "p", lead_id: leadId, kind: "sales", detail: "Proposal sent: Website Launch. Outcome: proposal_sent. Ref sample-ref-0000-0000-0010", created_at: "2026-09-26T15:00:00.000Z" }],
  });
  assert.equal(proposed.state, "none");

  // Any history that failed to load makes it partial.
  assert.equal(followUpForStory(base).partial, false);
  for (const key of ["notes", "calls", "messages", "activity"] as const) {
    assert.equal(followUpForStory({ ...base, [key]: null }).partial, true, key);
  }
});

test("reachForStory: the call card's Call, Text, and Email rules", () => {
  const lead = { phone: "(903) 555-0147", email: "jordan@example.test", sms_consent: true, sms_unsubscribed_at: null };
  assert.deepEqual(reachForStory(lead), REAL_REACH);
  const stopped = reachForStory({ ...lead, sms_unsubscribed_at: "2026-09-20T15:00:00.000Z" });
  assert.deepEqual(stopped.text, { label: "Replied STOP. Call instead.", href: null });
  assert.deepEqual(reachForStory({ ...lead, sms_consent: false }).text, { label: "No text consent", href: null });
  assert.deepEqual(reachForStory({ ...lead, email: "lead-123@no-email.facebook.lead" }).email, { label: "Facebook did not share an email", href: null });
  const noPhone = reachForStory({ ...lead, phone: null });
  assert.deepEqual(noPhone.call, { label: "No phone on file", href: null });
  assert.equal(noPhone.text, null, "one chip says there is no phone, not two");
});

// ---------------------------------------------------------------------------
// The screen

test("the screen: a title, the follow-up first, four rows that open without JavaScript, and 44px targets", () => {
  // Four open tasks: three are shown and the fourth is a link to Tasks on the record.
  const tasks = ["Send the build preview link", "Confirm the domain login", "Ask for the logo file", "Book the launch call"].map((title, n) => ({
    id: `t${n}`,
    title,
    due_date: `2026-10-0${n + 1}`,
    completed_at: null,
    created_at: "2026-09-26T16:00:00.000Z",
  }));
  const html = render({ story: buildClientStory(realInput({ tasks: ready(tasks) })), reach: REAL_REACH, anchors: ANCHORS });
  assert.match(html, /<a href="#lead-tasks"[^>]*>1 more in Tasks<\/a>/);
  assert.match(html, /<section id="client-360" aria-labelledby="client-360-title"/);
  assert.match(html, /<h2 id="client-360-title"[^>]*>The whole story<\/h2>/);
  assert.ok(html.indexOf("data-follow-up=") < html.indexOf('id="client-360-money"'), "the follow-up comes before the rows");
  for (const id of ["money", "builds", "conversations", "notes"]) {
    assert.match(html, new RegExp(`<details id="client-360-${id}"`), id);
  }
  const summaries = [...html.matchAll(/<summary\b[^>]*>/g)].map((m) => m[0]);
  assert.equal(summaries.length, 4);
  for (const s of summaries) assert.match(s, /min-h-\[56px\]/, s);
  const taps = [...html.matchAll(/<(a|button)\b[^>]*>/g)].map((m) => m[0]);
  assert.ok(taps.length >= 7, "Call, Text, Email, and the in-page links");
  for (const tag of taps) assert.match(tag, /min-h-\[44px\]/, tag);
  // The real buttons: the call card's links, built on the server.
  assert.match(html, /<a href="tel:\+19035550147"[^>]*>Call \(903\) 555-0147<\/a>/);
  assert.match(html, /<a href="sms:\+19035550147"[^>]*>Text \(consented\)<\/a>/);
  assert.match(html, /<a href="mailto:jordan@example.test"[^>]*>Email<\/a>/);
  for (const anchor of Object.values(ANCHORS)) assert.ok(html.includes(`href="${anchor}"`), anchor);
  assert.ok(!/Sample\./.test(textOf(html)), "a real record carries no sample label");
  assert.deepEqual(copyProblems(textOf(html)), []);
  assert.ok(!/\bnull\b/.test(textOf(html)), "no unrendered value");
});

test("the sample says it is fictional, and its buttons never dial, text, or email", () => {
  for (const view of SAMPLE_360_VIEWS) {
    const html = render({ story: story(view), reach: reachForStory(sampleContact(view)), anchors: null });
    const text = textOf(html);
    assert.match(text, /Sample\. (Jordan|Casey) Sample is fictional\. Nothing here is real, and nothing is saved or sent\./, view);
    assert.ok(!/href="(tel|sms|mailto):/.test(html), `${view}: no live contact link`);
    assert.match(text, /Sample: these buttons do not dial, text, or email anyone\./, view);
    assert.ok(!/href="#lead-/.test(html), `${view}: no in-page links to a record that is not there`);
    assert.deepEqual(copyProblems(text), [], view);
    assert.ok(!/\bnull\b/.test(text), view);
  }
});

test("every part's state is in words: not linked points to its page, failed says connection problem, empty says none", () => {
  const today = textOf(render({ story: story("today"), reach: null, anchors: null }));
  assert.ok(today.includes(NOT_LINKED_YET.purchases.why));
  assert.ok(today.includes(NOT_LINKED_YET.projects.why));
  const todayHtml = render({ story: story("today"), reach: null, anchors: null });
  for (const key of ["purchases", "invoices", "projects", "websiteMessages"] as const) {
    assert.match(todayHtml, new RegExp(`<a href="${NOT_LINKED_YET[key].link.href}"[^>]*min-h-\\[44px\\][^>]*>${NOT_LINKED_YET[key].link.label}</a>`), key);
  }

  const problem = textOf(render({ story: story("problem"), reach: null, anchors: null }));
  assert.match(problem, /Invoices did not load\. That is a connection problem, not an empty record\./);
  assert.match(problem, /Tasks did not load\. That is a connection problem, not an empty list\./);

  const empty = buildClientStory(
    realInput({
      notes: ready([]),
      messages: ready([]),
      emails: ready([]),
      calls: ready([]),
      activity: ready([]),
      tasks: ready([]),
      websiteMessages: ready([]),
      purchases: ready([]),
      invoices: ready([]),
      projects: ready([]),
      followUp: { state: "none", at: null, partial: false, reachedOut: null },
    }),
  );
  const nothingElse = buildClientStory(realInput({ messages: failed(), calls: ready([]), emails: ready([]), activity: ready([]), websiteMessages: ready([]) }));
  const nothingElseText = textOf(render({ story: nothingElse, reach: null, anchors: null }));
  assert.match(nothingElseText, /Texts, emails, and logged replies did not load\./);
  assert.match(nothingElseText, /Nothing else loaded\./);
  assert.ok(!nothingElseText.includes("No texts, calls, or emails yet."), "a failed read is never shown as none yet");

  const noPhoneHtml = render({ story: empty, reach: reachForStory({ phone: null, email: "jordan@example.test", sms_consent: true, sms_unsubscribed_at: null }), anchors: null });
  assert.equal((textOf(noPhoneHtml).match(/No phone on file/g) ?? []).length, 1, "one chip, not two");
  const emptyText = textOf(render({ story: empty, reach: null, anchors: null }));
  for (const words of ["No follow-up set", "No open tasks.", "No purchases yet.", "No invoices yet.", "No projects yet.", "No texts, calls, or emails yet.", "No notes yet."]) {
    assert.ok(emptyText.includes(words), words);
  }
});

test("the screen and the story builder reach no database, provider, or server-only code", () => {
  for (const file of ["app/admin/leads/[id]/Client360.tsx", "lib/client360.ts", "lib/client360Fixtures.ts"]) {
    for (const spec of importsOf(src(file))) {
      assert.ok(!/supabase|\/quo$|lib\/quo|callSheet|leadNotify|resend|nurture|smsPolicy|client360Server|next\//.test(spec), `${file} imports ${spec}`);
    }
    // Kept out of the lead page's browser bundle on purpose: the Call Closer brings the whole offer registry.
    assert.ok(!importsOf(src(file)).some((spec) => /callCloser$/.test(spec)), `${file} imports the Call Closer`);
    assert.ok(!/\bfetch\(|XMLHttpRequest|sendBeacon|EventSource|WebSocket/.test(src(file)), `${file} has no network path`);
  }
  // Hook-free, so the lead workspace (a client component) and the sample page (a server page) render the same file.
  assert.ok(!/\buse(State|Effect|Ref|Memo|Callback|Transition)\b/.test(src("app/admin/leads/[id]/Client360.tsx")));
  // The workspace runs in the browser: it takes the server's results, never the server module.
  const workspace = src("app/admin/leads/[id]/LeadWorkspace.tsx");
  assert.ok(!importsOf(workspace).some((s) => /client360Server|callSheet|lib\/quo/.test(s)));
});

test("fixtures are fictional: 555-01xx numbers, example.test addresses, and names that say so", () => {
  for (const view of SAMPLE_360_VIEWS) {
    const contact = sampleContact(view);
    assert.match(contact.phone, /^\(903\) 555-01\d\d$/, view);
    assert.match(contact.email, /@example\.test$/, view);
    assert.match(contact.business_name, /\(fictional\)$/, view);
    assert.match(contact.full_name, / Sample$/, view);
  }
  // Fresh objects every call, so a page cannot change the fixture for the next one.
  assert.notEqual(sampleStoryInput("client"), sampleStoryInput("client"));
  assert.equal(client360Fixtures.isSample360View("today"), true);
  assert.equal(client360Fixtures.isSample360View("../admin"), false);
});

// ---------------------------------------------------------------------------
// The sample page, run for real against a fake database

class Redirect extends Error {
  url: string;
  constructor(url: string) {
    super(`redirect ${url}`);
    this.url = url;
  }
}

const requireReal = createRequire(import.meta.url);
const StubLink = ({ href, children, prefetch: _prefetch, ...rest }: { href: string; children?: ReactNode; prefetch?: boolean | null }) =>
  createElement("a", { href, ...rest }, children);

async function samplePage(h: { signedIn?: boolean; role?: string } = {}, query?: Record<string, string>) {
  const reads: string[] = [];
  const db = {
    auth: { getUser: async () => ({ data: { user: h.signedIn === false ? null : { id: "staff-ryan", email: "owner@example.test" } } }) },
    from(table: string) {
      reads.push(table);
      const query: Record<string, unknown> = {};
      for (const method of ["select", "eq", "is", "order", "limit", "in"]) query[method] = () => query;
      for (const write of ["insert", "update", "upsert", "delete", "rpc"]) {
        query[write] = () => {
          throw new Error(`the sample tried to ${write} ${table}`);
        };
      }
      query.single = async () => (table === "profiles" ? { data: { role: h.role ?? "admin" }, error: null } : { data: null, error: { message: `unexpected table ${table}` } });
      return query;
    },
  };
  const file = "app/admin/leads/sample/page.tsx";
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
    },
    "@/lib/supabase/server": { createClient: async () => db },
    "@/lib/client360": client360,
    "@/lib/client360Fixtures": client360Fixtures,
    "@/lib/client360Server": client360Server,
    "../[id]/Client360": { __esModule: true, default: Client360 },
  };
  const mod: { exports: { default?: (props: unknown) => Promise<unknown>; metadata?: { title?: string }; dynamic?: string } } = { exports: {} };
  new Function("require", "module", "exports", code)(
    (name: string) => {
      if (!(name in modules)) throw new Error(`${file} imports ${name}, which this harness does not expect`);
      return modules[name];
    },
    mod,
    mod.exports,
  );
  try {
    const element = await mod.exports.default!(query ? { searchParams: Promise.resolve(query) } : {});
    return { html: renderToStaticMarkup(element as never), reads, redirect: null as string | null, exports: mod.exports };
  } catch (e) {
    if (e instanceof Redirect) return { html: "", reads, redirect: e.url, exports: mod.exports };
    throw e;
  }
}

test("sample page: signed in and admin before anything renders; it reads no lead data", async () => {
  const out = await samplePage({ signedIn: false });
  assert.equal(out.redirect, "/login?next=%2Fadmin%2Fleads%2Fsample");
  assert.deepEqual(out.reads, [], "nothing read for a signed-out visitor");
  const staff = await samplePage({ role: "sales" });
  assert.equal(staff.redirect, "/dashboard");
  assert.deepEqual(staff.reads, ["profiles"]);
  const admin = await samplePage();
  assert.equal(admin.redirect, null);
  assert.deepEqual(admin.reads, ["profiles"], "only the role check; no lead, note, or message table");
  assert.equal(admin.exports.dynamic, "force-dynamic");
  assert.equal(admin.exports.metadata?.title, "Sample whole story | The LeadFlow Pro");
  const text = textOf(admin.html);
  assert.match(text, /The whole story, with a made-up client/);
  assert.match(text, /Jordan Sample is fictional/);
  // The view switcher: four 44px links, the open one marked for screen readers.
  const views = [...admin.html.matchAll(/<a href="(\/admin\/leads\/sample[^"]*)"([^>]*)>/g)];
  assert.deepEqual(
    views.map((m) => m[1]),
    ["/admin/leads/sample", "/admin/leads/sample?view=today", "/admin/leads/sample?view=new", "/admin/leads/sample?view=problem"],
  );
  for (const m of views) assert.match(m[2], /min-h-\[44px\]/);
  assert.match(views[0][2], /aria-current="page"/);
  // Each view renders its own person or state; an unknown view falls back to the full sample.
  assert.match(textOf((await samplePage({}, { view: "new" })).html), /Casey Sample is fictional/);
  assert.match(textOf((await samplePage({}, { view: "problem" })).html), /did not load/);
  assert.match(textOf((await samplePage({}, { view: "<script>" })).html), /Jordan Sample is fictional/);
});

// ---------------------------------------------------------------------------
// The lead page's wiring

test("lead page: the whole story is built after the admin check from the rows already read, and nothing new comes from Supabase", () => {
  const page = src("app/admin/leads/[id]/page.tsx");
  const body = page.slice(page.indexOf("export default async function"));
  const role = body.indexOf('profile?.role !== "admin"');
  const story = body.indexOf("followUpForStory(");
  assert.ok(role > 0 && story > role, "the follow-up is worked out after the role check");
  assert.ok(body.indexOf("reachForStory(") > role);
  assert.match(page, /next_follow_up_at, last_contacted_at/, "the stored follow-up time and contact stamp are read with the lead, as the call card reads them");
  assert.match(body, /lastContactedAt: lead\.last_contacted_at \?\? null/);
  assert.match(body, /client360=\{client360\}/);
  // Only the tables the page already read; money, projects, and website messages wait for the new database.
  const tables = [...page.matchAll(/\.from\("([a-z_]+)"\)/g)].map((m) => m[1]).sort();
  assert.deepEqual(tables, [
    "business_growth_diagnostics",
    "diagnostic_notifications",
    "lead_activity",
    "lead_calls",
    "lead_emails",
    "lead_messages",
    "lead_notes",
    "lead_tasks",
    "leads",
    "profiles",
  ]);
  const workspace = src("app/admin/leads/[id]/LeadWorkspace.tsx");
  for (const key of ["websiteMessages", "purchases", "invoices", "projects"]) {
    assert.ok(workspace.includes(`${key}: notLinkedYet("${key}")`), key);
  }
  assert.match(workspace, /<Client360\s/);
  assert.match(workspace, /id="lead-tasks"/, "the story's task link has somewhere to land");
});

test("lead page states: a loading screen that is not an empty lead, and an error screen that shows no error detail", () => {
  const loading = src("app/admin/leads/[id]/loading.tsx");
  assert.match(loading, /role="status"/);
  assert.match(loading, /Loading the lead record/);
  assert.match(loading, /motion-safe:animate-pulse/, "no pulsing for people who ask for less motion");
  const error = src("app/admin/leads/[id]/error.tsx");
  assert.ok(error.startsWith('"use client";'), "Next requires error screens to be client components");
  assert.match(error, /The lead record could not be shown\./);
  assert.match(error, /Nothing was changed, and the lead is not empty\./);
  assert.ok(!/error\.message|error\.stack|digest\}/.test(error), "the error's own words never reach the screen");
  assert.match(error, /router\.refresh\(\);\s*reset\(\);/);
  assert.match(error, /min-h-\[44px\]/);
  assert.deepEqual(copyProblems(loading + error), []);
});
