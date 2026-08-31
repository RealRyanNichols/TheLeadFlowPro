import { NextResponse } from "next/server";
import { OperatorAuthError, requireOperatorAdmin } from "@/lib/operatoros/auth";

const PRIORITIES = new Set(["A", "B", "C", "WARM"]);
const STATUSES = new Set([
  "research",
  "ready",
  "contacted",
  "responded",
  "qualified",
  "proposal",
  "won",
  "lost",
  "do_not_contact",
]);

type RequestBody = {
  contactName?: unknown;
  contactTitle?: unknown;
  contactEmail?: unknown;
  contactPhone?: unknown;
  contactSource?: unknown;
  contactRoute?: unknown;
  ownerName?: unknown;
  priority?: unknown;
  status?: unknown;
  verified?: unknown;
  doNotContactReason?: unknown;
};

function optionalText(value: unknown, max: number) {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, max);
}

function optionalEmail(value: unknown) {
  const email = optionalText(value, 320);
  if (!email) return null;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email.toLowerCase() : undefined;
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { user, supabase } = await requireOperatorAdmin();
    const { id } = await context.params;
    const body = (await request.json()) as RequestBody;

    const { data: prospect, error: prospectError } = await supabase
      .from("operator_prospects")
      .select("id,workspace_id,status")
      .eq("id", id)
      .single();
    if (prospectError || !prospect) return NextResponse.json({ error: "Prospect not found" }, { status: 404 });

    const contactEmail = optionalEmail(body.contactEmail);
    if (contactEmail === undefined) return NextResponse.json({ error: "Enter a valid contact email" }, { status: 400 });

    const priority = typeof body.priority === "string" ? body.priority : "C";
    const status = typeof body.status === "string" ? body.status : prospect.status;
    if (!PRIORITIES.has(priority)) return NextResponse.json({ error: "Unsupported prospect priority" }, { status: 400 });
    if (!STATUSES.has(status)) return NextResponse.json({ error: "Unsupported prospect status" }, { status: 400 });

    const now = new Date().toISOString();
    const contactName = optionalText(body.contactName, 200);
    const contactTitle = optionalText(body.contactTitle, 200);
    const contactPhone = optionalText(body.contactPhone, 80);
    const contactSource = optionalText(body.contactSource, 1000);
    const contactRoute = optionalText(body.contactRoute, 1000);
    const ownerName = optionalText(body.ownerName, 120) || "Pat";
    const doNotContactReason = optionalText(body.doNotContactReason, 2000);
    const hasContact = Boolean(contactEmail || contactPhone || contactName);
    const update: Record<string, unknown> = {
      contact_name: contactName,
      contact_title: contactTitle,
      contact_email: contactEmail,
      contact_phone: contactPhone,
      contact_source: contactSource,
      contact_route: contactRoute,
      contact_verified_at: body.verified === true && hasContact ? now : null,
      owner_name: ownerName,
      priority,
      status,
      do_not_contact_reason: status === "do_not_contact" ? doNotContactReason || "Marked do not contact by an admin." : null,
      updated_at: now,
    };
    if (status === "do_not_contact") {
      update.next_action_at = null;
      update.next_action = "No further outreach. Prospect is marked do not contact.";
    }

    const { error: updateError } = await supabase
      .from("operator_prospects")
      .update(update)
      .eq("id", id);
    if (updateError) return NextResponse.json({ error: "Prospect details could not be updated" }, { status: 500 });

    if (status === "do_not_contact") {
      await supabase
        .from("operator_outreach_actions")
        .update({ status: "cancelled", human_approved: false, updated_at: now, notes: "Cancelled because prospect was marked do not contact." })
        .eq("prospect_id", id)
        .in("status", ["queued", "approved"]);
    }

    await supabase.from("operator_outreach_events").insert({
      workspace_id: prospect.workspace_id,
      prospect_id: id,
      action_id: null,
      event_type: "prospect_updated",
      detail_json: {
        priority,
        status,
        contact_verified: body.verified === true && hasContact,
        has_email: Boolean(contactEmail),
        has_phone: Boolean(contactPhone),
        owner_name: ownerName,
      },
      created_by: user.id,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof OperatorAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Prospect update failed" }, { status: 500 });
  }
}
