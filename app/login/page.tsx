import LoginForm from "./LoginForm";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Log In | The LeadFlow Pro" };

export default async function LoginPage() {
  // Already logged in? Skip the form: admins go to the back office,
  // clients go to their dashboard.
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
    redirect(profile?.role === "admin" ? "/admin" : "/dashboard");
  }

  return (
    <section className="mx-auto max-w-md px-4 py-20">
      <h1 className="text-center text-3xl font-black text-[var(--heading)]">
        The LeadFlow <span className="text-flow-400">Pro</span>
      </h1>
      <p className="mt-2 text-center text-[var(--muted)]">
        Log in or create your account.
      </p>
      <div className="card mt-8">
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </section>
  );
}
