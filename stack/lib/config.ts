// The per-client configuration for a Company OS stack.
//
// One JSON file per client says who the business is, which modules are on,
// which accounts (all the client's own) the stack deploys into, how people
// may be contacted, and which sequences run. Delivery is this file plus the
// provisioning runbook; nothing in the stack names a client by hand.
//
// No imports, so the same file works inside a shipped stack and inside
// The LeadFlow Pro's tooling.

export const STACK_VERSION = "1.0.0";

export type Channel = "sms" | "email";

export type ModuleKey = "crm" | "sequences" | "portal" | "dashboard" | "payments";

export const MODULES: ModuleKey[] = ["crm", "sequences", "portal", "dashboard", "payments"];

export type PersonStatus = "lead" | "customer" | "member" | "past" | "do_not_contact";

export type SequenceStep = {
  /** Days after enrollment. Step 0 is day 0. */
  day: number;
  channel: Channel;
  /** A template id the client's copy file provides. Never the copy itself. */
  templateId: string;
};

export type SequenceConfig = {
  id: string;
  name: string;
  /** What enrolls a person. */
  trigger: "person_created" | "status_customer" | "status_member" | "manual";
  steps: SequenceStep[];
  /** Person statuses that end the sequence. do_not_contact always ends it. */
  stopOnStatus: PersonStatus[];
  /** A reply from the person ends the sequence. Default true. */
  stopOnReply: boolean;
};

export type StackConfig = {
  slug: string;
  stackVersion: string;
  business: {
    name: string;
    legalName?: string;
    phoneE164: string;
    email: string;
    timezone: string;
    /** Printed on every automated message. */
    smsSignature: string;
  };
  modules: Record<ModuleKey, boolean>;
  accounts: {
    /** The client's own Supabase project ref (twenty lowercase letters). */
    supabaseProjectRef: string;
    /** The client's own Vercel project name. */
    vercelProject: string;
    /** The client's own Stripe account id (acct_...). Required when payments is on. */
    stripeAccountId?: string;
    /** Sender the client verified on their own domain. */
    emailFrom: string;
  };
  consent: {
    /** Local hours between which automated messages may go out. */
    quietHours: { start: number; end: number };
    /** Words that stop texts. STOP is always included. */
    stopWords?: string[];
    /** Whether an SMS step needs recorded consent (always true; here so the runbook can print it). */
    smsRequiresConsent: true;
  };
  sequences: SequenceConfig[];
  portal: {
    /** What a member sees. Each is that member's own records only. */
    shows: ("profile" | "payments" | "messages" | "documents")[];
  };
  launch: { status: "draft" | "staging" | "live"; scopeApprovedOn?: string; domain?: string };
};

export type ConfigProblem = { path: string; message: string };

const E164 = /^\+[1-9]\d{7,14}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SUPABASE_REF = /^[a-z]{20}$/;
const STRIPE_ACCT = /^acct_[A-Za-z0-9]{8,}$/;

