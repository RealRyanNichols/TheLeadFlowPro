import type { Metadata } from "next";
import Link from "next/link";
import { CalendarCheck, KeyRound, ShieldCheck, Timer } from "lucide-react";
import { WEEKLY_BUILD_SLOTS } from "@/lib/timeback";
import TimeBackFunnel from "./TimeBackFunnel";

// The destination for the "Time Back" Facebook lead campaign. They watched
// the video, filled the instant form, and tapped "Skip The Line". This page
// exists to take a real order: days x posts per day, automations stacked on
// top, paid by card before they leave.

export const metadata: Metadata = {
  title: "Get Your Time Back From Posting | The LeadFlow Pro",
  description:
    "Pick how many days and how many posts per day. We write it in your voice, schedule it in your accounts, and wire the follow-up. One-time price, no passwords, no seat rental.",
  alternates: { canonical: "https://www.theleadflowpro.com/go/time-back" },
  robots: { index: false, follow: true },
};

const ACCESS_POINTS = [
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
];

export default function TimeBackPage() {
  return (
    <main className="cb-page">
      <section className="cb-hero">
        <div className="cb-shell">
          <p className="cb-eyebrow">You saw the video. This is the next move.</p>
          <h1 className="cb-h1">
            <em>Get your time back from posting.</em>
            Pick your days. Pick your posts per day. We handle the rest.
          </h1>
          <p className="cb-lead">
            Written in your voice. Scheduled in your accounts on Facebook, Instagram, and X.
            Follow-up automations that work while you run the business. One-time price, no
            monthly seat to rent, and everything we build belongs to you.
          </p>
          <p className="cb-lead" style={{ marginTop: 12 }}>
            <Timer aria-hidden="true" style={{ display: "inline", height: 16, width: 16, verticalAlign: "-2px" }} />{" "}
            We open {WEEKLY_BUILD_SLOTS} new builds a week so every build ships fast. When the
            week is full, the next order starts the following Monday. Every day you wait is
            another day of posts that never went out.
          </p>
        </div>
      </section>

      <TimeBackFunnel />

      <section className="cb-band cb-band--tint">
        <div className="cb-shell">
          <h2 className="cb-h2">
            <em>No passwords. Ever.</em>
            The safe agency way to work in your accounts.
          </h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {ACCESS_POINTS.map((p) => (
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

      <section className="cb-band">
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
            <Link className="cb-btn cb-btn--ghost" href="/portfolio">
              See the live systems
            </Link>
            <Link className="cb-btn cb-btn--ghost" href="/packages/system-map">
              Want the full business picture first? Start with the $497 System Map
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
