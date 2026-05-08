import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function cleanText(value: unknown, max: number) {
  if (typeof value !== "string") return "";
  return value.replace(/\r\n/g, "\n").trim().slice(0, max);
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Admin login required." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const message = cleanText(body?.message, 3000);
  const status = cleanText(body?.status, 80);
  const hours = Number(body?.completedHours);

  if (message.length < 10) {
    return NextResponse.json({ error: "Send at least 10 characters for the client." }, { status: 400 });
  }

  const order = await (prisma as any).workOrder.findUnique({ where: { id: params.id } });
  if (!order) {
    return NextResponse.json({ error: "Work order not found." }, { status: 404 });
  }

  const stamp = new Date().toISOString();
  const update = [
    `--- Ryan update ${stamp} ---`,
    "Message:",
    message,
  ].join("\n");

  const allowedStatuses = new Set([
    "intake_needed",
    "in_progress",
    "waiting_on_client",
    "pending_review",
    "delivered",
    "completed",
    "canceled",
  ]);

  await (prisma as any).workOrder.update({
    where: { id: order.id },
    data: {
      notes: [order.notes, update].filter(Boolean).join("\n\n"),
      ...(allowedStatuses.has(status) ? { status } : {}),
      ...(Number.isFinite(hours) && hours >= 0 ? { completedHours: hours } : {}),
    },
  });

  return NextResponse.json({ ok: true });
}
