// The Client 360: one person's whole story at the top of the lead record,
// in the order Ryan reads it on a phone. What is owed next, money, builds,
// conversations, and notes, each with a one-line summary and the detail a
// tap away.
//
// Every part says where it stands, so an empty screen is never mistaken for
// a quiet client:
// - "ready": the records loaded. An empty list means there really are none.
// - "failed": the read failed. The screen says it is a connection problem,
//   not an empty record, and prints no count or total from it.
// - "not_linked": nothing links these records to a lead yet (projects belong
//   to a client login, website messages carry only an email address). The
//   screen says so and points to the page that has them. Nothing is guessed
//   and nothing is matched by email, the same rule the Purchases page keeps.
//
// Money totals are sums of loaded records in whole cents. A Sales Desk
// invoice's money lives only in its invoice row (the Stripe webhook leaves it
// out of purchases so it is never counted twice), so paid purchases plus paid
// invoices is the client's paid total. A total that would need a part that
// failed or is not linked is left off, never shown partial.
//
// The caller authorizes the user and loads the records. Rows for another lead
// are dropped here as well, so records loaded together never mix.
//
// Leaf module: pure functions over lib/leadTimeline.ts, lib/agencyRetainer.ts
// and lib/businessTime.ts, all browser-safe. Nothing here reads, writes,
// sends, or fetches, so it runs on the server, in the lead workspace in the
// browser, and in plain tests. It reads the Call Closer's outcome marker
// itself (callCloserEntry) rather than loading lib/callCloser.ts and its
// offer registry into the browser; tests/client360.test.ts holds the two to
// the same answer.

import { retainerActive, type RetainerState } from "@/lib/agencyRetainer";
import { centralDate, formatCentral, formatCentralDate, isLocalDate } from "@/lib/businessTime";
import {
  buildLeadTimeline,
  stripActivityMarkers,
  type LeadActivityRecord,
  type LeadCallRecord,
  type LeadEmailRecord,
  type LeadMessageRecord,
  type LeadNoteRecord,
  type TimelineLead,
} from "@/lib/leadTimeline";

// ---------------------------------------------------------------------------
// Inputs

/** A page Ryan can open instead, named in plain words. */
export type StoryLink = { href: string; label: string };

/** One source of records, and whether it loaded. */
export type Source<T> =
  | { status: "ready"; rows: T }
  | { status: "failed" }
  | { status: "not_linked"; why: string; link: StoryLink | null };

export function ready<T>(rows: T): Source<T> {
  return { status: "ready", rows };
}

export function failed<T>(): Source<T> {
  return { status: "failed" };
}

export function notLinked<T>(why: string, link: StoryLink | null = null): Source<T> {
  return { status: "not_linked", why, link };
}

/**
 * What the lead record says, for now, about the records nothing links to a
 * lead yet, and where to see them meanwhile. They join the lead record when
 * the droplet database is set up (step 1 of the Back Office plan). Until then
 * nothing new is read from Supabase for them, nothing is guessed, and nothing
 * is matched by email.
 */
export const NOT_LINKED_YET = {
  purchases: {
    why: "Purchases are not linked to this screen yet. They join the lead record when the new database is set up.",
    link: { href: "/admin/purchases", label: "Open Purchases" },
  },
  invoices: {
    why: "Invoices are not linked to this screen yet. They join the lead record when the new database is set up.",
    link: { href: "/admin/sales/invoices", label: "Open Invoices" },
  },
  projects: {
    why: "Projects belong to a client login, not a lead, so they cannot be matched here yet. Linking a client to their lead is part of the new database.",
    link: { href: "/admin/projects", label: "Open Projects" },
  },
  websiteMessages: {
    why: "Website messages are saved with an email address only, so they are not matched to a lead yet.",
    link: { href: "/admin/messages", label: "Open Messages" },
  },
} as const satisfies Record<string, { why: string; link: StoryLink }>;

/** A not-linked source from NOT_LINKED_YET. */
export function notLinkedYet<T>(key: keyof typeof NOT_LINKED_YET): Source<T> {
  const { why, link } = NOT_LINKED_YET[key];
  return notLinked<T>(why, { ...link });
}

/** A checkout the payment webhook recorded (public.purchases today). */
export type StoryPurchase = {
  id: string;
  lead_id: string | null;
  created_at: string;
  kind: string | null;
  amount_cents: number | null;
  /** paid, refunded, disputed, payment_failed */
  status: string | null;
};

