import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { nextBusinessAt } from "../lib/businessTime.ts";
import {
  CALL_OUTCOMES,
  IDEMPOTENCY_KEY_RE,
  LOST_REASONS,
  MEETING_PLACES,
  OUTCOME_LABELS,
  PANEL_OUTCOMES,
  STAGE_ORDER,
  TALKED_OUTCOMES,
  closerOffersFor,
  countPriorAttempts,
  firstName,
  meetingPlaceForLabel,
  offerIdsFromDetail,
  parseNextStepRequest,
  planCallOutcome,
  refMarker,
  stageAfter,
  theirWords,
  type CallOutcome,
  type CallPlan,
  type NextStepRequest,
  type PlanError,
  type PlannerLead,
} from "../lib/callCloser.ts";
import {
  SAMPLE_ACTOR_NAME,
  SAMPLE_CALL_ACTIVITY,
  SAMPLE_CALL_LEAD,
  SAMPLE_NOTES,
  SAMPLE_NOW,
} from "../lib/callCloserFixtures.ts";
import { copyProblems } from "../lib/hq/copy.ts";
import { CLOSER_OFFER_IDS, FREE_BUILD_ADD_ON_IDS, isCloserOfferId, payDoorFor, type CloserOfferId } from "../lib/payDoors.ts";
import { AGENCY_SERVICES } from "../lib/site/agency.ts";
import { CONSULTATION } from "../lib/site/consultation.ts";
import { EXTERNAL_LINKS } from "../lib/site/external-links.ts";
import { OFFERS } from "../lib/site/offers.ts";

const src = (f: string) => readFileSync(join(process.cwd(), f), "utf8");

// Fixed clocks only.
// Tue 2026-09-22 10:00 AM CDT (UTC-5), the shared sample "now".
const TUE_10AM = SAMPLE_NOW;
// Tue 2026-09-22 2:00 PM CDT: an afternoon call.
const TUE_2PM = new Date("2026-09-22T19:00:00.000Z");
// Fri 2026-09-25 4:30 PM CDT.
const FRI_430PM = new Date("2026-09-25T21:30:00.000Z");
// Fri 2026-10-30 3:00 PM CDT, two days before the clocks fall back (Sun Nov 1).
const FRI_BEFORE_FALL_BACK = new Date("2026-10-30T20:00:00.000Z");
// Mon 2026-09-21 and Thu 2026-09-24 at 10:00 AM CDT.
const MON_10AM = new Date("2026-09-21T15:00:00.000Z");
const THU_10AM = new Date("2026-09-24T15:00:00.000Z");

const KEY = "3f2b8c1e-5a4d-4e6f-9b7a-0c1d2e3f4a5b";
const PATCH_KEYS = ["status", "last_contacted_at", "next_follow_up_at", "lost_reason"];

function lead(overrides: Partial<PlannerLead> = {}): PlannerLead {
  const { created_at: _c, source: _s, goals: _g, best_contact_method: _b, ...base } = SAMPLE_CALL_LEAD;
  return { ...base, id: "7d0c5a4e-1b2f-4c3d-8e9f-a0b1c2d3e4f5", status: "new", next_follow_up_at: null, ...overrides };
}

function request(outcome: CallOutcome, overrides: Partial<NextStepRequest> = {}): NextStepRequest {
  return { outcome, idempotencyKey: KEY, note: null, offers: [], meeting: null, callback: null, lostReason: null, ...overrides };
}

type PlanInput = { lead?: PlannerLead; now?: Date; priorAttempts?: number; actorName?: string };

function plan(req: NextStepRequest, opts: PlanInput = {}): CallPlan | PlanError {
  return planCallOutcome({
    lead: opts.lead ?? lead(),
    request: req,
    actorName: opts.actorName ?? "Ryan Operator",
    now: opts.now ?? TUE_10AM,
    priorAttempts: opts.priorAttempts ?? 0,
  });
}

function ok(result: CallPlan | PlanError): CallPlan {
  if (!result.ok) assert.fail(`expected a plan, got ${result.status}: ${result.error}`);
  return result;
}

function refused(result: CallPlan | PlanError, status: 400 | 409 = 400): string {
  if (result.ok) assert.fail(`expected a ${status}, got a plan: ${result.summary}`);
  assert.equal(result.status, status);
  assert.equal(copyProblems(result.error).length, 0, result.error);
  return result.error;
}

/** One valid plan for every outcome, used by the invariants and the schema checks below. */
function everyPlan(): CallPlan[] {
  const now = TUE_10AM;
  const long = "x".repeat(2000);
  return [
    ok(plan(request("booked", { meeting: { localDate: "2026-09-24", time: "14:00", place: "at their business" }, offers: ["website_launch"] }))),
    ok(plan(request("booked", { meeting: { localDate: "2026-09-24", time: "14:00", place: "y".repeat(120) }, note: long }))),
    ok(plan(request("wants_proposal", { offers: ["website_launch", "system_map", "lead_followup_campaign"] }))),
    ok(plan(request("wants_proposal", { offers: ["agency_meta_ads"] }), { lead: lead({ business_name: null }) })),
    ok(plan(request("ready_to_pay", { offers: ["website_launch"] }))),
    ok(plan(request("ready_to_pay", { offers: ["lead_engine", "system_map", "lead_followup_campaign"] }))),
    ok(plan(request("call_back", { callback: { localDate: "2026-09-28", time: "09:00" }, note: "Wants to talk to his wife first." }))),
    ok(plan(request("no_answer"), { now })),
    ok(plan(request("no_answer"), { now, priorAttempts: 3 })),
    ok(plan(request("voicemail"), { now: TUE_2PM, priorAttempts: 1 })),
    ok(plan(request("not_a_fit", { lostReason: "no_budget" }))),
    ok(plan(request("not_a_fit", { lostReason: "other", note: `${"z".repeat(400)}\nsecond line` }))),
    ok(plan(request("proposal_sent", { offers: ["website_launch", "system_map"] }), { lead: lead({ status: "contacted" }) })),
    ok(plan(request("proposal_sent"))),
  ];
}

// ------------------------------------------------------------ constants --

