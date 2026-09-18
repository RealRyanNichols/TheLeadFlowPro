import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { INTEREST_LABELS, leadWelcomePayload } from "../lib/leadNotify.ts";
import { BUSINESS } from "../lib/site/business.ts";
import { CONSULTATION } from "../lib/site/consultation.ts";
import { FOOTER_COLUMNS, HEADER_CTA, NAV_LINKS } from "../lib/site/navigation.ts";

// The homepage's one ask is the free thirty-minute consultation. These tests
// keep the offer described one way everywhere and keep events and courses
// off the front door.

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
});

test("the homepage sells the consultation and the done-for-you services, never events or courses", () => {
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
    "—",
  ]) {
    assert.ok(!home.includes(banned), `app/page.tsx still contains "${banned}"`);
  }
  assert.ok(home.includes("ConsultationForm"));
  assert.ok(home.includes("id={CONSULTATION.anchor}"));
  for (const href of ["/agency/meta-ads", "/agency/automation", "/free-build", "/scoreboard", "/tools"]) {
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
    assert.ok(!line.includes("—"), `em dash in "${line}"`);
    assert.ok(!/guarantee|roas|#1/i.test(line), `banned claim in "${line}"`);
  }
  assert.ok(CONSULTATION.bring.length >= 4);
});
