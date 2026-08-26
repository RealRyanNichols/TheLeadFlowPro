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
import { paidSession } from "@/lib/stripeSession";
import ConversionPing from "@/components/ConversionPing";
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
}: {
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  accent: string;
  lead: ReactNode;
  actions: ReactNode;
  tracking?: ReactNode;
  followUp?: ReactNode;
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
              Your confirmation is recorded. The next step is shown here.
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
              <span>Confirmation received</span>
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
  // What was actually collected, straight from Stripe. Null when there is no
  // session to check or Stripe will not confirm it; the conversion events
  // below then fire with no value rather than with an invented one.
  const paid = await paidSession(sessionId);
  const paidValue = paid?.amountUsd ?? null;
  const bought = purchase === "learn_it";
  const paidEvent = purchase === "event";
  const paidDeposit =
    purchase === "build_deposit" || purchase === "package_deposit" || purchase === "package_full";

  if (paidDeposit) {
    return (
      <ConfirmationShell
        icon={CircleCheckBig}
        eyebrow="Build payment confirmed"
        title="Payment received."
        accent="The build moves."
        lead={
          <>
            Your down payment is credited in full toward the build. Your receipt is on the
            way by email. Ryan will be in touch with the next step and what he needs from
            you, usually the same day.
          </>
        }
        tracking={
          <ConversionPing
            googleAdsId={settings.google_ads_id}
            conversionLabel={settings.google_ads_conversion_label}
            purchase
            value={paidValue}
          />
        }
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

  if (paidEvent) {
    return (
      <ConfirmationShell
        icon={CalendarCheck2}
        eyebrow="Registration confirmed"
        title="Seat locked."
        accent="See you there."
        lead={
          <>
            Payment received and your registration is confirmed. Bring your laptop and your
            questions. You&apos;ll leave knowing exactly how to own your platform.
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

  if (bought) {
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
        tracking={
          <ConversionPing
            googleAdsId={settings.google_ads_id}
            conversionLabel={settings.google_ads_conversion_label}
            purchase={bought}
            value={paidValue}
          />
        }
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
          purchase={bought}
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
