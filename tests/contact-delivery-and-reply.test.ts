import test from "node:test";
import assert from "node:assert/strict";
import { contactDeliveryFailure, recordContactDeliveryFailure, type ContactDeliveryRow } from "../lib/contactDelivery.ts";
import { deliverContactNotification, type ContactNotificationStore } from "../lib/contactNotifications.ts";
import { sendLeadEmailNotification, sendOwnerAlertEmail, OWNER_ALERT_RECIPIENTS, ownerAlertReplyTo } from "../lib/leadNotify.ts";

const messageId = "52fc582f-f59b-4f48-9b08-fb5fc7195f06";
const providerId = "cd3c5cab-1858-411c-8c2f-386ad815f5b9";
const event = {
  type: "email.bounced",
  data: { email_id: providerId, bounce: { type: "Permanent", message: "private provider details" }, tags: { contact_message_id: messageId } },
};
function fixture(provider: string | null = providerId) {
  const row: ContactDeliveryRow & Record<string, unknown> = { message_id: messageId, provider_message_id: provider, status: "sent", attempt_count: 2 };
  let updates = 0;
  return {
    row,
    updates: () => updates,
    store: {
      byProviderId: async (id: string) => row.provider_message_id === id ? row : null,
      byContactId: async (id: string) => row.message_id === id ? row : null,
      fail: async (_row: ContactDeliveryRow, reason: string) => { updates++; row.status = "failed"; row.last_error = reason; },
    },
  };
}

test("permanent contact bounce becomes terminal without fabricated attempts or replay writes", async () => {
  const f = fixture();
  const failure = contactDeliveryFailure(event)!;
  assert.ok(failure);
  assert.equal(await recordContactDeliveryFailure(failure, f.store), true);
  assert.equal(await recordContactDeliveryFailure(failure, f.store), true);
  assert.equal(f.row.status, "failed");
  assert.equal(f.row.attempt_count, 2);
  assert.equal(f.updates(), 1);
  assert.equal(String(f.row.last_error).includes("private provider details"), false);
});

test("terminal bounce cannot trigger an outbound retry", async () => {
  const f = fixture();
  await recordContactDeliveryFailure(contactDeliveryFailure(event)!, f.store);
  let sends = 0;
  const store = { get: async () => f.row } as unknown as ContactNotificationStore;
  assert.equal(await deliverContactNotification(store, messageId, {
    apiKey: "test",
    send: async () => { sends++; return Response.json({ id: providerId }); },
  }), "failed");
  assert.equal(sends, 0);
});

test("signed tag handles an early bounce; wrong known provider ID cannot match", async () => {
  const early = fixture(null); early.row.status = "pending";
  assert.equal(await recordContactDeliveryFailure(contactDeliveryFailure(event)!, early.store), true);
  assert.equal(early.row.status, "failed");
  assert.equal(early.row.attempt_count, 2);
  const wrong = fixture("2df20ea3-d606-4b0b-98e3-c1e6e894a527");
  assert.equal(await recordContactDeliveryFailure(contactDeliveryFailure(event)!, wrong.store), false);
  assert.equal(wrong.row.status, "sent");
});

test("temporary bounce and unrecognized events do not terminate alerts", () => {
  assert.equal(contactDeliveryFailure({ ...event, data: { ...event.data, bounce: { type: "Temporary" } } }), null);
  assert.equal(contactDeliveryFailure({ ...event, data: { ...event.data, bounce: { type: "not_permanent" } } }), null);
  assert.equal(contactDeliveryFailure({ ...event, type: "email.delivered" }), null);
  assert.equal(contactDeliveryFailure({ type: "email.bounced", data: { email_id: "invalid", bounce: { type: "Permanent" } } }), null);
});

test("failed status write throws so the signed webhook can retry", async () => {
  const f = fixture();
  await assert.rejects(recordContactDeliveryFailure(contactDeliveryFailure(event)!, {
    ...f.store, fail: async () => { throw new Error("safe storage failure"); },
  }), /safe storage failure/);
  assert.equal(f.row.status, "sent");
});