/** A Sales Desk invoice (public.sales_invoices today). */
export type StoryInvoice = {
  id: string;
  lead_id: string;
  invoice_number: string | null;
  /** draft, open, paid, payment_failed, void, uncollectible, send_failed */
  status: string;
  subtotal_cents: number;
  /** A calendar date, YYYY-MM-DD. */
  due_date: string;
  sent_at: string | null;
  created_at: string;
};

/** A build and its milestones (public.projects and public.milestones today). */
export type StoryProject = {
  id: string;
  name: string;
  /** discovery, design, build, launch, live, support, paused */
  status: string;
  milestones: { id: string; title: string; status: string; sort_order: number }[];
};

/** A message through the website's contact form (public.messages today). */
export type StoryWebsiteMessage = {
  id: string;
  created_at: string;
  body: string;
  /** "visitor" for the person, anything else for a reply from the team. */
  sender: string;
};

/** A follow-up task on the lead (public.lead_tasks today). */
export type StoryTask = {
  id: string;
  title: string;
  /** A calendar date, YYYY-MM-DD, or null. */
  due_date: string | null;
  completed_at: string | null;
  created_at: string;
};

/**
 * What the server worked out about the next follow-up, by the call sheet's
 * own rules (lib/client360Server.ts), so this screen and the call card never
 * disagree.
 */
export type StoryFollowUp = {
  /**
   * The call card's own answer. first_call: nobody has logged a call or a note
   * and nothing has touched the lead, so any stored time is not a promise.
   */
  state: "due" | "later" | "none" | "first_call";
  /** The stored follow-up time (ISO), when there is one. */
  at: string | null;
  /** Some history did not load, so whether a past time is still owed cannot be told. */
  partial: boolean;
  /** The newest time they reached out, only when it came after the last time a person did. */
  reachedOut: { kind: "message_in" | "call_in"; at: string; channel: string | null; said: string | null } | null;
};

export type StoryLead = TimelineLead & { business_name: string | null };

/** One way to reach them: a link when it is allowed, otherwise the reason in words. Built on the server (lib/client360Server.ts). */
export type StoryReach = { label: string; href: string | null };

/** The call card's buttons, by the same rules. text is null with no phone on file, where the Call button already says so. */
export type StoryReachSet = { call: StoryReach; text: StoryReach | null; email: StoryReach };

export type StoryInput = {
  lead: StoryLead;
  now: Date;
  /** The fictional sample (/admin/leads/sample). Says so on screen. */
  sample?: boolean;
  followUp: StoryFollowUp;
  notes: Source<LeadNoteRecord[]>;
  messages: Source<LeadMessageRecord[]>;
  emails: Source<LeadEmailRecord[]>;
  calls: Source<LeadCallRecord[]>;
  activity: Source<LeadActivityRecord[]>;
  tasks: Source<StoryTask[]>;
  websiteMessages: Source<StoryWebsiteMessage[]>;
  purchases: Source<StoryPurchase[]>;
  invoices: Source<StoryInvoice[]>;
  plan: Source<RetainerState | null>;
  projects: Source<StoryProject[]>;
};

// ---------------------------------------------------------------------------
// Output

/** Words carry the meaning; the tone only adds color. */
export type StoryTone = "attention" | "good" | "neutral";

export type StoryLine = {
  id: string;
  title: string;
  /** What was said or done, clipped. May be empty. */
  detail: string;
  /** When, and its state, in one line. */
  meta: string;
  /** Money lines only, e.g. "$500.00". */
  amount?: string;
  tone: StoryTone;
};

export type PartState = "ready" | "failed" | "not_linked";

/** Where a part stands, with the reason and a way to the records when it is not linked. */
export type StoryPart = { state: PartState; why: string | null; link: StoryLink | null };

export type FollowUpView = {
  /** due: a follow-up is owed now. later: one is set. none: nothing set. first: nobody has called or noted yet. unknown: history is missing. */
  tone: "due" | "later" | "none" | "first" | "unknown";
  headline: string;
  detail: string | null;
  reachedOut: { sentence: string; said: string | null } | null;
  tasks: { state: "ready" | "failed"; open: StoryLine[]; openCount: number };
};

