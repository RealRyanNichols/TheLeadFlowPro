import { NextResponse } from "next/server";
import { executeOperatorRun } from "@/lib/operatoros/engine.ts";
import { OperatorAuthError, requireOperatorAdmin } from "@/lib/operatoros/auth.ts";

export const maxDuration = 120;

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { user } = await requireOperatorAdmin();
    const { id } = await params;
    if (!/^[0-9a-f-]{36}$/i.test(id)) {
      return NextResponse.json({ error: "Invalid run" }, { status: 400 });
    }
    const run = await executeOperatorRun(id, user.id);
    return NextResponse.json({ run });
  } catch (error) {
    if (error instanceof OperatorAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "OperatorOS execution failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
