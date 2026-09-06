import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  CalendarCheck2,
  CircleCheckBig,
  GraduationCap,
  MessageSquareText,
} from "lucide-react";
import { getSettings } from "@/lib/settings";
import ConversionPing from "@/components/ConversionPing";
import { fetchPaidSession } from "@/lib/stripeSession";
import { purchaseConfirmation } from "@/lib/purchaseConfirmation";
import styles from "./thank-you.module.css";

export const metadata = {
  title: "Got It | The LeadFlow Pro",
  robots: { index: false, follow: true },
};

function ConfirmationShell({
  icon: Icon,
  eyebrow,
  title,
  accent,
  lead,
  actions,
  tracking,
  followUp,
  confirmationLabel = "Confirmation received",
  statusNote = "Your confirmation is recorded. The next step is shown here.",
}: {
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  accent: string;
  lead: ReactNode;
  actions: ReactNode;
  tracking?: ReactNode;
  followUp?: ReactNode;
  confirmationLabel?: string;
  statusNote?: string;
}) {
  return (
    <main className={`cb-page ${styles.page}`}>
      {tracking}
      <section className={`cb-hero ${styles.hero}`}>
        <div className="cb-shell cb-hero-layout">
          <div className="cb-hero-copy">
            <div className={styles.statusIcon}>
              <Icon aria-hidden="true" />
            </div>
            <p className="cb-eyebrow">{eyebrow}</p>
            <h1 className="cb-h1">
              {title}
              <em>{accent}</em>
            </h1>
            <p className="cb-hero-lead">{lead}</p>
            <div className="cb-actions">{actions}</div>
            <p className="cb-hero-own">
              <CircleCheckBig aria-hidden="true" />
              {statusNote}
            </p>
          </div>

          <figure className="cb-hero-visual">
            <Image
              src="/images/offer-v2/website-launch-approval-path.webp"
              alt="A secure approval path moving from intake through build, review, and launch"
              width={1672}
              height={941}
              priority
              sizes="(max-width: 900px) 100vw, 56vw"
            />
            <figcaption>
              <span>{confirmationLabel}</span>
              <strong>One clear next step. No lost handoff.</strong>
            </figcaption>
          </figure>
        </div>
      </section>
      {followUp}
    </main>
  );
}

