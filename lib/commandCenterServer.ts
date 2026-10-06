import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  touchesFromRows,
  type CallSheetCallRow,
  type CallSheetMessageRow,
  type CallSheetNoteRow,
  type CallSheetTouch,
} from "@/lib/callSheet";
import { centralDate, wallClockToInstant } from "@/lib/businessTime";
import {
  moneyBoard,
  promisesDue,
  proposalsOnTable,
  windowStart,
  type BoardLead,
  type BoardPurchase,
  type BoardWindow,
  type MoneyBoard,
  type Promise_,
  type ProposalRow,
} from "@/lib/commandCenter";

// Reads for the command center's money board. The page passes the signed-in
// person's client, so row level security decides what they see (an admin
// sees everything; a sales login sees the leads, calls and texts its role is
// granted). Strictly read-only; nothing here contacts anyone.
//
// Two lead reads, like the call sheet: every lead created in the last 28 days
// (both windows come from the same rows), plus every open lead older than
// that, so a proposal from six weeks ago and a promise made last month still
// count. History (notes, calls, texts) is read for those leads only.
//
// Money in is the verified cash ledger (operator_verified_cash_entries):
// Stripe checkouts, paid Stripe invoices, and checks, cash, ACH or wires
// recorded by hand on /admin/operator/cash. The Sep 27 recording ("the
// dashboard shows $0 collected in September, but that's bullshit") was a
// board that read Stripe alone. The view answers admins only and returns no
// rows, not an error, to any other role, so the caller says whether this
// login can read it; a login that cannot gets "payments" in `unavailable`.

/** Most window leads read in one go. */
export const BOARD_LEAD_LIMIT = 600;
/** Most older open leads read. */
export const BOARD_OPEN_LIMIT = 300;
/** PostgREST's default page; a history read this full may be cut short. */
export const BOARD_ROW_CAP = 1000;

const LEAD_COLUMNS =
  "id, created_at, full_name, business_name, email, phone, interest, status, source, utm_source, best_contact_method, sms_consent, sms_unsubscribed_at, is_test, next_follow_up_at, priority, expected_value_cents, last_contacted_at, owner";
const CALL_COLUMNS = "lead_id, started_at, direction, outcome, scope_status";
const MESSAGE_COLUMNS = "lead_id, direction, channel, body, created_at, delivered";
const NOTE_COLUMNS = "lead_id, created_at, body, author";

export type BoardLoad =
  | {
      ok: true;
      board: MoneyBoard;
      promises: Promise_[];
      proposals: ProposalRow[];
      leads: BoardLead[];
      touches: CallSheetTouch[];
      /** Money that landed in the last 28 days (the verified cash ledger), so the page can count a different window. */
      purchases: BoardPurchase[];
      /** The raw call and text rows behind the touches, for the pulse (when each lane last moved). */
      calls: CallSheetCallRow[];
      messages: CallSheetMessageRow[];
      /** Meta leads created in the board's window, for cost per lead on our own records. */
      crmMetaLeads: number;
      /** Some history did not load in full (a read hit its row cap). */
      partial: boolean;
      /** Which optional reads this login could not make (a role without that grant). */
      unavailable: string[];
    }
  | { ok: false; error: string };

type NoteRow = CallSheetNoteRow & { author?: string | null };

/** A row of the verified cash ledger view. */
export type CashLedgerRow = {
  source_type: string;
  source_id: string;
  payer_label: string | null;
  description: string | null;
  amount_cents: number | null;
  received_at: string;
};

export const CASH_LEDGER_COLUMNS = "source_type, source_id, payer_label, description, amount_cents, received_at";

/** The ledger's rows in the board's purchase shape: every row on it is money that landed. */
export function purchasesFromLedger(rows: readonly CashLedgerRow[]): BoardPurchase[] {
  return rows
    .filter((row) => row.source_id && row.received_at && Number(row.amount_cents) > 0)
    .map((row) => ({ id: row.source_id, kind: row.source_type, amount_cents: Number(row.amount_cents), status: "paid", created_at: row.received_at }));
}

export type BoardOptions = {
  /** Whether this login is an admin, the only role the cash ledger answers. */
  moneyReadable: boolean;
};

