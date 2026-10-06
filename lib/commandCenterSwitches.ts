// The automation switches the board reports, read from the runtime
// environment, so Ryan can see at a glance which parts of the follow-up
// machine are actually on. Names and defaults match the modules that honour
// them (lib/speedToLead.ts, lib/callSheet.ts, lib/quo.ts, lib/metaInsights.ts,
// lib/businessDashboard.ts). Pure: env in, rows out; values are never printed.

import { callSheetEmailEnabled } from "@/lib/callSheet";

export type SwitchRow = {
  key: string;
  label: string;
  on: boolean;
  /** One line on what "on" does, so the row reads as a decision, not a flag. */
  detail: string;
  /** The variable to set, named so the owner can find it in the server's env file. */
  variable: string;
};

export function commandCenterSwitches(env: Record<string, string | undefined> = process.env): SwitchRow[] {
  const metaToken = Boolean((env.META_ADS_READ_TOKEN || env.META_PAGE_ACCESS_TOKEN || "").trim());
  const outboundTexts = env.QUO_OUTBOUND_SMS_DISABLED === "false";
  return [
    {
      key: "speed_to_lead",
      label: "Instant new-lead texts to Ryan and Pat",
      on: env.SPEED_TO_LEAD_ENABLED === "true",
      detail: "Every new lead texts both phones within seconds and emails the NEW LEAD alert. Off means the alert is email only.",
      variable: "SPEED_TO_LEAD_ENABLED",
    },
    {
      key: "lead_first_text",
      label: "Automatic first text to the lead",
      on: env.SPEED_TO_LEAD_ENABLED === "true" && outboundTexts,
      detail: "With consent, 8 AM to 9 PM Central, STOP honoured. Needs the instant alerts on and outbound texting on.",
      variable: "QUO_OUTBOUND_SMS_DISABLED",
    },
    {
      key: "call_sheet_email",
      label: "Morning call sheet by email",
      on: callSheetEmailEnabled(env),
      detail: "The call sheet lands in the owner inbox each morning. Off means open /admin/call-sheet yourself.",
      variable: "CALL_SHEET_EMAIL_ENABLED",
    },
    {
      key: "meta_read",
      label: "Meta ad reporting on this board",
      on: metaToken,
      detail: "Read-only spend, clicks and leads from the LeadFlow ad account. Never changes an ad.",
      variable: "META_ADS_READ_TOKEN",
    },
    {
      key: "business_sso",
      label: "Business dashboard sign-in",
      on: Boolean((env.BUSINESS_DASHBOARD_ORIGIN || "").trim()) && (env.BUSINESS_DASHBOARD_SSO_SECRET || "").trim().length >= 32,
      detail: "Opens the DigitalOcean owner dashboard from the Back Office already signed in.",
      variable: "BUSINESS_DASHBOARD_ORIGIN",
    },
  ];
}
