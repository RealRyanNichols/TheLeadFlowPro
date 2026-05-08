import { notFound, redirect } from "next/navigation";
import { requireAdminUser } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminClientByOrderPage({ params }: { params: { id: string } }) {
  await requireAdminUser();
  const order = await (prisma as any).workOrder.findUnique({ where: { id: params.id } });
  if (!order) notFound();

  const emailMatch = String(order.notes || "").match(/buyer_email:([^\s]+)/i);
  const userIdMatch = String(order.notes || "").match(/user_id:([^\s]+)/i);

  if (userIdMatch?.[1]) {
    redirect(`/admin/clients/${userIdMatch[1]}`);
  }

  if (emailMatch?.[1]) {
    const user = await prisma.user.findUnique({ where: { email: emailMatch[1].toLowerCase() } });
    if (user) redirect(`/admin/clients/${user.id}`);
  }

  const userByClientName = await prisma.user.findUnique({
    where: { email: String(order.clientName || "").toLowerCase() },
  }).catch(() => null);
  if (userByClientName) redirect(`/admin/clients/${userByClientName.id}`);

  notFound();
}
