import { unstable_noStore as noStore } from "next/cache";
import { requireAdminUser } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { AdminToolsClient } from "./AdminToolsClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Tool Requests - Ryan Admin" };

export default async function AdminToolsPage() {
  noStore();
  await requireAdminUser();

  const requests = await prisma.toolRequest.findMany({
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    take: 200,
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          businessName: true,
          phone: true,
          website: true,
          plan: true,
        },
      },
    },
  });

  return (
    <AdminToolsClient
      initialRequests={requests.map((request) => ({
        ...request,
        createdAt: request.createdAt.toISOString(),
        updatedAt: request.updatedAt.toISOString(),
      }))}
    />
  );
}