export type MoneyView = {
  summary: string;
  /** Paid so far, formatted. Null unless purchases and invoices both loaded. */
  paid: string | null;
  /** Still owed on sent invoices, formatted. Null unless invoices loaded. */
  owed: string | null;
  attention: string[];
  plan: StoryPart & { line: string | null; tone: StoryTone };
  purchases: StoryPart & { lines: StoryLine[] };
  invoices: StoryPart & { lines: StoryLine[] };
};

export type StoryMilestone = { id: string; title: string; status: "done" | "in_progress" | "pending"; label: string };

export type StoryProjectView = { id: string; name: string; stage: string; progress: string; next: string | null; milestones: StoryMilestone[] };

export type BuildsView = {
  summary: string;
  part: StoryPart;
  projects: StoryProjectView[];
};

/** What a list is missing: a source that did not load, or one not linked yet (with its page). */
export type StoryGap = { kind: "failed" | "not_linked"; text: string; link: StoryLink | null };

export type ConversationsView = {
  summary: string;
  /** Per channel. A count is a number of records; a source that did not load or is not linked says so instead. */
  counts: { label: string; value: string }[];
  recent: StoryLine[];
  problems: StoryGap[];
};

export type NotesView = {
  summary: string;
  state: "ready" | "failed";
  count: number;
  latest: StoryLine[];
};

export type ClientStory = {
  leadId: string;
  name: string;
  business: string | null;
  sample: boolean;
  /** When this story was put together, Central time. */
  asOf: string;
  followUp: FollowUpView;
  money: MoneyView;
  builds: BuildsView;
  conversations: ConversationsView;
  notes: NotesView;
};

// ---------------------------------------------------------------------------
// Helpers

/** Newest items shown in the Conversations and Notes parts. */
export const RECENT_CONVERSATIONS = 4;
export const LATEST_NOTES = 2;
export const OPEN_TASKS_SHOWN = 3;
/** Longest piece of a message or note shown before the ellipsis. */
export const DETAIL_MAX = 280;

const USD = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

/** Whole cents to "$1,234.56". */
export function formatCents(cents: number): string {
  return USD.format(Math.round(cents) / 100);
}

/** An amount in whole cents, or null when it is missing or not a whole number of cents. */
function centsOf(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) ? value : null;
}

function validDate(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const at = new Date(iso);
  return Number.isNaN(at.getTime()) ? null : at;
}

/** "Tue, Sep 22 at 9:14 AM" in Central time, or "Time not recorded". */
function when(iso: string | null | undefined): string {
  const at = validDate(iso);
  return at ? formatCentral(at) : "Time not recorded";
}

/** "Wed, Sep 30" for a calendar date (YYYY-MM-DD) or an instant (its Central day), or null. */
function dayOf(value: string | null | undefined): string | null {
  if (!value) return null;
  if (isLocalDate(value)) return formatCentralDate(value);
  const at = validDate(value);
  return at ? formatCentralDate(centralDate(at)) : null;
}

/**
 * Whitespace collapsed and cut to max characters with an ellipsis, at a word
 * break when one is near, the way the call sheet clips. Counted in code
 * points, so an emoji is never cut in half (half an emoji would read
 * differently on the server and in the browser).
 */
export function clip(text: string, max = DETAIL_MAX): string {
  const flat = typeof text === "string" ? text.replace(/\s+/g, " ").trim() : "";
  const chars = Array.from(flat);
  if (chars.length <= max) return flat;
  const room = max - 1;
  const head = chars.slice(0, room);
  const space = chars[room] === " " ? room : head.lastIndexOf(" ");
  const cut = space >= Math.floor(room * 0.6) ? head.slice(0, space) : head;
  return `${cut.join("").replace(/[\s,;:]+$/, "")}…`;
}

function pretty(value: string | null | undefined): string {
  const words = (value ?? "").replace(/_/g, " ").trim();
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : "";
}

function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}

function lowerFirst(text: string): string {
  return text ? text.charAt(0).toLowerCase() + text.slice(1) : text;
}

function part<T>(source: Source<T>): StoryPart {
  if (source.status === "not_linked") return { state: "not_linked", why: source.why, link: source.link };
  return { state: source.status, why: null, link: null };
}

function rowsOf<T>(source: Source<T[]>): T[] {
  return source.status === "ready" && Array.isArray(source.rows) ? source.rows : [];
}

/** Newest first by an ISO field; unreadable times last. */
function newestFirst<T>(rows: T[], at: (row: T) => string | null | undefined): T[] {
  const ms = (row: T) => validDate(at(row))?.getTime() ?? Number.NEGATIVE_INFINITY;
  return [...rows].sort((a, b) => ms(b) - ms(a));
}

