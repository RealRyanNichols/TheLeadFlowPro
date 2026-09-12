// The LeadFlow Pro Plugin: shared types.
//
// A workspace is one customer's business. Everything the Autopilot engine
// and the ChatGPT/Claude connector touch hangs off a workspace id. These
// types mirror the hq_* tables in supabase/migrations/20260912180000.

export const HQ_PLAN = {
  name: "The LeadFlow Pro Plugin",
  shortName: "LeadFlow Plugin",
  priceUsd: 49,
  trialDays: 14,
  /** purchases.kind and Stripe metadata.kind for the subscription. */
  kind: "hq_subscription",
  connectorName: "The LeadFlow Pro",
} as const;

export type Plan = "none" | "trial" | "active" | "past_due" | "canceled";

export type Voice = "plain" | "friendly" | "formal";

export type LeadSource =
  | "website"
  | "form"
  | "meta"
  | "sms"
  | "call"
  | "manual"
  | "plugin"
  | "api"
  | "email"
  | "other";

export type LeadStatus = "new" | "contacted" | "quoted" | "booked" | "won" | "lost" | "spam";

export const LEAD_STATUSES: LeadStatus[] = ["new", "contacted", "quoted", "booked", "won", "lost", "spam"];

/** Statuses where the lead still needs the owner's attention. */
export const OPEN_STATUSES: LeadStatus[] = ["new", "contacted", "quoted"];

export type WorkspaceSettings = {
  /** Text a brand-new lead back the moment they arrive (needs an SMS channel and consent). */
  autoTextBack: boolean;
  /** Email a brand-new lead back the moment they arrive (needs their email and consent). */
  autoEmailReply: boolean;
  /** Minutes before an uncontacted lead counts as slipping. */
  responseTargetMinutes: number;
  /** Local hour (0 to 23) the daily brief is built. */
  briefHour: number;
  /** Email the daily brief to the owner. */
  briefEmail: boolean;
  /** Email the owner the moment a lead arrives and again when one slips. */
  alertEmail: boolean;
  /** Text the owner from the connected number when a lead arrives. */
  alertSms: boolean;
  /** Extra phone numbers that get the same alert texts as the owner. */
  alertPhones: string[];
  /** Days after first contact for each automatic follow-up draft. */
  followUpDays: number[];
  /** Draft the week's posts, ad, and video script every week. */
  weeklyContent: boolean;
  /** Local weekday (0 Sunday to 6 Saturday) the weekly content and report land. */
  weeklyDay: number;
  /** A note the drafts should respect: promos, things never to say, tone. */
  notes: string;
};

export const DEFAULT_SETTINGS: WorkspaceSettings = {
  autoTextBack: false,
  autoEmailReply: true,
  responseTargetMinutes: 15,
  briefHour: 7,
  briefEmail: true,
  alertEmail: true,
  alertSms: false,
  alertPhones: [],
  followUpDays: [1, 3, 7, 14, 30],
  weeklyContent: true,
  weeklyDay: 1,
  notes: "",
};

export type Workspace = {
  id: string;
  slug: string;
  name: string;
  owner_id: string;
  owner_name: string | null;
  industry: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  city: string | null;
  state: string | null;
  timezone: string;
  brand_color: string;
  voice: Voice;
  services: string[];
  offer: string | null;
  review_link: string | null;
  plan: Plan;
  trial_ends_at: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  subscription_status: string | null;
  current_period_end: string | null;
  trial_used_at: string | null;
  stripe_event_at: number;
  /** The lead endpoint token. An address, shown in Settings. */
  inbound_token: string;
  /** True once a text-message webhook token has been minted. */
  has_sms_token: boolean;
  settings: WorkspaceSettings;
  onboarding_step: number;
  created_at: string;
  updated_at: string;
};

export type Lead = {
  id: string;
  workspace_id: string;
  created_at: string;
  updated_at: string;
  name: string;
  phone: string | null;
  email: string | null;
  source: LeadSource;
  source_detail: string | null;
  message: string | null;
  service: string | null;
  status: LeadStatus;
  score: number;
  first_contact_at: string | null;
  last_contact_at: string | null;
  next_follow_up_at: string | null;
  follow_up_step: number;
  value_cents: number | null;
  notes: string | null;
  consent_sms: boolean;
  consent_email: boolean;
  unsubscribed_at: string | null;
  auto_replied_at: string | null;
  external_id: string | null;
  meta: Record<string, unknown>;
};

export type EventKind =
  | "lead_in"
  | "text_out"
  | "email_out"
  | "text_in"
  | "email_in"
  | "call"
  | "note"
  | "status"
  | "alert"
  | "brief"
  | "report"
  | "content"
  | "follow_up"
  | "system"
  | "plugin";

export type HqEvent = {
  id: string;
  workspace_id: string;
  lead_id: string | null;
  kind: EventKind;
  detail: string;
  actor: string;
  dedupe_key: string | null;
  meta: Record<string, unknown>;
  created_at: string;
};

export type MessagePurpose =
  | "text_back"
  | "email_reply"
  | "follow_up"
  | "quote_follow_up"
  | "review_ask"
  | "reschedule"
  | "custom"
  | "inbound";

export type MessageStatus = "draft" | "queued" | "sending" | "sent" | "failed" | "received" | "skipped";

export type Message = {
  id: string;
  workspace_id: string;
  lead_id: string | null;
  direction: "in" | "out";
  channel: "sms" | "email";
  purpose: MessagePurpose;
  body: string;
  subject: string | null;
  status: MessageStatus;
  provider: string | null;
  provider_id: string | null;
  error: string | null;
  created_by: string;
  sent_at: string | null;
  created_at: string;
};

export type ContentKind = "post" | "ad" | "video_script" | "review_reply" | "email";
export type ContentStatus = "draft" | "approved" | "scheduled" | "published" | "rejected";

export type Content = {
  id: string;
  workspace_id: string;
  kind: ContentKind;
  title: string;
  body: string;
  hook: string | null;
  cta: string | null;
  extras: Record<string, unknown>;
  status: ContentStatus;
  week_of: string | null;
  scheduled_for: string | null;
  published_at: string | null;
  published_ref: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type Brief = {
  id: string;
  workspace_id: string;
  kind: "daily" | "weekly";
  brief_date: string;
  body_text: string;
  body_json: Record<string, unknown>;
  delivered_via: string[];
  created_at: string;
};

export type ConnectionKind = "openphone" | "twilio" | "meta_page" | "website";

export type Connection = {
  id: string;
  workspace_id: string;
  kind: ConnectionKind;
  label: string;
  config: Record<string, unknown>;
  status: "connected" | "error" | "disconnected";
  last_error: string | null;
  last_checked_at: string | null;
  created_at: string;
  updated_at: string;
};

/** Who is talking to the engine. Every action is attributed. */
export type Actor = "system" | "owner" | "plugin" | "cron" | "webhook";

/** True while the business is entitled to the engine and the connector. */
export function planIsLive(plan: Plan, trialEndsAt?: string | null, now = new Date()): boolean {
  if (plan === "active" || plan === "past_due") return true;
  if (plan === "trial") {
    if (!trialEndsAt) return true;
    return new Date(trialEndsAt).getTime() > now.getTime();
  }
  return false;
}
