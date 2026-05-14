import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin";
import { createProofDraftFromReport, listProofDrafts } from "@/lib/lead-intelligence";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function authorized(req: Request) {
  const session = await requireAdminSession();
  if (session) return true;
  const expected = process.env.ADMIN_INIT_SECRET;
  return Boolean(expected && req.headers.get("x-admin-secret") === expected);
}

export async function GET(req: Request) {
  if (!(await authorized(req))) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const drafts = await listProofDrafts(80);
  return NextResponse.json({ drafts });
}

export async function POST(req: Request) {
  if (!(await authorized(req))) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const contentType = req.headers.get("content-type") || "";
  let publicId: string | null = null;
  if (contentType.includes("application/json")) {
    const body = await req.json().catch(() => ({}));
    publicId = typeof body.publicId === "string" ? body.publicId : null;
  } else {
    const form = await req.formData();
    const value = form.get("publicId");
    publicId = typeof value === "string" ? value : null;
  }

  if (!publicId) return NextResponse.json({ error: "publicId required" }, { status: 400 });
  const draft = await createProofDraftFromReport(publicId);

  if (contentType.includes("application/json")) {
    return NextResponse.json({ ok: true, draft });
  }

  return NextResponse.redirect(new URL("/admin/proof-factory?created=1", req.url), { status: 303 });
}
