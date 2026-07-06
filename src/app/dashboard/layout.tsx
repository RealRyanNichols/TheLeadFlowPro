import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin-identity";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login?next=/dashboard");
  }

  if (!isAdminEmail(session.user.email)) {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-ink-950 text-white">
      <header className="border-b border-white/10 bg-ink-950/75 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-3 px-4">
          <Link href="/dashboard" className="text-sm font-bold tracking-tight hover:text-cyan-300">
            LeadFlow Pro · Review console
          </Link>
          <div className="flex items-center gap-2 text-xs">
            <Link
              href="/submit-source"
              className="rounded-lg border border-white/10 px-3 py-1.5 font-semibold text-ink-200 hover:bg-white/5 hover:text-white"
            >
              Submit source
            </Link>
            <Link
              href="/"
              className="rounded-lg border border-white/10 px-3 py-1.5 font-semibold text-ink-200 hover:bg-white/5 hover:text-white"
            >
              Back to site
            </Link>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6 sm:py-8">{children}</main>
    </div>
  );
}
