import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "@/lib/config";
import { isUrgency, type Urgency } from "./cadence";
import { isTone } from "./messages";
import { isTradeId } from "./trades";
import {
  DEFAULT_PROFILE,
  isQuoteStatus,
  isTouchOutcome,
  type Account,
  type AccountPlan,
  type AccountStatus,
  type Profile,
  type Quote,
  type Touch,
} from "./types";

// The data layer. Every function takes the client it should use, and every
// query filters by the account email in code. The three tables are service
// role only (no browser policy at all): the only way to a row is through a
// server route that has already verified the signed cookie. RLS is enabled
// with no policies as the backstop.

export type Db = SupabaseClient<any, any, any>;

export function serviceDb(): Db | null {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!key) return null;
  return createSupabaseClient(SUPABASE_URL, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function fail(where: string, error: { message?: string; code?: string } | null): never {
  throw new Error(`${where}: ${error?.code ?? ""} ${error?.message ?? "unknown database error"}`.trim());
}

function str(value: unknown, max = 500): string {
  return typeof value === "string" ? value.slice(0, max) : "";
}

function dateOrNull(value: unknown): string | null {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value) ? value.slice(0, 10) : null;
}

/* --------------------------------- profile -------------------------------- */

export function parseProfile(raw: unknown): Profile {
  const p = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return {
    business: str(p.business, 120),
    owner: str(p.owner, 60),
    phone: str(p.phone, 20).replace(/\D/g, ""),
    tradeId: isTradeId(p.tradeId) ? p.tradeId : DEFAULT_PROFILE.tradeId,
    tone: isTone(p.tone) ? p.tone : DEFAULT_PROFILE.tone,
    window: str(p.window, 80) || DEFAULT_PROFILE.window,
    timezone: /^[A-Za-z_]+\/[A-Za-z_]+(?:\/[A-Za-z_]+)?$/.test(str(p.timezone, 60)) ? str(p.timezone, 60) : DEFAULT_PROFILE.timezone,
  };
}

/* --------------------------------- accounts -------------------------------- */

function parseAccount(row: Record<string, unknown>): Account {
  const plan: AccountPlan = row.plan === "lifetime" ? "lifetime" : "monthly";
  const status: AccountStatus = row.status === "past_due" ? "past_due" : row.status === "canceled" ? "canceled" : "active";
  return {
    email: str(row.email, 200),
    plan,
    status,
    currentPeriodEnd: typeof row.current_period_end === "string" ? row.current_period_end : null,
    cancelAt: typeof row.cancel_at === "string" ? row.cancel_at : null,
    stripeCustomerId: typeof row.stripe_customer_id === "string" ? row.stripe_customer_id : null,
    stripeSubscriptionId: typeof row.stripe_subscription_id === "string" ? row.stripe_subscription_id : null,
    stripeEventAt: Number(row.stripe_event_at) || 0,
    profile: parseProfile(row.profile),
    createdAt: typeof row.created_at === "string" ? row.created_at : new Date(0).toISOString(),
  };
}

export async function getAccount(db: Db, email: string): Promise<Account | null> {
  const { data, error } = await db.from("chase_sheet_accounts").select("*").eq("email", email).maybeSingle();
  if (error) fail("getAccount", error);
  return data ? parseAccount(data) : null;
}

export async function findAccountByStripe(db: Db, column: "stripe_subscription_id" | "stripe_customer_id", value: string): Promise<Account | null> {
  const { data, error } = await db.from("chase_sheet_accounts").select("*").eq(column, value).limit(1).maybeSingle();
  if (error) fail("findAccountByStripe", error);
  return data ? parseAccount(data) : null;
}

export type PurchaseRecord = {
  email: string;
  plan: AccountPlan;
  sessionId: string;
  customerId: string | null;
  subscriptionId: string | null;
  /** Unix seconds of the Stripe event, for ordering. */
  eventAt: number;
};

/**
 * A paid checkout. Idempotent: the same session upserted twice changes
 * nothing. A lifetime purchase never downgrades to monthly, and a monthly
 * purchase never downgrades a lifetime account.
 */