test("outcomes, labels, and panel order are the contract the UI and route code against", () => {
  assert.deepEqual([...CALL_OUTCOMES], ["booked", "wants_proposal", "ready_to_pay", "call_back", "no_answer", "voicemail", "not_a_fit", "proposal_sent"]);
  assert.deepEqual([...PANEL_OUTCOMES], ["booked", "wants_proposal", "ready_to_pay", "call_back", "no_answer", "voicemail", "not_a_fit"]);
  assert.deepEqual(OUTCOME_LABELS, {
    booked: "Booked the sit-down",
    wants_proposal: "Wants a proposal",
    ready_to_pay: "Ready to pay now",
    call_back: "Talked, call back later",
    no_answer: "No answer",
    voicemail: "Left a voicemail",
    not_a_fit: "Not a fit",
    proposal_sent: "Proposal sent",
  });
  assert.deepEqual([...TALKED_OUTCOMES], ["booked", "wants_proposal", "ready_to_pay", "call_back", "not_a_fit", "proposal_sent"]);
  assert.deepEqual([...STAGE_ORDER], ["new", "contacted", "call_booked", "proposal"]);
  assert.deepEqual(LOST_REASONS.map((r) => r.id), ["not_owner", "no_budget", "has_someone", "wrong_number", "other"]);
  for (const text of [...Object.values(OUTCOME_LABELS), ...LOST_REASONS.map((r) => r.label), ...MEETING_PLACES.flatMap((p) => [p.label, p.place])]) {
    assert.deepEqual(copyProblems(text), [], text);
  }
  assert.equal(refMarker(KEY), `Ref ${KEY}`);
  assert.ok(IDEMPOTENCY_KEY_RE.test(KEY));
  assert.ok(IDEMPOTENCY_KEY_RE.test("A".repeat(20)));
  assert.ok(!IDEMPOTENCY_KEY_RE.test("a".repeat(19)));
  assert.ok(!IDEMPOTENCY_KEY_RE.test("a".repeat(81)));
  assert.ok(!IDEMPOTENCY_KEY_RE.test("abc def ghi jkl mno pqr"));
  assert.ok(!IDEMPOTENCY_KEY_RE.test("abcdefghij%klmnopqrstu"));
});

test("stageAfter only moves forward and leaves an unknown status alone", () => {
  assert.equal(stageAfter("new", "contacted"), "contacted");
  assert.equal(stageAfter("new", "call_booked"), "call_booked");
  assert.equal(stageAfter("contacted", "proposal"), "proposal");
  assert.equal(stageAfter("contacted", "contacted"), null);
  assert.equal(stageAfter("call_booked", "contacted"), null);
  assert.equal(stageAfter("proposal", "call_booked"), null);
  assert.equal(stageAfter("proposal", "proposal"), null);
  assert.equal(stageAfter("won", "proposal"), null);
  assert.equal(stageAfter("proposal_sent", "contacted"), null);
  assert.equal(stageAfter("", "contacted"), null);
});

// ---------------------------------------------------------------- parse --

test("parseNextStepRequest reads the posted keys and ignores an author or actor field", () => {
  const parsed = parseNextStepRequest({
    outcome: "booked",
    idempotency_key: KEY,
    note: "  Wants the <b>big</b> package.\r\nCall his cell.  ",
    offers: ["website_launch", "system_map", "website_launch"],
    meeting_date: "2026-09-24",
    meeting_time: "14:00",
    meeting_place: "  at   their business ",
    callback_date: "",
    callback_time: null,
    lost_reason: "",
    author: "Somebody Else",
    actor: "forged",
    actorName: "forged",
  });
  assert.ok(parsed.ok, parsed.ok ? "" : parsed.error);
  const r = parsed.request;
  assert.deepEqual(r, {
    outcome: "booked",
    idempotencyKey: KEY,
    note: "Wants the big package.\nCall his cell.",
    offers: ["website_launch", "system_map"],
    meeting: { localDate: "2026-09-24", time: "14:00", place: "at their business" },
    callback: null,
    lostReason: null,
  });
  assert.ok(!("author" in r) && !("actor" in r));

  const minimal = parseNextStepRequest({ outcome: "no_answer", idempotency_key: KEY });
  assert.ok(minimal.ok);
  assert.deepEqual(minimal.request, request("no_answer"));

  const withCallback = parseNextStepRequest({ outcome: "call_back", idempotency_key: KEY, callback_date: "2026-09-28", callback_time: "09:00", lost_reason: "other" });
  assert.ok(withCallback.ok);
  assert.deepEqual(withCallback.request.callback, { localDate: "2026-09-28", time: "09:00" });
  assert.equal(withCallback.request.lostReason, "other");
});

test("parseNextStepRequest rejects bad bodies, keys, outcomes, and offers", () => {
  const base = { outcome: "wants_proposal", idempotency_key: KEY, offers: ["website_launch"] };
  const rejects = (body: unknown, why: string) => {
    const parsed = parseNextStepRequest(body);
    assert.equal(parsed.ok, false, why);
    if (!parsed.ok) assert.deepEqual(copyProblems(parsed.error), [], parsed.error);
  };
  assert.ok(parseNextStepRequest(base).ok);
  rejects(null, "null body");
  rejects("booked", "string body");
  rejects([base], "array body");
  rejects({ ...base, outcome: "sold" }, "unknown outcome");
  rejects({ ...base, outcome: undefined }, "missing outcome");
  rejects({ ...base, outcome: "BOOKED" }, "outcome is case sensitive");
  rejects({ ...base, idempotency_key: undefined }, "missing key");
  rejects({ ...base, idempotency_key: "short" }, "short key");
  rejects({ ...base, idempotency_key: "has spaces in it and is long enough" }, "key with spaces");
  rejects({ ...base, idempotency_key: "k".repeat(81) }, "key too long");
  rejects({ ...base, idempotency_key: "%' or 1=1 --aaaaaaaaaaaaaaaaaa" }, "key that would break an ilike");
  rejects({ ...base, idempotency_key: 12345678901234567890 }, "numeric key");
  rejects({ ...base, offers: ["website_launch", "system_map", "lead_engine", "company_os"] }, "four offers");
  rejects({ ...base, offers: ["pro_kits"] }, "a registry offer outside the closer list");
  rejects({ ...base, offers: ["made_up"] }, "unknown offer");
  rejects({ ...base, offers: [42] }, "non-string offer");
  rejects({ ...base, offers: "website_launch" }, "offers not a list");
  rejects({ ...base, note: 7 }, "note not text");
  rejects({ ...base, note: "n".repeat(2001) }, "note too long");
  rejects({ ...base, meeting_date: "2026-09-24" }, "meeting date without time");
  rejects({ ...base, meeting_time: "14:00" }, "meeting time without date");
  rejects({ ...base, meeting_date: "2026-02-30", meeting_time: "14:00" }, "not a real date");
  rejects({ ...base, meeting_date: "09/24/2026", meeting_time: "14:00" }, "wrong date format");
  rejects({ ...base, meeting_date: "2026-09-24", meeting_time: "2 PM" }, "wrong time format");
  rejects({ ...base, meeting_date: "2026-09-24", meeting_time: "24:00" }, "hour out of range");
  rejects({ ...base, meeting_date: "2026-09-24", meeting_time: "14:00", meeting_place: "p".repeat(121) }, "place too long");
  rejects({ ...base, meeting_date: "2026-09-24", meeting_time: "14:00", meeting_place: 5 }, "place not text");
  rejects({ ...base, callback_date: "2026-09-28" }, "callback date without time");
  rejects({ ...base, lost_reason: "too_expensive" }, "unknown lost reason");

  // Three unique offers after dropping a duplicate is fine; a 2,000 character note is fine.
  const dupes = parseNextStepRequest({ ...base, offers: ["website_launch", "website_launch", "system_map", "lead_engine"] });
  assert.ok(dupes.ok);
  assert.deepEqual(dupes.request.offers, ["website_launch", "system_map", "lead_engine"]);
  assert.ok(parseNextStepRequest({ ...base, note: "n".repeat(2000) }).ok);
  assert.ok(parseNextStepRequest({ ...base, offers: [] }).ok);
  assert.ok(parseNextStepRequest({ ...base, offers: null }).ok);
});

