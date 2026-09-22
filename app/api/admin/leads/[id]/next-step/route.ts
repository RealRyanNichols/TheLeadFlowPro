import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { leadMessageAuthor } from "@/lib/leadMessageAuthor";
import {
  countPriorAttempts,
  parseNextStepRequest,
  planCallOutcome,
  refMarker,
  type CallPlan,
  type PlannerLead,
} from "@/lib/callCloser";
import { formatCentral } from "@/lib/businessTime";

// Saves what happened on a call: the Call Closer's one write path.
//
// The call card (and the proposal page's "Proposal sent" button) post the
// outcome here. lib/callCloser.ts decides what that outcome means; this route
// only checks who is asking, reads the lead, and writes the plan. The panel
// ran the same planner on the browser clock to draw "When you save", so what
// Ryan read is what lands.
//
// Order matters, and each step says why:
// 1. Signed in, then admin or sales. Nothing about the lead is read before
//    that, so a stranger learns nothing, not even whether an id exists.
// 2. The id and the body are checked before any lead read.
// 3. The lead is read with the signed-in user's own client, so row level
//    security still decides what they can see. A deleted lead is a 404.
// 4. A retried save carries the same idempotency key. If a timeline entry
//    already ends with that key's Ref marker, the call was saved and nothing
//    is written again.
// 5. Writes go lead, note, task, timeline. The lead first because the next
//    follow-up time is what brings the lead back to the call sheet. The note
//    second because it is the record of the call. If either fails the save
//    is retryable, and `landed` says what already went through. The task,
//    the proposal tasks, and the timeline entry are extras: a failure there
//    comes back as a warning on a 200, not a retry. The timeline entry goes
//    last so its Ref marker only exists once everything before it landed.
//
// The note's author is the signed-in profile's name. Any author or sender in
// the request body is ignored.
//
// Nothing here contacts the lead. It only writes to the CRM tables, never to
// the call log the public scoreboard counts, and it never uses the service
// key.

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Exactly the PlannerLead columns. */
const LEAD_COLUMNS =
  "id, full_name, business_name, status, interest, phone, email, sms_consent, sms_unsubscribed_at, next_follow_up_at, diagnostic";

/** How many recent call entries countPriorAttempts reads. */
const PRIOR_CALL_ENTRIES = 20;

/** A second tap within this window with the same note text does not add the note twice. */
const SAME_NOTE_WINDOW_MS = 15 * 60_000;

type Landed = "lead" | "note" | "task" | "proposal_tasks" | "activity";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function textOrNull(v: unknown): string | null {
  return typeof v === "string" ? v : null;
}

/** The row as the planner expects it, whatever the database sent back. */
function plannerLead(row: Record<string, unknown>, id: string): PlannerLead {
  return {
    id,
    full_name: textOrNull(row.full_name) ?? "",
    business_name: textOrNull(row.business_name),
    status: textOrNull(row.status) ?? "",
    interest: textOrNull(row.interest),
    phone: textOrNull(row.phone),
    email: textOrNull(row.email),
    sms_consent: typeof row.sms_consent === "boolean" ? row.sms_consent : null,
    sms_unsubscribed_at: textOrNull(row.sms_unsubscribed_at),
    next_follow_up_at: textOrNull(row.next_follow_up_at),
    diagnostic: isRecord(row.diagnostic) ? row.diagnostic : null,
  };
}

function followUpLabel(iso: string | null): string | null {
  if (!iso) return null;
  const at = new Date(iso);
  return Number.isNaN(at.getTime()) ? null : formatCentral(at);
}

function fail(status: number, error: string, extra: Record<string, unknown> = {}) {
  return NextResponse.json({ ok: false, error, ...extra }, { status });
}

