import assert from "node:assert/strict";
import test from "node:test";
import {
  isMetaSalesSeriesLead, META_SALES_START, META_SALES_STEPS,
  metaSalesStepsDueBy, renderMetaSalesStep,
} from "../lib/metaSalesSeries";
import { leadWelcomePayload } from "../lib/leadNotify";

const base = {
  source: "meta_lead_ad", created_at: META_SALES_START,
  marketing_email_consent: true, diagnostic: { form_id: "2084381329108926" },
};

test("v1 pins a precise future cutoff and admits only suitable consented owned forms", () => {
  assert.equal(isMetaSalesSeriesLead(base), true);
  assert.equal(isMetaSalesSeriesLead({ ...base, created_at: new Date(Date.parse(META_SALES_START) - 1).toISOString() }), false);
  for (const consent of [false, null, undefined, "true", 1]) {
    assert.equal(isMetaSalesSeriesLead({ ...base, marketing_email_consent: consent }), false);
  }
  for (const form of ["foreign", "2043120369669082", "2016689789051460", "2292508494936036", "1602617814609528", "1749164796410610", "1674448410325108"]) {
    assert.equal(isMetaSalesSeriesLead({ ...base, diagnostic: { form_id: form } }), false);
  }
  assert.equal(isMetaSalesSeriesLead({ ...base, source: "website" }), false);
  assert.equal(isMetaSalesSeriesLead({ ...base, created_at: "bad date" }), false);
});

test("any prior lower-range claim, including pending and failed history, prevents a new campaign restart", () => {
  for (const step of [0, 4, 101, 501, 601, 680]) {
    assert.equal(isMetaSalesSeriesLead(base, [{ step }]), false);
  }
  assert.equal(isMetaSalesSeriesLead(base, [{ step: 701 }]), true);
});

test("the nine approved follow-ups span thirty days without scheduling another day-zero welcome", () => {
  assert.deepEqual(META_SALES_STEPS.map((x) => x.day), [1, 3, 5, 8, 12, 16, 21, 26, 30]);
  assert.deepEqual(META_SALES_STEPS.map((x) => x.step), [701, 702, 703, 704, 705, 706, 707, 708, 709]);
  assert.equal(metaSalesStepsDueBy(0).length, 0);
  assert.equal(metaSalesStepsDueBy(3).length, 2);
  assert.equal(metaSalesStepsDueBy(30).length, 9);
  assert.equal(metaSalesStepsDueBy(31).length, 0);
  assert.equal(metaSalesStepsDueBy(180).length, 0);
});

test("each message substitutes signed unsubscribe safely and retains campaign/CTA attribution", () => {
  const url = "https://www.theleadflowpro.com/api/unsubscribe?id=fixture&token=fixture";
  for (const step of META_SALES_STEPS) {
    const output = renderMetaSalesStep(step, url);
    assert.ok(output.html.includes("id=fixture&amp;token=fixture"));
    assert.ok(output.text.includes(url));
    assert.equal(output.html.includes("UNSUBSCRIBE_LINK"), false);
    assert.equal(output.text.includes("UNSUBSCRIBE_LINK"), false);
    assert.equal(output.html.includes("{{{"), false);
    assert.equal(output.text.includes("{{{"), false);
    const unsubscribeHref = output.html.match(/href="([^"]*\/api\/unsubscribe[^"]*)"/)?.[1];
    assert.equal(unsubscribeHref?.replaceAll("&amp;", "&"), url);
    assert.equal(output.html.includes("%7B"), false);
    if (output.html.includes("/agency/start?")) {
      assert.ok(output.html.includes("utm_campaign=meta_sales_30day_v1"));
    }
  }
});

test("the frozen transactional welcome aligns future follow-ups without changing older pending payloads", () => {
  const lead = { full_name: "Owner Example", email: "owner@example.com", interest: "done_for_you",
    source: "meta_lead_ad", funnel: "contractor_owner" };
  const old = leadWelcomePayload(lead, { receivedAt: new Date(Date.parse(META_SALES_START) - 1).toISOString() });
  assert.ok(old.text.includes("Tomorrow: what one month looked like for Scott"));
  const future = leadWelcomePayload(lead, { receivedAt: META_SALES_START });
  assert.equal(future.text.includes("Tomorrow: what one month looked like for Scott"), false);
  assert.ok(future.text.includes("Over the coming weeks, I will follow up"));
  assert.ok("html" in future && typeof future.html === "string" && future.html.includes("Over the coming weeks, I will follow up"));
  assert.equal(future.subject, old.subject);
  assert.equal(future.from, old.from);
  assert.ok("tags" in future && "tags" in old);
  assert.deepEqual(future.tags, old.tags);
  assert.equal(leadWelcomePayload(lead).text, old.text, "unknown capture time retains the original welcome");
});