// ------------------------------------------------------------- outcomes --

test("booked: sit-down in Central time, stage to call_booked, a high meeting task", () => {
  const p = ok(plan(request("booked", { meeting: { localDate: "2026-09-24", time: "14:00", place: "at their business" } })));
  assert.equal(p.outcome, "booked");
  assert.deepEqual(p.leadPatch, {
    status: "call_booked",
    last_contacted_at: TUE_10AM.toISOString(),
    next_follow_up_at: "2026-09-24T19:00:00.000Z",
  });
  assert.equal(p.nextFollowUpAt, "2026-09-24T19:00:00.000Z");
  assert.deepEqual(p.task, { title: "Sit-down with Dana", task_type: "meeting", due_date: "2026-09-24", priority: "high" });
  assert.equal(p.noteBody, "Call: booked the sit-down for Thu, Sep 24 at 2:00 PM, at their business.");
  assert.equal(p.activity.kind, "call");
  assert.equal(p.activity.detail, `Call: booked the sit-down for Thu, Sep 24 at 2:00 PM, at their business. Outcome: booked. Ref ${KEY}`);
  assert.equal(p.completeProposalTasks, false);
  assert.deepEqual(p.payDoors, []);
  assert.equal(p.payMessage, null);
  assert.equal(p.proposalHref, null);
  assert.equal(p.summary, "Booked. The sit-down with Dana is Thu, Sep 24 at 2:00 PM.");
  assert.deepEqual(p.preview, [
    "Status moves to Call booked.",
    "Adds a task: Sit-down with Dana, due Thu, Sep 24.",
    "Next follow-up: Thu, Sep 24 at 2:00 PM. The lead comes back on your call sheet then.",
    "Saves a note and adds the call to the timeline.",
    "Nothing is sent to Dana.",
  ]);

  // A place without a preposition reads as "at <place>"; offers talked about are recorded.
  const office = ok(plan(request("booked", { meeting: { localDate: "2026-09-24", time: "09:30", place: "Cafe on Main." }, offers: ["website_launch"], note: "Bring the samples." })));
  assert.equal(office.noteBody, "Call: booked the sit-down for Thu, Sep 24 at 9:30 AM, at Cafe on Main. Talked about Website Launch.\n\nBring the samples.");
  assert.match(office.activity.detail, / Outcome: booked\. Offer ids: website_launch\. Ref /);
  const noPlace = ok(plan(request("booked", { meeting: { localDate: "2026-09-24", time: "09:30", place: null } })));
  assert.equal(noPlace.noteBody, "Call: booked the sit-down for Thu, Sep 24 at 9:30 AM.");

  // After the fall-back change the same wall clock is UTC-6.
  const cst = ok(plan(request("booked", { meeting: { localDate: "2026-11-02", time: "10:00", place: null } }), { now: FRI_BEFORE_FALL_BACK }));
  assert.equal(cst.leadPatch.next_follow_up_at, "2026-11-02T16:00:00.000Z");
});

test("booked and call_back refuse a missing, past, or far-off time", () => {
  refused(plan(request("booked")));
  refused(plan(request("booked", { meeting: { localDate: "2026-09-22", time: "09:59", place: null } })));
  refused(plan(request("booked", { meeting: { localDate: "2026-09-22", time: "10:00", place: null } }))); // exactly now is not later
  refused(plan(request("booked", { meeting: { localDate: "2026-12-22", time: "10:00", place: null } }))); // 91 days out
  refused(plan(request("booked", { meeting: { localDate: "2026-02-30", time: "10:00", place: null } })));
  // The limit is 90 x 24 hours. Clocks fall back in between, so exactly 90 days
  // out is 9:00 AM CST on Dec 21, and 10:00 AM that day is an hour past it.
  ok(plan(request("booked", { meeting: { localDate: "2026-12-21", time: "09:00", place: null } })));
  refused(plan(request("booked", { meeting: { localDate: "2026-12-21", time: "10:00", place: null } })));
  ok(plan(request("booked", { meeting: { localDate: "2026-09-22", time: "10:01", place: null } })));

  refused(plan(request("call_back")));
  refused(plan(request("call_back", { callback: { localDate: "2026-09-21", time: "16:00" } })));
  refused(plan(request("call_back", { callback: { localDate: "2027-01-05", time: "09:00" } })));
  refused(plan(request("call_back", { callback: { localDate: "2026-09-28", time: "9am" } })));
});

test("call_back: the promised instant becomes next_follow_up_at and the stage moves to contacted", () => {
  const p = ok(plan(request("call_back", { callback: { localDate: "2026-09-28", time: "09:00" }, note: "Wants to talk to his wife first." })));
  assert.deepEqual(p.leadPatch, {
    status: "contacted",
    last_contacted_at: TUE_10AM.toISOString(),
    next_follow_up_at: "2026-09-28T14:00:00.000Z",
  });
  assert.equal(p.task, null);
  assert.equal(p.noteBody, "Call: talked, call back Mon, Sep 28 at 9:00 AM.\n\nWants to talk to his wife first.");
  assert.equal(p.summary, "Call back set for Mon, Sep 28 at 9:00 AM.");
  assert.equal(p.activity.kind, "call");
  assert.ok(p.activity.detail.startsWith("Call: talked, call back Mon, Sep 28 at 9:00 AM. Outcome: call_back. Ref "));
});

test("wants_proposal: a high proposal task on the next Tuesday or Thursday, follow-up at 1:00 PM Central", () => {
  const p = ok(plan(request("wants_proposal", { offers: ["website_launch", "system_map"] })));
  assert.deepEqual(p.leadPatch, {
    status: "contacted",
    last_contacted_at: TUE_10AM.toISOString(),
    next_follow_up_at: "2026-09-24T18:00:00.000Z", // Thu 1:00 PM CDT
  });
  assert.deepEqual(p.task, {
    title: "Write the proposal for Sample Pressure Washing (fictional): Website Launch, System Map",
    task_type: "proposal",
    due_date: "2026-09-24",
    priority: "high",
  });
  assert.equal(p.proposalHref, `/admin/proposals/${lead().id}?offers=website_launch,system_map`);
  assert.equal(p.noteBody, "Call: wants a proposal for Website Launch and System Map. Proposal due Thu, Sep 24.");
  assert.match(p.activity.detail, / Outcome: wants_proposal\. Offer ids: website_launch, system_map\. Ref /);
  assert.equal(p.summary, "Proposal requested. It is on your list for Thu, Sep 24.");

  // Monday -> Tuesday; Thursday -> next Tuesday; Friday -> Tuesday.
  assert.equal(ok(plan(request("wants_proposal", { offers: ["system_map"] }), { now: MON_10AM })).task?.due_date, "2026-09-22");
  const thu = ok(plan(request("wants_proposal", { offers: ["system_map"] }), { now: THU_10AM }));
  assert.equal(thu.task?.due_date, "2026-09-29");
  assert.equal(thu.nextFollowUpAt, "2026-09-29T18:00:00.000Z");
  assert.equal(ok(plan(request("wants_proposal", { offers: ["system_map"] }), { now: FRI_430PM })).task?.due_date, "2026-09-29");
  // Across the fall-back change the 1:00 PM slot is UTC-6.
  assert.equal(ok(plan(request("wants_proposal", { offers: ["system_map"] }), { now: FRI_BEFORE_FALL_BACK })).nextFollowUpAt, "2026-11-03T19:00:00.000Z");

  // A lead with no business name gets its person's name in the task.
  const noBiz = ok(plan(request("wants_proposal", { offers: ["agency_meta_ads"] }), { lead: lead({ business_name: null }) }));
  assert.equal(noBiz.task?.title, "Write the proposal for Dana Sample: Meta ads management");

  refused(plan(request("wants_proposal")));
  refused(plan(request("wants_proposal", { offers: ["website_launch", "system_map", "lead_engine", "company_os"] })));
});