// ---------------------------------------------------------------------------
// Next follow-up

/**
 * "They texted you Tue, Sep 22 at 9:14 AM Central, and nobody has answered
 * since." The call card's sentence. With some history missing, the second
 * half cannot be known, so it is left off.
 */
export function reachedOutSentence(inbound: NonNullable<StoryFollowUp["reachedOut"]>, partial: boolean): string {
  const at = validDate(inbound.at);
  const whenText = at ? `${formatCentral(at)} Central` : "recently";
  if (inbound.kind === "call_in") {
    return partial ? `They called ${whenText} and nobody picked up.` : `They called ${whenText} and nobody picked up. Nobody has reached them since.`;
  }
  const verb = inbound.channel === "sms" ? "texted you" : inbound.channel === "email" ? "emailed you" : "wrote to you";
  return partial ? `They ${verb} ${whenText}.` : `They ${verb} ${whenText}, and nobody has answered since.`;
}

function followUpView(input: StoryInput): FollowUpView {
  const { followUp, now } = input;
  const at = validDate(followUp.at);
  let tone: FollowUpView["tone"];
  let headline: string;
  let detail: string | null;
  if (followUp.partial && at && at.getTime() <= now.getTime()) {
    // Some history did not load, so whether this time is still owed cannot be told.
    tone = "unknown";
    headline = "Follow-up time on file";
    detail = `${formatCentral(at)} Central. Some history did not load, so check it before you call.`;
  } else if (followUp.state === "first_call") {
    // The call card's words for a lead nobody has reached yet.
    tone = "first";
    headline = "This is the first call";
    detail = "Nobody has logged a call or a note yet.";
  } else if (followUp.state === "due" && at) {
    tone = "due";
    headline = "Follow-up due now";
    detail = `It came due ${formatCentral(at)} Central.`;
  } else if (followUp.state === "later" && at) {
    tone = "later";
    headline = "Next follow-up";
    detail = `${formatCentral(at)} Central.`;
  } else {
    tone = "none";
    headline = "No follow-up set";
    detail = null;
  }

  const today = centralDate(now);
  const openTasks = rowsOf(input.tasks).filter((t) => !t.completed_at && typeof t.title === "string" && t.title.trim());
  // Soonest due first, undated after, then oldest first, so the task that has waited longest leads.
  const dueKey = (t: StoryTask) => (t.due_date && isLocalDate(t.due_date) ? t.due_date : "9999-12-31");
  const sorted = [...openTasks].sort((a, b) => dueKey(a).localeCompare(dueKey(b)) || (a.created_at ?? "").localeCompare(b.created_at ?? ""));
  const open: StoryLine[] = sorted.slice(0, OPEN_TASKS_SHOWN).map((t) => {
    const dated = Boolean(t.due_date && isLocalDate(t.due_date));
    const due = dated ? formatCentralDate(t.due_date!) : null;
    const overdue = dated && t.due_date! < today;
    const dueToday = dated && t.due_date === today;
    return {
      id: `task:${t.id}`,
      title: clip(t.title, 140),
      detail: "",
      meta: !due ? "No due date" : overdue ? `Overdue · was due ${due}` : dueToday ? `Due today · ${due}` : `Due ${due}`,
      tone: overdue || dueToday ? "attention" : "neutral",
    };
  });

  return {
    tone,
    headline,
    detail,
    reachedOut: followUp.reachedOut ? { sentence: reachedOutSentence(followUp.reachedOut, followUp.partial), said: followUp.reachedOut.said } : null,
    tasks: { state: input.tasks.status === "ready" ? "ready" : "failed", open, openCount: openTasks.length },
  };
}

// ---------------------------------------------------------------------------
// Money

type Status = { label: string; tone: StoryTone };

const PURCHASE_STATUS: Record<string, Status> = {
  paid: { label: "Paid", tone: "good" },
  refunded: { label: "Refunded", tone: "neutral" },
  disputed: { label: "Disputed · needs attention", tone: "attention" },
  payment_failed: { label: "Payment failed", tone: "attention" },
};

/** Money still owed: sent and not paid, or a failed payment on it. */
const OWED_INVOICE = new Set(["open", "payment_failed"]);

