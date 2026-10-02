import assert from "node:assert/strict";
import test from "node:test";
import {
  CONTRACTOR_CAMPAIGN,
  CONTRACTOR_EMAILS,
  CONTRACTOR_LAST_STEP,
  CONTRACTOR_LIVE_DAYS,
  CONTRACTOR_META_FORM_ID,
  CONTRACTOR_STEPS,
  CONTRACTOR_WELCOME,
  CONTRACTOR_WRITTEN,
  contractorFirstName,
  contractorPlainText,
  contractorSendDays,
  contractorStepForDay,
  contractorStepsDueBy,
  contractorSubject,
  isContractorSeriesLead,
  type ContractorEmail,
} from "../lib/contractorSeries.ts";
import { renderContractorHtml } from "../lib/contractorEmailHtml.ts";
import { isAllowedLeadFlowAdId, registeredMetaForm } from "../lib/metaCampaignGuard.ts";
import { leadWelcomePayload } from "../lib/leadNotify.ts";

// The Scott video contractor series. Ryan's cadence, Ryan's copy rules, and
// the one gate that matters: only the days he cleared can ever send.

test("the schedule is daily to 30, then every 2, 3 and 4 days to 180", () => {
  const days = contractorSendDays();
  assert.equal(days.length, 80);
  assert.deepEqual(days.slice(0, 30), Array.from({ length: 30 }, (_, i) => i + 1));
  assert.deepEqual(days.slice(30, 33), [32, 34, 36]);
  assert.equal(days.at(-1), 180);
  for (let i = 1; i < days.length; i += 1) {
    const gap = days[i] - days[i - 1];
    const expected = days[i] <= 30 ? 1 : days[i] <= 60 ? 2 : days[i] <= 120 ? 3 : 4;
    assert.equal(gap, expected, `gap before day ${days[i]}`);
  }
  assert.equal(contractorStepForDay(1), 601);
  assert.equal(CONTRACTOR_LAST_STEP, 680);
});

test("only the days Ryan cleared can send", () => {
  const live = [...CONTRACTOR_LIVE_DAYS].sort((a, b) => a - b);
  assert.deepEqual(live, [1, 2, 3, 4, 5, 6, 7]);
  assert.deepEqual(
    CONTRACTOR_STEPS.map((s) => [s.day, s.step]),
    live.map((day) => [day, contractorStepForDay(day)]),
  );
  assert.deepEqual(contractorStepsDueBy(0).map((s) => s.step), []);
  assert.deepEqual(contractorStepsDueBy(2).map((s) => s.step), [601, 602]);
  // Only cleared days are ever due, however old the lead is.
  assert.deepEqual(
    contractorStepsDueBy(180).map((s) => s.day),
    CONTRACTOR_WRITTEN.filter((e) => CONTRACTOR_LIVE_DAYS.has(e.day)).map((e) => e.day),
  );
  assert.ok(CONTRACTOR_WRITTEN.length >= CONTRACTOR_EMAILS.length);
});

function copyOf(email: ContractorEmail): string[] {
  const out = [email.subject, email.preheader, email.kicker, email.headline, email.cta.label, email.cta.lead ?? "", email.next ?? "", email.ps ?? "", email.hero.alt];
  for (const block of email.blocks("Mike")) {
    if (block.kind === "p" || block.kind === "callout") out.push(block.text);
    if (block.kind === "quote") out.push(block.text, block.who);
    if (block.kind === "stats") out.push(block.note, ...block.items.flatMap((i) => [i.value, i.label]));
    if (block.kind === "steps") out.push(block.title ?? "", ...block.items.flatMap((i) => [i.title, i.text ?? ""]));
    if (block.kind === "checks") out.push(block.title, ...block.items);
  }
  return out;
}

test("every email follows the copy rules: one subject emoji, no dashes, no promises", () => {
  for (const email of [CONTRACTOR_WELCOME, ...CONTRACTOR_WRITTEN]) {
    assert.match(email.subject, /\p{Extended_Pictographic}/u, `day ${email.day} subject needs an emoji`);
    for (const line of copyOf(email)) {
      // The business is spelled O-L Guy Farms and phone numbers keep their
      // hyphen. Nothing else may carry a dash.
      const bare = line.replace(/O-L Guy Farms/g, "").replace(/\(\d{3}\) \d{3}-\d{4}/g, "");
      assert.doesNotMatch(bare, /[-‐-―−]/, `day ${email.day}: "${line}"`);
      assert.doesNotMatch(line, /\bguarantee/i, `day ${email.day}: "${line}"`);
    }
  }
});

