import test from "node:test";
import assert from "node:assert/strict";
import { leadWelcomePayload, withLeadTag, META_SALES_WELCOME_FUNNEL, META_SALES_WELCOME_CAMPAIGN, type NotifiableLead, type OwnerAlertContext } from "../lib/leadNotify.ts";
import { BUSINESS } from "../lib/site/business.ts";
import { EXTERNAL_LINKS, bookingPage } from "../lib/site/external-links.ts";
import { verifyUnsubscribe } from "../lib/unsubscribe.ts";
import { isMetaSalesDailySeriesLead } from "../lib/metaSalesDailySeries.ts";
import { createMetaDailyEnrollment } from "../lib/metaDailyEnrollment.ts";

const leadId = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
const secret = "local-render-fixture-not-a-production-credential";
const savedSecret = process.env.UNSUBSCRIBE_SECRET;
const savedService = process.env.SUPABASE_SERVICE_ROLE_KEY;
process.env.UNSUBSCRIBE_SECRET = secret;
delete process.env.SUPABASE_SERVICE_ROLE_KEY;
const fixture = { full_name: "Example Owner", email: "owner@example.test", interest: "done_for_you", source: "meta_lead_ad", funnel: META_SALES_WELCOME_FUNNEL, sms_consent: false };
const context = { leadId, receivedAt: "2026-10-08T20:00:00.000Z" };
const restoreEnvironment = () => {
  if (savedSecret === undefined) delete process.env.UNSUBSCRIBE_SECRET; else process.env.UNSUBSCRIBE_SECRET = savedSecret;
  if (savedService === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY; else process.env.SUPABASE_SERVICE_ROLE_KEY = savedService;
};
test.after(restoreEnvironment);
const decode = (text: string) => text.replaceAll("&amp;", "&").replaceAll("&quot;", '"').replaceAll("&#39;", "'").replaceAll("&lt;", "<").replaceAll("&gt;", ">");
const hrefs = (html: string) => [...html.matchAll(/href="([^"]+)"/g)].map((match) => decode(match[1]));

type RenderedWelcome = ReturnType<typeof leadWelcomePayload> & {
  html: string; headers: Record<string, string>; tags: { name: string; value: string }[];
};
function assertRendered(payload: ReturnType<typeof leadWelcomePayload>): asserts payload is RenderedWelcome {
  assert.ok("html" in payload && typeof payload.html === "string");
  assert.ok("headers" in payload && payload.headers !== null && typeof payload.headers === "object");
  assert.ok("tags" in payload && Array.isArray(payload.tags));
}
function currentPayload(input: NotifiableLead = fixture, options: OwnerAlertContext = context): RenderedWelcome {
  const payload = leadWelcomePayload(input, options);
  assertRendered(payload);
  return payload;
}

test("only an explicitly captured Meta welcome version chooses HTML, independently of timestamp", () => {
  assert.equal(META_SALES_WELCOME_FUNNEL, "meta_sales_welcome_v1");
  for (const receivedAt of ["2026-09-01T12:00:00Z", "2026-10-09T12:00:00Z"]) {
    const payload = currentPayload(fixture, { ...context, receivedAt });
    assert.equal(payload.from, "Ryan | The LeadFlow Pro <hello@theleadflowpro.com>");
    assert.equal(payload.reply_to, "hello@theleadflowpro.com");
    assert.equal(payload.subject, "Got it, Example. I am looking at what to fix first.");
    assert.ok(payload.html.startsWith("<!DOCTYPE html>"));
  }
});

test("old generic snapshots keep the exact body and sender across retries after the release", () => {
  for (const funnel of ["meta_lead_form", "free_build_funnel", null]) {
    const old = { ...fixture, funnel };
    assert.deepEqual(leadWelcomePayload(old), leadWelcomePayload(old, { ...context, receivedAt: "2027-01-01T12:00:00Z" }));
    const payload = leadWelcomePayload(old, context);
    assert.equal("html" in payload, false);
    assert.equal(payload.from, "Ryan Nichols <ryan@theleadflowpro.com>");
    assert.equal("tags" in payload, false);
    assert.match(payload.text, /Your answers just landed in my system\. Not a ticket queue\. Mine\. I read every one of these myself\./);
    assert.doesNotMatch(payload.text, /meta_sales_welcome_v1|Unsubscribe from follow-up emails/);
  }
});

test("a website caller cannot select the Meta-only template using a supplied funnel string", () => {
  const payload = leadWelcomePayload({ ...fixture, source: "website" }, context);
  assert.equal("html" in payload, false);
  assert.equal("tags" in payload, false);
  assert.equal(payload.from, "Ryan Nichols <ryan@theleadflowpro.com>");
});

test("HTML and plain text keep the existing results and response words with visible spacing", () => {
  const payload = currentPayload();
  const statements = [
    "Your answers just landed in my system. Not a ticket queue. Mine. I read every one of these myself.",
    "1. I look at what you told me: what you are running now, what it is costing you, and how fast you want it changed.",
    "2. I reply within one business day by email.",
    "3. You leave that first conversation knowing the fastest thing to fix and your next three moves, whether you hire me or not.",
  ];
  for (const statement of statements) {
    assert.ok(payload.text.includes(statement), statement);
    assert.ok(decode(payload.html).includes(statement), statement);
  }
  assert.match(payload.text, /Example,\n\nYour answers/);
  assert.match(payload.html, /font-size:17px;line-height:28px/);
  assert.match(payload.html, /max-width:600px/);
  assert.match(payload.html, /max-width:420px/);
  assert.doesNotMatch(payload.text, /free website|pay later|\$7,000|guaranteed/i);
});

test("every public destination has day00/campaign attribution in both versions", () => {
  const payload = currentPayload();
  const urls = hrefs(payload.html).filter((url) => !url.includes("/api/unsubscribe"));
  assert.ok(urls.length >= 3);
  for (const value of urls) {
    const url = new URL(value);
    assert.equal(url.protocol, "https:");
    assert.ok(["www.theleadflowpro.com", "calendly.com"].includes(url.hostname));
    assert.equal(url.searchParams.get("utm_source"), "resend");
    assert.equal(url.searchParams.get("utm_medium"), "email");
    assert.equal(url.searchParams.get("utm_campaign"), "meta_sales_welcome_v1");
    assert.match(url.searchParams.get("utm_content") || "", /^day00_(book|portfolio|site)$/);
    assert.ok(payload.text.includes(value));
  }
  assert.equal(payload.html.match(/Pick a time to talk &rarr;/g)?.length, 1);
});

test("all tracking keys and lead association stay separate from customer information", () => {
  const payload = withLeadTag(currentPayload(), leadId);
  assert.deepEqual(payload.tags, [
    { name: "campaign", value: "meta_sales_welcome_v1" },
    { name: "day", value: "00" },
    { name: "lead_id", value: leadId },
  ]);
  for (const value of hrefs(payload.html).filter((url) => !url.includes("/api/unsubscribe"))) {
    assert.ok(!value.includes(leadId));
    assert.ok(!value.includes(fixture.email));
    assert.ok(!value.includes("Example"));
  }
  assert.equal(META_SALES_WELCOME_CAMPAIGN, META_SALES_WELCOME_FUNNEL);
});

test("the exact existing one-click unsubscribe protocol is rendered, never a placeholder", () => {
  const payload = currentPayload();
  const target = new URL(hrefs(payload.html).find((url) => url.includes("/api/unsubscribe"))!);
  assert.equal(target.origin, "https://www.theleadflowpro.com");
  assert.equal(target.pathname, "/api/unsubscribe");
  assert.equal(target.searchParams.get("id"), leadId);
  assert.equal(verifyUnsubscribe(leadId, target.searchParams.get("t")!, secret), true);
  assert.equal(payload.headers["List-Unsubscribe"], `<${target}>`);
  assert.equal(payload.headers["List-Unsubscribe-Post"], "List-Unsubscribe=One-Click");
  assert.ok(payload.text.includes(target.toString()));
  assert.ok(payload.text.includes("No login required."));
  assert.ok(payload.html.includes("2800 Gilmer Rd Suite 106, Longview, TX 75604"));
  assert.doesNotMatch(payload.html, /\{\{|UNSUBSCRIBE_LINK/);
});

test("missing signing configuration and malformed identity fail before a provider request", () => {
  const before = process.env.UNSUBSCRIBE_SECRET;
  delete process.env.UNSUBSCRIBE_SECRET;
  try { assert.throws(() => leadWelcomePayload(fixture, context), /signing configuration is unavailable/); }
  finally { process.env.UNSUBSCRIBE_SECRET = before; }
  for (const id of [null, "", "bad-id\r\nInjected: yes", "<script>"]) {
    assert.throws(() => leadWelcomePayload(fixture, { ...context, leadId: id }), /signing configuration is unavailable/);
  }
});

test("HTML escapes hostile customer text and does not turn arbitrary names into external links", () => {
  const payload = currentPayload({ ...fixture, full_name: '<img src=x onerror="bad"> Example' });
  assert.ok(payload.html.includes("&lt;img"));
  assert.doesNotMatch(payload.html, /<img|onerror="bad"/);
  const urlName = currentPayload({ ...fixture, full_name: "https://untrusted.example/payload Person" });
  assert.ok(!hrefs(urlName.html).some((url) => url.includes("untrusted.example")));
});

test("phone follow-up wording still requires both permission and a number", () => {
  const noConsent = currentPayload({ ...fixture, phone: "9035550101", sms_consent: false });
  assert.doesNotMatch(noConsent.text, /With your permission, I may also call or text/);
  const permitted = currentPayload({ ...fixture, phone: "9035550101", sms_consent: true });
  assert.match(permitted.text, /With your permission, I may also call or text/);
  assert.ok(decode(permitted.html).includes("With your permission, I may also call or text"));
});

test("a missing booking page falls back to the scoped signup request, with attribution", () => {
  const mutable = EXTERNAL_LINKS as unknown as { bookingPage: string };
  const old = mutable.bookingPage;
  mutable.bookingPage = "";
  try {
    assert.equal(bookingPage(), null);
    const payload = currentPayload();
    const urls = hrefs(payload.html);
    const primary = new URL(urls.find((url) => url.includes("/agency/start"))!);
    assert.equal(primary.searchParams.get("plan"), "recommended");
    assert.equal(primary.searchParams.get("utm_content"), "day00_fit_review");
    assert.ok(payload.text.includes(primary.toString()));
    assert.match(payload.html, /Start my fit review/);
  } finally { mutable.bookingPage = old; }
});

test("contractor/workshop/agency welcomes and personal daily selector retain their existing lanes", () => {
  const contractor = leadWelcomePayload({ ...fixture, funnel: "contractor_owner" }, context);
  assertRendered(contractor);
  assert.equal(contractor.tags.find((tag) => tag.name === "campaign")?.value, "contractor_owner");
  assert.equal(contractor.from, "Ryan Nichols <ryan@theleadflowpro.com>");
  for (const funnel of ["agency_intake", "workshop_sep17", "product_project"]) {
    const payload = leadWelcomePayload({ ...fixture, funnel }, context);
    assert.equal("html" in payload, false);
    assert.ok(!payload.text.includes(META_SALES_WELCOME_CAMPAIGN));
  }
  const marker = createMetaDailyEnrollment("2026-10-08T20:00:00.000Z", "1234567890");
  assert.ok(marker);
  const candidate = { ...fixture, created_at: "2026-10-08T20:00:00.000Z", marketing_email_consent: true, diagnostic: { source: META_SALES_WELCOME_FUNNEL, form_id: "1001553739566746", meta_daily30: marker } };
  assert.equal(isMetaSalesDailySeriesLead(candidate, []), true);
  assert.equal(candidate.source, "meta_lead_ad");
  assert.equal(candidate.diagnostic.form_id, "1001553739566746");
  assert.equal(candidate.diagnostic.meta_daily30.enrolled_at, "2026-10-08T20:00:00.000Z");
  assert.equal(BUSINESS.email.hello, "hello@theleadflowpro.com");
});
