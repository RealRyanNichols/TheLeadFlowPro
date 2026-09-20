import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { EXTERNAL_LINKS, bookingPage, googleBusinessProfile, optionalLink } from "../lib/site/external-links.ts";
import { bookingLines, bookingSentence, leadTextBackBody, leadWelcomePayload } from "../lib/leadNotify.ts";
import { organizationJsonLd, sameAsLinks } from "../lib/site/structuredData.ts";
import { CONSULTATION } from "../lib/site/consultation.ts";

// The booking page and the Google listing are optional addresses. Until Ryan
// sets them, nothing on the site, in an email, or in a text may mention them.

test("an optional address counts only as a real https URL", () => {
  assert.equal(optionalLink(""), null);
  assert.equal(optionalLink("   "), null);
  assert.equal(optionalLink("calendar.app.google/abc"), null);
  assert.equal(optionalLink("http://example.com/book"), null);
  assert.equal(optionalLink("https://calendar.app.google/abc "), "https://calendar.app.google/abc");
});

test("with no booking page set, the confirmation, the welcome email, and the text-back say nothing about booking", () => {
  assert.equal(EXTERNAL_LINKS.bookingPage, "");
  assert.equal(bookingPage(), null);
  assert.deepEqual(bookingLines(), []);
  assert.equal(bookingSentence(), "");
  const text = leadTextBackBody("Sam");
  assert.ok(text.startsWith("Sam, this is Ryan with The LeadFlow Pro."));
  assert.ok(text.endsWith("Reply STOP to opt out."));
  assert.ok(!/book|calendar|pick a time/i.test(text));
  const welcome = leadWelcomePayload({ full_name: "Sam Tate", email: "sam@example.com", interest: CONSULTATION.interest, funnel: CONSULTATION.funnel });
  assert.ok(!/pick the time yourself/i.test(welcome.text));
  const form = readFileSync(join(process.cwd(), "components/site/ConsultationForm.tsx"), "utf8");
  assert.ok(form.includes("bookingPage()") && form.includes("{booking ? ("), "the confirmation renders the link only when set");
});

test("with a booking page set, the line appears once and STOP stays last in the text", () => {
  const url = "https://calendar.app.google/example";
  assert.deepEqual(bookingLines(url), ["Or pick the time yourself, right now:", url, ""]);
  assert.equal(bookingSentence(url), ` Pick a time yourself here: ${url}`);
  const text = leadTextBackBody("Sam", url);
  assert.ok(text.includes(url));
  assert.ok(text.endsWith("Reply STOP to opt out."));
  assert.equal(text.split(url).length, 2);
  assert.ok(text.length <= 320, `text-back is ${text.length} characters`);
});

test("the Google listing joins sameAs only when set", () => {
  assert.equal(EXTERNAL_LINKS.googleBusinessProfile, "");
  assert.equal(googleBusinessProfile(), null);
  assert.deepEqual(sameAsLinks(), organizationJsonLd().sameAs);
  assert.equal(sameAsLinks().length, 2);
  assert.ok(sameAsLinks().every((u) => u.startsWith("https://")));
});
