// A fictional client for the Client 360 sample (/admin/leads/sample) and its
// tests. Nobody here is real: the phone number is in the 555-01xx range set
// aside for fiction, the email is on the reserved example.test domain, and
// the business name says "(fictional)". Amounts come from the published price
// list (lib/site/prices.ts), so the sample never shows a price the site does
// not charge.
//
// The story: Jordan asked about a website through the site's form on Tuesday,
// Sep 8. Ryan called back within the hour. Jordan bought the System Map, then
// the Website Launch deposit, and the build is under way. The balance invoice
// is out, a gallery page came up by text and through the website, and the
// next follow-up is Tuesday morning. SAMPLE_360_NOW is Monday, Sep 28, 2026
// at 9:30 AM Central.
//
// Four views of the same screen, so every state can be looked at on a phone:
// - client:  the whole story, as it reads once the new database links money,
//            builds, and website messages to the lead;
// - today:   the same client as a real lead record shows it now, with those
//            parts not linked yet;
// - new:     a lead that came in this morning, texted, and has not been
//            answered;
// - problem: a connection problem, so some parts did not load.
//
// Leaf module: nothing here reads, writes, sends, or fetches anything.

import type { RetainerState } from "@/lib/agencyRetainer";
import {
  failed,
  notLinkedYet,
  ready,
  type StoryInput,
  type StoryInvoice,
  type StoryProject,
  type StoryPurchase,
  type StoryTask,
  type StoryWebsiteMessage,
} from "@/lib/client360";
import type { LeadActivityRecord, LeadCallRecord, LeadEmailRecord, LeadMessageRecord, LeadNoteRecord } from "@/lib/leadTimeline";
import { PRICES } from "@/lib/site/prices";

/** Monday, September 28, 2026 at 9:30 AM Central (CDT, UTC-5). */
export const SAMPLE_360_NOW: Date = new Date("2026-09-28T14:30:00.000Z");

export const SAMPLE_360_VIEWS = ["client", "today", "new", "problem"] as const;
export type Sample360View = (typeof SAMPLE_360_VIEWS)[number];

export const SAMPLE_360_VIEW_LABELS: Record<Sample360View, string> = {
  client: "Client, fully linked",
  today: "Client, as records link today",
  new: "New lead, not answered",
  problem: "Connection problem",
};

export function isSample360View(value: unknown): value is Sample360View {
  return typeof value === "string" && (SAMPLE_360_VIEWS as readonly string[]).includes(value);
}

const LEAD_ID = "sample";
const RYAN = "Ryan";

export const SAMPLE_360_LEAD = {
  id: LEAD_ID,
  created_at: "2026-09-08T19:05:00.000Z",
  full_name: "Jordan Sample",
  business_name: "Sample Lawn & Landscape (fictional)",
  source: "website",
  notes: null,
  phone: "(903) 555-0147",
  email: "jordan@example.test",
  sms_consent: true,
  sms_unsubscribed_at: null,
};

const NOTES: LeadNoteRecord[] = [
  {
    id: "n3",
    lead_id: LEAD_ID,
    body: "Photos received. The gallery goes in with the build. Added a yard size question to the quote form draft.",
    author: RYAN,
    created_at: "2026-09-26T16:00:00.000Z",
  },
  {
    id: "n2",
    lead_id: LEAD_ID,
    body: "Deposit paid. Kicked off the build and sent the discovery notes.",
    author: RYAN,
    created_at: "2026-09-14T17:10:00.000Z",
  },
  {
    id: "n1",
    lead_id: LEAD_ID,
    body: "Called back within the hour. Wants a site that brings in mowing and landscaping quotes. Starting with the System Map.",
    author: RYAN,
    created_at: "2026-09-08T20:20:00.000Z",
  },
];

