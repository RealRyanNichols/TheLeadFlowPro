import type { Metadata } from "next";
import Link from "next/link";
import { CalendarCheck, Camera, KeyRound, PhoneCall } from "lucide-react";
import { FREE_BUILD, findFreeBuildTier, formatUsd } from "@/lib/freeBuild";
import styles from "../free-build.module.css";

// Where a paid Free Build order lands. One job: get the twenty minute call on
// the calendar while the buyer is still on their phone, and tell them the
// three things to have ready. The delivery clock starts at that call, so this
// page has to make booking it feel like the obvious next tap.

export const metadata: Metadata = {
  title: "You are in | The Free Build",
  robots: { index: false, follow: false },
};

export default async function FreeBuildWelcomePage({
  searchParams,
}: {
  searchParams: Promise<{ tier?: string }>;
}) {
  const { tier: tierId } = await searchParams;
  const tier = findFreeBuildTier(String(tierId ?? ""));

  return (
    <main className={`cb-page ${styles.page}`}>
      <section className="cb-hero">
        <div className="cb-shell">
          <p className="cb-eyebrow">Payment received</p>
          <h1 className="cb-h1">
            You are in.
            <em>Now let us book twenty minutes.</em>
          </h1>
          <p className="cb-hero-lead">
            {tier
              ? `${tier.name} is paid, ${formatUsd(tier.priceUsd)} one time. Your ${tier.pages.toLowerCase()} and the engine behind it are both on my board.`
              : "Your Free Build order is paid and on my board."}{" "}
            The {FREE_BUILD.guaranteeDays} business day clock starts at our call, not at this
            payment, so the sooner it is on the calendar the sooner you are live.
          </p>
          <div className="cb-actions">
            <Link className="cb-btn cb-btn--primary" href="/book?src=free-build-welcome">
              Book My Twenty Minutes
              <CalendarCheck aria-hidden="true" />
            </Link>
            <a className="cb-btn cb-btn--ghost" href="tel:+19035008898">
              Or Call Me: (903) 500-8898
            </a>
          </div>
        </div>
      </section>

      <section className="cb-band">
        <div className="cb-shell">
          <p className="cb-eyebrow">Have these ready</p>
          <h2 className="cb-h2">Three things, and none of them are passwords.</h2>
          <div className={styles.cardGrid}>
            <div className={styles.miniCard}>
              <h3>
                <PhoneCall aria-hidden="true" style={{ width: 18, height: 18, marginRight: 8 }} />
                What you actually do
              </h3>
              <p>
                In your words, the way you would tell a neighbor. Who you want calling you and what
                you want them to do when they land. That is most of the call.
              </p>
            </div>
            <div className={styles.miniCard}>
              <h3>
                <Camera aria-hidden="true" style={{ width: 18, height: 18, marginRight: 8 }} />
                Photos and a logo, if you have them
              </h3>
              <p>
                Real photos of real work beat stock every time. Phone photos are fine. If you do not
                have a logo, that is fine too, and we build without one.
              </p>
            </div>
            <div className={styles.miniCard}>
              <h3>
                <KeyRound aria-hidden="true" style={{ width: 18, height: 18, marginRight: 8 }} />
                Access approvals, not passwords
              </h3>
              <p>
                Facebook and Instagram go through Meta Business Manager partner access, X through
                delegate access, email through an invited seat. You click approve. You can revoke
                me in one click, any time.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="cb-band cb-band--ink">
        <div className="cb-shell">
          <p className="cb-eyebrow">What happens next</p>
          <h2 className="cb-h2">You will hear from me inside one business day.</h2>
          <p className="cb-lead">
            If you do not, call or text me at (903) 500-8898. That is my direct line, not a queue.
            The receipt for this payment is in your email from Stripe.
          </p>
          <div className="cb-actions">
            <Link className="cb-btn cb-btn--primary" href="/book?src=free-build-welcome">
              Book My Twenty Minutes
              <CalendarCheck aria-hidden="true" />
            </Link>
            <Link className="cb-btn cb-btn--ghost" href="/portfolio">
              See What I Have Built
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
