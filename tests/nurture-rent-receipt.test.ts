import assert from "node:assert/strict";
import test from "node:test";
import {
  isRentReceiptSeriesLead,
  RENT_RECEIPT_CAMPAIGN,
  RENT_RECEIPT_FIRST_STEP,
  RENT_RECEIPT_LAST_STEP,
  RENT_RECEIPT_SERIES_START,
  RENT_RECEIPT_STEPS,
  rentReceiptCallLink,
  rentReceiptStepsDueBy,
} from "../lib/nurtureRentReceipt";
import {
  NURTURE_PAINS,
  NURTURE_TIMELINES,
  nurtureContextFor,
  painOf,
  timelineOf,
  type NurtureContext,
  type NurturePain,
  type NurtureTimeline,
} from "../lib/nurtureContext";
import { NURTURE_STEP_MEDIA, renderNurtureHtml } from "../lib/nurtureHtml";
import { NURTURE_FIRST_STEP, NURTURE_LAST_STEP, nurtureSubjectFor, WORKSHOP_LAST_STEP } from "../lib/nurture";
import { ENDS_AT as SPECIAL_ENDS_AT } from "../lib/septemberSpecial";
import { bookingPage } from "../lib/site/external-links";
import { BUSINESS } from "../lib/site/business";

// The rules every email in the series has to keep, checked on every rendered
// combination of pain and timeline, not on a sample.

const BANNED_WORDS = [
  "revolutionary",
  "cutting-edge",
  "cutting edge",
  "unlock your potential",
  "seamless",
  "transform your journey",
  "world-class",
  "world class",
  "next-gen",
  "ai-powered",
];

const NUMBER_PROMISES = [/guarantee\w* (you )?(leads|revenue|sales|results)/i, /\bROAS\b/, /cost per lead/i];

function context(pain: NurturePain, timeline: NurtureTimeline): NurtureContext {
  return {
    first: "Sam",
    pain,
    timeline,
    hot: timeline === "this_week" || timeline === "this_month",
  };
}

function stripUnavoidable(text: string): string {
  return text
    .replace(/https:\/\/\S+/g, "")
    .replaceAll(BUSINESS.phone.display, "")
    .replaceAll(RENT_RECEIPT_CAMPAIGN, "");
}

function renderAll() {
  const out: { day: number; pain: NurturePain; timeline: NurtureTimeline; subject: string; body: string }[] = [];
  for (const step of RENT_RECEIPT_STEPS) {
    for (const pain of NURTURE_PAINS) {
      for (const timeline of NURTURE_TIMELINES) {
        const c = context(pain, timeline);
        out.push({
          day: step.day,
          pain,
          timeline,
          subject: nurtureSubjectFor(step, c),
          body: step.body(c.first, c),
        });
      }
    }
  }
  return out;
}

test("thirty steps, days one to thirty, in a range no other sequence uses", () => {
  assert.equal(RENT_RECEIPT_STEPS.length, 30);
  assert.deepEqual(
    RENT_RECEIPT_STEPS.map((s) => s.day),
    Array.from({ length: 30 }, (_, i) => i + 1),
  );
  assert.equal(RENT_RECEIPT_FIRST_STEP, 501);
  assert.equal(RENT_RECEIPT_LAST_STEP, 530);
  assert.deepEqual(
    RENT_RECEIPT_STEPS.map((s) => s.step),
    Array.from({ length: 30 }, (_, i) => 501 + i),
  );
  // Free Build 101-130, diagnostic 200-206, workshop 201-204, workshop
  // follow-up 301-303, plugin onboarding 401-403. None may collide.
  for (const s of RENT_RECEIPT_STEPS) {
    assert.ok(s.step > NURTURE_LAST_STEP && s.step > WORKSHOP_LAST_STEP && s.step > 403);
    assert.ok(s.step < NURTURE_FIRST_STEP || s.step > NURTURE_LAST_STEP);
  }
  assert.equal(rentReceiptStepsDueBy(0).length, 0);
  assert.equal(rentReceiptStepsDueBy(1).length, 1);
  assert.equal(rentReceiptStepsDueBy(45).length, 30);
});