export function validateStackConfig(input: unknown): ConfigProblem[] {
  const problems: ConfigProblem[] = [];
  const bad = (path: string, message: string) => problems.push({ path, message });
  if (!input || typeof input !== "object") return [{ path: "", message: "config is not an object" }];
  const c = input as Partial<StackConfig>;

  if (!c.slug || !SLUG.test(c.slug)) bad("slug", "lowercase letters, digits, and single hyphens only");
  if (c.stackVersion !== STACK_VERSION) bad("stackVersion", `must be ${STACK_VERSION}`);

  const b = c.business;
  if (!b) bad("business", "missing");
  else {
    if (!b.name?.trim()) bad("business.name", "missing");
    if (!b.phoneE164 || !E164.test(b.phoneE164)) bad("business.phoneE164", "E.164 like +19035550100");
    if (!b.email || !EMAIL.test(b.email)) bad("business.email", "not a valid address");
    if (!b.timezone?.includes("/")) bad("business.timezone", "an IANA zone like America/Chicago");
    if (!b.smsSignature?.trim()) bad("business.smsSignature", "every automated text is signed");
  }

  if (!c.modules) bad("modules", "missing");
  else {
    for (const m of MODULES) if (typeof c.modules[m] !== "boolean") bad(`modules.${m}`, "true or false");
    if (c.modules.crm === false) bad("modules.crm", "the CRM is the record of people; it cannot be off");
    if (c.modules.sequences && !c.modules.crm) bad("modules.sequences", "needs crm");
    if (c.modules.portal && !c.modules.crm) bad("modules.portal", "needs crm");
  }

  const a = c.accounts;
  if (!a) bad("accounts", "missing");
  else {
    if (!a.supabaseProjectRef || !SUPABASE_REF.test(a.supabaseProjectRef)) bad("accounts.supabaseProjectRef", "the client's Supabase project ref (20 lowercase letters)");
    if (!a.vercelProject?.trim()) bad("accounts.vercelProject", "the client's Vercel project name");
    if (!a.emailFrom || !EMAIL.test(a.emailFrom.replace(/^.*<([^>]+)>$/, "$1"))) bad("accounts.emailFrom", "a sender on the client's domain");
    if (c.modules?.payments && (!a.stripeAccountId || !STRIPE_ACCT.test(a.stripeAccountId))) bad("accounts.stripeAccountId", "payments is on: the client's own Stripe account id (acct_...)");
  }

  const k = c.consent;
  if (!k) bad("consent", "missing");
  else {
    if (k.smsRequiresConsent !== true) bad("consent.smsRequiresConsent", "must be true");
    const q = k.quietHours;
    if (!q || !Number.isInteger(q.start) || !Number.isInteger(q.end) || q.start < 0 || q.end > 24 || q.start >= q.end) bad("consent.quietHours", "start < end, both 0 to 24 (local hours messages may go out)");
    else if (q.end - q.start > 14) bad("consent.quietHours", "a send window longer than 14 hours is not a quiet-hours policy");
  }

  if (!Array.isArray(c.sequences)) bad("sequences", "an array (may be empty)");
  else {
    const ids = new Set<string>();
    c.sequences.forEach((s, i) => {
      if (!s.id || !SLUG.test(s.id)) bad(`sequences[${i}].id`, "url-safe id");
      if (ids.has(s.id)) bad(`sequences[${i}].id`, "duplicate");
      ids.add(s.id);
      if (!["person_created", "status_customer", "status_member", "manual"].includes(s.trigger)) bad(`sequences[${i}].trigger`, "person_created, status_customer, status_member, or manual");
      if (!Array.isArray(s.steps) || s.steps.length === 0) bad(`sequences[${i}].steps`, "at least one step");
      else {
        let lastDay = -1;
        s.steps.forEach((st, j) => {
          if (!Number.isInteger(st.day) || st.day < 0) bad(`sequences[${i}].steps[${j}].day`, "whole days from enrollment");
          if (st.day <= lastDay) bad(`sequences[${i}].steps[${j}].day`, "steps must be in increasing day order");
          lastDay = st.day;
          if (!["sms", "email"].includes(st.channel)) bad(`sequences[${i}].steps[${j}].channel`, "sms or email");
          if (!st.templateId?.trim()) bad(`sequences[${i}].steps[${j}].templateId`, "missing");
        });
        if (s.steps.length > 8) bad(`sequences[${i}].steps`, "more than eight automated touches is not follow-up, it is nagging");
      }
      if (!Array.isArray(s.stopOnStatus)) bad(`sequences[${i}].stopOnStatus`, "an array");
      if (typeof s.stopOnReply !== "boolean") bad(`sequences[${i}].stopOnReply`, "true or false");
    });
    if (c.sequences.length && c.modules && !c.modules.sequences) bad("sequences", "sequences are defined but the module is off");
  }

  if (!c.portal || !Array.isArray(c.portal.shows)) bad("portal.shows", "an array");
  else if (c.modules?.portal && c.portal.shows.length === 0) bad("portal.shows", "portal is on but shows nothing");

  const l = c.launch;
  if (!l || !["draft", "staging", "live"].includes(l.status)) bad("launch.status", "draft, staging, or live");
  if (l?.status === "live" && (!l.scopeApprovedOn || !l.domain)) bad("launch", "a live stack needs scopeApprovedOn and domain");

  return problems;
}

export function enabledModules(c: StackConfig): ModuleKey[] {
  return MODULES.filter((m) => c.modules[m]);
}