/** The statuses the payment webhook and the Sales Desk write. Any other status cannot be placed in a total. */
const KNOWN_PURCHASE = new Set(Object.keys(PURCHASE_STATUS));
const KNOWN_INVOICE = new Set(["draft", "open", "paid", "payment_failed", "void", "uncollectible", "send_failed"]);

function purchaseStatus(purchase: StoryPurchase): Status {
  return PURCHASE_STATUS[purchase.status ?? ""] ?? { label: pretty(purchase.status) || "Status not recorded", tone: "neutral" };
}

function invoiceStatus(invoice: StoryInvoice, today: string): Status {
  const due = dayOf(invoice.due_date);
  switch (invoice.status) {
    case "paid":
      return { label: "Paid", tone: "good" };
    case "open":
      if (isLocalDate(invoice.due_date) && invoice.due_date < today) return { label: `Overdue · was due ${due}`, tone: "attention" };
      return { label: due ? `Sent · due ${due}` : "Sent · waiting for payment", tone: "neutral" };
    case "draft":
      return { label: "Draft · not sent", tone: "neutral" };
    case "payment_failed":
      return { label: "Payment failed · needs attention", tone: "attention" };
    case "send_failed":
      return { label: "Did not send · needs attention", tone: "attention" };
    case "void":
      return { label: "Voided", tone: "neutral" };
    case "uncollectible":
      return { label: "Marked uncollectible", tone: "neutral" };
    default:
      return { label: pretty(invoice.status) || "Status not recorded", tone: "neutral" };
  }
}

/** The monthly plan, from what the Stripe webhook stamped on the lead: a full line and a short one for the summary. */
export function planLine(plan: RetainerState | null): { line: string; short: string; tone: StoryTone } {
  if (!plan) return { line: "No monthly plan on this record.", short: "no monthly plan", tone: "neutral" };
  const name = `Monthly ${plan.service} retainer`;
  if (plan.endedAt) {
    const ended = dayOf(plan.endedAt);
    return { line: `${name} · ended${ended ? ` ${ended}` : ""}`, short: "plan ended", tone: "neutral" };
  }
  if (!retainerActive(plan)) {
    const end = dayOf(plan.currentPeriodEnd);
    return { line: `${name} · set to end${end ? ` on ${end}` : " at the close of the paid period"}`, short: "plan set to end", tone: "attention" };
  }
  const through = dayOf(plan.currentPeriodEnd);
  return { line: `${name} · renewing${through ? ` · paid through ${through}` : ""}`, short: "plan renewing", tone: "good" };
}

