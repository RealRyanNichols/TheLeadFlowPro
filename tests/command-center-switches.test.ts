import assert from "node:assert/strict";
import test from "node:test";
import { commandCenterSwitches } from "../lib/commandCenterSwitches.ts";

// The switches panel reads the same variables the modules honour, with the
// same strictness ("true" and "false" exactly), and never prints a value.

test("every switch is off on an empty environment, and the panel never carries a value", () => {
  const rows = commandCenterSwitches({});
  assert.deepEqual(
    rows.map((r) => [r.key, r.on]),
    [
      ["speed_to_lead", false],
      ["lead_first_text", false],
      ["call_sheet_email", false],
      ["meta_read", false],
      ["business_sso", false],
    ],
  );
  const text = JSON.stringify(rows);
  assert.doesNotMatch(text, /sk_|whsec_|EAA|secret-value/);
});

test("switches follow the exact strings the modules check", () => {
  const env = {
    SPEED_TO_LEAD_ENABLED: "true",
    QUO_OUTBOUND_SMS_DISABLED: "false",
    CALL_SHEET_EMAIL_ENABLED: "true",
    META_ADS_READ_TOKEN: "EAAtoken",
    BUSINESS_DASHBOARD_ORIGIN: "https://165-227-248-110.sslip.io",
    BUSINESS_DASHBOARD_SSO_SECRET: "x".repeat(32),
  };
  assert.ok(commandCenterSwitches(env).every((r) => r.on));
  // "TRUE", "1" and "yes" are not on; QUO_OUTBOUND_SMS_DISABLED unset means texting is off.
  const sloppy = commandCenterSwitches({ ...env, SPEED_TO_LEAD_ENABLED: "TRUE", CALL_SHEET_EMAIL_ENABLED: "1", QUO_OUTBOUND_SMS_DISABLED: undefined });
  assert.deepEqual(
    sloppy.map((r) => [r.key, r.on]),
    [
      ["speed_to_lead", false],
      ["lead_first_text", false],
      ["call_sheet_email", false],
      ["meta_read", true],
      ["business_sso", true],
    ],
  );
  // The first text needs both the alerts and outbound texting.
  assert.equal(commandCenterSwitches({ SPEED_TO_LEAD_ENABLED: "true" }).find((r) => r.key === "lead_first_text")?.on, false);
  // The page token is the Ads Brain's fallback for reporting too.
  assert.equal(commandCenterSwitches({ META_PAGE_ACCESS_TOKEN: "EAApage" }).find((r) => r.key === "meta_read")?.on, true);
  // A short SSO secret is not a working sign-in.
  assert.equal(commandCenterSwitches({ BUSINESS_DASHBOARD_ORIGIN: env.BUSINESS_DASHBOARD_ORIGIN, BUSINESS_DASHBOARD_SSO_SECRET: "short" }).find((r) => r.key === "business_sso")?.on, false);
});