test("ready_to_pay: the published pay door and one draft for Ryan to send himself", () => {
  const p = ok(plan(request("ready_to_pay", { offers: ["website_launch"] }), { actorName: "Ryan Operator" }));
  assert.deepEqual(p.leadPatch, {
    status: "proposal",
    last_contacted_at: TUE_10AM.toISOString(),
    next_follow_up_at: "2026-09-23T15:00:00.000Z", // Wed 10:00 AM CDT: check the payment
  });
  assert.equal(p.nextFollowUpAt, nextBusinessAt(TUE_10AM, 1, "10:00").toISOString());
  assert.equal(p.task, null);
  assert.deepEqual(p.payDoors, [payDoorFor("website_launch")]);
  assert.ok(p.payMessage);
  assert.ok(p.payMessage.startsWith("Hi Dana, it's Ryan with The LeadFlow Pro."), p.payMessage);
  assert.ok(p.payMessage.includes(EXTERNAL_LINKS.stripeWebsiteLaunchDeposit));
  assert.equal(p.noteBody, "Call: ready to pay now for Website Launch. Check the payment Wed, Sep 23 at 10:00 AM.");
  assert.ok(p.preview.includes("Shows the pay link and a message you can send Dana yourself."));
  assert.ok(p.preview.some((l) => l.startsWith("Website Launch: Pays the ")));
  assert.equal(p.proposalHref, null);

  // A larger build starts with the System Map door.
  const build = ok(plan(request("ready_to_pay", { offers: ["lead_engine"] })));
  assert.equal(build.payDoors[0].kind, "starts_with");
  assert.ok(build.payMessage?.includes(payDoorFor("system_map")?.url ?? "missing"));
  assert.ok(build.preview.includes("Lead Engine: Starts with the System Map, credited toward the build."));
});

test("ready_to_pay is refused for an offer with no online payment today", () => {
  const message = (name: string) => `No online payment for ${name} yet. Choose Wants a proposal so the number goes in writing first.`;
  const blocked: CloserOfferId[] = [
    "free_website_program",
    ...FREE_BUILD_ADD_ON_IDS,
    ...CLOSER_OFFER_IDS.filter((id) => id.startsWith("agency_") && payDoorFor(id)?.status !== "live"),
  ];
  assert.ok(blocked.includes("agency_meta_ads") && blocked.includes("free_build_launch"));
  for (const id of blocked) {
    const door = payDoorFor(id);
    assert.ok(door && !door.payableNow, id);
    assert.equal(refused(plan(request("ready_to_pay", { offers: [id] }))), message(door.offerName));
  }
  // One blocked offer blocks the whole save, named in the error.
  assert.equal(refused(plan(request("ready_to_pay", { offers: ["website_launch", "agency_meta_ads"] }))), message("Meta ads management"));
  refused(plan(request("ready_to_pay")));
});

test("no_answer and voicemail leave status and last_contacted_at alone and set the next try", () => {
  // Tue 10:00 AM (morning): +1 business day, try the afternoon.
  const morning = ok(plan(request("no_answer"), { lead: lead({ status: "contacted" }) }));
  assert.deepEqual(morning.leadPatch, { next_follow_up_at: "2026-09-23T21:00:00.000Z" }); // Wed 4:00 PM CDT
  assert.equal(morning.task, null);
  assert.equal(morning.noteBody, "Call: no answer. Try again Wed, Sep 23 at 4:00 PM.");
  assert.equal(morning.summary, "No answer logged. Try again Wed, Sep 23 at 4:00 PM.");
  assert.equal(morning.preview[0], "Status and last contacted stay as they are, because you did not talk.");

  // Fri 4:30 PM no answer -> Mon 10:00 AM CDT.
  const friday = ok(plan(request("no_answer"), { now: FRI_430PM }));
  assert.deepEqual(friday.leadPatch, { next_follow_up_at: "2026-09-28T15:00:00.000Z" });
  assert.equal(friday.noteBody, "Call: no answer. Try again Mon, Sep 28 at 10:00 AM.");

  // Fri Oct 30 3:00 PM voicemail: rung 1 -> +2 business days -> Tue Nov 3 10:00 AM CST (UTC-6).
  const vm = ok(plan(request("voicemail"), { now: FRI_BEFORE_FALL_BACK }));
  assert.deepEqual(vm.leadPatch, { next_follow_up_at: "2026-11-03T16:00:00.000Z" });
  assert.equal(vm.noteBody, "Call: left a voicemail. Try again Tue, Nov 3 at 10:00 AM.");
  assert.equal(vm.activity.kind, "call");
  assert.match(vm.activity.detail, / Outcome: voicemail\. Ref /);

  // Offers sent with an unanswered call are not recorded against it.
  const withOffers = ok(plan(request("no_answer", { offers: ["website_launch"] })));
  assert.doesNotMatch(withOffers.activity.detail, /Offer ids/);

  // A callback Ryan picks overrides the ladder, and is still checked.
  const chosen = ok(plan(request("no_answer", { callback: { localDate: "2026-09-24", time: "08:30" } })));
  assert.deepEqual(chosen.leadPatch, { next_follow_up_at: "2026-09-24T13:30:00.000Z" });
  refused(plan(request("voicemail", { callback: { localDate: "2026-09-21", time: "08:30" } })));
});

