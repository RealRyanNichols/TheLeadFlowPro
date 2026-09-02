import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  nurtureEmailIdempotencyKey,
  NURTURE_PROVIDER_TIMEOUT_MS,
  nurtureRetryWindowExpired,
  NURTURE_RESEND_SAFE_WINDOW_MS,
  NURTURE_SEQUENCE_VERSION,
  sendNurtureEmail,
  type NurtureResendPayload,
} from "../lib/nurtureDelivery";

const LEAD_ID = "123e4567-e89b-42d3-a456-426614174000";
const PAYLOAD: NurtureResendPayload = {
  from: "Ryan Nichols <ryan@theleadflowpro.com>",
  reply_to: "hello@theleadflowpro.com",
  to: ["owner@example.com"],
  subject: "Day one",
  text: "Useful follow-up",
  headers: { "List-Unsubscribe": "<https://example.com/unsubscribe>" },
};

test("nurture uses one stable provider key per sequence, lead, and step", () => {
  assert.equal(NURTURE_SEQUENCE_VERSION, "v1");
  assert.equal(
    nurtureEmailIdempotencyKey(LEAD_ID, 101),
    `nurture-free_build-v1-${LEAD_ID}-101`,
  );
  assert.equal(
    nurtureEmailIdempotencyKey(LEAD_ID, 101),
    nurtureEmailIdempotencyKey(LEAD_ID, 101),
  );
  assert.notEqual(
    nurtureEmailIdempotencyKey(LEAD_ID, 101),
    nurtureEmailIdempotencyKey(LEAD_ID, 102),
  );
  assert.ok(nurtureEmailIdempotencyKey(LEAD_ID, 101).length <= 256);
});

test("nurture retry cutoff stays inside Resend's 24-hour window", () => {
  const now = Date.parse("2026-09-02T00:00:00.000Z");
  assert.equal(NURTURE_RESEND_SAFE_WINDOW_MS, 23 * 60 * 60 * 1000);
  assert.equal(nurtureRetryWindowExpired("2026-09-01T01:00:00.001Z", now), false);
  assert.equal(nurtureRetryWindowExpired("2026-09-01T01:00:00.000Z", now), true);
  assert.equal(nurtureRetryWindowExpired(null, now), true);
  assert.equal(nurtureRetryWindowExpired("not-a-date", now), true);
});

test("nurture sends the stable key as a Resend request header", async () => {
  const captured: Array<{ input: string; init: RequestInit }> = [];
  const key = nurtureEmailIdempotencyKey(LEAD_ID, 101);
  const result = await sendNurtureEmail("re_test", key, PAYLOAD, async (input, init) => {
    captured.push({ input: String(input), init: init ?? {} });
    return new Response(JSON.stringify({ id: "provider_123" }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  });

  assert.deepEqual(result, { ok: true, providerMessageId: "provider_123" });
  assert.equal(captured.length, 1);
  assert.equal(captured[0].input, "https://api.resend.com/emails");
  assert.equal(new Headers(captured[0].init.headers).get("Idempotency-Key"), key);
  assert.equal(NURTURE_PROVIDER_TIMEOUT_MS, 5_000);
  assert.ok(captured[0].init.signal instanceof AbortSignal);
  assert.deepEqual(JSON.parse(String(captured[0].init.body)), PAYLOAD);
});

test("an aborted provider request remains retryable with the exact same key", async () => {
  const capturedKeys: Array<string | null> = [];
  const key = nurtureEmailIdempotencyKey(LEAD_ID, 101);
  const abortingFetch = async (_input: string | URL | Request, init?: RequestInit) => {
    assert.ok(init?.signal instanceof AbortSignal);
    capturedKeys.push(new Headers(init.headers).get("Idempotency-Key"));
    throw new DOMException("The operation was aborted", "AbortError");
  };

  const first = await sendNurtureEmail("re_test", key, PAYLOAD, abortingFetch);
  const retry = await sendNurtureEmail("re_test", key, PAYLOAD, abortingFetch);

  assert.equal(first.ok, false);
  assert.equal(retry.ok, false);
  if (!first.ok) assert.match(first.error, /aborted/i);
  if (!retry.ok) assert.match(retry.error, /aborted/i);
  assert.deepEqual(capturedKeys, [key, key]);
});

test("nurture migration preserves old history and adds explicit pending state", async () => {
  const migration = await readFile(
    new URL(
      "../supabase/migrations/20260901235500_nurture_delivery_idempotency.sql",
      import.meta.url,
    ),
    "utf8",
  );
  assert.match(migration, /delivery_status text not null default 'sent'/i);
  assert.match(migration, /delivery_status in \('pending', 'sent', 'failed'\)/i);
  assert.match(migration, /first_attempt_at timestamptz/i);
  assert.match(migration, /provider_message_id text/i);
});

test("nurture route retains failed claims and finalizes only accepted sends", async () => {
  const route = await readFile(
    new URL("../app/api/cron/nurture/route.ts", import.meta.url),
    "utf8",
  );
  assert.match(route, /delivery_status:\s*"pending"/);
  assert.match(route, /nurtureEmailIdempotencyKey\(lead\.id, next\.step\)/);
  assert.match(route, /nurtureRetryWindowExpired\(pendingRow\.first_attempt_at\)/);
  assert.match(route, /delivery_status:\s*"sent"/);
  assert.doesNotMatch(route, /\.from\("lead_emails"\)[\s\S]{0,120}\.delete\(\)/);
});

test("nurture cron retries hourly while successful sends remain day-spaced", async () => {
  const vercel = JSON.parse(
    await readFile(new URL("../vercel.json", import.meta.url), "utf8"),
  ) as { crons: Array<{ path: string; schedule: string }> };
  assert.deepEqual(
    vercel.crons.find((cron) => cron.path === "/api/cron/nurture"),
    { path: "/api/cron/nurture", schedule: "0 * * * *" },
  );
});
