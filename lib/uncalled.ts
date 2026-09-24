// The Uncalled list: every open lead that no person has ever called, texted,
// or written a note about. Oldest first, because the longest wait is the
// most embarrassing one.
//
// Why not leads.last_contacted_at: the Quo webhook runs touch_lead_contact()
// on every event on the line, including the texts the software itself sends,
// so the automatic first text stamps last_contacted_at and flips the lead to
// "contacted" within seconds. On 2026-09-22, 64 of 68 Meta leads had it set
// and 63 of them had never had an outbound call. A lead the software texted
// is still a lead nobody has called.
//
// So this reuses the call sheet's definition of a human touch
// (lib/callSheet.ts): a note, a call somebody had, or an outbound text a
// person typed. Software texts (the first text, the old text-backs, the
// inbound auto-reply) and missed inbound calls do not count. Pure: nothing
// here reads the database or contacts anyone.

import {
  CLOSED_STATUSES,
  canText,
  classifyCall,
  interestLabel,
  isHumanOutboundText,
  sourceLabel,
  type CallSheetLead,
  type CallSheetTouch,
} from "@/lib/callSheet";

/** The most leads the page reads in one go. */
export const UNCALLED_LEAD_LIMIT = 1000;

/** Meta and the Quo webhook store a made-up address when there is none; it cannot be emailed. */
export function isPlaceholderEmail(email: string | null | undefined): boolean {
  const value = String(email ?? "").trim().toLowerCase();
  return !value || value.includes("@no-email.") || value.endsWith("@unknown.invalid") || !value.includes("@");
}

export type UncalledTouchRows = {
  notes: { lead_id: string; created_at: string }[];
  calls: { lead_id: string | null; started_at: string; direction: string | null; outcome: string | null }[];
  messages: { lead_id: string; direction: string; body: string | null; created_at: string }[];
};

/** The call sheet's touch classification, over raw rows. */
export function touchesFromRows(rows: UncalledTouchRows): CallSheetTouch[] {
  const touches: CallSheetTouch[] = [];
  for (const n of rows.notes) touches.push({ lead_id: n.lead_id, at: n.created_at, kind: "note" });
  for (const c of rows.calls) {
    if (!c.lead_id) continue;
    touches.push({ lead_id: c.lead_id, at: c.started_at, kind: classifyCall(c.direction, c.outcome) });
  }
  for (const m of rows.messages) {
    if (m.direction === "in") touches.push({ lead_id: m.lead_id, at: m.created_at, kind: "message_in" });
    else if (isHumanOutboundText(String(m.body ?? ""))) touches.push({ lead_id: m.lead_id, at: m.created_at, kind: "message_out" });
  }
  return touches;
}

export type UncalledRow = {
  id: string;
  created_at: string;
  full_name: string;
  business_name: string | null;
  phone: string | null;
  /** Null when the only address on file is a placeholder. */
  email: string | null;
  status: string;
  sourceLabel: string;
  interestLabel: string;
  ageHours: number;
  /** Consent recorded and no STOP since. The page shows a text button only when true. */
  canText: boolean;
  /** The lead texted or called in and nobody has answered. */
  reachedOut: boolean;
  href: string;
};

export type UncalledList = {
  generatedAt: string;
  rows: UncalledRow[];
  /** Leads read but left off, with the reason. */
  excluded: { id: string; reason: string }[];
};

const HUMAN_TOUCH_KINDS: ReadonlySet<CallSheetTouch["kind"]> = new Set(["note", "call", "message_out"]);

export function buildUncalledList(leads: CallSheetLead[], touches: CallSheetTouch[], now: Date): UncalledList {
  const touched = new Set<string>();
  const reachedOut = new Set<string>();
  for (const t of touches) {
    if (HUMAN_TOUCH_KINDS.has(t.kind)) touched.add(t.lead_id);
    else reachedOut.add(t.lead_id);
  }

  const rows: UncalledRow[] = [];
  const excluded: UncalledList["excluded"] = [];
  for (const lead of leads) {
    if (lead.is_test) {
      excluded.push({ id: lead.id, reason: "test record" });
      continue;
    }
    if ((CLOSED_STATUSES as readonly string[]).includes(lead.status)) {
      excluded.push({ id: lead.id, reason: `status ${lead.status}` });
      continue;
    }
    const email = isPlaceholderEmail(lead.email) ? null : String(lead.email).trim();
    if (!lead.phone && !email) {
      excluded.push({ id: lead.id, reason: "no phone and no email" });
      continue;
    }
    if (touched.has(lead.id)) {
      excluded.push({ id: lead.id, reason: "a person has touched it" });
      continue;
    }
    const created = Date.parse(lead.created_at);
    if (!Number.isFinite(created)) {
      excluded.push({ id: lead.id, reason: "bad created_at" });
      continue;
    }
    rows.push({
      id: lead.id,
      created_at: lead.created_at,
      full_name: String(lead.full_name || "").trim() || "Unnamed lead",
      business_name: lead.business_name,
      phone: lead.phone,
      email,
      status: lead.status,
      sourceLabel: sourceLabel(lead),
      interestLabel: interestLabel(lead.interest),
      ageHours: Math.max(0, (now.getTime() - created) / 3_600_000),
      canText: canText(lead),
      reachedOut: reachedOut.has(lead.id),
      href: `/admin/sales/leads/${lead.id}`,
    });
  }

  // Oldest first: the longest wait goes to the top.
  rows.sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at));
  return { generatedAt: now.toISOString(), rows, excluded };
}