test("the missed-call ladder: 1, 2, then 4 business days, and a nudge to text after two misses", () => {
  const nudge = "That is several tries without an answer. Try a text or an email next.";
  const at = (outcome: "no_answer" | "voicemail", details: string[]) =>
    ok(plan(request(outcome), { now: TUE_2PM, priorAttempts: countPriorAttempts(details) }));
  const detail = (outcome: CallOutcome) => `Call: something. Outcome: ${outcome}. Ref ${KEY}`;

  // Tue 2:00 PM is the afternoon, so every try lands at 10:00 AM.
  const first = at("no_answer", []);
  assert.equal(first.nextFollowUpAt, "2026-09-23T15:00:00.000Z"); // +1: Wed
  assert.ok(!first.preview.includes(nudge));
  const second = at("no_answer", [detail("no_answer")]);
  assert.equal(second.nextFollowUpAt, "2026-09-24T15:00:00.000Z"); // +2: Thu
  assert.ok(!second.preview.includes(nudge));
  const third = at("no_answer", [detail("voicemail"), detail("no_answer")]);
  assert.equal(third.nextFollowUpAt, "2026-09-28T15:00:00.000Z"); // +4: Mon
  assert.ok(third.preview.includes(nudge));
  const fourth = at("no_answer", [detail("no_answer"), detail("no_answer"), detail("no_answer")]);
  assert.equal(fourth.nextFollowUpAt, "2026-09-28T15:00:00.000Z"); // stays at +4
  // A voicemail counts one rung higher: its first is +2, its second already nudges.
  assert.equal(at("voicemail", []).nextFollowUpAt, "2026-09-24T15:00:00.000Z");
  const vm2 = at("voicemail", [detail("no_answer")]);
  assert.equal(vm2.nextFollowUpAt, "2026-09-28T15:00:00.000Z");
  assert.ok(vm2.preview.includes(nudge));
  // A conversation resets the ladder.
  assert.equal(at("no_answer", [detail("call_back"), detail("no_answer"), detail("no_answer")]).nextFollowUpAt, "2026-09-23T15:00:00.000Z");
  // Garbage prior counts are treated as zero.
  assert.equal(ok(plan(request("no_answer"), { now: TUE_2PM, priorAttempts: -3 })).nextFollowUpAt, "2026-09-23T15:00:00.000Z");
  assert.equal(ok(plan(request("no_answer"), { now: TUE_2PM, priorAttempts: Number.NaN })).nextFollowUpAt, "2026-09-23T15:00:00.000Z");
});

test("countPriorAttempts counts unanswered calls from the newest until a conversation", () => {
  const d = (outcome: string) => `Call: x. Outcome: ${outcome}. Ref ${KEY}`;
  assert.equal(countPriorAttempts([]), 0);
  assert.equal(countPriorAttempts([d("no_answer")]), 1);
  assert.equal(countPriorAttempts([d("no_answer"), d("voicemail"), d("booked"), d("no_answer")]), 2);
  assert.equal(countPriorAttempts([d("wants_proposal"), d("no_answer")]), 0);
  for (const talked of TALKED_OUTCOMES) assert.equal(countPriorAttempts([d(talked), d("no_answer")]), 0, talked);
  // Details the Call Closer did not write are skipped, not counted and not a stop.
  assert.equal(countPriorAttempts(["Completed call logged", d("no_answer"), "Ryan: Priority set to high", d("voicemail")]), 2);
  // The marker at the end wins over anything typed earlier in the detail.
  assert.equal(countPriorAttempts([`Call: not a fit (Other: Outcome: booked.). Outcome: no_answer. Ref ${KEY}`]), 1);
  assert.equal(countPriorAttempts(SAMPLE_CALL_ACTIVITY), 1);
});

test("not_a_fit needs a reason, and Other needs a note", () => {
  refused(plan(request("not_a_fit")));
  refused(plan(request("not_a_fit", { lostReason: "too_expensive" })));
  refused(plan(request("not_a_fit", { lostReason: "other" })));
  refused(plan(request("not_a_fit", { lostReason: "other", note: "   \n  " })));

  const budget = ok(plan(request("not_a_fit", { lostReason: "no_budget" }), { lead: lead({ status: "contacted", next_follow_up_at: "2026-09-30T15:00:00.000Z" }) }));
  assert.deepEqual(budget.leadPatch, {
    status: "lost",
    last_contacted_at: TUE_10AM.toISOString(),
    next_follow_up_at: null,
    lost_reason: "No budget right now",
  });
  assert.equal(budget.nextFollowUpAt, null);
  assert.equal(budget.task, null);
  assert.equal(budget.noteBody, "Call: not a fit (No budget right now).");
  assert.ok(budget.preview.includes("Clears the next follow-up."));
  assert.equal(budget.summary, "Marked not a fit. Dana comes off the call sheet.");

  const other = ok(plan(request("not_a_fit", { lostReason: "other", note: "\nMoved the business to Tyler.\nMaybe next year." })));
  assert.equal(other.leadPatch.lost_reason, "Other: Moved the business to Tyler.");
  assert.equal(other.noteBody, "Call: not a fit (Other: Moved the business to Tyler).\n\n\nMoved the business to Tyler.\nMaybe next year.");

  const long = ok(plan(request("not_a_fit", { lostReason: "other", note: "w".repeat(1500) })));
  assert.ok((long.leadPatch.lost_reason ?? "").length <= 200);
  assert.ok(long.leadPatch.lost_reason?.startsWith("Other: www"));
});

test("proposal_sent: stage to proposal, proposal tasks completed, logged as sales", () => {
  const p = ok(plan(request("proposal_sent", { offers: ["website_launch", "system_map"] }), { lead: lead({ status: "contacted" }) }));
  assert.deepEqual(p.leadPatch, {
    status: "proposal",
    last_contacted_at: TUE_10AM.toISOString(),
    next_follow_up_at: "2026-09-24T14:00:00.000Z", // +2 business days at 9:00 AM CDT
  });
  assert.equal(p.completeProposalTasks, true);
  assert.equal(p.activity.kind, "sales");
  assert.equal(p.task, null);
  assert.equal(p.noteBody, "Proposal sent for Website Launch and System Map. Follow up Thu, Sep 24 at 9:00 AM.");
  assert.match(p.activity.detail, / Outcome: proposal_sent\. Offer ids: website_launch, system_map\. Ref /);
  assert.ok(p.preview.includes("Marks the open proposal tasks on this lead done."));
  assert.ok(p.preview.includes("Saves a note and adds it to the timeline."));

  const bare = ok(plan(request("proposal_sent")));
  assert.equal(bare.noteBody, "Proposal sent. Follow up Thu, Sep 24 at 9:00 AM.");
  assert.equal(bare.activity.kind, "sales");

  for (const outcome of CALL_OUTCOMES.filter((o) => o !== "proposal_sent")) {
    for (const p2 of everyPlan().filter((x) => x.outcome === outcome)) {
      assert.equal(p2.activity.kind, "call", outcome);
      assert.equal(p2.completeProposalTasks, false, outcome);
    }
  }
});

test("stages only move forward, unknown statuses are left alone, closed leads are refused", () => {
  const booked = request("booked", { meeting: { localDate: "2026-09-24", time: "14:00", place: null } });
  const onProposal = ok(plan(booked, { lead: lead({ status: "proposal" }) }));
  assert.ok(!("status" in onProposal.leadPatch), "a proposal lead logged as booked stays proposal");
  assert.equal(onProposal.leadPatch.last_contacted_at, TUE_10AM.toISOString());
  assert.equal(onProposal.preview[0], "Status stays Proposal.");
  assert.ok(!("status" in ok(plan(booked, { lead: lead({ status: "call_booked" }) })).leadPatch));
  assert.ok(!("status" in ok(plan(request("call_back", { callback: { localDate: "2026-09-28", time: "09:00" } }), { lead: lead({ status: "call_booked" }) })).leadPatch));
  assert.ok(!("status" in ok(plan(request("wants_proposal", { offers: ["system_map"] }), { lead: lead({ status: "proposal" }) })).leadPatch));
  assert.ok(!("status" in ok(plan(request("proposal_sent"), { lead: lead({ status: "proposal" }) })).leadPatch));

  const unknown = lead({ status: "proposal_sent" });
  for (const req of [
    booked,
    request("wants_proposal", { offers: ["system_map"] }),
    request("ready_to_pay", { offers: ["system_map"] }),
    request("call_back", { callback: { localDate: "2026-09-28", time: "09:00" } }),
    request("proposal_sent"),
  ]) {
    const p = ok(plan(req, { lead: unknown }));
    assert.ok(!("status" in p.leadPatch), `${req.outcome} left an unknown status alone`);
  }

  for (const closed of ["won", "lost"]) {
    for (const outcome of CALL_OUTCOMES) {
      const req = request(outcome, {
        offers: ["website_launch"],
        meeting: { localDate: "2026-09-24", time: "14:00", place: null },
        callback: { localDate: "2026-09-28", time: "09:00" },
        lostReason: "no_budget",
      });
      refused(plan(req, { lead: lead({ status: closed }) }), 409);
    }
  }
});

