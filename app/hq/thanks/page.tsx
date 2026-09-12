import { CheckCircle2 } from "lucide-react";

// Where a website form sends the customer after they press send. This is the
// only page under /hq a member of the public ever sees, so it says one true
// thing and stops. No branding we cannot stand behind, no tracking, nothing
// to click.

export const dynamic = "force-dynamic";

function businessName(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().slice(0, 80);
}

export default async function HqThanksPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const name = businessName(params.b);

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-md flex-col justify-center px-4 py-16">
      <CheckCircle2 aria-hidden="true" className="h-10 w-10 text-[var(--green)]" />
      <h1 className="mt-4 text-2xl font-black tracking-tight text-[var(--heading)] sm:text-3xl">Got it.</h1>
      <p className="mt-3 text-base leading-relaxed text-[var(--text)]">
        {name ? `${name} will be in touch shortly.` : "They will be in touch shortly."}
      </p>
      <p className="mt-4 text-sm text-[var(--muted)]">You can close this page. If it is urgent, calling is still the fastest way to reach them.</p>
    </main>
  );
}
