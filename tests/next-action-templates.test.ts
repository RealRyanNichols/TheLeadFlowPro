import assert from "node:assert/strict";
import test from "node:test";
import { PRICE_LINE, SCOTT_PROOF, SCRIPT_KEYS, SERVICE_WORK, script, scriptFirstName, scriptsFor, type ScriptContext } from "../lib/nextActionTemplates.ts";
import { buildNextActions, type NextActionLead, type NextActionTouch } from "../lib/nextAction.ts";
import { CALL_PLANS, type PlanId } from "../lib/followUpPlan.ts";
import { SCOTT_NUMBERS_NOTE, SCOTT_STATS } from "../lib/contractorSeries.ts";
import { PRICES } from "../lib/site/prices.ts";
import { BUSINESS } from "../lib/site/business.ts";
import { copyProblems } from "../lib/hq/copy.ts";

// The scripts a person reads before a call, a voicemail, a text or an email.
// Fictional names only. Nothing here sends anything.

const CONTRACTOR: ScriptContext = { firstName: "Riley", service: "dirt_work_excavation_grading", group: "priority", day: 0, contractor: true };
const OTHER: ScriptContext = { firstName: "Jordan", service: null, group: null, day: 3, contractor: false };
const NOW = new Date("2026-10-07T18:00:00.000Z");

test("every script renders for a contractor lead and for any other lead, clean of the house copy problems", () => {
  assert.equal(SCRIPT_KEYS.length, 29);
  for (const ctx of [CONTRACTOR, OTHER, { firstName: "" } satisfies ScriptContext]) {
    for (const key of SCRIPT_KEYS) {
      const s = script(key, ctx);
      assert.ok(s, key);
      const text = `${s.title}\n${s.subject ?? ""}\n${s.body}`;
      assert.deepEqual(copyProblems(text), [], `${key}: ${text.slice(0, 80)}`);
      assert.ok(!/\bRyan\b.*\bRyan\b with/.test(text), key);
      assert.ok(s.body.trim().length > 40, key);
      if (s.channel === "email") assert.ok(s.subject && s.subject.length <= 60, `${key} has a short subject`);
      else assert.equal(s.subject, undefined, key);
    }
  }
  assert.equal(script("no.such.script", CONTRACTOR), null);
  assert.deepEqual(scriptsFor(["call.first", "nope", "voicemail.1"], CONTRACTOR).map((s) => s.key), ["call.first", "voicemail.1"]);
});

test("the first call, the voicemails and the texts never talk price", () => {
  const quiet = SCRIPT_KEYS.filter((k) => k.startsWith("call.") || k.startsWith("voicemail.") || k.startsWith("text.") || k === "email.1" || k === "email.3" || k === "email.last" || k === "reply" || k === "callback");
  assert.ok(quiet.length >= 18);
  for (const key of quiet) {
    for (const ctx of [CONTRACTOR, OTHER]) {
      const body = script(key, ctx)!.body;
      assert.ok(!body.includes("$"), `${key} carries no dollar figure`);
    }
  }
  // The opener asks about their result, not our tools, and books the second call.
  const opener = script("call.first", CONTRACTOR)!.body;
  assert.match(opener, /How many more jobs do you want on the board this month\?/);
  assert.match(opener, /No price on this call\./);
  assert.match(opener, /Is tomorrow at 10 or at 2 better\?/);
  assert.match(opener, /more dirt work jobs/);
});