// ---------------------------------------------------------- invariants --

test("every plan: patch keys are a subset, the detail fits and ends with its Ref, and the copy is clean", () => {
  for (const p of everyPlan()) {
    for (const key of Object.keys(p.leadPatch)) assert.ok(PATCH_KEYS.includes(key), `${p.outcome} patched ${key}`);
    assert.ok(p.activity.detail.length <= 1000, `${p.outcome} detail is ${p.activity.detail.length}`);
    assert.ok(p.activity.detail.endsWith(refMarker(KEY)), p.activity.detail);
    assert.ok(p.activity.detail.includes(` Outcome: ${p.outcome}. `), p.activity.detail);
    assert.ok(p.noteBody.length > 0 && p.noteBody.length <= 4000, `${p.outcome} note is ${p.noteBody.length}`);
    if (p.task) assert.ok(p.task.title.length <= 300);
    if (p.leadPatch.lost_reason) assert.ok(p.leadPatch.lost_reason.length <= 200);
    assert.equal(p.preview[p.preview.length - 1], "Nothing is sent to Dana.");
    for (const text of [...p.preview, p.noteBody, p.summary, p.payMessage ?? "", p.activity.detail, p.task?.title ?? ""]) {
      assert.deepEqual(copyProblems(text), [], `${p.outcome}: ${text}`);
    }
    if (p.outcome !== "ready_to_pay") {
      assert.deepEqual(p.payDoors, []);
      assert.equal(p.payMessage, null);
    }
    if (p.outcome !== "wants_proposal") assert.equal(p.proposalHref, null);
    // status only appears when it changes
    if ("status" in p.leadPatch) assert.notEqual(p.leadPatch.status, "new");
  }
});

test("every payable offer gives a clean pay message with only registry figures", () => {
  for (const id of CLOSER_OFFER_IDS) {
    const door = payDoorFor(id);
    if (!door?.payableNow) continue;
    const p = ok(plan(request("ready_to_pay", { offers: [id] })));
    assert.ok(p.payMessage, id);
    assert.deepEqual(copyProblems(p.payMessage), [], p.payMessage);
    for (const m of p.payMessage.matchAll(/\$[\d,]+/g)) {
      const known = OFFERS.some((o) => o.priceLabel.includes(m[0]) || o.terms.includes(m[0]));
      assert.ok(known, `${id}: ${m[0]} is not a registry figure`);
    }
    for (const l of p.preview) assert.deepEqual(copyProblems(l), [], l);
  }
});

test("names the lead typed with long dashes, or no name at all, still give clean copy", () => {
  const odd = lead({ full_name: "Facebook lead", business_name: "Smith \u2013 Sons \u2014 Roofing" });
  const p = ok(plan(request("wants_proposal", { offers: ["website_launch"] }), { lead: odd }));
  assert.equal(p.task?.title, "Write the proposal for Smith - Sons - Roofing: Website Launch");
  assert.equal(p.preview[p.preview.length - 1], "Nothing is sent to the lead.");
  for (const text of [...p.preview, p.noteBody, p.summary]) assert.deepEqual(copyProblems(text), [], text);
  const pay = ok(plan(request("ready_to_pay", { offers: ["system_map"] }), { lead: odd, actorName: "" }));
  assert.ok(pay.payMessage?.startsWith("Hi there, it's Ryan with The LeadFlow Pro."), pay.payMessage ?? "");
});

// --------------------------------------------------------- read helpers --

test("offerIdsFromDetail reads back what a save recorded", () => {
  const p = ok(plan(request("wants_proposal", { offers: ["lead_engine", "system_map"] })));
  assert.deepEqual(offerIdsFromDetail(p.activity.detail), ["lead_engine", "system_map"]);
  assert.deepEqual(offerIdsFromDetail(ok(plan(request("no_answer"))).activity.detail), []);
  assert.deepEqual(offerIdsFromDetail("Call: x. Outcome: booked. Offer ids: website_launch, pro_kits, made_up, website_launch. Ref abc"), ["website_launch"]);
  assert.deepEqual(offerIdsFromDetail("Offer ids: system_map. then later Offer ids: company_os."), ["company_os"]);
  assert.deepEqual(offerIdsFromDetail(""), []);
});

test("closerOffersFor suggests up to four offers from the interest, the intake, or the services", () => {
  assert.deepEqual(closerOffersFor("free_website_program", null), ["free_website_program", "free_build_followup", "free_build_content", "free_build_launch"]);
  assert.deepEqual(closerOffersFor(SAMPLE_CALL_LEAD.interest, SAMPLE_CALL_LEAD.diagnostic), ["free_website_program", "free_build_followup", "free_build_content", "free_build_launch"]);

  // Agency lead with services: those services, in order, unknown slugs dropped.
  assert.deepEqual(closerOffersFor("done_for_you", { source: "agency_intake", services: ["meta-ads", "websites", "bogus", "meta-ads"] }), ["agency_meta_ads", "website_launch"]);
  assert.deepEqual(
    closerOffersFor("done_for_you", { services: AGENCY_SERVICES.map((s) => s.slug) }),
    AGENCY_SERVICES.map((s) => s.offerId).slice(0, 4),
  );
  assert.deepEqual(closerOffersFor(null, { source: "agency_intake", services: ["google-ads"] }), ["agency_google_ads"]);
  // Consultation (done_for_you with no services): the consultation set.
  const consult = ["system_map", "website_launch", "lead_followup_campaign", "free_website_program"];
  assert.deepEqual(closerOffersFor("done_for_you", { source: CONSULTATION.funnel, meeting: "your_place" }), consult);
  assert.deepEqual(closerOffersFor("done_for_you", null), consult);
  assert.deepEqual(closerOffersFor("done_for_you", { services: [] }), consult);

  assert.deepEqual(closerOffersFor("website_launch", null), ["website_launch", "lead_followup_campaign", "system_map"]);
  assert.deepEqual(closerOffersFor("launch_system", {}), ["website_launch", "lead_followup_campaign", "system_map"]);
  assert.deepEqual(closerOffersFor("lead_engine", null), ["lead_engine", "system_map"]);
  // The guided intake's recommendation wins over the raw interest, as in the proposal generator.
  assert.deepEqual(closerOffersFor("unsure", { recommendation: { package: "industry_os" } }), ["company_os", "system_map"]);
  // Unknown interests fall to the System Map, like offerIdForInterest.
  for (const unknown of [null, "learn", "unsure", "something_new"]) {
    assert.deepEqual(closerOffersFor(unknown, null), ["system_map", "website_launch", "lead_followup_campaign"], String(unknown));
  }
  for (const interest of [null, "free_website_program", "done_for_you", "website_launch", "company_os", "zzz"]) {
    const ids = closerOffersFor(interest, { services: ["meta-ads", "google-ads", "websites", "automation", "video", "content"] });
    assert.ok(ids.length >= 1 && ids.length <= 4, `${interest}: ${ids.length}`);
    for (const id of ids) assert.ok(isCloserOfferId(id) && payDoorFor(id), id);
  }
});

