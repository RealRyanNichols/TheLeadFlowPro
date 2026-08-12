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

  if (paidEvent) {
    return (
      <section className="mx-auto max-w-2xl px-4 py-24 text-center">
        <h1 className="text-4xl font-black text-white">
          Seat locked. <span className="text-gradient">See you there.</span>
        </h1>
        <p className="mt-4 text-lg text-slate-300">
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
    <section className="mx-auto max-w-2xl px-4 py-24 text-center">
      <ConversionPing
        googleAdsId={settings.google_ads_id}
        conversionLabel={settings.google_ads_conversion_label}
        purchase={bought}
      />
      {bought ? (
        <>
          <h1 className="text-4xl font-black text-white">
            You're in. <span className="text-gradient">Welcome to the owners' side.</span>
          </h1>
          <p className="mt-4 text-lg text-slate-300">
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
          <h1 className="text-4xl font-black text-white">Got it. I'm on it.</h1>
          <p className="mt-4 text-lg text-slate-300">
            Your info is in my system (the same one I will build for you, by the
            way). I will reach out within one business day to set up your call.
          </p>

          {settings.calendar_url ? (
            <div className="card mt-8 !p-4 text-left">
              <p className="px-2 pt-2 font-semibold text-white">
                Want to skip the back and forth? Grab your time right now:
              </p>
              <iframe
                src={settings.calendar_url}
                className="mt-3 h-[640px] w-full rounded-xl border border-white/10 bg-white"
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
            <p className="mt-4 text-slate-400">
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
