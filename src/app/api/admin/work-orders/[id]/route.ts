// src/app/api/admin/work-orders/[id]/route.ts
//
// Lets Ryan move capacity down as work gets done. Completed hours are capped
// at estimated hours so the public meter cannot go negative.

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

function toNullableString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function numberOrUndefined(value: unknown): number | undefined {
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
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

  try {
    const existing = await (prisma as any).workOrder.findUnique({
      where: { id: params.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "work order not found" }, { status: 404 });
    }

    const nextEstimate = numberOrUndefined(body.estimatedHours);
    const nextCompleted = numberOrUndefined(body.completedHours);
    const estimatedHours =
      nextEstimate === undefined
        ? Number(existing.estimatedHours)
        : Math.max(0.25, nextEstimate);
    let completedHours =
      nextCompleted === undefined
        ? Number(existing.completedHours)
        : Math.max(0, nextCompleted);

    const data: any = {
      estimatedHours,
      completedHours: Math.min(estimatedHours, completedHours),
    };

    if (typeof body.incrementCompletedHours !== "undefined") {
      const increment = numberOrUndefined(body.incrementCompletedHours) ?? 0;
      completedHours = Number(existing.completedHours) + increment;
      data.completedHours = Math.min(estimatedHours, Math.max(0, completedHours));
    }

    if (typeof body.clientName === "string") data.clientName = body.clientName.trim();
    if (typeof body.publicLabel === "string") data.publicLabel = body.publicLabel.trim() || null;
    if (typeof body.offerSlug === "string") data.offerSlug = body.offerSlug.trim() || null;
    if (typeof body.title === "string") data.title = body.title.trim() || existing.title;
    if (typeof body.notes === "string") data.notes = body.notes.trim() || null;
    if (typeof body.engagementId === "string") data.engagementId = body.engagementId.trim() || null;
    if (typeof body.deliveryGuaranteeDays !== "undefined") {
      const days = numberOrUndefined(body.deliveryGuaranteeDays);
      data.deliveryGuaranteeDays = days === undefined ? null : Math.max(0, Math.round(days));
    }
    if (typeof body.dueAt === "string") {
      const dueAt = body.dueAt.trim() ? new Date(body.dueAt) : null;
      data.dueAt = dueAt && !Number.isNaN(dueAt.getTime()) ? dueAt : null;
    }
    if (typeof body.status === "string") {
      data.status = body.status.trim() || existing.status;
      if (data.status === "delivered" || data.status === "completed") {
        data.completedHours = estimatedHours;
      }
    }

    const updated = await (prisma as any).workOrder.update({
      where: { id: params.id },
      data,
    });
    return NextResponse.json({ ok: true, workOrder: updated });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "update failed" },
      { status: 500 },
    );
  }
}

export async function DELETE(req: Request, { params }: Ctx) {
  const auth = checkAuth(req);
  if (!auth.ok) return auth.res;

  try {
    await (prisma as any).workOrder.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "delete failed" },
      { status: 404 },
    );
  }
}
