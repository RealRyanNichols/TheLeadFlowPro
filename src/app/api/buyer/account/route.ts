import { NextResponse } from "next/server";
import { z } from "zod";
import { getBuyerPortalData, trackBuyerEvent, updateBuyerAccount } from "@/lib/buyer-portal";
import { getBuyerAuthState } from "@/lib/supabase-buyer-auth";

export const runtime = "nodejs";

const BuyerAccountPatchSchema = z.object({
  name: z.string().trim().min(2).max(120),
  phone: z.string().trim().max(40).optional().default(""),
  company_name: z.string().trim().min(2).max(160),
  website: z.string().trim().max(240).optional().default(""),
  buyer_type: z.string().trim().min(2).max(120),
  industry: z.string().trim().min(2).max(120),
  location_served: z.string().trim().min(2).max(160),
  budget_range: z.string().trim().min(2).max(120),
  intended_use: z.string().trim().min(12).max(1600),
  communication_preference: z.string().trim().min(2).max(80),
  consent_status: z.enum(["accepted", "not_requested"]).default("accepted"),
});

export async function GET() {
  const portal = await getBuyerPortalData();
  return NextResponse.json({ ok: true, portal });
}

export async function PATCH(req: Request) {
  try {
    const auth = await getBuyerAuthState();
    if (!auth.authenticated) return NextResponse.json({ error: "Buyer login required." }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const parsed = BuyerAccountPatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid buyer profile." }, { status: 400 });
    }

    const account = await updateBuyerAccount(auth.user, {
      ...parsed.data,
      email: auth.user.email,
    });
    await trackBuyerEvent("buyer_profile_completed", {
      buyer_account_id: account.id,
      account_status: account.account_status,
    }).catch(() => null);

    return NextResponse.json({ ok: true, account });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Buyer profile save failed." }, { status: 500 });
  }
}
