// src/app/api/admin/engagements/route.ts — admin CRUD for client engagements.
//
// Auth: x-admin-secret header must match ADMIN_INIT_SECRET env var.
// GET    → list all engagements (newest first)
// POST   → create a new engagement

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function checkAuth(req: Request): { ok: true } | { ok: false; res: NextResponse } {
  const expected = process.env.ADMIN_INIT_SECRET;
  if (!expected) {
    return {
      ok: false,
      res: NextResponse.json(
        { error: "ADMIN_INIT_SECRET not set in env" },
        { status: 503 }
      ),
    };
  }
  const provided = req.headers.get("x-admin-secret");
  if (provided !== expected) {
    return {
      ok: false,
      res: NextResponse.json({ error: "unauthorized" }, { status: 401 }),
    };
  }
  return { ok: true };
}

export async function GET(req: Request) {
  const auth = checkAuth(req);
  if (!auth.ok) return auth.res;

  const rows = await prisma.clientEngagement.findMany({
    orderBy: [{ status: "asc" }, { startedAt: "desc" }],
  });
  return NextResponse.json({ engagements: rows });
}

export async function POST(req: Request) {
  const auth = checkAuth(req);
  if (!auth.ok) return auth.res;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  const clientName = (body.clientName || "").toString().trim();
  if (!clientName) {
    return NextResponse.json({ error: "clientName required" }, { status: 400 });
  }
  const hoursPerWeek = Number.isFinite(+body.hoursPerWeek) ? Math.max(1, Math.round(+body.hoursPerWeek)) : 5;

  const created = await prisma.clientEngagement.create({
    data: {
      clientName,
      publicLabel: body.publicLabel?.toString() || null,
      offerSlug:   body.offerSlug?.toString()   || null,
      hoursPerWeek,
      status:      body.status?.toString() || "active",
      notes:       body.notes?.toString() || null,
    },
  });

  return NextResponse.json({ ok: true, engagement: created }, { status: 201 });
}