const MESSAGES: LeadMessageRecord[] = [
  {
    id: "m1",
    lead_id: LEAD_ID,
    direction: "in",
    channel: "sms",
    body: "Can we add a gallery page for the patio jobs?",
    author: null,
    delivered: true,
    created_at: "2026-09-22T14:14:00.000Z",
  },
  {
    id: "m2",
    lead_id: LEAD_ID,
    direction: "out",
    channel: "sms",
    body: "Yes. Send me 10 to 15 of your favorite patio photos and I will add a gallery page.",
    author: RYAN,
    delivered: true,
    created_at: "2026-09-22T15:02:00.000Z",
  },
  {
    id: "m3",
    lead_id: LEAD_ID,
    direction: "out",
    channel: "email",
    body: "Here is your System Map summary and the three priorities we talked about.",
    author: RYAN,
    delivered: true,
    created_at: "2026-09-11T18:30:00.000Z",
  },
];

const EMAILS: LeadEmailRecord[] = [
  { id: "e0", lead_id: LEAD_ID, step: 0, sent_at: "2026-09-08T19:05:30.000Z", delivery_status: null, first_attempt_at: null, last_attempt_at: null },
  {
    id: "e1",
    lead_id: LEAD_ID,
    step: 1,
    sent_at: "2026-09-09T14:00:00.000Z",
    delivery_status: "sent",
    first_attempt_at: "2026-09-09T14:00:00.000Z",
    last_attempt_at: "2026-09-09T14:00:00.000Z",
  },
];

const CALLS: LeadCallRecord[] = [
  {
    id: "c1",
    lead_id: LEAD_ID,
    direction: "outgoing",
    status: "completed",
    outcome: "answered",
    started_at: "2026-09-08T20:00:00.000Z",
    created_at: "2026-09-08T20:13:00.000Z",
    duration_seconds: 760,
    summary: "Walked through the Website Launch. Wants the System Map first.",
    next_steps: ["Send the System Map checkout link"],
    source: "Business phone",
    scope_status: "company",
  },
];

const ACTIVITY: LeadActivityRecord[] = [
  {
    id: "a1",
    lead_id: LEAD_ID,
    kind: "call",
    detail: "Call: talked, wants a proposal. Outcome: wants_proposal. Ref sample-ref-0000-0000-0360",
    created_at: "2026-09-08T20:15:00.000Z",
  },
  { id: "a2", lead_id: LEAD_ID, kind: "stage_change", detail: "Stage: Proposal to Won", created_at: "2026-09-14T16:05:00.000Z" },
];

const TASKS: StoryTask[] = [
  { id: "t1", title: "Send the build preview link", due_date: "2026-09-29", completed_at: null, created_at: "2026-09-26T16:05:00.000Z" },
  { id: "t2", title: "Confirm the domain login", due_date: "2026-09-25", completed_at: null, created_at: "2026-09-21T15:00:00.000Z" },
  { id: "t3", title: "Send the System Map", due_date: "2026-09-11", completed_at: "2026-09-11T18:30:00.000Z", created_at: "2026-09-10T15:40:00.000Z" },
];

const WEBSITE: StoryWebsiteMessage[] = [
  {
    id: "w1",
    created_at: "2026-09-25T21:40:00.000Z",
    body: "Uploaded the patio photos to the shared folder. Can the quote form ask for yard size too?",
    sender: "visitor",
  },
];

const PURCHASES: StoryPurchase[] = [
  { id: "p1", lead_id: LEAD_ID, created_at: "2026-09-10T15:30:00.000Z", kind: "system_map", amount_cents: PRICES.systemMap * 100, status: "paid" },
  {
    id: "p2",
    lead_id: LEAD_ID,
    created_at: "2026-09-14T16:00:00.000Z",
    kind: "website_launch_deposit",
    amount_cents: PRICES.websiteLaunchDeposit * 100,
    status: "paid",
  },
];

const INVOICES: StoryInvoice[] = [
  {
    id: "i1",
    lead_id: LEAD_ID,
    invoice_number: "SAMPLE-0001",
    status: "open",
    subtotal_cents: PRICES.websiteLaunchFinal * 100,
    due_date: "2026-10-05",
    sent_at: "2026-09-21T15:10:00.000Z",
    created_at: "2026-09-21T15:05:00.000Z",
  },
];

