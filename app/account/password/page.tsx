import SetPasswordForm from "./SetPasswordForm";

export const metadata = { title: "Set Your Password | The LeadFlow Pro" };

export default function SetPasswordPage() {
  return (
    <section className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-16">
      <h1 className="text-2xl font-black text-[var(--heading)]">Set a new password</h1>
      <p className="mt-2 text-sm text-[var(--muted)]">
        Pick something only you know. We never ask for it and nobody on the team can see it.
      </p>
      <div className="card mt-6">
        <SetPasswordForm />
      </div>
    </section>
  );
}