/** Nothing was written: the whole save can be sent again with the same key. */
function connectionProblem(landed: Landed[]) {
  return fail(500, "This is a connection problem, not a problem with the lead. Try saving again.", {
    retryable: true,
    landed,
  });
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const landed: Landed[] = [];
  try {
    const supabase = await createClient();

    // Admin or sales only, checked before anything about the lead is read.
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return fail(401, "Sign in to log a call.");
    const { data: profile } = await supabase.from("profiles").select("role, full_name").eq("id", user.id).single();
    if (profile?.role !== "admin" && profile?.role !== "sales") {
      return fail(403, "Sales access required.");
    }
    const author = leadMessageAuthor(profile.full_name, user.email);
    // Signs the pay-link draft. With no profile name the draft falls back to
    // the owner's first name rather than an email address or "The".
    const signer = author.auditName === author.displayName ? author.displayName : "";

    const { id } = await context.params;
    if (typeof id !== "string" || !UUID_RE.test(id)) return fail(400, "That lead link is not valid.");

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return fail(400, "Send the call outcome as JSON.");
    }
    const parsed = parseNextStepRequest(body);
    if (!parsed.ok) return fail(400, parsed.error);
    const step = parsed.request;

    const leadRead = await supabase
      .from("leads")
      .select(LEAD_COLUMNS)
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle();
    if (leadRead.error) return connectionProblem(landed);
    if (!isRecord(leadRead.data)) return fail(404, "Lead not found. It may have been deleted.");
    const lead = plannerLead(leadRead.data, id);
    const now = new Date();

    // A retry of a save that already landed. The key passed IDEMPOTENCY_KEY_RE,
    // so it holds no LIKE wildcards. The marker always ends the detail, so the
    // pattern is anchored at the end: one key can never match a longer one.
    const marker = refMarker(step.idempotencyKey);
    const prior = await supabase
      .from("lead_activity")
      .select("id")
      .eq("lead_id", id)
      .ilike("detail", `%${marker}`)
      .limit(1);
    if (prior.error) return connectionProblem(landed);
    if (Array.isArray(prior.data) && prior.data.length > 0) {
      // Replanned only to hand the pay links or proposal link back to the
      // panel. Nothing is written, and a closed lead simply gets none.
      const replay = planCallOutcome({ lead, request: step, actorName: signer, now, priorAttempts: 0 });
      const shown: Pick<CallPlan, "payDoors" | "payMessage" | "proposalHref"> = replay.ok
        ? replay
        : { payDoors: [], payMessage: null, proposalHref: null };
      return NextResponse.json({
        ok: true,
        duplicate: true,
        landed: [],
        warnings: [],
        retryable: false,
        summary: "This call was already saved. Nothing was saved twice.",
        nextFollowUpAt: lead.next_follow_up_at,
        nextFollowUpLabel: followUpLabel(lead.next_follow_up_at),
        preview: [],
        payDoors: shown.payDoors,
        payMessage: shown.payMessage,
        proposalHref: shown.proposalHref,
      });
    }

    const history = await supabase
      .from("lead_activity")
      .select("detail")
      .eq("lead_id", id)
      .eq("kind", "call")
      .order("created_at", { ascending: false })
      .limit(PRIOR_CALL_ENTRIES);
    if (history.error) return connectionProblem(landed);
    const details = (Array.isArray(history.data) ? history.data : [])
      .map((row: unknown) => (isRecord(row) ? row.detail : null))
      .filter((d: unknown): d is string => typeof d === "string");

    const plan = planCallOutcome({
      lead,
      request: step,
      actorName: signer,
      now,
      priorAttempts: countPriorAttempts(details),
    });
    if (!plan.ok) return fail(plan.status, plan.error);

    // 1. The lead: stage, last contacted, next follow-up, lost reason.
    if (Object.keys(plan.leadPatch).length > 0) {
      const updated = await supabase
        .from("leads")
        .update(plan.leadPatch)
        .eq("id", id)
        .is("deleted_at", null)
        .select("id");
      // Row level security turns a refused update into zero rows, not an error.
      if (updated.error || !Array.isArray(updated.data) || updated.data.length === 0) {
        return fail(500, "The lead did not update, so nothing was saved. Try saving again.", {
          retryable: true,
          landed,
        });
      }
      landed.push("lead");
    }

    // 2. The note. A double tap or a retry within a few minutes with the same
    // text does not add it twice. If the check itself fails, the note is
    // written anyway: a repeated note is better than a missing one.
    const since = new Date(now.getTime() - SAME_NOTE_WINDOW_MS).toISOString();
    const recentNotes = await supabase
      .from("lead_notes")
      .select("body")
      .eq("lead_id", id)
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(20);
    const alreadyNoted =
      !recentNotes.error &&
      Array.isArray(recentNotes.data) &&
      recentNotes.data.some((row: unknown) => isRecord(row) && row.body === plan.noteBody);
    if (!alreadyNoted) {
      const note = await supabase
        .from("lead_notes")
        .insert({ lead_id: id, body: plan.noteBody, author: author.auditName });
      if (note.error) {
        return fail(500, "The lead updated but the note did not save. Try saving again to finish.", {
          retryable: true,
          landed,
        });
      }
      landed.push("note");
    }

    const warnings: string[] = [];

    // 3. The task (a sit-down or a proposal to write).
    if (plan.task) {
      const task = await supabase.from("lead_tasks").insert({
        lead_id: id,
        title: plan.task.title,
        task_type: plan.task.task_type,
        due_date: plan.task.due_date,
        priority: plan.task.priority,
      });
      if (task.error) warnings.push(`The task "${plan.task.title}" did not save. Add it on the lead page.`);
      else landed.push("task");
    }

    // 4. A proposal went out, so the open "write the proposal" tasks are done.
    if (plan.completeProposalTasks) {
      const done = await supabase
        .from("lead_tasks")
        .update({ completed_at: now.toISOString() })
        .eq("lead_id", id)
        .eq("task_type", "proposal")
        .is("completed_at", null);
      if (done.error) warnings.push("The open proposal tasks were not marked done. Check them off on the lead page.");
      else landed.push("proposal_tasks");
    }

    // 5. The timeline entry, last. Its Ref marker is what makes a retry safe.
    const activity = await supabase
      .from("lead_activity")
      .insert({ lead_id: id, kind: plan.activity.kind, detail: plan.activity.detail });
    if (activity.error) warnings.push("The call did not reach the timeline. The note and the next follow-up are saved.");
    else landed.push("activity");

    return NextResponse.json({
      ok: true,
      duplicate: false,
      landed,
      warnings,
      retryable: false,
      summary: plan.summary,
      nextFollowUpAt: plan.nextFollowUpAt,
      nextFollowUpLabel: followUpLabel(plan.nextFollowUpAt),
      preview: plan.preview,
      payDoors: plan.payDoors,
      payMessage: plan.payMessage,
      proposalHref: plan.proposalHref,
    });
  } catch {
    // Something threw part way. `landed` says what went through. The lead
    // update and the note are safe to repeat with the same key (the note is
    // not added twice); a task that already landed would be, so once one has,
    // the answer is no longer "try again".
    const retryable = !landed.includes("task");
    return fail(
      500,
      retryable
        ? "Something went wrong while saving the call. Try saving again."
        : "Something went wrong after the call was saved. Check the lead page before saving again.",
      { retryable, landed },
    );
  }
}
