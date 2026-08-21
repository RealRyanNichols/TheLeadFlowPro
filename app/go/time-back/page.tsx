import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CalendarCheck, KeyRound, ShieldCheck, Timer } from "lucide-react";
import { WEEKLY_BUILD_SLOTS } from "@/lib/timeback";
import TimeBackFunnel from "./TimeBackFunnel";

// The destination for the "Time Back" Facebook lead campaign. Mobile-first:
// the first phone screen carries the promise, the price floor, and TWO
// buttons. The week-strip graphic SHOWS the product (a calendar that filled
// itself) instead of describing it.

export const metadata: Metadata = {
  title: "Get Your Time Back From Posting | The LeadFlow Pro",
  description:
    "Pick how many days and how many posts per day. We write it in your voice, schedule it in your accounts, and wire the follow-up. From $297 one-time. No passwords, no monthly seat.",
  alternates: { canonical: "https://www.theleadflowpro.com/go/time-back" },
  robots: { index: false, follow: true },
};

const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

function WeekStrip() {
  return (
    <div className="rounded-[20px] border border-[#5b87ff59] bg-gradient-to-b from-[#16233d] to-[#0d1628] p-5 shadow-[0_0_60px_#1240e83d]">
      <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#35c6f4]">
        Your next 7 days, already done
      </p>
      <div className="mt-4 grid grid-cols-7 gap-2">
        {DAY_LABELS.map((d, col) => (
          <div key={`${d}${col}`} className="grid justify-items-center gap-2">
            <span className="text-[11px] font-extrabold text-[#8b97ad]">{d}</span>
            {[0, 1, 2].map((row) => (
              <span
                key={row}
                className="tb-dot h-3.5 w-3.5 rounded-full bg-[#5b87ff]"
                style={{ animationDelay: `${(col * 3 + row) * 0.12}s` }}
              />
            ))}
          </div>
        ))}
      </div>
      <p className="mt-4 flex items-center justify-between text-xs font-bold text-[#a8b4c8]">
        <span>21 posts · your voice · your accounts</span>
        <span className="text-[#7ee2a1]">Scheduled ✓</span>
      </p>
    </div>
  );
}

export default function TimeBackPage() {
  return (
    <main className="cb-page">
      <style>{`
        @keyframes tbPulse {
          0%, 100% { opacity: .25; transform: scale(.8); box-shadow: 0 0 0 #5b87ff00; }
          50% { opacity: 1; transform: scale(1); box-shadow: 0 0 12px #5b87ff99; }
        }
        .tb-dot { animation: tbPulse 2.6s ease-in-out infinite; }
      `}</style>

      <div className="bg-[#0a1220]">
        <section className="px-4 pb-10 pt-10 sm:pt-16">
          <div className="mx-auto grid w-full max-w-[1120px] items-center gap-8 lg:grid-cols-[1fr_420px]">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#35c6f4]">
                You saw the video. This is the next move.
              </p>
              <h1 className="mt-3 text-4xl font-extrabold leading-[1.05] tracking-tight text-white sm:text-6xl">
                Get your time back{" "}
                <span className="text-[#5b87ff] [text-shadow:0_0_30px_#5b87ff66]">
                  from posting.
                </span>
              </h1>
              <p className="mt-4 max-w-xl text-base text-[#a8b4c8] sm:text-lg">
                3+ posts a day on Facebook, Instagram, and X. Written in your voice, scheduled in
                YOUR accounts, follow-up wired.{" "}
                <b className="text-white">From $297, one-time.</b> No monthly seat to rent.
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <a
                  href="#tb-build"
                  className="inline-flex min-h-[54px] items-center gap-2 rounded-xl bg-[var(--cb-blue)] px-6 text-base font-extrabold text-white shadow-[0_0_36px_#1240e880] transition hover:bg-[var(--cb-blue-deep)]"
                >
                  Build my package
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </a>
                <a
                  href="#tb-proof"
                  className="inline-flex min-h-[54px] items-center gap-2 rounded-xl border border-[#ffffff2e] px-6 text-base font-bold text-[#e6ebf4]"
                >
                  See it on a real business
                </a>
              </div>
              <p className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#ffffff0d] px-3 py-2 text-sm font-bold text-[#a8b4c8]">
                <Timer className="h-4 w-4 text-[#35c6f4]" aria-hidden="true" />
                {WEEKLY_BUILD_SLOTS} build slots open this week. Full week rolls to Monday.
              </p>
            </div>
            <WeekStrip />
          </div>
        </section>

        <TimeBackFunnel />
      </div>

      <section className="cb-band cb-band--tint">
        <div className="cb-shell">
          <h2 className="cb-h2">
            <em>No passwords. Ever.</em>
            The safe agency way to work in your accounts.
          </h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {[
              {
                icon: KeyRound,
                title: "You never hand over a password",
                body: "Facebook and Instagram grant us partner access through Meta Business Manager, the official agency door. X uses delegate access. Email platforms give us an invited team seat. You click approve, we get to work.",
              },
              {
                icon: ShieldCheck,
                title: "You can revoke us in one click",
                body: "Partner access is task-level and yours to remove any time. Everything we build lives in YOUR accounts, so if we disappeared tomorrow, you keep all of it. That is the whole point: own your platform.",
              },
              {
                icon: CalendarCheck,
                title: "Built and scheduled, not dumped",
                body: "We do not email you a folder of drafts. Posts go on your calendar, automations get switched on, and you get a walkthrough of exactly what is running and where.",
              },
            ].map((p) => (
              <div
                key={p.title}
                className="rounded-2xl border border-[var(--line-strong)] bg-white p-6"
              >
                <p.icon className="h-6 w-6 text-[var(--blue)]" aria-hidden="true" />
                <h3 className="mt-3 text-lg font-extrabold text-[var(--heading)]">{p.title}</h3>
                <p className="mt-2 text-sm text-[var(--muted)]">{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="cb-band" id="tb-proof">
        <div className="cb-shell">
          <h2 className="cb-h2">
            <em>This is not theory.</em>
            The same system runs real local businesses today.
          </h2>
          <p className="cb-lead">
            Premier Dental Academy of Longview runs on this exact stack: 455 first-party leads
            since May 4, and July ads at a 4.45% click-through rate and 72 cents a click. Premier
            Dental Academy of Longview and The LeadFlow Pro share common ownership, which is why
            we can show you the numbers straight from the account.
          </p>
          <div className="cb-actions">
            <Link className="cb-btn cb-btn--primary" href="#tb-build">
              Build my package
            </Link>
            <Link className="cb-btn cb-btn--ghost" href="/portfolio">
              See the live systems
            </Link>
            <Link className="cb-btn cb-btn--ghost" href="/packages/system-map">
              Want the full picture first? The $497 System Map
            </Link>
          </div>
          <p className="mt-6 text-sm text-[var(--quiet)]">
            Posting more than 10 times a day, or running multiple locations?{" "}
            <Link href="/contact" className="font-bold text-[var(--blue)] underline">
              Book a call
            </Link>{" "}
            and we price it custom.
          </p>
        </div>
      </section>
    </main>
  );
}
