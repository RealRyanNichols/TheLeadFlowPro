import { NextResponse } from "next/server";
import { OperatorAuthError, requireOperatorAdmin } from "@/lib/operatoros/auth";

const ALLOWED_CHANNELS = new Set(["email", "dm", "phone", "text"]);

type RequestBody = {
  senderName?: unknown;
  senderEmail?: unknown;
  senderPhone?: unknown;
  bookingUrl?: unknown;
  outboundOwner?: unknown;
  closerOwner?: unknown;
  defaultMarket?: unknown;
  dailyNewContactLimit?: unknown;
  dailyFollowupLimit?: unknown;
  replyTargetMinutes?: unknown;
  businessTimezone?: unknown;
  allowedChannels?: unknown;
  operatorNotes?: unknown;
};

function text(value: unknown, max: number, fallback = "") {
  if (typeof value !== "string") return fallback;
  return value.trim().slice(0, max);
}

function optionalUrl(value: unknown) {
  const raw = text(value, 2000);
  if (!raw) return null;
  try {
    const parsed = new URL(raw);
    return ["http:", "https:"].includes(parsed.protocol) ? parsed.toString() : undefined;
  } catch {
    return undefined;
  }
}

function integer(value: unknown, min: number, max: number, fallback: number) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) return fallback;
  return parsed;
}

export async function PATCH(request: Request) {
  try {
    const { supabase } = await requireOperatorAdmin();
    const body = (await request.json()) as RequestBody;

    const { data: workspace, error: workspaceError } = await supabase
      .from("operator_workspaces")
      .select("id")
      .eq("slug", "the-leadflow-pro")
      .single();
    if (workspaceError || !workspace) return NextResponse.json({ error: "OperatorOS workspace unavailable" }, { status: 500 });

    const senderName = text(body.senderName, 200);
    const senderEmail = text(body.senderEmail, 320).toLowerCase();
    if (senderEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(senderEmail)) {
      return NextResponse.json({ error: "Enter a valid sender email" }, { status: 400 });
    }
    const bookingUrl = optionalUrl(body.bookingUrl);
    if (bookingUrl === undefined) return NextResponse.json({ error: "Enter a valid booking URL" }, { status: 400 });

    const allowedChannels = Array.isArray(body.allowedChannels)
      ? body.allowedChannels.map(String).filter((channel) => ALLOWED_CHANNELS.has(channel))
      : [];
    if (!allowedChannels.length) {
      return NextResponse.json({ error: "Select at least one permitted outreach channel" }, { status: 400 });
    }

    const update = {
      workspace_id: workspace.id,
      sender_name: senderName || null,
      sender_email: senderEmail || null,
      sender_phone: text(body.senderPhone, 80) || null,
      booking_url: bookingUrl,
      outbound_owner: text(body.outboundOwner, 120, "Pat") || "Pat",
      closer_owner: text(body.closerOwner, 120, "Ryan") || "Ryan",
      default_market: text(body.defaultMarket, 200, "Longview, TX") || "Longview, TX",
      daily_new_contact_limit: integer(body.dailyNewContactLimit, 0, 500, 50),
      daily_followup_limit: integer(body.dailyFollowupLimit, 0, 500, 20),
      reply_target_minutes: integer(body.replyTargetMinutes, 1, 10080, 15),
      business_timezone: text(body.businessTimezone, 100, "America/Chicago") || "America/Chicago",
      allowed_channels: allowedChannels,
      approval_mode: "human_required",
      content_publish_mode: "draft_only",
      operator_notes: text(body.operatorNotes, 5000) || null,
      updated_at: new Date().toISOString(),
    };

    const { error: saveError } = await supabase
      .from("operator_workspace_settings")
      .upsert(update, { onConflict: "workspace_id" });
    if (saveError) return NextResponse.json({ error: "Operator setup could not be saved" }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof OperatorAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Operator setup update failed" }, { status: 500 });
  }
}
