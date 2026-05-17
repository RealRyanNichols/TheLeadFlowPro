import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin-identity";

export const dynamic = "force-dynamic";

export default async function BackendRouterPage() {
  const session = await auth();
  if (!session?.user?.email) {
    redirect("/login?next=/backend");
  }

  if (isAdminEmail(session.user.email)) {
    redirect("/admin");
  }

  redirect("/dashboard/work");
}