test("NEW LEAD owner reply reaches the inquirer while staff recipients stay unchanged", async (t) => {
  const old = process.env.RESEND_API_KEY;
  process.env.RESEND_API_KEY = "owner-test-not-a-real-key";
  t.after(() => { if (old === undefined) delete process.env.RESEND_API_KEY; else process.env.RESEND_API_KEY = old; });
  let payload: Record<string, unknown> | null = null;
  t.mock.method(globalThis, "fetch", async (_url: unknown, options: RequestInit) => {
    payload = JSON.parse(String(options.body));
    return Response.json({ id: providerId });
  });
  const result = await sendLeadEmailNotification({
    full_name: "Owner test", email: "qa@example.com", interest: "done_for_you",
  }, "owner_alert", "owner-test");
  assert.equal(result.ok, true);
  assert.ok(payload);
  assert.equal((payload as Record<string, unknown>).reply_to, "qa@example.com");
  assert.deepEqual((payload as Record<string, unknown>).to, OWNER_ALERT_RECIPIENTS);
});


test("owner Reply-To rejects multiple addresses, display names, quotes and header injection", () => {
  for (const value of [
    "a,b@example.com", "A <a@example.com>", '\"a\"@example.com',
    "a@example.com, b@example.com", "a@example.com\r\nBcc: b@example.com",
    "a@example.com\n", "a..b@example.com", ".a@example.com", "a@-example.com", "quo+9035550142@unknown.invalid", "a@no-email.local",
  ]) assert.equal(ownerAlertReplyTo(value), null, value);
  assert.equal(ownerAlertReplyTo("  owner+test@example.com  "), "owner+test@example.com");
});

test("invalid owner Reply-To is omitted without changing recipients", async (t) => {
  const old = process.env.RESEND_API_KEY;
  process.env.RESEND_API_KEY = "owner-test-not-a-real-key";
  t.after(() => { if (old === undefined) delete process.env.RESEND_API_KEY; else process.env.RESEND_API_KEY = old; });
  let payload: Record<string, unknown> | null = null;
  t.mock.method(globalThis, "fetch", async (_url: unknown, options: RequestInit) => {
    payload = JSON.parse(String(options.body));
    return Response.json({ id: providerId });
  });
  await sendLeadEmailNotification({
    full_name: "Owner test", email: "a,b@example.com", interest: "done_for_you",
  }, "owner_alert", "owner-test-invalid");
  assert.ok(payload);
  assert.equal(Object.hasOwn(payload!, "reply_to"), false);
  assert.deepEqual((payload as Record<string, unknown>).to, OWNER_ALERT_RECIPIENTS);
});

test("speed-to-lead owner email replies to the existing lead address and keeps the same idempotency key", async (t) => {
  const old = process.env.RESEND_API_KEY;
  process.env.RESEND_API_KEY = "owner-test-not-a-real-key";
  t.after(() => { if (old === undefined) delete process.env.RESEND_API_KEY; else process.env.RESEND_API_KEY = old; });
  const payloads: Record<string, unknown>[] = [];
  t.mock.method(globalThis, "fetch", async (_url: unknown, options: RequestInit) => {
    payloads.push(JSON.parse(String(options.body)));
    assert.equal(new Headers(options.headers).get("Idempotency-Key"), "same-owner-key");
    return Response.json({ id: providerId });
  });
  await sendOwnerAlertEmail({ subject: "Internal test", text: "Internal test" }, "same-owner-key", "qa@example.com");
  await sendOwnerAlertEmail({ subject: "Internal test", text: "Internal test" }, "same-owner-key", "quo+9035550142@unknown.invalid");
  assert.equal(payloads[0].reply_to, "qa@example.com");
  assert.equal(Object.hasOwn(payloads[1], "reply_to"), false);
  for (const payload of payloads) assert.deepEqual(payload.to, OWNER_ALERT_RECIPIENTS);
});