test("theirWords strips the exact consultation prefix the homepage form writes", () => {
  // The form's template, character for character (components/site/ConsultationForm.tsx).
  const form = src("components/site/ConsultationForm.tsx");
  assert.ok(
    form.includes("`Free ${CONSULTATION.minutes}-minute consultation. Meet: ${meetingLabel(meeting)}. Reach me by: ${contactLabel(contact)}.`"),
    "ConsultationForm changed its goals prefix; update theirWords",
  );
  assert.ok(form.includes('].join("\\n")'), "ConsultationForm no longer joins the goals with newlines");

  for (const m of CONSULTATION.meetings) {
    for (const c of CONSULTATION.contactMethods) {
      const goals = [`Free ${CONSULTATION.minutes}-minute consultation. Meet: ${m.label}. Reach me by: ${c.label}.`, "", "Our phones ring all day and nobody writes anything down."].join("\n");
      assert.deepEqual(theirWords(goals), { words: "Our phones ring all day and nobody writes anything down.", meet: m.label, reachBy: c.label });
    }
  }
  const empty = [`Free ${CONSULTATION.minutes}-minute consultation. Meet: ${CONSULTATION.meetings[2].label}. Reach me by: Text.`, "", ""].join("\n");
  assert.deepEqual(theirWords(empty), { words: null, meet: "Phone or video call", reachBy: "Text" });
  const multi = [`Free ${CONSULTATION.minutes}-minute consultation. Meet: Come to my business. Reach me by: Call.`, "", "Line one.", "", "Line two."].join("\n");
  assert.equal(theirWords(multi).words, "Line one.\n\nLine two.");

  assert.deepEqual(theirWords(SAMPLE_CALL_LEAD.goals), { words: SAMPLE_CALL_LEAD.goals, meet: null, reachBy: null });
  assert.deepEqual(theirWords("  Just want more calls.  "), { words: "Just want more calls.", meet: null, reachBy: null });
  assert.deepEqual(theirWords("Free 15-minute consultation. Meet: X. Reach me by: Y.\n\nhi"), { words: "Free 15-minute consultation. Meet: X. Reach me by: Y.\n\nhi", meet: null, reachBy: null });
  assert.deepEqual(theirWords(null), { words: null, meet: null, reachBy: null });
  assert.deepEqual(theirWords(""), { words: null, meet: null, reachBy: null });

  assert.equal(meetingPlaceForLabel("Come to my business"), "at their business");
  assert.equal(meetingPlaceForLabel("I will come to the Longview office"), "at the Longview office");
  assert.equal(meetingPlaceForLabel("Phone or video call"), "on a phone or video call");
  assert.equal(meetingPlaceForLabel(null), null);
  assert.equal(meetingPlaceForLabel("Somewhere"), null);
  assert.deepEqual(MEETING_PLACES.map((p) => p.id), CONSULTATION.meetings.map((m) => m.id));
});

test("firstName takes the first word and never greets a placeholder", () => {
  assert.equal(firstName("Dana Sample"), "Dana");
  assert.equal(firstName("  dana   sample "), "Dana");
  assert.equal(firstName("DANA SAMPLE"), "Dana");
  assert.equal(firstName("McKenzie Ray"), "McKenzie");
  assert.equal(firstName("Dana, Sample"), "Dana");
  assert.equal(firstName("Facebook lead"), "");
  assert.equal(firstName("dana@example.test"), "");
  assert.equal(firstName(""), "");
  assert.equal(firstName("   "), "");
});

// ------------------------------------------------------------- fixtures --

test("fixtures are fictional and tell a story the planner agrees with", () => {
  assert.equal(SAMPLE_NOW.toISOString(), "2026-09-22T15:00:00.000Z");
  assert.equal(SAMPLE_CALL_LEAD.id, "sample");
  assert.equal(SAMPLE_CALL_LEAD.full_name, "Dana Sample");
  assert.match(SAMPLE_CALL_LEAD.business_name ?? "", /\(fictional\)$/);
  assert.match(SAMPLE_CALL_LEAD.phone ?? "", /555-01\d\d$/);
  assert.match(SAMPLE_CALL_LEAD.email ?? "", /@example\.test$/);
  assert.equal(SAMPLE_CALL_LEAD.source, "meta_lead_ad");
  assert.ok(["free_website_program", "done_for_you"].includes(SAMPLE_CALL_LEAD.interest ?? ""));
  assert.ok(SAMPLE_NOTES.length > 0 && SAMPLE_NOTES.length <= 3);
  for (let i = 1; i < SAMPLE_NOTES.length; i += 1) assert.ok(SAMPLE_NOTES[i - 1].created_at > SAMPLE_NOTES[i].created_at, "notes are newest first");
  for (const n of SAMPLE_NOTES) {
    assert.deepEqual(copyProblems(n.body), [], n.body);
    assert.equal(n.author, SAMPLE_ACTOR_NAME);
  }
  const fixtureSource = src("lib/callCloserFixtures.ts");
  for (const phone of fixtureSource.matchAll(/\(\d{3}\) \d{3}-\d{4}/g)) assert.match(phone[0], /555-01\d\d$/);
  for (const email of fixtureSource.matchAll(/[\w.+-]+@[\w.-]+\.[a-z]+/g)) assert.match(email[0], /@example\.test$/);

  // The newest sample note is exactly what a no-answer at that moment writes,
  // and the lead's callback is the one it set.
  const missed = ok(
    planCallOutcome({
      lead: lead({ id: SAMPLE_CALL_LEAD.id }),
      request: request("no_answer"),
      actorName: SAMPLE_ACTOR_NAME,
      now: new Date(SAMPLE_NOTES[0].created_at),
      priorAttempts: 0,
    }),
  );
  assert.equal(missed.noteBody, SAMPLE_NOTES[0].body);
  assert.equal(missed.nextFollowUpAt, SAMPLE_CALL_LEAD.next_follow_up_at);
  assert.ok(SAMPLE_CALL_ACTIVITY[0].startsWith(SAMPLE_NOTES[0].body));
  assert.ok(new Date(SAMPLE_CALL_LEAD.created_at) < new Date(SAMPLE_NOTES[SAMPLE_NOTES.length - 1].created_at));

  // Sample mode works end to end: the sample lead plans every panel outcome cleanly.
  const { created_at: _c, source: _s, goals: _g, best_contact_method: _b, ...sampleLead } = SAMPLE_CALL_LEAD;
  const p = ok(planCallOutcome({ lead: sampleLead, request: request("ready_to_pay", { offers: ["website_launch"] }), actorName: SAMPLE_ACTOR_NAME, now: SAMPLE_NOW, priorAttempts: countPriorAttempts(SAMPLE_CALL_ACTIVITY) }));
  assert.equal(p.proposalHref, null);
  const proposal = ok(planCallOutcome({ lead: sampleLead, request: request("wants_proposal", { offers: ["free_website_program"] }), actorName: SAMPLE_ACTOR_NAME, now: SAMPLE_NOW, priorAttempts: 1 }));
  assert.equal(proposal.proposalHref, "/admin/proposals/sample?offers=free_website_program");
});