test("texts are short, say who is texting, and the first one carries the way out", () => {
  for (const key of SCRIPT_KEYS.filter((k) => k.startsWith("text."))) {
    for (const ctx of [CONTRACTOR, OTHER]) {
      const body = script(key, ctx)!.body;
      assert.ok(body.length <= 300, `${key} is ${body.length} characters`);
      assert.match(body, /with The LeadFlow Pro/, key);
      assert.ok(!/https?:\/\//.test(body), `${key} has no link`);
    }
  }
  assert.match(script("text.1", CONTRACTOR)!.body, /Reply STOP to opt out\.$/);
});

test("the price line is built from the price file, and the Scott line matches the approved numbers", () => {
  assert.equal(PRICES.farmAcquiredJobPlanningTarget, 500);
  assert.equal(PRICES.managedStartingUpfront, 7500);
  assert.equal(
    PRICE_LINE,
    "I price it by the job: $500 for each job we set out to help you close. It starts at $7,500 for a campaign of up to 90 days, and the ad budget is part of what we agree to.",
  );
  // Scott's numbers as he said them (lib/contractorSeries.ts), with the note that travels with them.
  assert.ok(SCOTT_STATS.some((s) => s.value === "$4,500"));
  assert.ok(SCOTT_STATS.some((s) => s.value === "$800"), "about $500 to us plus about $300 in ads");
  assert.match(SCOTT_NUMBERS_NOTE, /about \$500 to us plus about \$300 in ad spend/);
  assert.match(SCOTT_PROOF, /about \$500/);
  assert.match(SCOTT_PROOF, /about \$300/);
  assert.match(SCOTT_PROOF, /roughly \$4,500/);
  assert.match(SCOTT_PROOF, /October 1, 2026/);
  assert.match(SCOTT_PROOF, /before what he pays us/);
  assert.ok(SCOTT_PROOF.endsWith("One business, one month. Not a promise of what yours will do."));
  assert.ok(SCOTT_NUMBERS_NOTE.endsWith("One business, one month. Not a promise of what yours will do."));
  assert.deepEqual(copyProblems(`${PRICE_LINE} ${SCOTT_PROOF}`), []);
});

test("a lead that did not come from the contractor form hears customers, not jobs, and no Scott and no contractor price", () => {
  for (const key of SCRIPT_KEYS) {
    const s = script(key, OTHER)!;
    const text = `${s.subject ?? ""} ${s.body}`;
    assert.ok(!text.includes("Scott"), `${key} does not tell a contractor's story to a different business`);
    assert.ok(!text.includes("$500") && !text.includes("$7,500"), `${key} does not quote the contractor campaign price`);
    assert.ok(!/\bmore jobs\b|\bjobs you want\b/.test(text), `${key} says customers`);
  }
  assert.match(script("call.first", OTHER)!.body, /How many more customers do you want this month\?/);
  // With nothing set, a lead that answered Pat's questions is read as a contractor lead.
  assert.match(script("voicemail.2", { firstName: "Riley", group: "standard" })!.body, /Scott at O-L Guy Farms/);
  assert.ok(!script("voicemail.2", { firstName: "Riley" })!.body.includes("Scott"));
});

test("the group changes the opener: a fit check asks who they are, funding is never promised", () => {
  assert.match(script("call.first", { ...CONTRACTOR, group: "fit_check" })!.body, /Do you own or run the company, or are you looking to hire somebody\?/);
  const funding = script("call.first", { ...CONTRACTOR, group: "funding_review" })!.body;
  assert.match(funding, /They said they would need funding\. Do not promise any\./);
  assert.ok(!script("call.first", CONTRACTOR)!.body.includes("funding"));
});

test("names, senders and the phone number", () => {
  assert.match(script("voicemail.1", CONTRACTOR)!.body, /^Riley, this is Ryan with The LeadFlow Pro/);
  assert.match(script("voicemail.1", { ...CONTRACTOR, sender: "Pat" })!.body, /^Riley, this is Pat with The LeadFlow Pro/);
  assert.match(script("voicemail.1", { firstName: "" })!.body, /^Hello, this is Ryan/);
  assert.ok(script("voicemail.1", CONTRACTOR)!.body.includes(BUSINESS.phone.display));
  assert.equal(scriptFirstName("riley example"), "Riley");
  assert.equal(scriptFirstName("  O'Neil  Farms"), "O'Neil");
  assert.equal(scriptFirstName("555-0142"), "");
  assert.equal(scriptFirstName(null), "");
  for (const key of Object.keys(SERVICE_WORK)) assert.match(script("call.first", { ...CONTRACTOR, service: key })!.body, new RegExp(`more ${SERVICE_WORK[key]} jobs`));
  assert.match(script("call.first", { ...CONTRACTOR, service: null })!.body, /about getting more jobs\./);
});

test("every script the engine can name exists", () => {
  const id = (n: number) => `0a1b2c3d-0000-4000-8000-${String(n).padStart(12, "0")}`;
  const base: NextActionLead = {
    id: id(1), created_at: new Date(NOW.getTime() - 3_600_000).toISOString(), full_name: "Riley Example", business_name: null, phone: "(903) 555-0142", email: "riley@example.test",
    status: "new", priority: "normal", source: "meta_lead_ad", campaign: null, group: null, service: null, ad_id: null, series: null,
    can_text: true, can_email: true, next_follow_up_at: null, is_test: false, expected_value_cents: null,
  };
  const named = new Set<string>();
  const collect = (lead: NextActionLead, touches: NextActionTouch[]) => {
    for (const row of buildNextActions({ leads: [lead], touches, now: NOW }).rows) for (const key of row.templateKeys) named.add(key);
  };
  const plans: [PlanId, Partial<NextActionLead>][] = [["full", { priority: "high" }], ["standard", {}], ["light", { priority: "low" }]];
  for (const [planId, overrides] of plans) {
    const steps = CALL_PLANS[planId].steps.length;
    for (let made = 0; made <= steps; made += 1) {
      const created = new Date(NOW.getTime() - 5 * 86_400_000);
      const touches: NextActionTouch[] = Array.from({ length: made }, (_, i) => ({ lead_id: id(1), at: new Date(created.getTime() + (i + 1) * 60_000).toISOString(), kind: "call_out_missed" }));
      collect({ ...base, ...overrides, created_at: created.toISOString() }, touches);
    }
  }
  collect({ ...base }, [{ lead_id: id(1), at: new Date(NOW.getTime() - 600_000).toISOString(), kind: "text_in" }]);
  collect({ ...base, status: "contacted" }, [{ lead_id: id(1), at: new Date(NOW.getTime() - 600_000).toISOString(), kind: "call_out_answered" }]);
  collect({ ...base, status: "contacted", next_follow_up_at: new Date(NOW.getTime() - 600_000).toISOString() }, [{ lead_id: id(1), at: new Date(NOW.getTime() - 3_000_000).toISOString(), kind: "call_out_answered" }]);
  collect({ ...base, status: "call_booked", next_follow_up_at: new Date(NOW.getTime() + 6_000_000).toISOString() }, []);
  collect({ ...base, status: "call_booked", next_follow_up_at: new Date(NOW.getTime() - 6_000_000).toISOString() }, []);
  collect({ ...base, created_at: new Date(NOW.getTime() - 60 * 86_400_000).toISOString() }, []);
  for (let followUps = 0; followUps <= 5; followUps += 1) {
    const sent = NOW.getTime() - 20 * 86_400_000;
    const touches: NextActionTouch[] = [{ lead_id: id(1), at: new Date(sent).toISOString(), kind: "proposal_sent" }];
    for (let i = 0; i < followUps; i += 1) touches.push({ lead_id: id(1), at: new Date(sent + (i + 1) * 3_600_000).toISOString(), kind: "call_out_missed" });
    collect({ ...base, status: "proposal" }, touches);
  }
  assert.ok(named.size >= 25, `${named.size} keys named`);
  for (const key of named) assert.ok(SCRIPT_KEYS.includes(key), `${key} has a script`);
  // And nothing is written that no action ever uses.
  for (const key of SCRIPT_KEYS) assert.ok(named.has(key), `${key} is used by an action`);
});

test("a name the software made up is never said out loud", () => {
  // The phone line saves an unknown number as "Unknown". Meta fills in "Facebook User".
  for (const name of ["Unknown", "unknown caller", "Facebook User", "Text-in lead", "Unnamed", "N/A", "test"]) assert.equal(scriptFirstName(name), "", name);
  assert.equal(scriptFirstName("Riley Example"), "Riley");
  const opener = script("call.first", { firstName: scriptFirstName("Unknown"), byPhone: true })!.body;
  assert.match(opener, /^"Hello, this is Ryan with The LeadFlow Pro\./);
  assert.ok(!opener.includes("Unknown"));
});

test("somebody who called or texted is never told about a form they did not fill out", () => {
  const PHONE: ScriptContext = { firstName: "Jordan", day: 1, byPhone: true, contractor: false };
  for (const key of SCRIPT_KEYS) {
    const s = script(key, PHONE)!;
    assert.ok(!/\bform\b/i.test(`${s.subject ?? ""} ${s.body}`), `${key} does not mention a form`);
    assert.deepEqual(copyProblems(`${s.title}\n${s.subject ?? ""}\n${s.body}`), [], key);
  }
  assert.match(script("call.first", PHONE)!.body, /^"Jordan, this is Ryan with The LeadFlow Pro\. You got in touch with us yesterday\. Did I catch you at a decent time\?"/);
  assert.match(script("voicemail.1", PHONE)!.body, /calling about your message to us\./);
  // A form lead still hears about the form, and how long ago it was.
  assert.match(script("call.first", { ...CONTRACTOR, day: 0 })!.body, /You filled out our form a little while ago about getting more dirt work jobs\./);
  assert.match(script("call.first", { ...CONTRACTOR, day: 3 })!.body, /You filled out our form the other day/);
  assert.match(script("call.first", { ...CONTRACTOR, day: 17 })!.body, /You filled out our form a while back/);
});

test("the checklists say what the board does, and claim nothing about what works", () => {
  const all = SCRIPT_KEYS.map((key) => script(key, CONTRACTOR)!.body).join("\n");
  for (const claim of ["beats a text back", "where deals go quiet", "money that is not real", "we never connected"]) assert.ok(!all.includes(claim), claim);
  assert.match(script("next_step", CONTRACTOR)!.body, /Without a next step saved, the board cannot bring this lead back to you\.$/);
  assert.match(script("reply", CONTRACTOR)!.body, /3\. No answer, and they texted you: one line and one question back\./);
  assert.match(script("call.reopen", CONTRACTOR)!.body, /I wanted to check in before I close your file\./);
});