function moneyView(input: StoryInput): MoneyView {
  const leadId = input.lead.id;
  const today = centralDate(input.now);
  const purchases = rowsOf(input.purchases).filter((p) => p.lead_id === leadId);
  const invoices = rowsOf(input.invoices).filter((i) => i.lead_id === leadId);
  const attention: string[] = [];

  const purchaseLines: StoryLine[] = newestFirst(purchases, (p) => p.created_at).map((p) => {
    const status = purchaseStatus(p);
    const cents = centsOf(p.amount_cents);
    const title = pretty(p.kind) || "Purchase";
    if (status.tone === "attention") attention.push(`${title}: ${status.label}`);
    return {
      id: `purchase:${p.id}`,
      title,
      detail: "",
      meta: `${when(p.created_at)} · ${status.label}`,
      amount: cents === null ? "Amount not recorded" : formatCents(cents),
      tone: status.tone,
    };
  });

  const invoiceLines: StoryLine[] = newestFirst(invoices, (i) => i.created_at).map((i) => {
    const status = invoiceStatus(i, today);
    const cents = centsOf(i.subtotal_cents);
    const title = i.invoice_number ? `Invoice ${i.invoice_number}` : "Invoice (no number yet)";
    if (status.tone === "attention") attention.push(`${title}: ${status.label}`);
    return {
      id: `invoice:${i.id}`,
      title,
      detail: "",
      meta: `Made ${when(i.created_at)} · ${status.label}`,
      amount: cents === null ? "Amount not recorded" : formatCents(cents),
      tone: status.tone,
    };
  });

  const purchasesReady = input.purchases.status === "ready";
  const invoicesReady = input.invoices.status === "ready";
  // A total is told only when every amount in it is recorded and every row's
  // status is one the code knows: one paid row with no amount, or a status
  // nobody can place, means no total, never a total that quietly skips it.
  const total = (amounts: (number | null)[]): number | null =>
    amounts.some((a) => a === null) ? null : amounts.reduce<number>((sum, a) => sum + (a ?? 0), 0);
  const purchaseUnknown = purchases.some((p) => !KNOWN_PURCHASE.has(p.status ?? ""));
  const invoiceUnknown = invoices.some((i) => !KNOWN_INVOICE.has(i.status));
  const paidAmounts = [
    ...purchases.filter((p) => p.status === "paid").map((p) => centsOf(p.amount_cents)),
    ...invoices.filter((i) => i.status === "paid").map((i) => centsOf(i.subtotal_cents)),
  ];
  const owedAmounts = invoices.filter((i) => OWED_INVOICE.has(i.status)).map((i) => centsOf(i.subtotal_cents));
  const paidCents = purchasesReady && invoicesReady && !purchaseUnknown && !invoiceUnknown ? total(paidAmounts) : null;
  const owedCents = invoicesReady && !invoiceUnknown ? total(owedAmounts) : null;
  const amountMissing = (purchasesReady && invoicesReady && paidCents === null) || (invoicesReady && owedCents === null);

  const planSource = input.plan;
  const planInfo = planSource.status === "ready" ? planLine(planSource.rows) : null;
  if (planInfo?.tone === "attention") attention.push(planInfo.line);
  const plan = { ...part(planSource), line: planInfo?.line ?? null, tone: planInfo?.tone ?? ("neutral" as StoryTone) };

  const bits: string[] = [];
  if (attention.length) bits.push("Needs attention");
  const nothingYet = paidCents === 0 && owedCents === 0 && !purchaseLines.length && !invoiceLines.length;
  if (nothingYet) bits.push("Nothing bought or invoiced yet");
  else {
    if (paidCents !== null) bits.push(`${formatCents(paidCents)} paid`);
    if (owedCents) bits.push(`${formatCents(owedCents)} owed`);
  }
  if (planInfo) bits.push(planInfo.short);
  const moneyFailed = [input.purchases, input.invoices].some((src) => src.status === "failed");
  const notLinkedNames = [
    input.purchases.status === "not_linked" ? "purchases" : null,
    input.invoices.status === "not_linked" ? "invoices" : null,
  ].filter((name): name is string => name !== null);
  if (moneyFailed) bits.push("some money records did not load");
  else if (notLinkedNames.length) bits.push(`${notLinkedNames.join(" and ")} not linked here yet`);
  if (amountMissing) bits.push("an amount or status is not recorded, so no total");
  if (planSource.status === "failed") bits.push("plan did not load");
  const summary = bits.map((b, i) => (i === 0 ? b.charAt(0).toUpperCase() + b.slice(1) : b)).join(" · ");

  return {
    summary,
    paid: paidCents === null ? null : formatCents(paidCents),
    owed: owedCents === null ? null : formatCents(owedCents),
    attention,
    plan,
    purchases: { ...part(input.purchases), lines: purchaseLines },
    invoices: { ...part(input.invoices), lines: invoiceLines },
  };
}

// ---------------------------------------------------------------------------
// Builds

const PROJECT_STAGE: Record<string, string> = {
  discovery: "Discovery",
  design: "Design",
  build: "Building",
  launch: "Launching",
  live: "Live",
  support: "Support",
  paused: "Paused",
};

const MILESTONE_LABEL: Record<StoryMilestone["status"], string> = {
  done: "Done",
  in_progress: "In progress",
  pending: "Not started",
};

function milestoneState(status: string): StoryMilestone["status"] {
  return status === "done" ? "done" : status === "in_progress" ? "in_progress" : "pending";
}

function buildsView(input: StoryInput): BuildsView {
  const projects: StoryProjectView[] = rowsOf(input.projects).map((p) => {
    const milestones: StoryMilestone[] = [...(Array.isArray(p.milestones) ? p.milestones : [])]
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .map((m) => {
        const status = milestoneState(m.status);
        return { id: m.id, title: clip(m.title, 140), status, label: MILESTONE_LABEL[status] };
      });
    const done = milestones.filter((m) => m.status === "done").length;
    return {
      id: p.id,
      name: clip(p.name, 120) || "Untitled project",
      stage: PROJECT_STAGE[p.status] ?? (pretty(p.status) || "Stage not recorded"),
      progress: milestones.length ? `${done} of ${milestones.length} milestones done` : "No milestones yet",
      next: milestones.find((m) => m.status !== "done")?.title ?? null,
      milestones,
    };
  });
  const state = part(input.projects);
  let summary: string;
  if (state.state === "failed") summary = "Projects did not load";
  else if (state.state === "not_linked") summary = "Projects are not linked to leads yet";
  else if (!projects.length) summary = "No projects yet";
  else if (projects.length === 1) summary = `${projects[0].name} · ${projects[0].stage} · ${projects[0].progress}`;
  else summary = `${plural(projects.length, "project")} · ${projects.map((p) => `${p.name} (${p.stage})`).join(", ")}`;
  return { summary, part: state, projects };
}

