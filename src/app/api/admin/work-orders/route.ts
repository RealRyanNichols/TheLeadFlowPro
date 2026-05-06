// src/app/api/admin/work-orders/route.ts
//
// Admin work-order ledger. These rows are the fulfillment blocks behind the
// public capacity meter: estimated hours minus completed hours.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { deliveryDueDate, getOfferWorkload } from "@/lib/workload";

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

function numberOrNull(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export async function GET(req: Request) {
  const auth = checkAuth(req);
  if (!auth.ok) return auth.res;

  try {
    const rows = await (prisma as any).workOrder.findMany({
      orderBy: [{ status: "asc" }, { dueAt: "asc" }, { createdAt: "desc" }],
    });
    return NextResponse.json({ workOrders: rows });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "work order table unavailable. Push the Prisma/Supabase schema first.",
      },
      { status: 500 },
    );
  }
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

  const clientName = toNullableString(body.clientName);
  if (!clientName) {
    return NextResponse.json({ error: "clientName required" }, { status: 400 });
  }

  const offerSlug = toNullableString(body.offerSlug);
  const workload = getOfferWorkload(offerSlug);
  const estimate = numberOrNull(body.estimatedHours);
  const completed = numberOrNull(body.completedHours);
  const dueAtInput = toNullableString(body.dueAt);
  const dueAt = dueAtInput
    ? new Date(dueAtInput)
    : workload
      ? deliveryDueDate(new Date(), workload)
      : null;
  const estimatedHours = Math.max(0.25, estimate ?? workload?.reserveHours ?? 1);
  const completedHours = Math.min(
    estimatedHours,
    Math.max(0, completed ?? 0),
  );

  try {
    const created = await (prisma as any).workOrder.create({
      data: {
        engagementId: toNullableString(body.engagementId),
        clientName,
        publicLabel: toNullableString(body.publicLabel),
        offerSlug,
        title: toNullableString(body.title) ?? workload?.label ?? "Custom work order",
        status: toNullableString(body.status) ?? "intake_needed",
        estimatedHours,
        completedHours,
        deliveryGuaranteeDays: numberOrNull(body.deliveryGuaranteeDays) ?? workload?.deliveryMaxDays ?? null,
        dueAt: dueAt && !Number.isNaN(dueAt.getTime()) ? dueAt : null,
        notes: toNullableString(body.notes),
      },
    });

    return NextResponse.json({ ok: true, workOrder: created }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "create failed" },
      { status: 500 },
    );
  }
}
