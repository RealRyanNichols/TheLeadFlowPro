import { NextResponse } from "next/server";
import { OperatorAuthError, requireOperatorAdmin } from "@/lib/operatoros/auth";

const SOURCES = new Set(["check", "ach", "cash", "wire", "other"]);

type CashRequest = {
  amountUsd?: unknown;
  receivedAt?: unknown;
  source?: unknown;
  payerName?: unknown;
  memo?: unknown;
  externalReference?: unknown;
  verified?: unknown;
};

function optionalText(value: unknown, max: number) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : null;
}

export async function POST(request: Request) {
  try {
    const { user, supabase } = await requireOperatorAdmin();
    const body = (await request.json()) as CashRequest;

    const amountUsd = Number(body.amountUsd);
    const amountCents = Math.round(amountUsd * 100);
    if (!Number.isFinite(amountUsd) || amountCents <= 0 || amountCents > 25_000_000) {
      return NextResponse.json({ error: "Enter a payment amount between $0.01 and $250,000" }, { status: 400 });
    }

    const source = typeof body.source === "string" ? body.source : "";
    if (!SOURCES.has(source)) {
      return NextResponse.json({ error: "Choose a valid payment source" }, { status: 400 });
    }

    const receivedAt = typeof body.receivedAt === "string" ? new Date(body.receivedAt) : null;
    if (!receivedAt || Number.isNaN(receivedAt.getTime())) {
      return NextResponse.json({ error: "Enter a valid received date and time" }, { status: 400 });
    }

    const payerName = optionalText(body.payerName, 300);
    if (!payerName) {
      return NextResponse.json({ error: "Enter the payer or business name" }, { status: 400 });
    }
    if (body.verified !== true) {
      return NextResponse.json({ error: "Confirm that the money was actually received before recording it" }, { status: 400 });
    }

    const { data: workspace, error: workspaceError } = await supabase
      .from("operator_workspaces")
      .select("id")
      .eq("slug", "the-leadflow-pro")
      .single();
    if (workspaceError || !workspace) {
      return NextResponse.json({ error: "OperatorOS workspace unavailable" }, { status: 500 });
    }

    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("operator_manual_cash_events")
      .insert({
        workspace_id: workspace.id,
        amount_cents: amountCents,
        currency: "usd",
        received_at: receivedAt.toISOString(),
        source,
        payer_name: payerName,
        memo: optionalText(body.memo, 3000),
        external_reference: optionalText(body.externalReference, 300),
        status: "verified",
        verified_by: user.id,
        verified_at: now,
        created_by: user.id,
      })
      .select("id")
      .single();

    if (error?.code === "23505") {
      return NextResponse.json({ error: "That payment reference is already recorded" }, { status: 409 });
    }
    if (error || !data) {
      return NextResponse.json({ error: "The payment could not be recorded" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, id: data.id });
  } catch (error) {
    if (error instanceof OperatorAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Cash entry failed" }, { status: 500 });
  }
}