test("every rendered email keeps the copy rules on every pain and timeline", () => {
  const rendered = renderAll();
  assert.equal(rendered.length, 30 * NURTURE_PAINS.length * NURTURE_TIMELINES.length);
  for (const r of rendered) {
    const where = `day ${r.day} / ${r.pain} / ${r.timeline}`;
    const all = `${r.subject}\n${r.body}`;
    const checkable = stripUnavoidable(all);

    // No dashes of any kind outside URLs and the phone number.
    assert.equal(/[–—-]/.test(checkable), false, `dash in ${where}: ${checkable.match(/.{0,30}[–—-].{0,30}/)?.[0]}`);

    // No banned words.
    for (const word of BANNED_WORDS) {
      assert.equal(all.toLowerCase().includes(word), false, `banned word "${word}" in ${where}`);
    }

    // No number promises.
    for (const pattern of NUMBER_PROMISES) {
      assert.equal(pattern.test(all), false, `number promise in ${where}`);
    }

    // Exactly one link per email.
    const links = all.match(/https:\/\/\S+/g) ?? [];
    assert.equal(links.length, 1, `${links.length} links in ${where}`);

    // Every link carries attribution for the day and the track.
    const link = links[0];
    assert.ok(link.includes(`utm_campaign=${RENT_RECEIPT_CAMPAIGN}`), `no campaign utm in ${where}`);
    assert.ok(
      link.includes(`utm_content=day${String(r.day).padStart(2, "0")}_${r.pain}_`),
      `no day/track utm in ${where}: ${link}`,
    );

    // Short. The signature and unsubscribe line are added later by the cron.
    const words = r.body.split(/\s+/).filter(Boolean).length;
    assert.ok(words <= 200, `${words} words in ${where}`);

    // Opens with the first name, never promises an automated text.
    assert.ok(r.body.startsWith("Sam,"), `no greeting in ${where}`);
    assert.equal(/you will (get|receive) a text/i.test(all), false, `automated text promised in ${where}`);
    assert.equal(/\bfree website\b/i.test(all), false, `retired offer named in ${where}`);
  }
});

test("hot leads close on the booking link every day; cool leads only on the door days", () => {
  const booking = bookingPage();
  assert.ok(booking, "the booking page must be set for this series to make sense");
  const doorDays = new Set([7, 11, 15, 29, 30]);
  for (const r of renderAll()) {
    const hot = r.timeline === "this_week" || r.timeline === "this_month";
    const hasBooking = r.body.includes(booking!);
    if (hot) {
      assert.equal(hasBooking, true, `hot day ${r.day} / ${r.pain} does not link the call`);
    } else {
      assert.equal(hasBooking, doorDays.has(r.day), `cool day ${r.day} / ${r.pain} booking link state is wrong`);
    }
  }
  // The call link never dies: with no booking page it falls back to the contact page.
  const c = context("other", "this_week");
  assert.ok(rentReceiptCallLink(3, c).startsWith(booking!));
});

