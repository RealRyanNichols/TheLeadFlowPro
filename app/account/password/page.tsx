import { PRIVATE_PAGE_METADATA } from "@/lib/publicPageMetadata";
import SetPasswordForm from "./SetPasswordForm";
import { redirect } from "next/navigation";
import { authCallbackPath } from "@/lib/authRedirect";

export const metadata = {
  title: "Set Your Password | The LeadFlow Pro",
  ...PRIVATE_PAGE_METADATA,
};

export default async function SetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const { code } = await searchParams;
  if (code) {
    const callback = new URL(
      authCallbackPath("/account/password"),
      "https://auth.internal",
    );
    callback.searchParams.set("code", code);
    redirect(`${callback.pathname}${callback.search}`);
  }
  return (
    <section className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-16">
      <h1 className="text-2xl font-black text-[var(--heading)]">
        Set a new password
      </h1>
      <p className="mt-2 text-sm text-[var(--muted)]">
        Pick something only you know. We never ask for it and nobody on the team
        can see it.
      </p>
      <div className="card mt-6">
        <SetPasswordForm />
      </div>
    </section>
  );
}
