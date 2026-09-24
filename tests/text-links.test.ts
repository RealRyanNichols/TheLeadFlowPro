import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { CALL_LABEL, TEXT_BODIES, TEXT_LABEL, smsHref } from "../lib/site/textLinks.ts";
import { BUSINESS } from "../lib/site/business.ts";
import { CONSULTATION } from "../lib/site/consultation.ts";
import { isAutomatedLeadText, leadConsultationTextBody, leadTextBackBody, textBackBodyFor } from "../lib/leadNotify.ts";
import { copyProblems } from "../lib/hq/copy.ts";

test("every text link dials the one business line with a plain prefilled opening line", () => {
  for (const [placement, body] of Object.entries(TEXT_BODIES)) {
    const href = smsHref(placement as keyof typeof TEXT_BODIES);
    assert.ok(href.startsWith(`${BUSINESS.phone.sms}?&body=`), placement);
    assert.equal(decodeURIComponent(href.split("body=")[1]), body, placement);
    assert.ok(body.startsWith("Hi Ryan"), placement);
    assert.ok(body.endsWith(" "), `${placement} leaves room for the person to type`);
    assert.deepEqual(copyProblems(body), [], placement);
  }
  assert.equal(TEXT_LABEL, "Text Ryan");
  assert.equal(CALL_LABEL, `Call ${BUSINESS.phone.display}`);
});

test("every public call-or-text placement is a pair: one tel link and one sms link", () => {
  const files = ["app/page.tsx", "components/SiteFooter.tsx", "components/site/ConsultationForm.tsx", "app/services/page.tsx", "components/SiteHeader.tsx", "app/longview/page.tsx"];
  for (const file of files) {
    const source = readFileSync(join(process.cwd(), file), "utf8");
    assert.ok(!/Call or text/.test(source), `${file} still has a combined call-or-text link`);
    assert.ok(source.includes('smsHref("'), `${file} has no one-tap text link`);
  }
  const header = readFileSync(join(process.cwd(), "components/SiteHeader.tsx"), "utf8");
  const textIndex = header.indexOf("header-text-mobile");
  const detailsIndex = header.indexOf("<details");
  assert.ok(textIndex > 0 && textIndex < detailsIndex, "the mobile text link sits outside the collapsed menu");
});

test("the consultation text-back names the consultation and keeps the one-business-day promise", () => {
  const text = leadConsultationTextBody("Sam", null);
  assert.ok(text.includes(`free ${CONSULTATION.minutes}-minute consultation`));
  assert.ok(text.includes("within one business day"));
  assert.ok(!text.includes("shortly"));
  assert.ok(text.endsWith("Reply STOP to opt out."));
  assert.ok(text.length <= 320, `${text.length} characters`);
  const generic = leadTextBackBody("Sam", null);
  // The generic text-back promises nothing it cannot keep: no "shortly", no call on a clock.
  assert.ok(!generic.includes("shortly"));
  assert.ok(!/call you/i.test(generic));
  assert.ok(generic.includes("Reply here with your business name"));
  // The selector, not the source text: a consultation request gets its own body, everything else the generic one.
  assert.equal(textBackBodyFor({ full_name: "Sam Tate", funnel: CONSULTATION.funnel }, null), leadConsultationTextBody("Sam", null));
  assert.equal(textBackBodyFor({ full_name: "Sam Tate", funnel: "free_build_funnel" }, null), leadTextBackBody("Sam", null));
  assert.equal(textBackBodyFor({ full_name: "", funnel: null }, null), leadTextBackBody("there", null));
  const notify = readFileSync(join(process.cwd(), "lib/leadNotify.ts"), "utf8");
  assert.match(notify, /sendLeadText\(lead\.phone,\s*textBackBodyFor\(lead\)\)/);
});

test("the automated text-backs are recognisable as software, with or without the booking line, and a typed text is not", () => {
  const url = "https://calendar.app.google/example";
  for (const body of [leadTextBackBody("Sam", null), leadTextBackBody("Dana", url), leadConsultationTextBody("Sam", null), leadConsultationTextBody("Priya", url)]) {
    assert.equal(isAutomatedLeadText(body), true, body);
  }
  assert.equal(isAutomatedLeadText("Hi Sam, this is Ryan. Can we look at the water heater Thursday?"), false);
  assert.equal(isAutomatedLeadText(""), false);
});
