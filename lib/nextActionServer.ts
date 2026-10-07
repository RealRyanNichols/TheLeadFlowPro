import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { canText, isHumanOutboundText } from "@/lib/callSheet";
import { isContractorSeriesLead } from "@/lib/contractorSeries";
import { contractorFollowUp } from "@/lib/metaLeadAnswers";
import {
  buildNextActions,
  leadPace,
  touchesFromHistory,
  type EmailEvent,
  type HistoryActivityRow,
  type HistoryCallRow,
  type HistoryMessageRow,
  type HistoryNoteRow,
  type NextActionBoard,
  type NextActionEmail,
  type NextActionLead,
  type NextActionTouch,
} from "@/lib/nextAction";
import { scorecard, type AdRow, type EmailTotals, type ScoreLead, type Scorecard } from "@/lib/growthSignals";

// Reads for the Next actions page. The page passes the signed-in person's own
// client, so row level security decides what an admin or the sales desk can
// see. Strictly read-only: nothing here writes a lead, sends a message or
// touches an ad.
//
// One lead read (the last LOOKBACK_DAYS, open or closed, newest first), then
// the history for those leads. A history read that comes back full is marked
// partial instead of quietly undercounting; a history read that fails names
// itself in `unavailable`, and the counts it feeds say "not read", never 0.

/** How far back a lead can be and still be on the board. Past the 180-day email series, with room. */
export const LOOKBACK_DAYS = 200;
/** Most leads read. The history reads filter on these ids, so this also bounds the request size. */
export const LEAD_LIMIT = 400;
/** PostgREST returns at most this many rows per request by default. */
const PAGE = 1000;
/** Most pages read for one history table. */
const MAX_PAGES = 4;

const LEAD_COLUMNS =
  "id, created_at, full_name, business_name, email, phone, status, priority, source, utm_campaign, diagnostic, sms_consent, sms_unsubscribed_at, marketing_email_consent, email_unsubscribed_at, is_test, next_follow_up_at, expected_value_cents";

type LeadRow = {
  id: string;
  created_at: string;
  full_name: string | null;
  business_name: string | null;
  email: string | null;
  phone: string | null;
  status: string | null;
  priority: string | null;
  source: string | null;
  utm_campaign: string | null;
  diagnostic: unknown;
  sms_consent: boolean | null;
  sms_unsubscribed_at: string | null;
  marketing_email_consent: boolean | null;
  email_unsubscribed_at: string | null;
  is_test: boolean | null;
  next_follow_up_at: string | null;
  expected_value_cents: number | null;
};

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

/** An address a person could actually receive mail at. The intake routes fill in placeholders when a form has none. */
export function isRealEmail(email: string | null | undefined): boolean {
  const value = (email ?? "").trim().toLowerCase();
  return value.includes("@") && !value.includes("@no-email.") && !value.endsWith(".invalid");
}

/** One CRM row, as the engine reads it. Pure, so the mapping is tested rather than trusted. */
export function toNextActionLead(row: LeadRow): NextActionLead {
  const diagnostic = record(row.diagnostic);
  const fields = record(diagnostic?.fields);
  const answers: [string, string][] = fields ? Object.entries(fields).filter((entry): entry is [string, string] => typeof entry[1] === "string") : [];
  const followUp = answers.length ? contractorFollowUp(answers) : null;
  const service = fields && typeof fields.primary_service === "string" ? fields.primary_service : null;
  const adId = diagnostic && typeof diagnostic.ad_id === "string" && diagnostic.ad_id.trim() ? diagnostic.ad_id.trim() : null;
  return {
    id: row.id,
    created_at: row.created_at,
    full_name: row.full_name ?? "",
    business_name: row.business_name,
    phone: row.phone,
    email: row.email,
    status: row.status ?? "new",
    priority: row.priority,
    source: row.source,
    campaign: row.utm_campaign,
    group: followUp?.group ?? null,
    service,
    ad_id: adId,
    series: isContractorSeriesLead({ source: row.source, diagnostic: row.diagnostic, marketing_email_consent: row.marketing_email_consent }) ? "contractor_owner" : null,
    can_text: canText({ phone: row.phone, sms_consent: row.sms_consent, sms_unsubscribed_at: row.sms_unsubscribed_at }),
    can_email: isRealEmail(row.email) && !row.email_unsubscribed_at,
    next_follow_up_at: row.next_follow_up_at,
    is_test: row.is_test,
    expected_value_cents: row.expected_value_cents,
  };
}