test("every button carries the campaign and the day", () => {
  for (const email of [CONTRACTOR_WELCOME, ...CONTRACTOR_WRITTEN]) {
    assert.match(email.cta.href, new RegExp(`utm_campaign=${CONTRACTOR_CAMPAIGN}&utm_content=day${email.day}(_|&|$|#)`));
  }
});

test("only the Scott form with consent joins the series", () => {
  const lead = {
    marketing_email_consent: true,
    source: "meta_lead_ad",
    diagnostic: { form_id: CONTRACTOR_META_FORM_ID },
  };
  assert.equal(isContractorSeriesLead(lead), true);
  assert.equal(isContractorSeriesLead({ ...lead, marketing_email_consent: false }), false);
  assert.equal(isContractorSeriesLead({ ...lead, source: "website" }), false);
  assert.equal(isContractorSeriesLead({ ...lead, diagnostic: { form_id: "3610264839155246" } }), false);
  assert.equal(isContractorSeriesLead({ ...lead, diagnostic: null }), false);
});

test("the form and both ads are registered: email follow up yes, automatic text no", () => {
  const form = registeredMetaForm(CONTRACTOR_META_FORM_ID);
  assert.ok(form);
  assert.equal(form.inquiryOptIn, true);
  assert.equal(form.textOnSubmit, false);
  assert.equal(form.funnel, "contractor_owner");
  assert.equal(isAllowedLeadFlowAdId("120253999623340154"), true);
  assert.equal(isAllowedLeadFlowAdId("120254001470770154"), true);
});

test("names: a real first name is used, a made up one is not", () => {
  assert.equal(contractorFirstName("mike smith"), "Mike");
  assert.equal(contractorFirstName("José Ramirez"), "José");
  assert.equal(contractorFirstName("Facebook lead"), "");
  assert.equal(contractorFirstName(""), "");
  assert.equal(contractorSubject(CONTRACTOR_WELCOME, "Mike"), "✅ Mike, your application is in");
  assert.equal(contractorSubject(CONTRACTOR_WELCOME, ""), "✅ Your application is in");
  assert.ok(contractorPlainText(CONTRACTOR_WELCOME, "").startsWith("Hello,"));
});

test("the designed email: real logo, call and text buttons, unsubscribe, Scott's note", () => {
  const unsub = "https://www.theleadflowpro.com/api/unsubscribe?id=x&t=y";
  for (const email of [CONTRACTOR_WELCOME, ...CONTRACTOR_EMAILS]) {
    const html = renderContractorHtml({ email, firstName: "Mike", unsubUrl: unsub });
    assert.ok(html.startsWith("<!DOCTYPE html>"));
    assert.ok(html.includes("/images/email/leadflow-logo-tile.png"), "the LF logo");
    assert.ok(!html.includes("app-icon"), "never the old app icon");
    assert.ok(html.includes("Call Ryan") && html.includes("Text Ryan"));
    assert.ok(html.includes(unsub.replace(/&/g, "&amp;")), "one click unsubscribe");
    assert.ok(html.includes("Nothing in this email is a promise of leads, sales or revenue."));
    if (email.blocks("Mike").some((b) => b.kind === "stats")) {
      assert.ok(html.includes("Not a promise of what yours will do."), `day ${email.day} keeps Scott's note`);
    }
  }
});

test("the contractor welcome is the designed email, tagged, with its unsubscribe", () => {
  const payload = leadWelcomePayload(
    { full_name: "Mike Smith", email: "mike@example.com", interest: "done_for_you", funnel: "contractor_owner" },
    { leadId: "lead-123" },
  ) as Record<string, unknown>;
  assert.equal(payload.subject, "✅ Mike, your application is in");
  assert.ok(String(payload.html).startsWith("<!DOCTYPE html>"));
  assert.ok(String(payload.text).startsWith("Mike,"));
  assert.deepEqual(payload.tags, [
    { name: "campaign", value: "contractor_owner" },
    { name: "day", value: "00" },
  ]);
});

test("the send window is 7 AM to 8 PM Central unless turned off", async () => {
  const { nurtureSendWindowOpen } = await import("../lib/nurtureDelivery.ts");
  assert.equal(nurtureSendWindowOpen(Date.parse("2026-10-02T08:00:00Z")), false); // 3 AM CDT
  assert.equal(nurtureSendWindowOpen(Date.parse("2026-10-02T12:00:00Z")), true); // 7 AM CDT
  assert.equal(nurtureSendWindowOpen(Date.parse("2026-10-03T00:59:00Z")), true); // 7:59 PM CDT
  assert.equal(nurtureSendWindowOpen(Date.parse("2026-10-03T01:00:00Z")), false); // 8 PM CDT
  assert.equal(nurtureSendWindowOpen(Date.parse("2026-10-02T08:00:00Z"), "off"), true);
});