test("days one to five branch on the pain; days six to thirty are shared", () => {
  for (const day of [1, 2, 3, 4, 5]) {
    const step = RENT_RECEIPT_STEPS[day - 1];
    const bodies = new Set(NURTURE_PAINS.map((pain) => step.body("Sam", context(pain, "unknown"))));
    assert.equal(bodies.size, NURTURE_PAINS.length, `day ${day} does not branch on every pain`);
    const subjects = new Set(NURTURE_PAINS.map((pain) => nurtureSubjectFor(step, context(pain, "unknown"))));
    assert.ok(subjects.size >= 2, `day ${day} subjects never vary`);
  }
  for (const step of RENT_RECEIPT_STEPS.slice(5)) {
    const bodies = new Set(NURTURE_PAINS.map((pain) => step.body("Sam", context(pain, "unknown"))));
    // Only the utm_content differs between pains from day six on.
    const stripped = new Set([...bodies].map((b) => b.replace(/utm_content=\S+/g, "")));
    assert.equal(stripped.size, 1, `day ${step.day} varies by pain and should not`);
  }
  // Rendering without a context falls back to the general cool path.
  assert.ok(RENT_RECEIPT_STEPS[0].body("Dana").startsWith("Dana,"));
  assert.ok(RENT_RECEIPT_STEPS[0].body("Dana").includes("What is costing you the most") === false);
  assert.equal(nurtureSubjectFor(RENT_RECEIPT_STEPS[0], context("other", "unknown")), "❓ What is costing you the most?");
  // Every subject carries one emoji up front, then words.
  for (const r of renderAll()) {
    assert.match(r.subject, /^\p{Extended_Pictographic}/u, `no emoji on ${r.subject}`);
  }
});

test("the context reader understands the real Meta form payload and the goals fallback", () => {
  const meta = {
    full_name: "Debra Terry",
    timeline: "this_month",
    goals:
      "what is costing you the most right now: missed_calls_and_texts_nobody_returns\nhow soon do you want it fixed: this_month",
    diagnostic: {
      fields: {
        email: "x@example.com",
        full_name: "Debra Terry",
        "how_soon_do_you_want_it_fixed?": "this_month",
        "what_is_costing_you_the_most_right_now?": "missed_calls_and_texts_nobody_returns",
      },
      form_id: "3610264839155246",
      source: "meta_lead_form",
    },
  };
  assert.deepEqual(nurtureContextFor(meta), {
    first: "Debra",
    pain: "missed_calls",
    timeline: "this_month",
    hot: true,
  });

  assert.equal(painOf({ diagnostic: { fields: { "what_is_costing_you_the_most_right_now?": "no_website,_or_one_that_does_nothing" } } }), "no_website");
  assert.equal(painOf({ diagnostic: { fields: { "what_is_costing_you_the_most_right_now?": "leads_that_never_get_followed_up" } } }), "no_follow_up");
  assert.equal(painOf({ diagnostic: { fields: { "what_is_costing_you_the_most_right_now?": "paying_monthly_for_tools_i_do_not_use" } } }), "monthly_fees");
  assert.equal(painOf({ diagnostic: { fields: { "what_is_costing_you_the_most_right_now?": "something_else" } } }), "other");
  assert.equal(painOf({ goals: "what is costing you the most right now: paying_monthly_for_tools_i_do_not_use" }), "monthly_fees");
  assert.equal(painOf({ diagnostic: null, goals: null }), "other");
  assert.equal(painOf({ diagnostic: [] }), "other");

  assert.equal(timelineOf({ timeline: "this_week" }), "this_week");
  assert.equal(timelineOf({ timeline: "next_90_days" }), "next_90_days");
  assert.equal(timelineOf({ timeline: "just_looking_right_now" }), "just_looking");
  assert.equal(timelineOf({ timeline: "", goals: "how soon do you want it fixed: this_week" }), "this_week");
  assert.equal(timelineOf({ diagnostic: { fields: { "how_soon_do_you_want_it_fixed?": "next_90_days" } } }), "next_90_days");
  assert.equal(timelineOf({}), "unknown");
  assert.equal(nurtureContextFor({ full_name: null }).first, "there");
  assert.equal(nurtureContextFor({ full_name: "  Tony   loud " }).first, "Tony");
});