/** What the Resend webhook wrote on the lead timeline, as one of three events. Null for anything else. */
export function emailEventKind(detail: string): EmailEvent["kind"] | null {
  if (detail.startsWith("Opened ")) return "opened";
  if (detail.startsWith("Clicked ")) return "clicked";
  if (/^Email bounced\b/.test(detail)) return "bounced";
  return null;
}

type Page<T> = { data: T[] | null; error: { message: string } | null };

/** Read every page of a history query, up to MAX_PAGES. `capped` is true when the last page came back full. */
async function readAll<T>(page: (from: number, to: number) => PromiseLike<Page<T>>): Promise<{ rows: T[]; error: string | null; capped: boolean }> {
  const rows: T[] = [];
  for (let i = 0; i < MAX_PAGES; i += 1) {
    const result = await page(i * PAGE, (i + 1) * PAGE - 1);
    if (result.error) return { rows, error: result.error.message, capped: false };
    const batch = result.data ?? [];
    rows.push(...batch);
    if (batch.length < PAGE) return { rows, error: null, capped: false };
  }
  return { rows, error: null, capped: true };
}

export type NextActionLoad =
  | {
      ok: true;
      board: NextActionBoard;
      score: Scorecard;
      /** Every lead read, open or closed, for the page's own counts. */
      leads: NextActionLead[];
      touches: NextActionTouch[];
      /** True when a history read hit its cap, so some counts may be short. */
      partial: boolean;
      /** True when the lead read came back full, so older leads may be missing. */
      leadsCapped: boolean;
      /** History the signed-in person could not read. Counts built on it are left out, not shown as zero. */
      unavailable: string[];
    }
  | { ok: false; error: string };

export type NextActionOptions = {
  /** The scorecard window, in days. */
  days: number;
  /** One row per ad for the same window, or null when Meta was not read. */
  ads: readonly AdRow[] | null;
  /** Where a row sends the person to log the outcome. */
  hrefFor: (leadId: string) => string;
};

