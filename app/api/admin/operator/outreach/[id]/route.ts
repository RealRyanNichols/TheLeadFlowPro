import { NextResponse } from "next/server";
import { OperatorAuthError, requireOperatorAdmin } from "@/lib/operatoros/auth";
import {
  outreachReadiness,
  type OutreachChannel,
  type OutreachProspectReadiness,
  type OutreachWorkspaceReadiness,
} from "@/lib/operatoros/outreach-readiness";

const CHANNELS = new Set(["email", "dm", "phone", "text", "email_or_dm", "internal"]);
const FINAL_ACTION_STATUSES = new Set(["sent", "skipped", "responded", "cancelled"]);
const LATER_PROSPECT_STAGES = new Set(["responded", "qualified", "proposal", "won", "lost", "do_not_contact"]);

type Operation = "save" | "approve" | "mark_sent" | "skip" | "reopen";

type RequestBody = {
  operation?: unknown;
  messageDraft?: unknown;
  dueAt?: unknown;
  channel?: unknown;
  note?: unknown;
};

function parseDueAt(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function safeText(value: unknown, max: number) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > max) return null;
  return trimmed;
}

async function advanceProspect(
  supabase: Awaited<ReturnType<typeof requireOperatorAdmin>>["supabase"],
  prospectId: string,
  currentActionId: string,
  fallbackMessage: string,
) {
  const { data: nextAction } = await supabase
    .from("operator_outreach_actions")
    .select("id,due_at,action_type")
    .eq("prospect_id", prospectId)
    .neq("id", currentActionId)
    .in("status", ["queued", "approved"])
    .order("due_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  await supabase
    .from("operator_prospects")
    .update({
      next_action_at: nextAction?.due_at ?? null,
      next_action: nextAction
        ? `Review ${String(nextAction.action_type).replaceAll("_", " ")} draft.`
        : fallbackMessage,
      updated_at: new Date().toISOString(),
    })
    .eq("id", prospectId);
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { user, supabase } = await requireOperatorAdmin();
    const { id } = await context.params;
    const body = (await request.json()) as RequestBody;
    const operation = body.operation as Operation;

    if (!["save", "approve", "mark_sent", "skip", "reopen"].includes(operation)) {
      return NextResponse.json({ error: "Unsupported outreach operation" }, { status: 400 });
    }

    const { data: action, error: actionError } = await supabase
      .from("operator_outreach_actions")
      .select("id,workspace_id,prospect_id,channel,action_type,due_at,message_draft,status,human_approved")
      .eq("id", id)
      .single();
    if (actionError || !action) return NextResponse.json({ error: "Outreach action not found" }, { status: 404 });

    if (FINAL_ACTION_STATUSES.has(action.status) && operation !== "reopen") {
      return NextResponse.json({ error: "This outreach action is already closed" }, { status: 409 });
    }

    const nextMessage = body.messageDraft === undefined
      ? action.message_draft
      : safeText(body.messageDraft, 12000);
    if (!nextMessage) return NextResponse.json({ error: "A message draft is required" }, { status: 400 });

    const nextChannel = body.channel === undefined ? action.channel : String(body.channel);
    if (!CHANNELS.has(nextChannel)) return NextResponse.json({ error: "Unsupported outreach channel" }, { status: 400 });

    const nextDueAt = body.dueAt === undefined ? action.due_at : parseDueAt(body.dueAt);
    if (!nextDueAt) return NextResponse.json({ error: "A valid due time is required" }, { status: 400 });

    if ((operation === "approve" || operation === "mark_sent") && nextChannel !== "internal") {
      const [prospectResult, settingsResult] = await Promise.all([
        supabase
          .from("operator_prospects")
          .select("status,contact_name,contact_title,contact_email,contact_phone,contact_route,contact_source,contact_verified_at,compliance_review_required")
          .eq("id", action.prospect_id)
          .single(),
        supabase
          .from("operator_workspace_settings")
          .select("sender_name,sender_email,sender_phone,allowed_channels")
          .eq("workspace_id", action.workspace_id)
          .single(),
      ]);

      if (prospectResult.error || !prospectResult.data || settingsResult.error || !settingsResult.data) {
        return NextResponse.json(
          { error: "Outreach readiness could not be verified. Check the prospect and workspace settings." },
          { status: 409 },
        );
      }

      const readiness = outreachReadiness(
        prospectResult.data as OutreachProspectReadiness,
        settingsResult.data as OutreachWorkspaceReadiness,
        nextChannel as OutreachChannel,
      );
      if (!readiness.ready) {
        return NextResponse.json(
          { error: readiness.blockers[0], blockers: readiness.blockers },
          { status: 409 },
        );
      }
    }

    const note = typeof body.note === "string" ? body.note.trim().slice(0, 2000) : "";
    const now = new Date().toISOString();
    let eventType: string = operation;
    let update: Record<string, unknown> = {
      message_draft: nextMessage,
      channel: nextChannel,
      due_at: nextDueAt,
      updated_at: now,
    };

    if (operation === "save") {
      update = { ...update, status: "queued", human_approved: false };
      eventType = "edited";
    }

    if (operation === "approve") {
      update = { ...update, status: "approved", human_approved: true };
      eventType = "approved";
    }

    if (operation === "reopen") {
      update = { ...update, status: "queued", human_approved: false, sent_at: null };
      eventType = "reopened";
    }

    if (operation === "skip") {
      update = {
        ...update,
        status: "skipped",
        human_approved: false,
        notes: note || "Skipped by an admin from Prospect Command.",
      };
      eventType = "skipped";
    }

    if (operation === "mark_sent") {
      if (!action.human_approved || action.status !== "approved") {
        return NextResponse.json({ error: "Approve the draft before marking it sent" }, { status: 409 });
      }
      update = {
        ...update,
        status: "sent",
        sent_at: now,
        notes: note || "Marked sent by an admin. OperatorOS did not send the message.",
      };
      eventType = "sent";
    }

    const { error: updateError } = await supabase
      .from("operator_outreach_actions")
      .update(update)
      .eq("id", id);
    if (updateError) return NextResponse.json({ error: "Outreach action could not be updated" }, { status: 500 });

    if (operation === "mark_sent") {
      const { data: prospect } = await supabase
        .from("operator_prospects")
        .select("status,permission_state")
        .eq("id", action.prospect_id)
        .single();
      await supabase
        .from("operator_prospects")
        .update({
          status: prospect && LATER_PROSPECT_STAGES.has(prospect.status) ? prospect.status : "contacted",
          permission_state: prospect?.permission_state === "not_contacted" ? "requested" : prospect?.permission_state,
          last_contacted_at: now,
          last_outreach_channel: nextChannel,
          updated_at: now,
        })
        .eq("id", action.prospect_id);
      await advanceProspect(
        supabase,
        action.prospect_id,
        action.id,
        "Wait for a reply or create a new permission-first follow-up.",
      );
    } else if (operation === "skip") {
      await advanceProspect(supabase, action.prospect_id, action.id, "No remaining outreach draft is queued.");
    } else {
      await supabase
        .from("operator_prospects")
        .update({
          next_action_at: nextDueAt,
          next_action: `Review ${String(action.action_type).replaceAll("_", " ")} draft.`,
          updated_at: now,
        })
        .eq("id", action.prospect_id);
    }

    await supabase.from("operator_outreach_events").insert({
      workspace_id: action.workspace_id,
      prospect_id: action.prospect_id,
      action_id: action.id,
      event_type: eventType,
      detail_json: {
        channel: nextChannel,
        due_at: nextDueAt,
        previous_status: action.status,
        note: note || null,
        external_send_performed_by_operatoros: false,
      },
      created_by: user.id,
    });

    return NextResponse.json({ ok: true, status: update.status ?? action.status, eventType });
  } catch (error) {
    if (error instanceof OperatorAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Outreach action update failed" }, { status: 500 });
  }
}