export async function recordPurchase(db: Db, purchase: PurchaseRecord): Promise<{ account: Account; created: boolean }> {
  const existing = await getAccount(db, purchase.email);
  if (!existing) {
    const { data, error } = await db
      .from("chase_sheet_accounts")
      .insert({
        email: purchase.email,
        plan: purchase.plan,
        status: "active",
        stripe_customer_id: purchase.customerId,
        stripe_subscription_id: purchase.subscriptionId,
        stripe_session_id: purchase.sessionId,
        stripe_event_at: purchase.eventAt,
        profile: {},
      })
      .select("*")
      .single();
    if (error?.code === "23505") {
      const raced = await getAccount(db, purchase.email);
      if (!raced) fail("recordPurchase", error);
      return { account: raced, created: false };
    }
    if (error) fail("recordPurchase", error);
    return { account: parseAccount(data), created: true };
  }
  const patch: Record<string, unknown> = {
    stripe_customer_id: purchase.customerId ?? existing.stripeCustomerId,
    stripe_session_id: purchase.sessionId,
    stripe_event_at: Math.max(existing.stripeEventAt, purchase.eventAt),
  };
  if (purchase.plan === "lifetime") {
    patch.plan = "lifetime";
    patch.status = "active";
    patch.current_period_end = null;
    patch.cancel_at = null;
  } else if (existing.plan === "monthly") {
    patch.status = "active";
    patch.stripe_subscription_id = purchase.subscriptionId ?? existing.stripeSubscriptionId;
    patch.cancel_at = null;
  } else {
    // A monthly checkout on a lifetime account: keep lifetime, remember the subscription so it can be ended.
    patch.stripe_subscription_id = purchase.subscriptionId ?? existing.stripeSubscriptionId;
  }
  const { data, error } = await db.from("chase_sheet_accounts").update(patch).eq("email", purchase.email).select("*").single();
  if (error) fail("recordPurchase.update", error);
  return { account: parseAccount(data), created: false };
}

export type PlanPatch = {
  status: AccountStatus;
  currentPeriodEnd: string | null;
  cancelAt: string | null;
  subscriptionId?: string | null;
  customerId?: string | null;
  eventAt: number;
};

export async function updatePlan(db: Db, email: string, patch: PlanPatch): Promise<void> {
  const row: Record<string, unknown> = {
    status: patch.status,
    current_period_end: patch.currentPeriodEnd,
    cancel_at: patch.cancelAt,
    stripe_event_at: patch.eventAt,
  };
  if (patch.subscriptionId !== undefined) row.stripe_subscription_id = patch.subscriptionId;
  if (patch.customerId !== undefined) row.stripe_customer_id = patch.customerId;
  const { error } = await db.from("chase_sheet_accounts").update(row).eq("email", email);
  if (error) fail("updatePlan", error);
}

export async function setStatus(db: Db, email: string, status: AccountStatus): Promise<void> {
  const { error } = await db.from("chase_sheet_accounts").update({ status }).eq("email", email);
  if (error) fail("setStatus", error);
}

export async function saveProfile(db: Db, email: string, profile: Profile): Promise<Profile> {
  const clean = parseProfile(profile);
  const { error } = await db.from("chase_sheet_accounts").update({ profile: clean }).eq("email", email);
  if (error) fail("saveProfile", error);
  return clean;
}

/* ---------------------------------- quotes --------------------------------- */

function parseQuote(row: Record<string, unknown>): Quote {
  return {
    id: str(row.id, 64),
    customerName: str(row.customer_name, 120),
    customerPhone: str(row.customer_phone, 20),
    customerEmail: str(row.customer_email, 200),
    job: str(row.job, 160),
    amountCents: Math.max(0, Number(row.amount_cents) || 0),
    sentOn: dateOrNull(row.sent_on) ?? new Date().toISOString().slice(0, 10),
    urgency: isUrgency(row.urgency) ? row.urgency : "planned",
    status: isQuoteStatus(row.status) ? row.status : "open",
    done: Math.max(0, Number(row.done) || 0),
    nextOn: dateOrNull(row.next_on),
    lastTouchOn: dateOrNull(row.last_touch_on),
    notes: str(row.notes, 2000),
    wonOn: dateOrNull(row.won_on),
    lostOn: dateOrNull(row.lost_on),
    lostReason: str(row.lost_reason, 200),
    createdAt: typeof row.created_at === "string" ? row.created_at : "",
    updatedAt: typeof row.updated_at === "string" ? row.updated_at : "",
  };
}

export async function listQuotes(db: Db, email: string): Promise<Quote[]> {
  const { data, error } = await db
    .from("chase_sheet_quotes")
    .select("*")
    .eq("account_email", email)
    .order("created_at", { ascending: false })
    .limit(2000);
  if (error) fail("listQuotes", error);
  return (data ?? []).map(parseQuote);
}

