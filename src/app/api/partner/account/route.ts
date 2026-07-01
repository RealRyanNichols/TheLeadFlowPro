import { NextResponse } from "next/server";
import { z } from "zod";
import { getPartnerPortalData, trackPartnerEvent, updatePartnerAccount } from "@/lib/partner-portal";
import { getBuyerAuthState } from "@/lib/supabase-buyer-auth";

export const runtime = "nodejs";

const PartnerAccountPatchSchema = z.object({
  name: z.string().trim().min(2).max(120),
  phone: z.string().trim().max(40).optional().default(""),
  company: z.string().trim().min(2).max(160),
  website: z.string().trim().max(240).optional().default(""),
  partner_type: z.enum([
    "source_contributor",
    "agency_partner",
    "creator_partner",
    "local_operator",
    "research_partner",
    "referral_partner",
    "data_partner",
    "client_partner",
  ]),
  payout_preference: z.string().trim().min(2).max(120),
  rights_to_submit: z.boolean(),
  no_prohibited_data: z.boolean(),
  review_gated: z.boolean(),
  no_guaranteed_payment: z.boolean(),
});

export async function GET() {
  const portal = await getPartnerPortalData();
  return NextResponse.json({ ok: true, portal });
}

export async function PATCH(req: Request) {
  try {
    const auth = await getBuyerAuthState();
    if (!auth.authenticated) return NextResponse.json({ error: "Partner login required." }, { status: 401 });

    const parsed = PartnerAccountPatchSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid partner profile." }, { status: 400 });
    }

    const data = parsed.data;
    if (!data.rights_to_submit || !data.no_prohibited_data || !data.review_gated || !data.no_guaranteed_payment) {
      return NextResponse.json({ error: "All partner compliance confirmations are required." }, { status: 400 });
    }

    const account = await updatePartnerAccount(auth.user, {
      name: data.name,
      phone: data.phone,
      company: data.company,
      website: data.website,
      partner_type: data.partner_type,
      payout_preference: data.payout_preference,
      compliance_confirmations: {
        rights_to_submit: data.rights_to_submit,
        no_prohibited_data: data.no_prohibited_data,
        review_gated: data.review_gated,
        no_guaranteed_payment: data.no_guaranteed_payment,
      },
    });

    await trackPartnerEvent("partner_signup_completed", {
      partner_account_id: account.id,
      partner_type: account.partner_type,
      status: account.status,
      route: "/partner/settings",
    }).catch(() => null);

    return NextResponse.json({ ok: true, account });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Partner profile save failed." }, { status: 500 });
  }
}