const PROJECTS: StoryProject[] = [
  {
    id: "pr1",
    name: "Website Launch",
    status: "build",
    milestones: [
      { id: "ms1", title: "Discovery call and scope", status: "done", sort_order: 1 },
      { id: "ms2", title: "Figma design approved", status: "done", sort_order: 2 },
      { id: "ms3", title: "Site and funnel built", status: "in_progress", sort_order: 3 },
      { id: "ms4", title: "Dashboard and database live", status: "pending", sort_order: 4 },
      { id: "ms5", title: "Domain connected and launched", status: "pending", sort_order: 5 },
      { id: "ms6", title: "Handover: repo, hosting, database keys", status: "pending", sort_order: 6 },
    ],
  },
];

/** No monthly plan: the Website Launch is paid in two parts, not monthly. */
const PLAN: RetainerState | null = null;

function clientInput(): StoryInput {
  return {
    lead: SAMPLE_360_LEAD,
    now: SAMPLE_360_NOW,
    sample: true,
    // Set when the note on Sep 26 went in: Tuesday at 10:00 AM Central.
    followUp: { state: "later", at: "2026-09-29T15:00:00.000Z", partial: false, reachedOut: null },
    notes: ready(NOTES),
    messages: ready(MESSAGES),
    emails: ready(EMAILS),
    calls: ready(CALLS),
    activity: ready(ACTIVITY),
    tasks: ready(TASKS),
    websiteMessages: ready(WEBSITE),
    purchases: ready(PURCHASES),
    invoices: ready(INVOICES),
    plan: ready(PLAN),
    projects: ready(PROJECTS),
  };
}

/** The "new" view's person: came in from a Facebook lead form this morning. */
export const SAMPLE_360_NEW_LEAD = {
  ...SAMPLE_360_LEAD,
  created_at: "2026-09-28T13:12:00.000Z",
  full_name: "Casey Sample",
  business_name: "Sample Mobile Detailing (fictional)",
  phone: "(903) 555-0152",
  email: "casey@example.test",
  source: "meta_lead_ad",
};

/** Who each view is about, with the phone, email, and texting consent the sample's buttons are drawn from. */
export function sampleContact(view: Sample360View): typeof SAMPLE_360_LEAD {
  return view === "new" ? SAMPLE_360_NEW_LEAD : SAMPLE_360_LEAD;
}

function newLeadInput(): StoryInput {
  const lead = SAMPLE_360_NEW_LEAD;
  const said = "Do you build sites for detailers? I mostly get customers from Facebook right now.";
  return {
    lead,
    now: SAMPLE_360_NOW,
    sample: true,
    followUp: {
      state: "none",
      at: null,
      partial: false,
      reachedOut: { kind: "message_in", at: "2026-09-28T13:20:00.000Z", channel: "sms", said },
    },
    notes: ready([]),
    messages: ready([
      { id: "nm1", lead_id: LEAD_ID, direction: "in", channel: "sms", body: said, author: null, delivered: true, created_at: "2026-09-28T13:20:00.000Z" },
    ]),
    emails: ready([]),
    calls: ready([]),
    activity: ready([]),
    tasks: ready([]),
    websiteMessages: notLinkedYet("websiteMessages"),
    purchases: notLinkedYet("purchases"),
    invoices: notLinkedYet("invoices"),
    plan: ready(null),
    projects: notLinkedYet("projects"),
  };
}

/** The sample story for one view. Each call returns fresh objects. */
export function sampleStoryInput(view: Sample360View = "client"): StoryInput {
  if (view === "new") return newLeadInput();
  const base = clientInput();
  if (view === "today") {
    return {
      ...base,
      websiteMessages: notLinkedYet("websiteMessages"),
      purchases: notLinkedYet("purchases"),
      invoices: notLinkedYet("invoices"),
      projects: notLinkedYet("projects"),
    };
  }
  if (view === "problem") {
    return {
      ...base,
      followUp: { ...base.followUp, state: "due", at: "2026-09-25T15:00:00.000Z", partial: true },
      messages: failed(),
      calls: failed(),
      tasks: failed(),
      invoices: failed(),
    };
  }
  return base;
}
