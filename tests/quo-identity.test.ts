import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
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
