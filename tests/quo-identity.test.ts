import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHmac, randomBytes } from "node:crypto";
import test from "node:test";
import {
  INBOUND_AUTO_REPLY,
  LEADFLOW_FROM,
  leadFlowQuoFromNumber,
  leadFlowQuoUserId,
  sendInboundAutoReply,
  sendLeadText,
  verifyLeadFlowQuoInboundIdentity,
} from "../lib/quo";
import { quoInboundMessage, verifyQuoInboundAuthentication } from "../lib/quoInboundWebhook";

const LEADFLOW_PHONE_NUMBER_ID = "PNleadflowVerified123";

function inbound(overrides: Partial<Parameters<typeof verifyLeadFlowQuoInboundIdentity>[0]> = {}) {
  return verifyLeadFlowQuoInboundIdentity({
    eventType: "message.received",
    direction: "incoming",
    phoneNumberId: LEADFLOW_PHONE_NUMBER_ID,
    to: LEADFLOW_FROM,
    allowedPhoneNumberId: LEADFLOW_PHONE_NUMBER_ID,
    ...overrides,
  });
}

test("Quo inbound identity accepts both documented destination shapes", () => {
  assert.deepEqual(inbound(), { ok: true });
  assert.deepEqual(inbound({ to: [LEADFLOW_FROM] }), { ok: true });
});

test("Quo inbound ingestion is disabled without the verified LeadFlow PN id", () => {
  assert.deepEqual(inbound({ allowedPhoneNumberId: "" }), {
    ok: false,
    reason: "inbound_not_configured",
  });
});

test("Quo inbound rejects another resource id or destination in the shared workspace", () => {
  assert.deepEqual(inbound({ phoneNumberId: "PNpremierDental" }), {
    ok: false,
    reason: "unapproved_phone_number_id",
  });
  assert.deepEqual(inbound({ to: "+19039136444" }), {
    ok: false,
    reason: "unapproved_destination",
  });
  assert.deepEqual(inbound({ to: [LEADFLOW_FROM, "+19039136444"] }), {
    ok: false,
    reason: "unapproved_destination",
  });
});

test("Quo inbound accepts only an incoming message.received event", () => {
  assert.deepEqual(inbound({ eventType: "message.delivered" }), {
    ok: false,
    reason: "not_message_received",
  });
  assert.deepEqual(inbound({ direction: "outgoing" }), {
    ok: false,
    reason: "not_incoming",
  });
});

test("current Quo envelopes carry exact resource, sender and destination identity", () => {
  const event = {
    apiVersion: "2026-03-30",
    type: "message.received",
    data: {
      resource: { id: "ACsyntheticInbound", direction: "incoming", text: "Controlled test", createdAt: "2026-10-06T16:00:00Z" },
      context: {
        phoneNumberId: LEADFLOW_PHONE_NUMBER_ID,
        conversationId: "CNsynthetic",
        userId: "USsynthetic",
        senderIdentifier: "+19035550100",
        recipientIdentifiers: [LEADFLOW_FROM],
      },
    },
  };
  const message = quoInboundMessage(event);
  assert.ok(message);
  assert.equal(message.id, "ACsyntheticInbound");
  assert.equal(message.from, "+19035550100");
  assert.equal(message.text, "Controlled test");
  assert.equal(message.conversationId, "CNsynthetic");
  assert.deepEqual(verifyLeadFlowQuoInboundIdentity({ ...message, allowedPhoneNumberId: LEADFLOW_PHONE_NUMBER_ID }), { ok: true });
  const foreign = quoInboundMessage({ ...event, data: { ...event.data, context: { ...event.data.context, phoneNumberId: "PNpremier", recipientIdentifiers: ["+19039136444"] } } });
  assert.ok(foreign);
  assert.equal(verifyLeadFlowQuoInboundIdentity({ ...foreign, allowedPhoneNumberId: LEADFLOW_PHONE_NUMBER_ID }).ok, false);
  const outbound = quoInboundMessage({ ...event, data: { ...event.data, resource: { ...event.data.resource, direction: "outgoing" } } });
  assert.ok(outbound);
  assert.equal(verifyLeadFlowQuoInboundIdentity({ ...outbound, allowedPhoneNumberId: LEADFLOW_PHONE_NUMBER_ID }).ok, false);
  const internal = quoInboundMessage({ ...event, data: { ...event.data, context: { ...event.data.context, senderIdentifier: "USinternal1234567890" } } });
  assert.equal(internal?.from, "");
  assert.equal(quoInboundMessage({ ...event, data: { resource: event.data.resource } }), null);
});

