import { NextResponse } from "next/server";
import {
  createWorkshopServiceClient,
  normalizeWorkshopError,
} from "@/lib/eventCommerce";

function text(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const eventId = text(body.event_id, 80);
    const fullName = text(body.full_name, 200);
    const email = text(body.email, 200).toLowerCase();
    if (!eventId || !fullName || !email) {
      return NextResponse.json({ error: "Name and email are required." }, { status: 400 });
    }
    if (body.website) {
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    const supabase = createWorkshopServiceClient();
    const { data, error } = await supabase.rpc("workshop_register_with_terms", {
      p_event_id: eventId,
      p_full_name: fullName,
      p_email: email,
      p_phone: text(body.phone, 50) || null,
      p_business_name: text(body.business_name, 200) || null,
      p_notes: text(body.notes, 1000) || null,
      p_terms_acknowledged: body.terms_acknowledged === true,
    });
    if (error) {
      const normalized = normalizeWorkshopError(error.message);
      return NextResponse.json({ error: normalized.message }, { status: normalized.status });
    }

    const registration = Array.isArray(data) ? data[0] : data;
    if (!registration?.registration_id) {
      return NextResponse.json({ error: "Registration could not be created." }, { status: 500 });
    }
    return NextResponse.json({
      ok: true,
      registration_id: registration.registration_id,
      registration_status: registration.registration_status,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("SUPABASE_SERVICE_ROLE_KEY")) {
      return NextResponse.json({ error: "Registration is being connected." }, { status: 503 });
    }
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}