// ---------------------------------------------------------------------------
// Conversations

const OUTCOME_MARKER = /\bOutcome: ([a-z_]+)\./g;

/**
 * Which Call Closer entry a lead_activity row is: a call saved on the call
 * card ("call"), a proposal marked sent from the proposal page ("proposal"),
 * or neither. The same rule as lib/callCloser.ts isCallHistoryEntry and the
 * call card's read (every entry carries an "Outcome: x." marker, and the
 * last marker wins because it is appended after anything a person typed).
 */
export function callCloserEntry(kind: unknown, detail: unknown): "call" | "proposal" | null {
  if (typeof detail !== "string") return null;
  let outcome: string | null = null;
  for (const m of detail.matchAll(OUTCOME_MARKER)) outcome = m[1];
  if (!outcome) return null;
  if (kind === "call") return "call";
  if (kind === "sales" && outcome === "proposal_sent") return "proposal";
  return null;
}

const SOURCE_LABELS = {
  messages: "Texts, emails, and logged replies",
  calls: "Business line calls",
  activity: "Calls logged on the call card",
  emails: "Automated follow-up emails",
  websiteMessages: "Website messages",
} as const;

function conversationsView(input: StoryInput): ConversationsView {
  const lead = input.lead;
  const messages = rowsOf(input.messages).filter((m) => m.lead_id === lead.id);
  const emails = rowsOf(input.emails).filter((e) => e.lead_id === lead.id);
  const calls = rowsOf(input.calls).filter((c) => c.lead_id === lead.id && c.scope_status === "company");
  // The Call Closer's entries: saved calls and proposals marked sent. Stage and owner changes are not conversations.
  const entryKind = new Map<string, "call" | "proposal">();
  const callerEntries = rowsOf(input.activity).filter((a) => {
    const entry = a.lead_id === lead.id ? callCloserEntry(a.kind, a.detail) : null;
    if (entry) entryKind.set(`activity:${a.id}`, entry);
    return entry !== null;
  });
  const callLogCount = [...entryKind.values()].filter((k) => k === "call").length;
  const website = rowsOf(input.websiteMessages);

  // The lead timeline's own titles and delivery words, so both lists read the same.
  const timeline = buildLeadTimeline({ lead, messages, emails, calls, activity: callerEntries });
  const lines: (StoryLine & { at: number; whenText: string })[] = [];
  for (const item of timeline) {
    const isConversation =
      item.kind === "message" ||
      item.kind === "call" ||
      (item.kind === "email" && item.title !== "Follow-up sequence enrolled") ||
      (item.kind === "activity" && entryKind.has(item.id));
    if (!isConversation) continue;
    const whenText = when(item.at);
    const entry = item.kind === "activity" ? entryKind.get(item.id) : undefined;
    lines.push({
      id: item.id,
      title: entry === "call" ? "Call logged on the call card" : entry === "proposal" ? "Proposal marked sent" : item.title,
      detail: clip(item.body),
      meta: [whenText, item.status].filter(Boolean).join(" · "),
      tone: item.status?.startsWith("Failed") || item.status === "Not sent" ? "attention" : "neutral",
      at: validDate(item.at)?.getTime() ?? Number.NEGATIVE_INFINITY,
      whenText,
    });
  }
  for (const w of website) {
    const fromThem = w.sender === "visitor";
    const whenText = when(w.created_at);
    lines.push({
      id: `website:${w.id}`,
      title: fromThem ? "Website message from lead" : "Website reply",
      detail: clip(w.body),
      meta: `${whenText} · ${fromThem ? "Sent through the website" : "Reply on the website thread"}`,
      tone: "neutral",
      at: validDate(w.created_at)?.getTime() ?? Number.NEGATIVE_INFINITY,
      whenText,
    });
  }
  lines.sort((a, b) => b.at - a.at || a.id.localeCompare(b.id));
  const newest = lines[0];
  const recent: StoryLine[] = lines.slice(0, RECENT_CONVERSATIONS).map(({ at: _at, whenText: _when, ...line }) => line);

  const count = (source: Source<unknown[]>, n: number) =>
    source.status === "ready" ? String(n) : source.status === "failed" ? "Did not load" : "Not linked yet";
  const counts = [
    { label: "Texts", value: count(input.messages, messages.filter((m) => m.channel === "sms").length) },
    { label: "Calls on the business line", value: count(input.calls, calls.length) },
    { label: "Calls logged on the call card", value: count(input.activity, callLogCount) },
    { label: "Emails", value: count(input.messages, messages.filter((m) => m.channel === "email").length) },
    // Step zero enrolls a lead in follow-up. It is never an email send.
    { label: "Automated follow-up emails", value: count(input.emails, emails.filter((e) => e.step > 0).length) },
    { label: "Replies logged by hand", value: count(input.messages, messages.filter((m) => m.channel === "note").length) },
    { label: "Website messages", value: count(input.websiteMessages, website.length) },
  ];

  const sources = { messages: input.messages, calls: input.calls, activity: input.activity, emails: input.emails, websiteMessages: input.websiteMessages };
  const problems: StoryGap[] = [];
  let anyFailed = false;
  for (const key of Object.keys(sources) as (keyof typeof sources)[]) {
    const source = sources[key];
    if (source.status === "failed") {
      anyFailed = true;
      problems.push({ kind: "failed", text: `${SOURCE_LABELS[key]} did not load. That is a connection problem, not an empty history.`, link: null });
    }
    if (source.status === "not_linked") problems.push({ kind: "not_linked", text: source.why, link: source.link });
  }

  // With a source missing, the newest line shown may not be the newest there is, so the summary says so.
  let summary: string;
  if (newest) summary = anyFailed ? `Latest that loaded: ${lowerFirst(newest.title)}, ${newest.whenText}` : `Latest: ${lowerFirst(newest.title)}, ${newest.whenText}`;
  else if (anyFailed) summary = "Some conversations did not load";
  else summary = "No texts, calls, or emails yet";
  return { summary, counts, recent, problems };
}

