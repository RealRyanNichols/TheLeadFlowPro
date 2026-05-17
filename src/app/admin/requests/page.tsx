import { unstable_noStore as noStore } from "next/cache";
import { requireAdminUser } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { AdminRequestsClient } from "./AdminRequestsClient";

export const dynamic = "force-dynamic";

export default async function AdminRequestsPage({
  searchParams,
}: {
  searchParams?: { goal?: string };
}) {
  noStore();
  await requireAdminUser();
  const goalFilter = searchParams?.goal?.trim() || null;

  const intakes = await prisma.publicIntake.findMany({
    where: goalFilter ? { biggestGoal: goalFilter } : undefined,
    orderBy: [{ handled: "asc" }, { createdAt: "desc" }],
    take: 100,
  });

  return (
    <AdminRequestsClient
      goalFilter={goalFilter}
      initialIntakes={intakes.map((intake) => ({
        ...intake,
        createdAt: intake.createdAt.toISOString(),
        updatedAt: intake.updatedAt.toISOString(),
      }))}
    />
  );
}