export async function loadNextActions(supabase: SupabaseClient, now: Date, options: NextActionOptions): Promise<NextActionLoad> {
  const since = new Date(now.getTime() - LOOKBACK_DAYS * 86_400_000).toISOString();
  const leadsResult = await supabase
    .from("leads")
    .select(LEAD_COLUMNS)
    .is("deleted_at", null)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(LEAD_LIMIT);
  if (leadsResult.error) return { ok: false, error: leadsResult.error.message };
  const leadRows = (leadsResult.data ?? []) as LeadRow[];
  const leads = leadRows.map(toNextActionLead);
  const ids = leads.map((l) => l.id);
  const windowStartMs = now.getTime() - options.days * 86_400_000;
  // Timestamps come back from the database with an offset, so they are compared as instants, never as text.
  const inScoreWindow = (value: string | null | undefined) => Date.parse(value ?? "") >= windowStartMs;

  const empty = { rows: [], error: null, capped: false };
  const [notes, calls, messages, activity, emails, welcomes] =
    ids.length === 0
      ? [empty, empty, empty, empty, empty, empty]
      : await Promise.all([
          readAll<HistoryNoteRow>((from, to) => supabase.from("lead_notes").select("lead_id, created_at, author").in("lead_id", ids).order("created_at", { ascending: false }).range(from, to)),
          readAll<HistoryCallRow>((from, to) =>
            supabase.from("lead_calls").select("lead_id, started_at, direction, outcome, duration_seconds, scope_status").in("lead_id", ids).order("started_at", { ascending: false }).range(from, to),
          ),
          readAll<HistoryMessageRow>((from, to) =>
            supabase.from("lead_messages").select("lead_id, direction, channel, body, created_at, delivered, author").in("lead_id", ids).order("created_at", { ascending: false }).range(from, to),
          ),
          readAll<HistoryActivityRow>((from, to) =>
            supabase.from("lead_activity").select("lead_id, kind, detail, created_at").in("lead_id", ids).in("kind", ["call", "sales", "email"]).order("created_at", { ascending: false }).range(from, to),
          ),
          readAll<{ lead_id: string; step: number; delivery_status: string | null; sent_at: string | null }>((from, to) =>
            supabase.from("lead_emails").select("lead_id, step, delivery_status, sent_at").in("lead_id", ids).order("sent_at", { ascending: false }).range(from, to),
          ),
          readAll<{ lead_id: string; notification_type: string; status: string }>((from, to) =>
            supabase.from("lead_email_notifications").select("lead_id, notification_type, status").in("lead_id", ids).eq("notification_type", "lead_welcome").eq("status", "sent").range(from, to),
          ),
        ]);

  // Notes, calls, messages and the call history decide who is owed what. Without them the board would lie.
  for (const [name, result] of [["notes", notes], ["calls", calls], ["messages", messages], ["call history", activity]] as const) {
    if (result.error) return { ok: false, error: `The ${name} could not be read: ${result.error}` };
  }
  // The email history only feeds counts. If it cannot be read, those counts are left out.
  const unavailable: string[] = [];
  if (emails.error) unavailable.push("email history");
  if (welcomes.error) unavailable.push("welcome emails");

  const touches = touchesFromHistory(
    {
      calls: calls.rows as HistoryCallRow[],
      messages: messages.rows as HistoryMessageRow[],
      notes: notes.rows as HistoryNoteRow[],
      activity: (activity.rows as HistoryActivityRow[]).filter((a) => a.kind !== "email"),
    },
    // The call sheet's own rule for the software's texts, so both pages agree.
    { isAutomatedText: (row) => !isHumanOutboundText(row.body ?? "") },
  );

  const emailEvents: EmailEvent[] = [];
  let opened = 0;
  let clicked = 0;
  let bounced = 0;
  for (const a of activity.rows as HistoryActivityRow[]) {
    if (a.kind !== "email" || typeof a.detail !== "string") continue;
    const kind = emailEventKind(a.detail);
    if (!kind) continue;
    emailEvents.push({ lead_id: a.lead_id, kind });
    if (inScoreWindow(a.created_at)) {
      if (kind === "opened") opened += 1;
      if (kind === "clicked") clicked += 1;
      if (kind === "bounced") bounced += 1;
    }
  }

  const emailRows = emails.error ? [] : (emails.rows as { lead_id: string; step: number; delivery_status: string | null; sent_at: string | null }[]);
  const sentEmails: NextActionEmail[] = emailRows.map((e) => ({ lead_id: e.lead_id, step: e.step, status: e.delivery_status }));
  const welcomed = welcomes.error ? null : new Set((welcomes.rows as { lead_id: string }[]).map((w) => w.lead_id));

  // An unread table is passed as null, so the board leaves the count out instead of printing a zero.
  const board = buildNextActions({ leads, touches, emails: emails.error ? null : sentEmails, emailEvents, welcomed, now, hrefFor: options.hrefFor });

  const inWindow = leads.filter((l) => !l.is_test && inScoreWindow(l.created_at));
  const scoreLeads: ScoreLead[] = inWindow.map((l) => ({
    id: l.id,
    created_at: l.created_at,
    status: l.status,
    group: l.group,
    source: l.source,
    ad_id: l.ad_id,
    expected_value_cents: l.expected_value_cents,
  }));
  const emailTotals: EmailTotals | null = emails.error
    ? null
    : {
        sent: emailRows.filter((e) => (e.delivery_status === null || e.delivery_status === "sent") && inScoreWindow(e.sent_at)).length,
        opened,
        clicked,
        bounced,
      };
  const score = scorecard({ days: options.days, now, leads: scoreLeads, pace: leadPace(inWindow, touches), board, ads: options.ads, email: emailTotals });

  return {
    ok: true,
    board,
    score,
    leads,
    touches,
    partial: [notes, calls, messages, activity, emails].some((r) => r.capped),
    leadsCapped: leadRows.length >= LEAD_LIMIT,
    unavailable,
  };
}
