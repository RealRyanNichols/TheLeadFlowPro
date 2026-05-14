import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin";
import { listProspects, runProspectRadar } from "@/lib/lead-intelligence";

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
  const prospects = await listProspects(100);
  return NextResponse.json({ prospects });
}

export async function POST(req: Request) {
  if (!(await authorized(req))) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const contentType = req.headers.get("content-type") || "";
  let city = "Longview";
  let state = "Texas";
  let niche = "contractors";

  if (contentType.includes("application/json")) {
    const body = await req.json().catch(() => ({}));
    city = typeof body.city === "string" ? body.city : city;
    state = typeof body.state === "string" ? body.state : state;
    niche = typeof body.niche === "string" ? body.niche : niche;
  } else {
    const form = await req.formData();
    city = typeof form.get("city") === "string" ? String(form.get("city")) : city;
    state = typeof form.get("state") === "string" ? String(form.get("state")) : state;
    niche = typeof form.get("niche") === "string" ? String(form.get("niche")) : niche;
  }

  const result = await runProspectRadar({ city, state, niche });
  if (contentType.includes("application/json")) {
    return NextResponse.json({ ok: true, ...result });
  }

  return NextResponse.redirect(new URL("/admin/radar?ran=1", req.url), { status: 303 });
}
