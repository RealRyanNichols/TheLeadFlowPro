import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  LEAD_EMAIL_PROVIDER_TIMEOUT_MS,
  sendLeadEmailNotification,
  type NotifiableLead,
} from "../lib/leadNotify";
import {
  leadEmailNotificationCronHttpStatus,
  leadEmailNotificationIdempotencyKey,
  leadEmailNotificationRetryDelayMinutes,
  leadEmailNotificationWindowExpired,
  LEAD_EMAIL_NOTIFICATION_SAFE_WINDOW_MS,
  MAX_LEAD_EMAIL_NOTIFICATION_ATTEMPTS,
} from "../lib/leadEmailNotifications";

const LEAD: NotifiableLead = {
  full_name: "Jane Owner",
  email: "jane@example.com",
  phone: "903-555-0100",
  business_name: "Example Co",
  interest: "free_website_program",
  source: "meta_lead_ad",
  funnel: "free_build_funnel",
};

test("lead email retry schedule stays inside the provider idempotency window", () => {
  assert.equal(MAX_LEAD_EMAIL_NOTIFICATION_ATTEMPTS, 7);
  assert.equal(leadEmailNotificationRetryDelayMinutes(1), 1);
  assert.equal(leadEmailNotificationRetryDelayMinutes(2), 5);
  assert.equal(leadEmailNotificationRetryDelayMinutes(6), 360);
  assert.equal(leadEmailNotificationRetryDelayMinutes(99), 360);

  const totalRetryMinutes = Array.from(
    { length: MAX_LEAD_EMAIL_NOTIFICATION_ATTEMPTS - 1 },
    (_, index) => leadEmailNotificationRetryDelayMinutes(index + 1),
  ).reduce((sum, delay) => sum + delay, 0);
  assert.ok(totalRetryMinutes < 24 * 60);
});

test("each lead email gets a stable, type-specific provider idempotency key", () => {
  const leadId = "123e4567-e89b-42d3-a456-426614174000";
  assert.equal(
    leadEmailNotificationIdempotencyKey(leadId, "owner_alert"),
    `lead-${leadId}-owner_alert-v1`,
  );
  assert.notEqual(
    leadEmailNotificationIdempotencyKey(leadId, "owner_alert"),
    leadEmailNotificationIdempotencyKey(leadId, "lead_welcome"),
  );
});

test("cron reports the run as failed when any outbox row becomes terminal", () => {
  assert.equal(leadEmailNotificationCronHttpStatus({ permanently_failed: 0 }), 200);
  assert.equal(leadEmailNotificationCronHttpStatus({ permanently_failed: 1 }), 500);
});

test("ambiguous sends are never replayed after the provider idempotency window", () => {
  const now = Date.parse("2026-09-01T23:00:00.000Z");
  assert.equal(LEAD_EMAIL_NOTIFICATION_SAFE_WINDOW_MS, 23 * 60 * 60 * 1000);
  assert.equal(
    leadEmailNotificationWindowExpired("2026-09-01T00:00:00.001Z", now),
    false,
  );
  assert.equal(leadEmailNotificationWindowExpired("2026-09-01T00:00:00.000Z", now), true);
  assert.equal(leadEmailNotificationWindowExpired("not-a-date", now), true);
});

