import LoginForm from "./LoginForm";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Kept out of the sitemap, but Google indexed it anyway from the header and
// footer links. A sign-in form ranking for the brand name spends crawl budget
// and puts a dead end in the results, so it is explicitly noindex. follow stays
// true so link equity still flows through to the pages that should rank.
export const metadata = {
  title: "Log In | The LeadFlow Pro",
  robots: { index: false, follow: true },
};

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
    <section className="mx-auto max-w-md px-4 pb-24 pt-[22px] sm:pt-8">
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