export async function loadMoneyBoard(supabase: SupabaseClient, now: Date, days: BoardWindow, options: BoardOptions = { moneyReadable: true }): Promise<BoardLoad> {
  const since28 = windowStart(now, 28).toISOString();
  const [windowResult, openResult] = await Promise.all([
    supabase
      .from("leads")
      .select(LEAD_COLUMNS)
      .is("deleted_at", null)
      .eq("is_test", false)
      .gte("created_at", since28)
      .order("created_at", { ascending: false })
      .limit(BOARD_LEAD_LIMIT),
    supabase
      .from("leads")
      .select(LEAD_COLUMNS)
      .is("deleted_at", null)
      .eq("is_test", false)
      .lt("created_at", since28)
      .not("status", "in", "(won,lost)")
      .order("created_at", { ascending: false })
      .limit(BOARD_OPEN_LIMIT),
  ]);
  if (windowResult.error) return { ok: false, error: windowResult.error.message };
  if (openResult.error) return { ok: false, error: openResult.error.message };

  // One row per lead, whichever read returned it first.
  const byId = new Map<string, BoardLead>();
  for (const lead of [...((windowResult.data ?? []) as BoardLead[]), ...((openResult.data ?? []) as BoardLead[])]) {
    if (lead?.id && !byId.has(lead.id)) byId.set(lead.id, lead);
  }
  const leads = [...byId.values()];
  const ids = leads.map((lead) => lead.id);
  const unavailable: string[] = [];

  let notes: NoteRow[] = [];
  let calls: CallSheetCallRow[] = [];
  let messages: CallSheetMessageRow[] = [];
  let purchases: BoardPurchase[] = [];
  let partial = false;

  if (ids.length > 0) {
    // Newest first, so a capped read keeps the touches that decide this week.
    const [noteResult, callResult, messageResult] = await Promise.all([
      supabase.from("lead_notes").select(NOTE_COLUMNS).in("lead_id", ids).order("created_at", { ascending: false }),
      supabase.from("lead_calls").select(CALL_COLUMNS).in("lead_id", ids).order("started_at", { ascending: false }),
      supabase.from("lead_messages").select(MESSAGE_COLUMNS).in("lead_id", ids).order("created_at", { ascending: false }),
    ]);
    // A role without a grant on a history table gets an empty read or an
    // error; either way the board says that lane is not counted, never zero.
    if (noteResult.error) unavailable.push("notes");
    else notes = (noteResult.data ?? []) as NoteRow[];
    if (callResult.error) unavailable.push("calls");
    else calls = (callResult.data ?? []) as CallSheetCallRow[];
    if (messageResult.error) unavailable.push("texts");
    else messages = (messageResult.data ?? []) as CallSheetMessageRow[];
    partial = [notes, calls, messages].some((rows) => rows.length >= BOARD_ROW_CAP);
  }

  if (options.moneyReadable) {
    const cashResult = await supabase
      .from("operator_verified_cash_entries")
      .select(CASH_LEDGER_COLUMNS)
      .gte("received_at", since28)
      .order("received_at", { ascending: false })
      .limit(500);
    if (cashResult.error) unavailable.push("payments");
    else purchases = purchasesFromLedger((cashResult.data ?? []) as CashLedgerRow[]);
  } else {
    unavailable.push("payments");
  }

  const touches = touchesFromRows({ notes, calls, messages });
  const board = moneyBoard({
    leads,
    touches,
    purchases,
    notes: notes.map((note) => ({ author: note.author ?? null, created_at: note.created_at })),
    calls,
    now,
    days,
  });
  const endOfToday = wallClockToInstant(centralDate(now), "23:59");
  const sinceWindow = windowStart(now, days).getTime();
  const crmMetaLeads = leads.filter((lead) => {
    const at = Date.parse(lead.created_at);
    if (!Number.isFinite(at) || at < sinceWindow) return false;
    const source = String(lead.source ?? "").toLowerCase();
    return ["meta_lead_ad", "facebook-lead-ad", "facebook_lead_ad", "facebook", "meta"].includes(source);
  }).length;

  return {
    ok: true,
    board,
    promises: promisesDue(leads, touches, now, endOfToday),
    proposals: proposalsOnTable(leads, touches, now),
    leads,
    touches,
    purchases,
    calls,
    messages,
    crmMetaLeads,
    partial,
    unavailable,
  };
}

export type ClientWorkspaceRow = { id: string; name: string; slug: string | null; plan: string | null };
export type ClientLeadRow = { workspace_id: string; created_at: string };

/**
 * Client businesses on the plugin (HQ workspaces) and their leads over the
 * last 28 days. HQ tables are member-read under row level security, so the
 * page passes the service client here only after it has verified the admin.
 */
export async function loadClientWorkspaces(
  db: SupabaseClient,
  now: Date,
): Promise<{ ok: true; workspaces: ClientWorkspaceRow[]; leads: ClientLeadRow[] } | { ok: false; error: string }> {
  const since28 = windowStart(now, 28).toISOString();
  const workspaceResult = await db
    .from("hq_workspaces")
    .select("id, name, slug, plan")
    .in("plan", ["trial", "active", "past_due"])
    .order("name", { ascending: true })
    .limit(200);
  if (workspaceResult.error) return { ok: false, error: workspaceResult.error.message };
  const workspaces = (workspaceResult.data ?? []) as ClientWorkspaceRow[];
  if (workspaces.length === 0) return { ok: true, workspaces, leads: [] };
  const leadResult = await db
    .from("hq_leads")
    .select("workspace_id, created_at")
    .in(
      "workspace_id",
      workspaces.map((w) => w.id),
    )
    .gte("created_at", since28)
    .limit(5000);
  if (leadResult.error) return { ok: false, error: leadResult.error.message };
  return { ok: true, workspaces, leads: (leadResult.data ?? []) as ClientLeadRow[] };
}
