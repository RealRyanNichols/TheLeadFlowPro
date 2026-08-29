import assert from "node:assert/strict";
import test from "node:test";
import { sendDiagnosticInternalAlert } from "../lib/businessDiagnosticEmails";
import {
  diagnosticNotificationIdempotencyKey,
  diagnosticNotificationRetryDelayMinutes,
} from "../lib/diagnosticNotifications";

const ALERT_INPUT = {
  eventType: "draft_saved" as const,
  idempotencyKey: "diagnostic-123-draft_saved",
  leadId: "123e4567-e89b-42d3-a456-426614174000",
  fullName: "Jane Owner",
  businessName: "Example Co",
  email: "jane@example.com",
  phone: "903-555-0100",
  sourceChannel: "website",
  priority: "high",
  completenessScore: 42,
  opportunityScore: 71,
  summary: "Needs a connected website and follow-up process.",
  tags: ["service:website_repair", "leak:slow-response"],
};

test("diagnostic notification retry schedule stays inside the provider idempotency window", () => {
  assert.equal(diagnosticNotificationRetryDelayMinutes(1), 5);
  assert.equal(diagnosticNotificationRetryDelayMinutes(2), 15);
  assert.equal(diagnosticNotificationRetryDelayMinutes(3), 60);
  assert.equal(diagnosticNotificationRetryDelayMinutes(5), 360);
  assert.equal(diagnosticNotificationRetryDelayMinutes(99), 360);
});

test("each diagnostic event gets a stable provider idempotency key", () => {
  const diagnosticId = "123e4567-e89b-42d3-a456-426614174000";
  assert.equal(
    diagnosticNotificationIdempotencyKey(diagnosticId, "draft_saved"),
    `diagnostic-${diagnosticId}-draft_saved`,
  );
  assert.notEqual(
    diagnosticNotificationIdempotencyKey(diagnosticId, "draft_saved"),
    diagnosticNotificationIdempotencyKey(diagnosticId, "submitted"),
  );
});

test("internal diagnostic alerts use the configured inbox and idempotency header", async () => {
  const previousKey = process.env.RESEND_API_KEY;
  const previousInbox = process.env.LEADFLOW_NOTIFY_EMAIL;
  const previousFetch = globalThis.fetch;
  let captured: { url: string; init: RequestInit } | null = null;
  process.env.RESEND_API_KEY = "re_test_key";
  process.env.LEADFLOW_NOTIFY_EMAIL =
    "ops@theleadflowpro.com; hello@theleadflowpro.com";
  globalThis.fetch = async (input, init) => {
    captured = { url: String(input), init: init ?? {} };
    return new Response(JSON.stringify({ id: "email_provider_123" }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };

  try {
    const result = await sendDiagnosticInternalAlert(ALERT_INPUT);
    assert.deepEqual(result, { ok: true, providerMessageId: "email_provider_123" });
    assert.ok(captured);
    assert.equal(captured.url, "https://api.resend.com/emails");
    const headers = new Headers(captured.init.headers);
    assert.equal(headers.get("Idempotency-Key"), ALERT_INPUT.idempotencyKey);
    const body = JSON.parse(String(captured.init.body));
    assert.deepEqual(body.to, ["ops@theleadflowpro.com", "hello@theleadflowpro.com"]);
    assert.match(body.subject, /DIAGNOSTIC STARTED/);
    assert.match(body.text, /Draft saved/i);
  } finally {
    globalThis.fetch = previousFetch;
    if (previousKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = previousKey;
    if (previousInbox === undefined) delete process.env.LEADFLOW_NOTIFY_EMAIL;
    else process.env.LEADFLOW_NOTIFY_EMAIL = previousInbox;
  }
});

test("missing email configuration returns a retryable failure instead of pretending success", async () => {
  const previousKey = process.env.RESEND_API_KEY;
  delete process.env.RESEND_API_KEY;
  try {
    const result = await sendDiagnosticInternalAlert({
      ...ALERT_INPUT,
      eventType: "submitted",
      idempotencyKey: "diagnostic-123-submitted",
    });
    assert.deepEqual(result, { ok: false, error: "RESEND_API_KEY is not configured" });
  } finally {
    if (previousKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = previousKey;
  }
});