test("the series admits the Free Build set by creation date and nothing else", () => {
  const admitted = {
    source: "meta_lead_ad",
    marketing_email_consent: true,
    diagnostic: { form_id: "3610264839155246", source: "meta_lead_form" },
  };
  const start = Date.parse(RENT_RECEIPT_SERIES_START);
  assert.equal(isRentReceiptSeriesLead({ ...admitted, created_at: new Date(start).toISOString() }), true);
  assert.equal(isRentReceiptSeriesLead({ ...admitted, created_at: new Date(start + 60_000).toISOString() }), true);
  assert.equal(isRentReceiptSeriesLead({ ...admitted, created_at: new Date(start - 60_000).toISOString() }), false);
  assert.equal(isRentReceiptSeriesLead({ ...admitted, created_at: null }), false);
  assert.equal(
    isRentReceiptSeriesLead({ ...admitted, marketing_email_consent: false, created_at: new Date(start).toISOString() }),
    false,
  );
  // A website consultation is not in the Free Build set, so not here either.
  assert.equal(
    isRentReceiptSeriesLead(
      { source: "website", interest: "consultation", marketing_email_consent: true, diagnostic: { source: "consultation" }, created_at: new Date(start).toISOString() },
    ),
    false,
  );
  // The services, scoreboard and qualified forms are in the set, so a new lead from any of them gets this series.
  for (const form_id of ["1001553739566746", "1072145798524733", "1075109702046952", "1602617814609528"]) {
    assert.equal(
      isRentReceiptSeriesLead({ ...admitted, diagnostic: { form_id }, created_at: new Date(start + 1).toISOString() }),
      true,
      form_id,
    );
  }
});

test("every step renders the designed email from the lead's answers", () => {
  const unsub = "https://www.theleadflowpro.com/unsubscribe?t=fixture";
  const after = Date.parse(SPECIAL_ENDS_AT) + 60_000;
  const booking = bookingPage()!;
  for (const step of RENT_RECEIPT_STEPS) {
    assert.ok(NURTURE_STEP_MEDIA[step.step], `step ${step.step} has no media entry`);
    for (const pain of NURTURE_PAINS) {
      for (const timeline of ["this_week", "just_looking"] as const) {
        const c = context(pain, timeline);
        const html = renderNurtureHtml({ step, firstName: "Sam", unsubUrl: unsub, context: c, now: after });
        const where = `step ${step.step} / ${pain} / ${timeline}`;
        assert.ok(html.includes(unsub), `${where} lost the unsubscribe link`);
        assert.ok(html.includes(`Day ${step.day} of 30`), `${where} day label`);
        assert.ok(html.includes("<img"), `${where} has no picture`);
        assert.ok(!/[\u2013\u2014]/.test(html), `${where} contains a dash`);
        // The headline is the subject without its emoji, so inbox and body agree.
        const headline = nurtureSubjectFor(step, c).replace(/^\S+\s/, "");
        assert.ok(html.includes(`<h1 style="margin:0 0 16px;font-family:Inter,Helvetica,Arial,sans-serif;font-size:26px;line-height:1.2;letter-spacing:-0.02em;color:#20212b;">${headline}</h1>`), `${where} headline`);
        // The button carries the one link the words carry, labeled for it.
        const link = (step.body("Sam", c).match(/https:\/\/\S+/) ?? [])[0]!;
        assert.ok(html.includes(`href="${link.replace(/&/g, "&amp;")}"`), `${where} button target`);
        if (link.startsWith(booking)) {
          assert.ok(html.includes(NURTURE_STEP_MEDIA[step.step].ctaHot ?? "Pick a time, I call you"), `${where} call label`);
        } else {
          assert.ok(html.includes(NURTURE_STEP_MEDIA[step.step].cta), `${where} cool label`);
        }
        // The tool card and the special link carry this campaign, never Free Build's.
        assert.equal(html.includes("utm_campaign=free_build"), false, `${where} leaks the Free Build campaign`);
        assert.ok(html.includes(`utm_campaign=${RENT_RECEIPT_CAMPAIGN}&amp;utm_content=day${step.day}_tool`), `${where} tool card`);
      }
    }
  }
});