test("legacy envelopes preserve their provider identity without inventing direction", () => {
  const message = quoInboundMessage({ type: "message.received", data: { object: {
    id: "AClegacy", direction: "incoming", from: { phoneNumber: "+19035550100" }, to: LEADFLOW_FROM,
    phoneNumberId: LEADFLOW_PHONE_NUMBER_ID, text: "Legacy test",
  } } });
  assert.ok(message);
  assert.equal(message.from, "+19035550100");
  assert.deepEqual(verifyLeadFlowQuoInboundIdentity({ ...message, allowedPhoneNumberId: LEADFLOW_PHONE_NUMBER_ID }), { ok: true });
  const malformed = quoInboundMessage({ type: "message.received", data: { object: { ...message, direction: undefined } } });
  assert.equal(malformed?.direction, null);
});

test("provider signing keys require a fresh signature over the raw body and cannot use a query bypass", () => {
  const key = randomBytes(24);
  const secret = `whsec_${key.toString("base64")}`;
  const body = JSON.stringify({ type: "message.received" });
  const nowMs = Date.parse("2026-10-06T16:00:00Z");
  const timestamp = String(nowMs / 1000);
  const headersFor = (timestamp: string) => new Headers({
    "webhook-id": "EVsynthetic",
    "webhook-timestamp": timestamp,
    "webhook-signature": `v1,${createHmac("sha256", key).update(`EVsynthetic.${timestamp}.${body}`).digest("base64")}`,
  });
  const input = { secret, querySecret: null, headers: headersFor(timestamp), body, nowMs };
  assert.equal(verifyQuoInboundAuthentication(input), true);
  assert.equal(verifyQuoInboundAuthentication({ ...input, body: `${body} ` }), false);
  assert.equal(verifyQuoInboundAuthentication({ ...input, headers: headersFor(String(Number(timestamp) - 601)) }), false);
  assert.equal(verifyQuoInboundAuthentication({ ...input, headers: headersFor(String(Number(timestamp) + 601)) }), false);
  assert.equal(verifyQuoInboundAuthentication({ ...input, querySecret: secret, headers: new Headers() }), false);
  assert.equal(verifyQuoInboundAuthentication({ ...input, secret: undefined }), false);
  assert.equal(verifyQuoInboundAuthentication({ ...input, secret: "legacy-test-token", querySecret: "legacy-test-token", headers: new Headers() }), true);
  assert.equal(verifyQuoInboundAuthentication({ ...input, secret: "legacy-test-token", querySecret: "wrong" }), false);
});

test("inbound auto-replies remain off without their existing explicit switch", async () => {
  const previous = process.env.QUO_INBOUND_AUTOREPLY_ENABLED;
  const previousFetch = globalThis.fetch;
  let fetches = 0;
  delete process.env.QUO_INBOUND_AUTOREPLY_ENABLED;
  globalThis.fetch = async () => { fetches += 1; return new Response(null, { status: 200 }); };
  try {
    assert.equal(await sendInboundAutoReply("+19035550100", "Synthetic test"), false);
    assert.equal(fetches, 0);
  } finally {
    globalThis.fetch = previousFetch;
    if (previous === undefined) delete process.env.QUO_INBOUND_AUTOREPLY_ENABLED;
    else process.env.QUO_INBOUND_AUTOREPLY_ENABLED = previous;
  }
});

test("Quo outbound identity permits only the exact compiled LeadFlow number", () => {
  assert.equal(leadFlowQuoFromNumber(undefined), LEADFLOW_FROM);
  assert.equal(leadFlowQuoFromNumber(""), LEADFLOW_FROM);
  assert.equal(leadFlowQuoFromNumber(LEADFLOW_FROM), LEADFLOW_FROM);
  assert.equal(leadFlowQuoFromNumber("+19039136444"), null);
  assert.equal(leadFlowQuoFromNumber("9035008898"), null);
});

test("Quo sender attribution fails closed on a partial or mismatched user allowlist", () => {
  assert.equal(leadFlowQuoUserId(undefined, undefined), undefined);
  assert.equal(leadFlowQuoUserId("USryan", undefined), null);
  assert.equal(leadFlowQuoUserId(undefined, "USryan"), null);
  assert.equal(leadFlowQuoUserId("USother", "USryan"), null);
  assert.equal(leadFlowQuoUserId("USryan", "USryan"), "USryan");
});

