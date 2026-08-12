import Link from "next/link";
import { getSettings } from "@/lib/settings";
import ConversionPing from "@/components/ConversionPing";

// Post-conversion page. Nothing to rank here, and letting Google index it would
// put a thin confirmation screen in front of people searching for the real pages.
export const metadata = {
  title: "Got It | The LeadFlow Pro",
  robots: { index: false, follow: true },
};

export default async function ThankYou({
  searchParams,
}: {
  searchParams: Promise<{ purchase?: string }>;
}) {
  const { purchase } = await searchParams;
  const settings = await getSettings();
  const bought = purchase === "learn_it";
  const paidEvent = purchase === "event";
  // Down payments: the generic Learn It confirmation is wrong for someone who
  // just funded a build.
  const paidDeposit =
    purchase === "build_deposit" || purchase === "package_deposit" || purchase === "package_full";

  if (paidDeposit) {
    return (
      <section className="mx-auto max-w-2xl px-4 pb-24 pt-[22px] text-center sm:pt-8">
        <ConversionPing
          googleAdsId={settings.google_ads_id}
          conversionLabel={settings.google_ads_conversion_label}
          purchase
        />
        <h1 className="text-4xl font-black text-[var(--heading)]">
          Payment received. <span className="text-gradient">The build moves.</span>
        </h1>
        <p className="mt-4 text-lg text-[var(--text)]">
          Your down payment is credited in full toward the build. Your receipt is on the
          way by email. Ryan will be in touch with the next step and what he needs from
          you, usually the same day.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <Link href="/portfolio" className="btn-primary">
            See what gets built
          </Link>
          <Link href="/contact" className="btn-ghost">
            Send Ryan a message
          </Link>
        </div>
      </section>
    );
  }

  if (paidEvent) {
    return (
      <section className="mx-auto max-w-2xl px-4 pb-24 pt-[22px] text-center sm:pt-8">
        <h1 className="text-4xl font-black text-[var(--heading)]">
          Seat locked. <span className="text-gradient">See you there.</span>
        </h1>
        <p className="mt-4 text-lg text-[var(--text)]">
          Payment received and your registration is confirmed. Bring your laptop
          and your questions — you'll leave knowing exactly how to own your
          platform.
        </p>
        <div className="mt-8 flex justify-center gap-4">
          <Link href="/events" className="btn-primary">
            Back to Events
          </Link>
          <Link href="/training" className="btn-ghost">
            Get a Head Start — Free Course
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-2xl px-4 pb-24 pt-[22px] text-center sm:pt-8">
      <ConversionPing
        googleAdsId={settings.google_ads_id}
        conversionLabel={settings.google_ads_conversion_label}
        purchase={bought}
      />
      {bought ? (
        <>
          <h1 className="text-4xl font-black text-[var(--heading)]">
            You're in. <span className="text-gradient">Welcome to the owners' side.</span>
          </h1>
          <p className="mt-4 text-lg text-[var(--text)]">
            Payment received. Check your email for your getting-started note.
            Create your login with the SAME email you purchased with and every
            course unlocks automatically.
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <Link href="/login" className="btn-primary">
              Create Your Login
            </Link>
            <Link href="/training" className="btn-ghost">
              Go to Training
            </Link>
          </div>
        </>
      ) : (
        <>
          <h1 className="text-4xl font-black text-[var(--heading)]">Got it. I'm on it.</h1>
          <p className="mt-4 text-lg text-[var(--text)]">
            Your info is in my system (the same one I will build for you, by the
            way). I will reach out within one business day to set up your call.
          </p>

          {settings.calendar_url ? (
            <div className="card mt-8 !p-4 text-left">
              <p className="px-2 pt-2 font-semibold text-[var(--heading)]">
                Want to skip the back and forth? Grab your time right now:
              </p>
              <iframe
                src={settings.calendar_url}
                className="mt-3 h-[640px] w-full rounded-xl border border-[var(--line-strong)] bg-white"
                title="Book your call"
              />
              <a
                href={settings.calendar_url}
                target="_blank"
                rel="noreferrer"
                className="btn-ghost mt-3 block text-center"
              >
                Open the calendar in a new tab instead
              </a>
            </div>
          ) : (
            <p className="mt-4 text-[var(--muted)]">
              Want a head start? The first course in the training area is free.
            </p>
          )}

          <div className="mt-8 flex justify-center gap-4">
            <Link href="/login" className="btn-primary">
              Create Your Login
            </Link>
            <Link href="/" className="btn-ghost">
              Back Home
            </Link>
          </div>
        </>
      )}
    </section>
  );
}
