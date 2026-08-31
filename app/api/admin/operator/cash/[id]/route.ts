import { NextResponse } from "next/server";
import { OperatorAuthError, requireOperatorAdmin } from "@/lib/operatoros/auth";

type VoidRequest = { operation?: unknown; reason?: unknown };

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { user, supabase } = await requireOperatorAdmin();
    const { id } = await context.params;
    const body = (await request.json()) as VoidRequest;
    if (body.operation !== "void") {
      return NextResponse.json({ error: "Unsupported cash-ledger operation" }, { status: 400 });
    }
    const reason = typeof body.reason === "string" ? body.reason.trim().slice(0, 2000) : "";
    if (reason.length < 3) {
      return NextResponse.json({ error: "Enter a reason for voiding this entry" }, { status: 400 });
    }

    const { data: entry, error: loadError } = await supabase
      .from("operator_manual_cash_events")
      .select("id,status")
      .eq("id", id)
      .single();
    if (loadError || !entry) return NextResponse.json({ error: "Manual cash entry not found" }, { status: 404 });
    if (entry.status === "void") return NextResponse.json({ error: "This entry is already void" }, { status: 409 });

    const now = new Date().toISOString();
    const { error } = await supabase
      .from("operator_manual_cash_events")
      .update({
        status: "void",
        voided_by: user.id,
        voided_at: now,
        void_reason: reason,
        updated_at: now,
      })
      .eq("id", id);
    if (error) return NextResponse.json({ error: "The cash entry could not be voided" }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof OperatorAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Cash-ledger update failed" }, { status: 500 });
  }
}
