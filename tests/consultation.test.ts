import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { INTEREST_LABELS, leadWelcomePayload } from "../lib/leadNotify.ts";
import { BUSINESS } from "../lib/site/business.ts";
import { CONSULTATION } from "../lib/site/consultation.ts";
import { FOOTER_COLUMNS, HEADER_CTA, NAV_LINKS } from "../lib/site/navigation.ts";

// The homepage's one ask is the free thirty-minute consultation. These tests
// keep the offer described one way everywhere. Resource links remain secondary
// to the consultation under the October8 broader website organization request.

test("a consultation request lands in the done-for-you lane with a welcome that names the time, the place, and the phone", () => {
  assert.ok(INTEREST_LABELS[CONSULTATION.interest], "interest must be a labelled leads.interest value");
  const mail = leadWelcomePayload({
    full_name: "Fixture Owner",
    email: "fixture@example.com",
    interest: CONSULTATION.interest,
    funnel: CONSULTATION.funnel,
  });
  assert.match(mail.subject, /consultation/i);
  assert.ok(mail.text.includes("Fixture,"));
  assert.ok(mail.text.includes(BUSINESS.phone.display));
  assert.ok(mail.text.includes(`${CONSULTATION.minutes}-minute`));
  assert.ok(mail.text.includes(BUSINESS.city));
  for (const item of CONSULTATION.bring) assert.ok(mail.text.includes(item), item);
  assert.ok(!/workshop|seat|lesson|course/i.test(mail.text), "no event or course pitch in the consultation welcome");
  assert.ok(!/calendly\.com|pick the time yourself/i.test(mail.text), "the 30-minute request does not redirect to a separate 20-minute calendar");
});

test("the homepage keeps the consultation and existing service destinations clear", () => {
  const home = readFileSync("app/page.tsx", "utf8");
  for (const banned of [
    "FeaturedEvent",
    "NextStepGuide",
    "BusinessTaskPreview",
    "eventState",
    "workshop",
    "Workshop",
    "operator-academy",
    "chatgpt/free",
    "\u2014",
  ]) {
    assert.ok(!home.includes(banned), `app/page.tsx still contains "${banned}"`);
  }
  assert.ok(home.includes("ConsultationForm"));
  assert.ok(home.includes("id={CONSULTATION.anchor}"));
  for (const href of ["/services", "/portfolio", "/about", "/scoreboard", "/tools"]) {
    assert.ok(home.includes(`href="${href}"`), `homepage links ${href}`);
  }
});

test("header, footer, and the offer config point at the same consultation form", () => {
  assert.equal(CONSULTATION.href, `/#${CONSULTATION.anchor}`);
  assert.equal(HEADER_CTA.href, CONSULTATION.href);
  assert.ok(!NAV_LINKS.some((l) => l.href === "/events"), "no Events tab");
  assert.ok(!NAV_LINKS.some((l) => l.href === "/operator-academy"), "no Learn tab");
  const footer = FOOTER_COLUMNS.flatMap((c) => c.links);
  assert.ok(!footer.some((l) => l.href === "/events"), "no events link in the footer");
  assert.ok(footer.some((l) => l.href === CONSULTATION.href), "footer links the consultation");
});

test("meeting options cover the owner's shop, the Longview office, and a call, in plain copy", () => {
  assert.deepEqual(
    CONSULTATION.meetings.map((m) => m.id),
    ["your_place", "our_office", "call"],
  );
  assert.deepEqual(
    CONSULTATION.contactMethods.map((m) => m.id),
    ["text", "call", "email"],
  );
  const copy = [
    CONSULTATION.eyebrow,
    CONSULTATION.headline,
    CONSULTATION.body,
    ...CONSULTATION.bring,
    ...CONSULTATION.meetings.flatMap((m) => [m.label, m.detail]),
  ];
  for (const line of copy) {
    assert.ok(!line.includes("\u2014"), `em dash in "${line}"`);
    assert.ok(!/guarantee|roas|#1/i.test(line), `banned claim in "${line}"`);
  }
  assert.ok(CONSULTATION.bring.length >= 4);
});

test("consultation follow-up copy promises email without phone permission", () => {
  const lead = { full_name: "Fixture Owner", email: "fixture@example.com", interest: CONSULTATION.interest, funnel: CONSULTATION.funnel, phone: "+19035550100" };
  const without = leadWelcomePayload({ ...lead, sms_consent: false });
  assert.match(without.text, /within one business day by email from this address/);
  assert.doesNotMatch(without.text, /by a call or text from/);
  const withPermission = leadWelcomePayload({ ...lead, sms_consent: true });
  assert.match(withPermission.text, /with your permission/);
});

test("managed inquiry welcome agrees with included advertising and written billing scope", () => {
  const mail = leadWelcomePayload({ full_name: "Fixture Owner", email: "fixture@example.com", interest: "done_for_you", funnel: "agency_intake" });
  assert.match(mail.text, /included advertising allocation/);
  assert.match(mail.text, /first 90 days start at \$7,500 upfront/);
  assert.doesNotMatch(mail.text, /pay the platforms directly|ongoing monthly prices/);
  assert.match(mail.text, /permission/);
});
