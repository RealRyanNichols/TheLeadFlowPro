import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { ensureTlfpAccount, isEmail, normalizeEmail, postCredits } from "@/lib/tlfp";

// Admin: grant or adjust TLFP Credits by hand. Every call is one ledger row
// with the admin's email as the actor and a ref built from a client-supplied
// request id, so a double-submit posts once. Negative amounts are allowed
// (a correction) and may take a balance below zero.

export const runtime = "nodejs";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Log in." }, { status: 401 });
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return NextResponse.json({ error: "Admins only." }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const email = normalizeEmail(body.email);
  const credits = Math.trunc(Number(body.credits));
  const memo = typeof body.memo === "string" ? body.memo.trim().slice(0, 300) : "";
  const requestId = typeof body.request_id === "string" && /^[0-9a-f-]{36}$/i.test(body.request_id) ? body.request_id : "";
  if (!isEmail(email)) return NextResponse.json({ error: "Enter a real email." }, { status: 400 });
  if (!Number.isFinite(credits) || credits === 0 || Math.abs(credits) > 1999) {
    return NextResponse.json({ error: "Credits must be a whole number between -1999 and 1999, not zero." }, { status: 400 });
  }
  if (memo.length < 3) return NextResponse.json({ error: "Say why, in a few words. It shows on their ledger." }, { status: 400 });
  if (!requestId) return NextResponse.json({ error: "Missing request id." }, { status: 400 });

  try {
    const service = createServiceClient();
    await ensureTlfpAccount(service, email);
    const result = await postCredits(service, {
      email,
      delta: credits,
      reason: credits > 0 ? "admin_grant" : "admin_adjust",
      ref: `admin:${requestId}`,
      memo,
      actor: `admin:${normalizeEmail(user.email)}`,
      requireFunds: false,
    });
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error === "balance_cap" ? "That would push the balance past the cap. Nothing posted." : `Not posted: ${result.error}` },
        { status: 409 },
      );
    }
    return NextResponse.json({ ok: true, applied: result.applied, balance: result.balance, duplicate: result.duplicate === true });
  } catch (error) {
    console.error("TLFP admin post failed:", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ error: "The ledger call failed. Check the migration is applied." }, { status: 500 });
  }
}
