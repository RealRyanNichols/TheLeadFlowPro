import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { clientCanSeeWorkOrder } from "@/lib/client-office";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function cleanText(value: unknown, max: number) {
  if (typeof value !== "string") return "";
  return value.replace(/\r\n/g, "\n").trim().slice(0, max);
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in to send an update." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const message = cleanText(body?.message, 3000);
  const links = cleanText(body?.links, 2000);
  const category = cleanText(body?.category, 80) || "intake";
  const urgency = cleanText(body?.urgency, 80) || "normal";
  const contactPreference = cleanText(body?.contactPreference, 80) || "office";

  if (message.length < 10) {
    return NextResponse.json({ error: "Send at least 10 characters so Ryan has context." }, { status: 400 });
  }

  const order = await (prisma as any).workOrder.findUnique({ where: { id: params.id } });
  if (!order || !clientCanSeeWorkOrder(order, { id: user.id, email: user.email, name: user.name })) {
    return NextResponse.json({ error: "Work order not found." }, { status: 404 });
  }

  const stamp = new Date().toISOString();
  const update = [
    `--- Client update ${stamp} ---`,
    `Type: ${category}`,
    `Urgency: ${urgency}`,
    `Best response: ${contactPreference}`,
    "Message:",
    message,
    links ? "\nLinks/files:" : null,
    links || null,
  ].filter(Boolean).join("\n");

  const nextStatus =
    order.status === "intake_needed" || order.status === "waiting_on_client"
      ? "pending_review"
      : order.status;

  await (prisma as any).workOrder.update({
    where: { id: order.id },
    data: {
      status: nextStatus,
      notes: [order.notes, update].filter(Boolean).join("\n\n"),
    },
  });

  return NextResponse.json({ ok: true, status: nextStatus });
}
