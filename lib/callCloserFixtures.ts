// A fictional lead for the call card's sample mode (/admin/call-sheet/sample)
// and the Call Closer tests. Nobody here is real: the phone number is in the
// 555-01xx range set aside for fiction, the email is on the reserved
// example.test domain, and the business name says "(fictional)".
//
// The story it tells is the common one from the call sheet: a Facebook lead
// for a website came in Monday afternoon, Ryan read up on the business,
// called, got no answer, and the Call Closer set the next try for Tuesday at
// 10:00 AM Central. SAMPLE_NOW is that Tuesday morning, so the sample opens on
// a callback that is due right now.
//
// Leaf module: types only from lib/callCloser.ts. Nothing here reads, writes,
// sends, or fetches anything.

import type { PlannerLead } from "./callCloser";

/** Tuesday, September 22, 2026 at 10:00 AM Central (CDT, UTC-5). */
export const SAMPLE_NOW: Date = new Date("2026-09-22T15:00:00.000Z");

/** Who signs the sample's pay-link draft. */
export const SAMPLE_ACTOR_NAME = "Ryan";

export const SAMPLE_CALL_LEAD: PlannerLead & {
  created_at: string;
  source: string;
  goals: string;
  best_contact_method: string | null;
} = {
  id: "sample",
  created_at: "2026-09-21T19:12:00.000Z",
  full_name: "Dana Sample",
  business_name: "Sample Pressure Washing (fictional)",
  status: "new",
  interest: "website_launch",
  phone: "(903) 555-0100",
  email: "dana@example.test",
  sms_consent: true,
  sms_unsubscribed_at: null,
  // Set by the no-answer call below: the next business day at 10:00 AM Central.
  next_follow_up_at: "2026-09-22T15:00:00.000Z",
  source: "meta_lead_ad",
  best_contact_method: "text",
  // Meta lead form answers are stored one "question: answer" per line (app/api/meta-leads/route.ts).
  goals: [
    "what kind of business do you run: Pressure washing, mostly driveways and house washes",
    "what do you want the website to do: Show our before and after work and get quote requests from people who find us on Facebook",
    "best time to reach you: After 3 PM",
  ].join("\n"),
  // What that route writes for a website form's lead: a Website Launch
  // inquiry (interest above) under the default meta_lead_form funnel.
  diagnostic: {
    source: "meta_lead_form",
    notification_pipeline: "lead_intake_v1",
    meta_lead_id: "sample-meta-lead",
    form_id: null,
    ad_id: null,
    ad_attribution: "unverified_no_ad_id",
    fields: {
      what_kind_of_business_do_you_run: "Pressure washing, mostly driveways and house washes",
      best_time_to_reach_you: "After 3 PM",
    },
  },
};

/** The lead's last notes, newest first, as the call card reads them. */
export const SAMPLE_NOTES: { body: string; created_at: string; author: string }[] = [
  {
    body: "Call: no answer. Try again Tue, Sep 22 at 10:00 AM.",
    created_at: "2026-09-21T21:40:00.000Z",
    author: SAMPLE_ACTOR_NAME,
  },
  {
    body: "Looked them up before calling. Their Facebook page has plenty of before and after photos and no website link.",
    created_at: "2026-09-21T21:35:00.000Z",
    author: SAMPLE_ACTOR_NAME,
  },
  {
    body: "Came in from the Facebook website ad. Asked for a call after 3 PM.",
    created_at: "2026-09-21T19:20:00.000Z",
    author: SAMPLE_ACTOR_NAME,
  },
];

/** The lead's call activity details, newest first: one unanswered try so far. */
export const SAMPLE_CALL_ACTIVITY: string[] = [
  "Call: no answer. Try again Tue, Sep 22 at 10:00 AM. Outcome: no_answer. Ref sample-ref-0000-0000-0001",
];
