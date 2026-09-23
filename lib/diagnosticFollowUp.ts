// The follow-up time a Business Growth Diagnostic puts on its lead.
//
// When a questionnaire is first submitted, the lead gets a review task and a
// follow-up time so the sales boards list it. The time is the one that task
// sets: 9:00 AM Central on its due day, which is the Central day of the
// submission (lib/taskFollowUp.ts taskFollowUpAt). So marking the review task
// done clears it and rescheduling the task moves it, like any other task.
//
// It is only a stamp, never a promise, so it goes on only when the field is
// empty: a call back or a sit-down a person already set (the Call Closer, a
// task, the Sales Desk) is never overwritten, and a later re-save of the
// answers never touches it. The call sheet ignores the stamp on a lead nobody
// has touched (lib/callSheet.ts callbackState), so the first call still
// happens.
//
// Server code only: the route hands in its own service client. The empty
// check runs in the database (.is("next_follow_up_at", null)), so a value
// written a moment earlier by another screen still wins.

import type { SupabaseClient } from "@supabase/supabase-js";
import { centralDate } from "@/lib/businessTime";
import { taskFollowUpAt } from "@/lib/taskFollowUp";

export type DiagnosticFollowUpStamp = "stamped" | "kept" | "failed";

/** The review task's due date: the Central calendar day the questionnaire was submitted. Null for a missing or unreadable time. */
export function diagnosticReviewDueDate(submittedAt: string | null | undefined): string | null {
  if (!submittedAt) return null;
  const at = new Date(submittedAt);
  return Number.isNaN(at.getTime()) ? null : centralDate(at);
}

export async function stampDiagnosticFollowUp(
  supabase: Pick<SupabaseClient, "from">,
  leadId: string,
  submittedAt: string | null,
): Promise<DiagnosticFollowUpStamp> {
  const due = diagnosticReviewDueDate(submittedAt);
  if (!leadId || !due) return "kept";
  const result = await supabase
    .from("leads")
    .update({ next_follow_up_at: taskFollowUpAt(due) })
    .eq("id", leadId)
    .is("next_follow_up_at", null)
    .select("id");
  if (result.error) return "failed";
  return Array.isArray(result.data) && result.data.length > 0 ? "stamped" : "kept";
}
