import { requireAdminUser } from "@/lib/admin";
import { BlueprintLabClient } from "./BlueprintLabClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Blueprint Lab - The LeadFlow Pro" };

export default async function AdminBlueprintLabPage() {
  await requireAdminUser();
  return <BlueprintLabClient />;
}
