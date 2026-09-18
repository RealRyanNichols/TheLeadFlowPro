import type { Metadata } from "next";
import Link from "next/link";
import { CalendarCheck, KeyRound, MessageSquareText, PhoneCall, Plug, ShieldCheck } from "lucide-react";
import ConversionPing from "@/components/ConversionPing";
import { AGENCY_PAYMENT, agencyPaymentFromMetadata } from "@/lib/agencyPayment";
import { PLUGIN } from "@/lib/pluginDocs";
import { PRIVATE_PAGE_METADATA } from "@/lib/publicPageMetadata";
import { getSettings } from "@/lib/settings";
import { BUSINESS } from "@/lib/site/business";
import { usd } from "@/lib/site/prices";
import { fetchPaidSession } from "@/lib/stripeSession";

// Where a paid agency scope lands. Verifies the Checkout session with Stripe
// before saying a word, then does two jobs: get the accounts connected while
// the buyer is still at the screen, and put the plugin in front of them so
// they see their own leads from day one.

export const metadata: Metadata = {
  ...PRIVATE_PAGE_METADATA,
  title: "Payment received | The LeadFlow Pro Agency",
};

const SMS_BODY = encodeURIComponent("Hi Ryan, my agency scope is paid. When do we start the Map call?");

export default async function AgencyPaidPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { session_id: sessionId } = await searchParams;
  const paid = await fetchPaidSession(sessionId);
  const isAgency = paid?.kind === AGENCY_PAYMENT.kind;

  if (!paid || !isAgency) {
    return (
      <main className="cb-page">
        <section className="cb-hero">
          <div className="cb-shell">
            <p className="cb-eyebrow">{paid ? "Payment confirmed" : "Payment not confirmed"}</p>
            <h1 className="cb-h1">
              Let us check your next step.
              <em>Your receipt has the details.</em>
            </h1>
            <p className="cb-hero-lead">
              {paid
                ? `Stripe confirms a payment of ${usd(paid.amountUsd)}, but this link does not identify an agency scope. Check your receipt or contact Ryan for the next step for your purchase.`
                : "We could not verify a completed payment from this link. If you already paid, check your Stripe receipt or contact Ryan before paying again. Nothing is charged by opening this page."}
            </p>
            <div className="cb-actions">
              <Link href="/contact" className="cb-btn cb-btn--primary">
                Get help with my next step
                <PhoneCall aria-hidden="true" />
              </Link>
              <Link href="/agency" className="cb-btn cb-btn--ghost">
                Back to the agency lane
              </Link>
            </div>
          </div>
        </section>
      </main>
    );
  }

  const settings = await getSettings();
  const details = agencyPaymentFromMetadata(paid.metadata ?? null);
  const serviceName = details.service?.name ?? "Your agency scope";
  const cadence = details.billing === "monthly" ? "a month" : "one time";
  const needsAccounts = !details.service || ["meta-ads", "google-ads", "automation", "content"].includes(details.service.slug);

  return (
    <main className="cb-page">
      <ConversionPing
        googleAdsId={settings.google_ads_id}
        conversionLabel={settings.google_ads_conversion_label}
        purchase
        value={paid.amountUsd}
        dedupeKey={paid.eventId}
        sku={`agency_${details.service?.slug ?? "scope"}`}
      />
      <section className="cb-hero">
        <div className="cb-shell">
          <p className="cb-eyebrow">Payment received</p>
          <h1 className="cb-h1">
            {serviceName} is paid.
            <em>Now let us get you connected.</em>
          </h1>
          <p className="cb-hero-lead">
            {usd(paid.amountUsd)} {cadence}
            {details.reference ? `, against the scope marked "${details.reference}"` : ""}. Stripe&rsquo;s
            receipt is your record and the written scope is the contract. Ryan reaches out within one
            business day to start the Map step. Two things you can do right now move the launch date
            closer.
          </p>
          <div className="cb-actions">
            {needsAccounts ? (
              <Link href="/connect" className="cb-btn cb-btn--primary" data-cta="agency_paid_connect">
                Connect your accounts
                <KeyRound aria-hidden="true" />
              </Link>
            ) : (
              <a className="cb-btn cb-btn--primary" href={`${BUSINESS.phone.sms}?&body=${SMS_BODY}`}>
                Text Ryan to book the Map call
                <CalendarCheck aria-hidden="true" />
              </a>
            )}
            <a className="cb-btn cb-btn--ghost" href={BUSINESS.phone.tel}>
              Or call: {BUSINESS.phone.display}
            </a>
          </div>
          <p className="cb-hero-own">
            <ShieldCheck aria-hidden="true" className="h-5 w-5" />
            {details.billing === "monthly"
              ? "Renews on the same date each month until you cancel. Cancel by replying to the receipt or texting Ryan; it stops at the end of the paid month."
              : "One-time. Nothing renews. Anything more is a new line on a new written scope."}
          </p>
        </div>
      </section>

      <section className="cb-band">
        <div className="cb-shell">
          <p className="cb-eyebrow">Right now, from your phone</p>
          <h2 className="cb-h2 cb-heading">Three things, and none of them are passwords.</h2>
          <div className="cb-doors">
            <div className="cb-door">
              <span className="cb-door-num">01</span>
              <h3>Connect your accounts</h3>
              <p>
                Log in with Facebook, tap approve, done. Your Business Manager, ad account, page, and
                pixel are created in your name or stay there. Google Ads is a manager invite to your
                customer ID, sent by Ryan. You can revoke access in one click, any time.
              </p>
              <div className="cb-actions">
                <Link href="/connect" className="cb-btn cb-btn--primary">
                  Open the connect page
                  <KeyRound aria-hidden="true" />
                </Link>
              </div>
            </div>
            <div className="cb-door">
              <span className="cb-door-num">02</span>
              <h3>Book the Map call</h3>
              <p>
                One call: what you sell, who buys it, where leads come from now, and the launch date.
                The scope already says what gets built; the call sets the order and the dates.
              </p>
              <div className="cb-actions">
                <a className="cb-btn cb-btn--ghost" href={`${BUSINESS.phone.sms}?&body=${SMS_BODY}`}>
                  Text Ryan
                  <MessageSquareText aria-hidden="true" />
                </a>
              </div>
            </div>
            <div className="cb-door cb-door--ink">
              <span className="cb-door-num">03</span>
              <h3>See your own leads from day one</h3>
              <p>
                {PLUGIN.connectorName} runs the same capture, record, follow-up loop inside ChatGPT or
                Claude. Every inquiry the build produces lands in your inbox with a morning brief and a
                who-to-call list. {PLUGIN.priceLabel}, {PLUGIN.trialDays} days free, cancel yourself.
              </p>
              <div className="cb-actions">
                <Link href="/plugin" className="cb-btn cb-btn--ghost">
                  See the plugin
                  <Plug aria-hidden="true" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="cb-band cb-band--ink">
        <div className="cb-shell">
          <p className="cb-eyebrow">What happens next</p>
          <h2 className="cb-h2">You will hear from Ryan inside one business day.</h2>
          <p className="cb-lead">
            If you do not, call or text {BUSINESS.phone.display}. That is his direct line, not a queue.
            Nothing is built and nothing runs without your written approval, and ad spend goes from your
            card to Meta or Google directly, never through The LeadFlow Pro.
          </p>
          <div className="cb-actions">
            <Link href="/agency" className="cb-btn cb-btn--ghost">
              Back to the agency lane
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