export default async function ThankYou({
  searchParams,
}: {
  searchParams: Promise<{ purchase?: string; session_id?: string }>;
}) {
  const { purchase, session_id: sessionId } = await searchParams;
  const settings = await getSettings();

  const paid = await fetchPaidSession(sessionId);
  const confirmation = purchaseConfirmation({ purchase, sessionId }, paid);
  const tracking = paid ? (
    <ConversionPing
      googleAdsId={settings.google_ads_id}
      conversionLabel={settings.google_ads_conversion_label}
      purchase
      value={paid.amountUsd}
      dedupeKey={paid.eventId}
    />
  ) : undefined;

  if (confirmation === "unverified") {
    return (
      <ConfirmationShell
        icon={MessageSquareText}
        eyebrow="Payment not confirmed"
        title="Let’s check your payment."
        accent="You have a clear next step."
        lead={<>We could not verify a completed payment from this link. If you already paid,
          check your Stripe receipt or contact Ryan so we can confirm your order before you pay again.</>}
        confirmationLabel="Payment verification needed"
        statusNote="An unverified link does not confirm a purchase."
        actions={<>
          <Link href="/contact" className="cb-btn cb-btn--primary">Get help with my payment<ArrowRight aria-hidden="true" /></Link>
          <Link href="/" className="cb-btn cb-btn--ghost">Back Home</Link>
        </>}
      />
    );
  }

  if (confirmation === "deposit") {
    return (
      <ConfirmationShell
        icon={CircleCheckBig}
        eyebrow="Build payment confirmed"
        title="Payment received."
        accent="The build moves."
        lead={
          <>
            Your payment is credited in full toward the build. Your receipt is on the
            way by email. Ryan will be in touch with the next step and what he needs from
            you, usually the same day.
          </>
        }
        tracking={tracking}
        actions={
          <>
            <Link href="/portfolio" className="cb-btn cb-btn--primary">
              See What Gets Built
              <ArrowRight aria-hidden="true" />
            </Link>
            <Link href="/contact" className="cb-btn cb-btn--ghost">
              Send Ryan a Message
            </Link>
          </>
        }
      />
    );
  }

  if (confirmation === "event") {
    return (
      <ConfirmationShell
        icon={CalendarCheck2}
        eyebrow="Workshop payment received"
        title="Payment received."
        accent="Check your confirmation."
        lead={
          <>
            Your workshop payment is confirmed. Check your email for your registration details
            and next step. Contact Ryan if your confirmation has not arrived.
          </>
        }
        actions={
          <>
            <Link href="/events" className="cb-btn cb-btn--primary">
              Back to Events
              <ArrowRight aria-hidden="true" />
            </Link>
            <Link href="/training" className="cb-btn cb-btn--ghost">
              Get a Head Start · Free Course
            </Link>
          </>
        }
      />
    );
  }

  // A paid System Map is a diagnostic engagement, not a course. The old page
  // told a $497 buyer "Training access confirmed" and sent them to /login.
  // The package page promises "a short intake so the call starts warm"; the
  // Business Growth Diagnostic is that intake.
  if (confirmation === "system_map") {
    return (
      <ConfirmationShell
        icon={CircleCheckBig}
        eyebrow="System Map paid"
        title="Your System Map is on the books."
        accent="One intake and the call starts warm."
        lead={
          <>
            Payment received. Ryan reaches out within one business day from (903) 500-8898 to
            schedule your mapping call. Do the ten-minute Business Growth Diagnostic first if you
            can. It is the exact intake he uses, and it means the call starts with your numbers
            instead of small talk.
          </>
        }
        tracking={tracking}
        actions={
          <>
            <Link
              href="/diagnostic?utm_source=website&utm_medium=thank_you&utm_campaign=system_map_intake"
              className="cb-btn cb-btn--primary"
            >
              Start the intake
              <ArrowRight aria-hidden="true" />
            </Link>
            <Link href="/portfolio" className="cb-btn cb-btn--ghost">
              See What Gets Built
            </Link>
          </>
        }
      />
    );
  }

  if (confirmation === "training") {
    return (
      <ConfirmationShell
        icon={GraduationCap}
        eyebrow="Training access confirmed"
        title="You’re in."
        accent="Welcome to the owners’ side."
        lead={
          <>
            Payment received. Check your email for your getting-started note. Create your
            login with the same email you purchased with and every course unlocks
            automatically.
          </>
        }
        tracking={tracking}
        actions={
          <>
            <Link href="/login" className="cb-btn cb-btn--primary">
              Create Your Login
              <ArrowRight aria-hidden="true" />
            </Link>
            <Link href="/training" className="cb-btn cb-btn--ghost">
              Go to Training
            </Link>
          </>
        }
      />
    );
  }

  if (confirmation === "payment") {
    return (
      <ConfirmationShell
        icon={CircleCheckBig}
        eyebrow="Payment confirmed"
        title="Payment received."
        accent="Your receipt has the details."
        lead={<>Check your email for the receipt and next steps for the item you purchased.
          Contact Ryan if you need help finding your order.</>}
        tracking={tracking}
        actions={<>
          <Link href="/contact" className="cb-btn cb-btn--primary">Get help with my order<ArrowRight aria-hidden="true" /></Link>
          <Link href="/" className="cb-btn cb-btn--ghost">Back Home</Link>
        </>}
      />
    );
  }

  return (
    <ConfirmationShell
      icon={MessageSquareText}
      eyebrow="Request received"
      title="Got it."
      accent="I’m on it."
      lead={
        <>
          Your info is in my system, the same one I will build for you, by the way. I will
          reach out within one business day to set up your call.
        </>
      }
      tracking={
        <ConversionPing
          googleAdsId={settings.google_ads_id}
          conversionLabel={settings.google_ads_conversion_label}
        />
      }
      actions={
        <>
          <Link href="/login" className="cb-btn cb-btn--primary">
            Create Your Login
            <ArrowRight aria-hidden="true" />
          </Link>
          <Link href="/" className="cb-btn cb-btn--ghost">
            Back Home
          </Link>
        </>
      }
      followUp={
        <section className="cb-band">
          <div className="cb-shell">
            {settings.calendar_url ? (
              <div className={styles.calendarPanel}>
                <div>
                  <p className="cb-eyebrow">Skip the back and forth</p>
                  <h2 className="cb-h2">Grab your time right now.</h2>
                  <p className="cb-lead">
                    Pick the time that works, or open the calendar in its own tab if that is
                    easier on your device.
                  </p>
                </div>
                <div>
                  <iframe
                    src={settings.calendar_url}
                    title="Book your call"
                  />
                  <a
                    href={settings.calendar_url}
                    target="_blank"
                    rel="noreferrer"
                    className="cb-btn cb-btn--ghost"
                  >
                    Open Calendar in a New Tab
                    <ArrowRight aria-hidden="true" />
                  </a>
                </div>
              </div>
            ) : (
              <div className={styles.headStart}>
                <GraduationCap aria-hidden="true" />
                <div>
                  <p className="cb-eyebrow">While you wait</p>
                  <h2>Want a head start?</h2>
                  <p>The first course in the training area is free.</p>
                </div>
                <Link href="/training" className="cb-btn cb-btn--primary">
                  Start the Free Course
                  <ArrowRight aria-hidden="true" />
                </Link>
              </div>
            )}
          </div>
        </section>
      }
    />
  );
}
