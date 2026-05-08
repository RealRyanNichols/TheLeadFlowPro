import { redirect } from "next/navigation";
import { auth, currentUser } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin-identity";
export { adminEmails, isAdminEmail } from "@/lib/admin-identity";

export async function requireAdminUser() {
  const user = await currentUser();
  if (!user) {
    redirect("/login?next=/admin");
  }
  if (!isAdminEmail(user.email)) {
    redirect("/dashboard");
  }
  return user;
}

export async function requireAdminSession() {
  const session = await auth();
  if (!session?.user?.email || !isAdminEmail(session.user.email)) return null;
  return session;
}
