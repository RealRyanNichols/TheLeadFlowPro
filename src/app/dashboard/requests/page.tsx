import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ToolRequestsClient } from "./ToolRequestsClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Tool Requests - The LeadFlow Pro" };

export default async function RequestsPage() {
  const user = await currentUser();
  if (!user) redirect("/login?next=/dashboard/requests");

  const [mine, community] = await Promise.all([
    prisma.toolRequest.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.toolRequest.findMany({
      where: {
        userId: { not: user.id },
        status: { not: "declined" },
      },
      orderBy: [{ upvotes: "desc" }, { createdAt: "desc" }],
      take: 50,
      include: { user: { select: { businessName: true, name: true } } },
    }),
  ]);

  return (
    <ToolRequestsClient
      initialMine={mine.map((request) => ({
        ...request,
        createdAt: request.createdAt.toISOString(),
        updatedAt: request.updatedAt.toISOString(),
      }))}
      initialCommunity={community.map((request) => ({
        ...request,
        user: request.user,
        createdAt: request.createdAt.toISOString(),
        updatedAt: request.updatedAt.toISOString(),
      }))}
    />
  );
}