test("enabled Quo send paths do not call the provider with a foreign from number", async () => {
  const previous = {
    apiKey: process.env.QUO_API_KEY,
    from: process.env.QUO_FROM_NUMBER,
    userId: process.env.QUO_USER_ID,
    allowedUserId: process.env.QUO_LEADFLOW_USER_ID,
    outboundDisabled: process.env.QUO_OUTBOUND_SMS_DISABLED,
    inboundEnabled: process.env.QUO_INBOUND_AUTOREPLY_ENABLED,
  };
  const previousFetch = globalThis.fetch;
  let fetches = 0;
  process.env.QUO_API_KEY = "test-key";
  process.env.QUO_FROM_NUMBER = "+19039136444";
  process.env.QUO_USER_ID = "USpremierDental";
  process.env.QUO_LEADFLOW_USER_ID = "USryan";
  process.env.QUO_OUTBOUND_SMS_DISABLED = "false";
  process.env.QUO_INBOUND_AUTOREPLY_ENABLED = "true";
  globalThis.fetch = async () => {
    fetches += 1;
    return new Response(null, { status: 200 });
  };

  try {
    assert.equal(await sendLeadText("+19035550100", "test"), false);
    assert.equal(await sendInboundAutoReply("+19035550100", INBOUND_AUTO_REPLY), false);
    assert.equal(fetches, 0);
  } finally {
    globalThis.fetch = previousFetch;
    for (const [key, value] of Object.entries({
      QUO_API_KEY: previous.apiKey,
      QUO_FROM_NUMBER: previous.from,
      QUO_USER_ID: previous.userId,
      QUO_LEADFLOW_USER_ID: previous.allowedUserId,
      QUO_OUTBOUND_SMS_DISABLED: previous.outboundDisabled,
      QUO_INBOUND_AUTOREPLY_ENABLED: previous.inboundEnabled,
    })) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

test("enabled Quo send paths do not call the provider with a foreign sender user", async () => {
  const previous = {
    apiKey: process.env.QUO_API_KEY,
    from: process.env.QUO_FROM_NUMBER,
    userId: process.env.QUO_USER_ID,
    allowedUserId: process.env.QUO_LEADFLOW_USER_ID,
    outboundDisabled: process.env.QUO_OUTBOUND_SMS_DISABLED,
    inboundEnabled: process.env.QUO_INBOUND_AUTOREPLY_ENABLED,
  };
  const previousFetch = globalThis.fetch;
  let fetches = 0;
  process.env.QUO_API_KEY = "test-key";
  process.env.QUO_FROM_NUMBER = LEADFLOW_FROM;
  process.env.QUO_USER_ID = "USpremierDental";
  process.env.QUO_LEADFLOW_USER_ID = "USryan";
  process.env.QUO_OUTBOUND_SMS_DISABLED = "false";
  process.env.QUO_INBOUND_AUTOREPLY_ENABLED = "true";
  globalThis.fetch = async () => {
    fetches += 1;
    return new Response(null, { status: 200 });
  };

  try {
    assert.equal(await sendLeadText("+19035550100", "test"), false);
    assert.equal(await sendInboundAutoReply("+19035550100", INBOUND_AUTO_REPLY), false);
    assert.equal(fetches, 0);
  } finally {
    globalThis.fetch = previousFetch;
    for (const [key, value] of Object.entries({
      QUO_API_KEY: previous.apiKey,
      QUO_FROM_NUMBER: previous.from,
      QUO_USER_ID: previous.userId,
      QUO_LEADFLOW_USER_ID: previous.allowedUserId,
      QUO_OUTBOUND_SMS_DISABLED: previous.outboundDisabled,
      QUO_INBOUND_AUTOREPLY_ENABLED: previous.inboundEnabled,
    })) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

test("Quo inbound route guards identity before service-role access", async () => {
  const source = await readFile(
    new URL("../app/api/quo-inbound/route.ts", import.meta.url),
    "utf8",
  );
  const supabaseGuard = source.indexOf("leadFlowSupabaseRuntimeIssues(SUPABASE_URL)");
  const destinationGuard = source.indexOf("verifyLeadFlowQuoInboundIdentity({");
  const serviceRoleAccess = source.indexOf("process.env.SUPABASE_SERVICE_ROLE_KEY");

  assert.ok(supabaseGuard >= 0);
  assert.ok(destinationGuard > supabaseGuard);
  assert.ok(serviceRoleAccess > destinationGuard);
  assert.match(source, /QUO_LEADFLOW_INBOUND_PHONE_NUMBER_ID/);
  assert.doesNotMatch(source, /direction\s*\?\?\s*["']incoming["']/);
});
