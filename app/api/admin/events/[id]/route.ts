import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createWorkshopServiceClient } from "@/lib/eventCommerce";

async function requireAdmin() {
  const session = await createClient();
  const {
    data: { user },
  } = await session.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "Not signed in" }, { status: 401 }) };
  const { data: profile } = await session
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") {
    return { error: NextResponse.json({ error: "Admins only" }, { status: 403 }) };
  }
  return { service: createWorkshopServiceClient() };
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const access = await requireAdmin();
    if ("error" in access) return access.error;
    const { id } = await params;
    const { data, error } = await access.service.rpc("workshop_admin_get_event_details", {
      p_event_id: id,
    });
    if (error) {
      return NextResponse.json({ error: "Private event details could not be loaded." }, { status: 500 });
    }
    return NextResponse.json({ details: Array.isArray(data) ? data[0] ?? null : data ?? null });
  } catch {
    return NextResponse.json({ error: "Private event details are not configured." }, { status: 503 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const access = await requireAdmin();
    if ("error" in access) return access.error;
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const value = (key: string, max: number) =>
      typeof body[key] === "string" ? body[key].trim().slice(0, max) || null : null;
    const { data, error } = await access.service.rpc("workshop_admin_update_event_details", {
      p_event_id: id,
      p_exact_address: value("exact_address", 500) ?? "",
      p_arrival_notes: value("arrival_notes", 2000),
      p_recording_consent_text: value("recording_consent_text", 4000),
      p_cancellation_policy: value("cancellation_policy", 4000),
      p_seat_transfer_policy: value("seat_transfer_policy", 4000),
    });
    if (error) {
      const message = error.message.includes("terms_required")
        ? "Close ticket sales before removing required buyer policies."
        : "Private event details could not be saved.";
      return NextResponse.json({ error: message }, { status: 400 });
    }
    return NextResponse.json({ details: Array.isArray(data) ? data[0] ?? null : data ?? null });
  } catch {
    return NextResponse.json({ error: "Private event details are not configured." }, { status: 503 });
  }
}