export async function getQuote(db: Db, email: string, id: string): Promise<Quote | null> {
  const { data, error } = await db.from("chase_sheet_quotes").select("*").eq("account_email", email).eq("id", id).maybeSingle();
  if (error) fail("getQuote", error);
  return data ? parseQuote(data) : null;
}

export async function countOpenQuotes(db: Db, email: string): Promise<number> {
  const { count, error } = await db
    .from("chase_sheet_quotes")
    .select("id", { count: "exact", head: true })
    .eq("account_email", email)
    .eq("status", "open");
  if (error) fail("countOpenQuotes", error);
  return count ?? 0;
}

export type NewQuote = {
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  job: string;
  amountCents: number;
  sentOn: string;
  urgency: Urgency;
  notes: string;
  nextOn: string | null;
};

export async function insertQuote(db: Db, email: string, input: NewQuote): Promise<Quote> {
  const { data, error } = await db
    .from("chase_sheet_quotes")
    .insert({
      account_email: email,
      customer_name: input.customerName,
      customer_phone: input.customerPhone,
      customer_email: input.customerEmail,
      job: input.job,
      amount_cents: input.amountCents,
      sent_on: input.sentOn,
      urgency: input.urgency,
      notes: input.notes,
      status: "open",
      done: 0,
      next_on: input.nextOn,
    })
    .select("*")
    .single();
  if (error) fail("insertQuote", error);
  return parseQuote(data);
}

export type QuotePatch = Partial<{
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  job: string;
  amountCents: number;
  sentOn: string;
  urgency: Urgency;
  status: Quote["status"];
  done: number;
  nextOn: string | null;
  lastTouchOn: string | null;
  notes: string;
  wonOn: string | null;
  lostOn: string | null;
  lostReason: string;
}>;

const QUOTE_COLUMNS: Record<keyof QuotePatch, string> = {
  customerName: "customer_name",
  customerPhone: "customer_phone",
  customerEmail: "customer_email",
  job: "job",
  amountCents: "amount_cents",
  sentOn: "sent_on",
  urgency: "urgency",
  status: "status",
  done: "done",
  nextOn: "next_on",
  lastTouchOn: "last_touch_on",
  notes: "notes",
  wonOn: "won_on",
  lostOn: "lost_on",
  lostReason: "lost_reason",
};

export async function updateQuote(db: Db, email: string, id: string, patch: QuotePatch): Promise<Quote | null> {
  const row: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) continue;
    row[QUOTE_COLUMNS[key as keyof QuotePatch]] = value;
  }
  if (Object.keys(row).length === 0) return getQuote(db, email, id);
  const { data, error } = await db
    .from("chase_sheet_quotes")
    .update(row)
    .eq("account_email", email)
    .eq("id", id)
    .select("*")
    .maybeSingle();
  if (error) fail("updateQuote", error);
  return data ? parseQuote(data) : null;
}

export async function deleteQuote(db: Db, email: string, id: string): Promise<boolean> {
  const { data, error } = await db.from("chase_sheet_quotes").delete().eq("account_email", email).eq("id", id).select("id");
  if (error) fail("deleteQuote", error);
  return (data ?? []).length > 0;
}

/* ---------------------------------- touches -------------------------------- */

function parseTouch(row: Record<string, unknown>): Touch {
  return {
    id: str(row.id, 64),
    quoteId: str(row.quote_id, 64),
    step: Number(row.step) || 0,
    role: str(row.role, 20) as Touch["role"],
    channel: (str(row.channel, 10) || "text") as Touch["channel"],
    outcome: isTouchOutcome(row.outcome) ? row.outcome : "sent",
    note: str(row.note, 1000),
    at: typeof row.created_at === "string" ? row.created_at : "",
  };
}

export async function listTouches(db: Db, email: string): Promise<Touch[]> {
  const { data, error } = await db
    .from("chase_sheet_touches")
    .select("*")
    .eq("account_email", email)
    .order("created_at", { ascending: false })
    .limit(5000);
  if (error) fail("listTouches", error);
  return (data ?? []).map(parseTouch);
}

export async function insertTouch(db: Db, email: string, touch: Omit<Touch, "id" | "at">): Promise<Touch> {
  const { data, error } = await db
    .from("chase_sheet_touches")
    .insert({
      account_email: email,
      quote_id: touch.quoteId,
      step: touch.step,
      role: touch.role,
      channel: touch.channel,
      outcome: touch.outcome,
      note: touch.note,
    })
    .select("*")
    .single();
  if (error) fail("insertTouch", error);
  return parseTouch(data);
}