// ---------------------------------------------------------------------------
// Notes

/** A note for reading: each line's trailing Call Closer markers removed, whitespace collapsed. */
function noteText(body: string): string {
  return body
    .split(/\r?\n/)
    .map((line) => stripActivityMarkers(line.trim()))
    .filter(Boolean)
    .join(" ");
}

function notesView(input: StoryInput): NotesView {
  const lead = input.lead;
  const notes = newestFirst(
    rowsOf(input.notes).filter((n) => n.lead_id === lead.id && typeof n.body === "string" && n.body.trim()),
    (n) => n.created_at,
  );
  const latest: StoryLine[] = notes.slice(0, LATEST_NOTES).map((n) => ({
    id: `note:${n.id}`,
    title: n.author?.trim() || "Author not recorded",
    detail: clip(noteText(n.body)),
    meta: when(n.created_at),
    tone: "neutral",
  }));
  const legacy = lead.notes?.trim();
  if (legacy && latest.length < LATEST_NOTES) {
    latest.push({ id: `legacy:${lead.id}`, title: "Earlier saved note", detail: clip(legacy), meta: "Time not recorded", tone: "neutral" });
  }
  const count = notes.length + (legacy ? 1 : 0);
  if (input.notes.status !== "ready") return { summary: "Notes did not load", state: "failed", count, latest };
  const newest = notes[0];
  const by = newest?.author?.trim() ? ` by ${newest.author.trim()}` : "";
  const summary = !count ? "No notes yet" : newest ? `${plural(count, "note")} · last ${when(newest.created_at)}${by}` : plural(count, "note");
  return { summary, state: "ready", count, latest };
}

// ---------------------------------------------------------------------------

/** The whole story, ready to render. */
export function buildClientStory(input: StoryInput): ClientStory {
  return {
    leadId: input.lead.id,
    name: input.lead.full_name?.trim() || "Unnamed lead",
    business: input.lead.business_name?.trim() || null,
    sample: input.sample === true,
    asOf: formatCentral(input.now),
    followUp: followUpView(input),
    money: moneyView(input),
    builds: buildsView(input),
    conversations: conversationsView(input),
    notes: notesView(input),
  };
}
