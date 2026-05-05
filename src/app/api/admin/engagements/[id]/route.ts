// src/app/api/admin/engagements/[id]/route.ts
//
// PATCH → update fields (status, hoursPerWeek, etc.). When status flips to
//         "completed", completedAt is auto-set.
// DELETE → hard delete. Use sparingly; prefer status="completed".

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function checkAuth(req: Request): { ok: true } | { ok: false; res: NextResponse } {
  const expected = process.env.ADMIN_INIT_SECRET;
  if (!expected) {
    return {
      ok: false,
      res: NextResponse.json({ error: "ADMIN_INIT_SECRET not set" }, { status: 503 }),
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

type Ctx = { params: { id: string } };

export async function PATCH(req: Request, { params }: Ctx) {
  const auth = checkAuth(req);
  if (!auth.ok) return auth.res;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  const data: any = {};
  if (typeof body.clientName === "string")    data.clientName    = body.clientName.trim();
  if (typeof body.publicLabel === "string")   data.publicLabel   = body.publicLabel.trim() || null;
  if (typeof body.offerSlug === "string")     data.offerSlug     = body.offerSlug.trim() || null;
  if (Number.isFinite(+body.hoursPerWeek))    data.hoursPerWeek  = Math.max(1, Math.round(+body.hoursPerWeek));
  if (typeof body.notes === "string")         data.notes         = body.notes;
  if (typeof body.status === "string") {
    data.status = body.status;
    if (body.status === "completed") {
      data.completedAt = new Date();
    } else {
      data.completedAt = null;
    }
  }

  try {
    const updated = await prisma.clientEngagement.update({
      where: { id: params.id },
      data,
    });
    return NextResponse.json({ ok: true, engagement: updated });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "update failed" },
      { status: 404 }
    );
  }
}

export async function DELETE(req: Request, { params }: Ctx) {
  const auth = checkAuth(req);
  if (!auth.ok) return auth.res;
  try {
    await prisma.clientEngagement.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "delete failed" },
      { status: 404 }
    );
  }
}
