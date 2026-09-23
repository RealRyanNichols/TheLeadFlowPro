import type { Metadata } from "next";
import Link from "next/link";
import { MessageSquareText, PhoneCall } from "lucide-react";
import { FIVE_OFFER } from "@/lib/fiveOffer";
import { BUSINESS } from "@/lib/site/business";
import { fetchPaidSession } from "@/lib/stripeSession";
import { usd } from "@/lib/site/prices";
import FiveContactLink from "../FiveContactLink";
import styles from "../five.module.css";

// Where a paid spot lands. One job: get the day 1 call booked while the buyer
// is still holding the phone, and tell them the four things to have ready.
// The thirty days start at that call, so this page has to make texting the
// business name and a two hour window feel like the obvious next tap.

export const metadata: Metadata = {
  title: "You have one of the five | The LeadFlow Pro",
  robots: { index: false, follow: false },
};

export default async function FiveWelcomePage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { session_id: sessionId } = await searchParams;
  const paid = await fetchPaidSession(sessionId);
  const isFive = paid?.kind === FIVE_OFFER.kind;

  if (!paid || !isFive) {
    return (
      <main className={`cb-page ${styles.page}`}>
        <section className="cb-hero">
          <div className="cb-shell">
            <p className="cb-eyebrow">{paid ? "Payment confirmed" : "Payment not confirmed"}</p>
            <h1 className={`cb-h1 ${styles.heroH1}`}>
              Let us check your next step.<em>Your receipt has the details.</em>
            </h1>
            <p className={styles.heroLead}>
              {paid
                ? `Stripe confirms a payment of ${usd(paid.amountUsd)}, but this link does not identify one of the five spots. Check your receipt or text Ryan and he will sort it.`
                : "We could not verify a completed payment from this link. If you already paid, check your Stripe receipt or text Ryan before paying again."}
            </p>
            <div className={styles.heroActions}>
              <FiveContactLink href={BUSINESS.phone.sms} kind="sms" className="cb-btn cb-btn--primary">
                <MessageSquareText aria-hidden="true" />
                Text {BUSINESS.phone.display}
              </FiveContactLink>
              <Link href={FIVE_OFFER.path} className="cb-btn cb-btn--ghost">
                Back to The Five
              </Link>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className={`cb-page ${styles.page}`}>
      <section className="cb-hero">
        <div className="cb-shell">
          <p className="cb-eyebrow">Paid. You have one of the five.</p>
          <h1 className={`cb-h1 ${styles.heroH1}`}>
            You are in.<em>Now let us get the shoot on the calendar.</em>
          </h1>
          <p className={styles.heroLead}>
            Stripe confirms {usd(paid.amountUsd)}. Your thirty days start at the day 1 call, not
            today, so nothing is ticking while we find the date. Fastest way to start: text me your
            business name and the best two hour window this week.
          </p>
          <div className={styles.heroActions}>
            <FiveContactLink href={BUSINESS.phone.sms} kind="sms" className="cb-btn cb-btn--primary">
              <MessageSquareText aria-hidden="true" />
              Text {BUSINESS.phone.display}
            </FiveContactLink>
            <FiveContactLink href={BUSINESS.phone.tel} kind="phone" className="cb-btn cb-btn--ghost">
              <PhoneCall aria-hidden="true" />
              Call {BUSINESS.phone.display}
            </FiveContactLink>
          </div>
          <p className={styles.heroFine}>
            Save the number. Every call about your thirty days comes from it.
          </p>
        </div>
      </section>

      <section className="cb-band cb-band--tight">
        <div className="cb-shell">
          <div className={styles.sectionHead}>
            <p className="cb-eyebrow">What happens next</p>
            <h2 className="cb-h2">Four things, in order.</h2>
          </div>
          <ol className={styles.welcomeSteps}>
            <li>
              <div>
                <h3>I call you within one business day</h3>
                <p>
                  Thirty minutes from {BUSINESS.phone.display}. Your offer, your area, your best
                  customer, and the shoot date. Have your Facebook Page name handy.
                </p>
              </div>
            </li>
            <li>
              <div>
                <h3>Leadsie sends you one link</h3>
                <p>
                  It connects your Facebook Page and ad account to me without handing over a
                  password. You can pull the access any time, including day 31.
                </p>
              </div>
            </li>
            <li>
              <div>
                <h3>The shoot, days 2 to 5</h3>
                <p>
                  Up to {FIVE_OFFER.shootHours} hours at your place. Bring a clean shirt with your
                  logo if you have one, your truck or storefront, and one customer story you can
                  tell in sixty seconds. I bring the mic and the camera.
                </p>
              </div>
            </li>
            <li>
              <div>
                <h3>Page, posts, emails, then the ad goes live on day 7</h3>
                <p>
                  You approve the offer page and the first week of posts. The ad launches on your
                  account with the daily budget we agreed on the call. Ad spend goes from your card
                  to Meta, never through me.
                </p>
              </div>
            </li>
          </ol>
          <p className={styles.legal}>
            Your Stripe receipt is your record of payment. Questions about anything above go to{" "}
            {BUSINESS.email.hello} or the number on this page.
          </p>
        </div>
      </section>
    </main>
  );
}