test("lead emails pass the stable key to Resend and preserve the free-build promise", async () => {
  const previousKey = process.env.RESEND_API_KEY;
  const previousFetch = globalThis.fetch;
  const captured: Array<{ url: string; init: RequestInit }> = [];
  process.env.RESEND_API_KEY = "re_test_key";
  globalThis.fetch = async (input, init) => {
    captured.push({ url: String(input), init: init ?? {} });
    return new Response(JSON.stringify({ id: `email_provider_${captured.length}` }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };

  try {
    const ownerKey = leadEmailNotificationIdempotencyKey(
      "123e4567-e89b-42d3-a456-426614174000",
      "owner_alert",
    );
    const welcomeKey = leadEmailNotificationIdempotencyKey(
      "123e4567-e89b-42d3-a456-426614174000",
      "lead_welcome",
    );
    assert.deepEqual(await sendLeadEmailNotification(LEAD, "owner_alert", ownerKey), {
      ok: true,
      providerMessageId: "email_provider_1",
    });
    assert.deepEqual(await sendLeadEmailNotification(LEAD, "lead_welcome", welcomeKey), {
      ok: true,
      providerMessageId: "email_provider_2",
    });

    assert.equal(captured.length, 2);
    assert.equal(captured[0].url, "https://api.resend.com/emails");
    assert.equal(new Headers(captured[0].init.headers).get("Idempotency-Key"), ownerKey);
    assert.equal(new Headers(captured[1].init.headers).get("Idempotency-Key"), welcomeKey);
    assert.ok(LEAD_EMAIL_PROVIDER_TIMEOUT_MS > 0);
    assert.ok(LEAD_EMAIL_PROVIDER_TIMEOUT_MS <= 5_000);
    assert.ok(captured[0].init.signal instanceof AbortSignal);
    assert.ok(captured[1].init.signal instanceof AbortSignal);

    const owner = JSON.parse(String(captured[0].init.body));
    const welcome = JSON.parse(String(captured[1].init.body));
    assert.deepEqual(owner.to, ["hello@theleadflowpro.com"]);
    assert.deepEqual(welcome.to, [LEAD.email]);
    assert.match(welcome.subject, /free website application/i);
    assert.match(welcome.text, /build fee is \$0/i);
    assert.match(welcome.text, /No paid add-on is required/i);
  } finally {
    globalThis.fetch = previousFetch;
    if (previousKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = previousKey;
  }
});

test("an ambiguous timeout remains retryable with the same provider key", async () => {
  const previousKey = process.env.RESEND_API_KEY;
  const previousFetch = globalThis.fetch;
  const capturedKeys: Array<string | null> = [];
  process.env.RESEND_API_KEY = "re_test_key";
  globalThis.fetch = async (_input, init) => {
    assert.ok(init?.signal instanceof AbortSignal);
    capturedKeys.push(new Headers(init?.headers).get("Idempotency-Key"));
    throw new DOMException("The operation was aborted", "AbortError");
  };

  const idempotencyKey = leadEmailNotificationIdempotencyKey(
    "123e4567-e89b-42d3-a456-426614174000",
    "owner_alert",
  );
  try {
    const first = await sendLeadEmailNotification(LEAD, "owner_alert", idempotencyKey);
    const retry = await sendLeadEmailNotification(LEAD, "owner_alert", idempotencyKey);
    assert.equal(first.ok, false);
    assert.equal(retry.ok, false);
    if (!first.ok) assert.match(first.error, /aborted/i);
    if (!retry.ok) assert.match(retry.error, /aborted/i);
    assert.deepEqual(capturedKeys, [idempotencyKey, idempotencyKey]);
  } finally {
    globalThis.fetch = previousFetch;
    if (previousKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = previousKey;
  }
});

test("missing Resend configuration leaves the email retryable", async () => {
  const previousKey = process.env.RESEND_API_KEY;
  delete process.env.RESEND_API_KEY;
  try {
    const result = await sendLeadEmailNotification(
      LEAD,
      "owner_alert",
      "lead-123-owner_alert-v1",
    );
    assert.deepEqual(result, { ok: false, error: "RESEND_API_KEY is not configured" });
  } finally {
    if (previousKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = previousKey;
  }
});

test("lead insert trigger queues one job per type without backfilling old leads", async () => {
  const migration = await readFile(
    new URL(
      "../supabase/migrations/20260901235000_lead_email_notification_outbox.sql",
      import.meta.url,
    ),
    "utf8",
  );
  assert.match(migration, /unique \(lead_id, notification_type\)/i);
  assert.match(migration, /after insert on public\.leads/i);
  assert.match(migration, /security definer\s+set search_path = ''/i);
  assert.match(migration, /notification_pipeline[\s\S]+lead_intake_v1/i);
  assert.match(migration, /request\.jwt\.claim\.role[\s\S]+service_role/i);
  assert.match(migration, /lead_snapshot jsonb not null/i);
  assert.match(migration, /jsonb_build_object\s*\(/i);
  assert.match(migration, /on conflict \(lead_id, notification_type\) do nothing/gi);
  assert.match(migration, /revoke all on table public\.lead_email_notifications from public, anon, authenticated/i);
  assert.doesNotMatch(migration, /insert into public\.lead_email_notifications[\s\S]+select[\s\S]+from public\.leads/i);
});

test("both lead entry routes use the outbox and keep SMS separate", async () => {
  for (const relativePath of ["../app/api/leads/route.ts", "../app/api/meta-leads/route.ts"]) {
    const source = await readFile(new URL(relativePath, import.meta.url), "utf8");
    assert.match(source, /notification_pipeline:\s*["']lead_intake_v1["']/);
    assert.match(source, /deliverLeadEmailNotificationsForLead\s*\(/);
    assert.match(source, /notifyNewLeadSms\s*\(/);
    assert.doesNotMatch(source, /notifyNewLead\s*\(/);
  }

  const websiteRoute = await readFile(new URL("../app/api/leads/route.ts", import.meta.url), "utf8");
  assert.match(websiteRoute, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.doesNotMatch(websiteRoute, /SUPABASE_ANON_KEY/);
  assert.match(websiteRoute, /leadFlowSupabaseRuntimeIssues\s*\(/);
  assert.match(websiteRoute, /fullName\s*=\s*body\.full_name\.trim\(\)/);
  assert.match(websiteRoute, /Enter a valid email address/);

  const cron = await readFile(
    new URL("../app/api/cron/lead-email-notifications/route.ts", import.meta.url),
    "utf8",
  );
  assert.match(cron, /CRON_SECRET/);
  assert.match(cron, /status: 401/);
  assert.match(cron, /retryPendingLeadEmailNotifications/);
  assert.match(cron, /leadFlowSupabaseRuntimeIssues\s*\(/);
  assert.match(cron, /leadEmailNotificationCronHttpStatus\s*\(/);
  assert.match(cron, /permanent failures/i);

  const outbox = await readFile(
    new URL("../lib/leadEmailNotifications.ts", import.meta.url),
    "utf8",
  );
  assert.match(outbox, /Lead email notification permanently failed/);
});