// ---------------------------------------------------- schema conformance --

test("schema conformance: patch keys, activity kinds, task types, and lengths match the migrations", () => {
  const sql = src("supabase/migrations/20260819172000_expand_sales_crm_and_delivery_center.sql");
  const fnStart = sql.indexOf("function public.protect_sales_lead_fields");
  assert.ok(fnStart > 0, "protect_sales_lead_fields not found");
  const fields = sql.slice(fnStart).match(/to_jsonb\(new\)\s*-\s*array\[([\s\S]*?)\]/);
  assert.ok(fields, "protect_sales_lead_fields array not found");
  const salesFields = [...fields[1].matchAll(/'([a-z_]+)'/g)].map((m) => m[1]);
  assert.ok(salesFields.includes("status") && salesFields.length >= 4, salesFields.join(","));

  const checkValues = (constraint: string): string[] => {
    const at = sql.indexOf(`add constraint ${constraint}`);
    assert.ok(at > 0, `${constraint} not found`);
    const body = sql.slice(at, sql.indexOf(";", at));
    return [...body.matchAll(/'([a-z_]+)'::text/g)].map((m) => m[1]);
  };
  const activityKinds = checkValues("lead_activity_kind_check");
  const taskTypes = checkValues("lead_tasks_type_check");
  const taskPriorities = checkValues("lead_tasks_priority_check");
  assert.ok(activityKinds.includes("call") && activityKinds.includes("sales"));

  const portal = src("supabase/migrations/20260809000100_portal_buildout.sql");
  const limit = (column: string, table: string): number => {
    const block = portal.slice(portal.indexOf(`create table if not exists public.${table}`));
    const m = block.match(new RegExp(`char_length\\(${column}\\) <= (\\d+)`));
    assert.ok(m, `${table}.${column} limit not found`);
    return Number(m[1]);
  };
  const noteMax = limit("body", "lead_notes");
  const titleMax = limit("title", "lead_tasks");
  const detailMax = limit("detail", "lead_activity");
  const lostMax = Number(sql.match(/char_length\(lost_reason\) <= (\d+)/)?.[1]);
  assert.ok(noteMax > 0 && titleMax > 0 && detailMax > 0 && lostMax > 0);

  for (const p of everyPlan()) {
    for (const key of Object.keys(p.leadPatch)) assert.ok(salesFields.includes(key), `${key} is not a sales-editable lead field`);
    assert.ok(activityKinds.includes(p.activity.kind), p.activity.kind);
    assert.ok(p.activity.detail.length <= detailMax);
    assert.ok(p.noteBody.length <= noteMax);
    if (p.task) {
      assert.ok(taskTypes.includes(p.task.task_type), p.task.task_type);
      assert.ok(taskPriorities.includes(p.task.priority), p.task.priority);
      assert.ok(p.task.title.length <= titleMax);
      assert.match(p.task.due_date, /^\d{4}-\d{2}-\d{2}$/);
    }
    if (p.leadPatch.lost_reason) assert.ok(p.leadPatch.lost_reason.length <= lostMax);
    if ("status" in p.leadPatch) assert.ok([...STAGE_ORDER, "lost"].includes(p.leadPatch.status as string));
  }
  // Both task types and both activity kinds the planner can produce are allowed.
  for (const t of ["meeting", "proposal"]) assert.ok(taskTypes.includes(t), t);
  for (const k of ["call", "sales"]) assert.ok(activityKinds.includes(k), k);
});

// ----------------------------------------------------------- import guard --

/**
 * The runtime imports of a module: every `import ... from`, bare `import "x"`,
 * `export ... from`, dynamic import(), and require(). A whole-statement
 * `import type` is erased before the code runs, so it pulls in no runtime
 * code and is not listed (lib/speedToLead.ts takes its row types from the
 * call sheet that way).
 */
function runtimeImports(source: string): string[] {
  const specs: string[] = [];
  for (const m of source.matchAll(/^\s*import\s+(type\s+)?[\s\S]*?\sfrom\s+["']([^"']+)["']/gm)) {
    if (!m[1]) specs.push(m[2]);
  }
  for (const m of source.matchAll(/^\s*import\s+["']([^"']+)["']/gm)) specs.push(m[1]);
  for (const m of source.matchAll(/^\s*export\s+(type\s+)?[^;]*?\sfrom\s+["']([^"']+)["']/gm)) {
    if (!m[1]) specs.push(m[2]);
  }
  for (const m of source.matchAll(/\b(?:import|require)\s*\(\s*["']([^"']+)["']\s*\)/g)) specs.push(m[1]);
  return specs;
}

test("import guard: the pure Call Closer modules import no channel, database, or call sheet code", () => {
  const files = ["lib/callCloser.ts", "lib/payDoors.ts", "lib/businessTime.ts", "lib/callCloserFixtures.ts", "lib/speedToLead.ts"];
  const forbidden = [/callSheet/i, /(^|\/)quo(\.ts)?$/i, /leadNotify/i, /supabase/i, /resend/i, /channels/i, /server-only/i, /stripe(?!\w)/i];
  for (const file of files) {
    const source = src(file);
    const imports = runtimeImports(source);
    for (const spec of imports) {
      for (const bad of forbidden) assert.doesNotMatch(spec, bad, `${file} imports ${spec}`);
    }
    assert.ok(!source.includes("fetch("), `${file} calls fetch(`);
    assert.doesNotMatch(source, /\bsendEmail\b|\bsendSms\b|\blead_calls\b/, `${file} mentions a sender or lead_calls`);
  }

  // The Call Closer itself stays on the short list the spec allows, so a
  // "use client" panel can import it.
  assert.deepEqual(runtimeImports(src("lib/callCloser.ts")).sort(), [
    "@/lib/businessTime",
    "@/lib/hq/copy",
    "@/lib/payDoors",
    "@/lib/proposals/build",
    "@/lib/site/agency",
    "@/lib/site/consultation",
  ]);
  assert.deepEqual(runtimeImports(src("lib/callCloserFixtures.ts")), []);
  // No cycle: the proposal builder never imports the Call Closer.
  assert.ok(!runtimeImports(src("lib/proposals/build.ts")).some((s) => /callCloser/.test(s)));
  // The guard itself sees through a type-only import and catches a real one.
  assert.deepEqual(runtimeImports('import type { A } from "@/lib/callSheet";\nimport { b } from "@/lib/quo";\nconst c = await import("@/lib/leadNotify");'), ["@/lib/quo", "@/lib/leadNotify"]);
});
