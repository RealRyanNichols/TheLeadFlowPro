import LoginForm from "./LoginForm";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Log In | The LeadFlow Pro",
  robots: { index: false, follow: true },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ logged_out?: string }>;
}) {
  const { logged_out: loggedOut } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (profile?.role === "admin") redirect("/admin");
    if (profile?.role === "sales") redirect("/admin/sales");
    redirect("/dashboard");
  }

  return (
    <section className="mx-auto max-w-md px-4 pb-24 pt-[22px] sm:pt-8">
      <h1 className="text-center text-3xl font-black text-[var(--heading)]">
        The LeadFlow <span className="text-flow-400">Pro</span>
      </h1>
      <p className="mt-2 text-center text-[var(--muted)]">
        Log in or create your account.
      </p>
      <div className="card mt-8">
        {loggedOut === "1" && (
          <p className="mb-4 rounded-lg border border-[var(--green-line)] bg-[var(--green-tint)] p-3 text-center text-sm font-semibold text-[var(--green)]">
            You are signed out.
          </p>
        )}
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </section>
  );
}
