import { withPublicPageMetadata } from "@/lib/publicPageMetadata";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check, CreditCard, KeyRound, MessageSquareText, Plug, ShieldCheck } from "lucide-react";
import SiteHero from "@/components/site/system/SiteHero";
import FinalCta from "@/components/site/system/FinalCta";
import CaseStudies from "@/components/site/CaseStudy";
import AgencyIntake from "./start/AgencyIntake";
import { AGENCY_PAYMENT, agencyFixedPriceUsd, agencyPayHref } from "@/lib/agencyPayment";
import { PLUGIN } from "@/lib/pluginDocs";
import { AGENCY_HUB, AGENCY_PROCESS, AGENCY_SERVICES, OWNERSHIP_PROMISE, agencyOffer } from "@/lib/site/agency";
import { BUSINESS } from "@/lib/site/business";
import { TBD_PRICE_LABEL } from "@/lib/site/offers";
import { PRICES, usd } from "@/lib/site/prices";
import { breadcrumbJsonLd, graph, jsonLdText, localBusinessJsonLd } from "@/lib/site/structuredData";

// The agency hub: the "run it for me" lane. Every child page reads from
// lib/site/agency.ts; pricing reads from lib/site/offers.ts and prints the
// TBD line until Ryan sets a number.
//
// The page has to work, not just describe: the intake form is on the page
// (section #intake), the written-scope payment has its own door
// (/agency/pay), account access is one tap away (/connect), and the plugin
// is where the client watches the leads land.

export const metadata: Metadata = withPublicPageMetadata("/agency", {
  title: "Agency: Meta ads, Google Ads, websites, automation, video, content | The LeadFlow Pro",
  description:
    "Full-service ads, websites, automation, video, and content for East Texas businesses, run in accounts you own. You pay the platforms directly and keep the pixel, audiences, leads, and reporting.",
});

const ALWAYS_TRUE = [
  "No guaranteed leads, cost per lead, ranking, or return on ad spend. Anyone promising those is guessing with your money.",
  "The free five-page website stays the front door. If that is what you need first, apply for it and skip the intake.",
  "Prices for the agency services are confirmed on the scoping call and written down before anything starts. Paying that number happens on this site, by card, against the scope.",
];

export default function AgencyHubPage() {
  const jsonLd = graph(
    localBusinessJsonLd({
      id: `${BUSINESS.siteUrl}/agency#localbusiness`,
      name: `${BUSINESS.name} Agency`,
      catalogName: "Agency services",
      offerIds: AGENCY_SERVICES.map((s) => s.offerId),
      knowsAbout: ["Meta ads management", "Google Ads management", "Business websites", "Marketing automation", "Video production", "Content marketing"],
    }),
    breadcrumbJsonLd([
      { name: "Home", path: "/" },
      { name: "Agency", path: "/agency" },
    ]),
  );
  return (
    <main className="cb-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdText(jsonLd) }} />
      <SiteHero
        compact
        eyebrow={AGENCY_HUB.eyebrow}
        mutedTitle={AGENCY_HUB.title}
        title="Ads, websites, automation, video, and content. Run for you. Owned by you."
        body={AGENCY_HUB.lead}
        media={{
          src: "/images/homepage-v2/company-operating-loop.webp",
          alt: "The operating loop: capture, record, follow-up, sale, delivery, reporting",
          kicker: "The loop",
          caption: "Capture, record, follow up, sell, deliver, report. In your accounts.",
        }}
        primary={{ href: "#intake", label: "Tell Ryan what is leaking" }}
        secondary={{ href: "#services", label: "See the six services" }}
        trustLine={OWNERSHIP_PROMISE.headline}
      />

      <section id="services" className="cb-band" tabIndex={-1}>
        <div className="cb-shell">
          <div className="cb-headrow">
            <div>
              <p className="cb-eyebrow">Six services, one loop</p>
              <h2 className="cb-h2 cb-heading">Pick the piece that is leaking.</h2>
            </div>
            <p className="cb-lead">
              Each one is scoped on its own, priced in writing before it starts, and built so it keeps
              working if we ever part ways.
            </p>
          </div>
          <div className="cb-servicegrid">
            {AGENCY_SERVICES.map((service) => {
              const offer = agencyOffer(service);
              const fixed = agencyFixedPriceUsd(service);
              const live = offer.status === "live";
              return (
                <article key={service.slug} className="cb-servicecard" data-service={service.slug}>
                  <p className="cb-eyebrow">{service.eyebrow}</p>
                  <h3>{service.name}</h3>
                  <p>{service.promise}</p>
                  <div className="cb-servicecard-price">
                    {live ? (
                      <>
                        <strong>{offer.priceLabel}</strong>
                        <span>{service.slug === "websites" ? `Or apply for the free program, ${usd(PRICES.freeBuildFee)} build fee.` : "Published price. Pay it on this site."}</span>
                      </>
                    ) : (
                      <>
                        {TBD_PRICE_LABEL}
                        <span>Written down before anything starts. Paid by card against the scope.</span>
                      </>
                    )}
                  </div>
                  <Link href={`/agency/${service.slug}`} className="cb-textlink" data-cta="agency_service_open" data-cta-placement={service.slug}>
                    See what is included <ArrowRight aria-hidden="true" />
                  </Link>
                  {fixed !== null || service.slug !== "websites" ? (
                    <Link href={agencyPayHref(service.slug)} className="cb-textlink" data-cta="agency_service_pay" data-cta-placement={service.slug}>
                      Pay a written scope <CreditCard aria-hidden="true" />
                    </Link>
                  ) : (
                    <Link href="/free-build" className="cb-textlink" data-cta="agency_service_apply" data-cta-placement={service.slug}>
                      Apply for the free website <ArrowRight aria-hidden="true" />
                    </Link>
                  )}
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section id="start" className="cb-band cb-band--tint" aria-labelledby="doors-title" tabIndex={-1}>
        <div className="cb-shell">
          <div className="cb-headrow">
            <div>
              <p className="cb-eyebrow">Three doors, all of them real</p>
              <h2 id="doors-title" className="cb-h2 cb-heading">
                Answers in. Payment in. Accounts connected.
              </h2>
            </div>
            <p className="cb-lead">
              Every door on this page does something. The form saves to Ryan&rsquo;s own desk, the
              payment goes through Stripe against a written number, and account access is one login
              and one tap.
            </p>
          </div>
          <div className="cb-doors">
            <div className="cb-door">
              <span className="cb-door-num">01 · Tell</span>
              <h3>Ten questions, one business day.</h3>
              <p>
                Business, channels, the ad budget you are genuinely prepared to spend, the bottleneck,
                who decides, and when. Saved the second you send it, with an alert on Ryan&rsquo;s phone.
              </p>
              <ul>
                <li><Check aria-hidden="true" /> A written reply within one business day</li>
                <li><Check aria-hidden="true" /> The scope, ownership, and price in writing before anything starts</li>
                <li><Check aria-hidden="true" /> A $0 ad budget does not disqualify you</li>
              </ul>
              <div className="cb-actions">
                <Link href="#intake" className="cb-btn cb-btn--primary" data-cta="agency_door_intake" data-cta-placement="agency_hub">
                  Start the intake
                  <MessageSquareText aria-hidden="true" />
                </Link>
              </div>
            </div>
            <div className="cb-door">
              <span className="cb-door-num">02 · Pay</span>
              <h3>Pay the number in writing.</h3>
              <p>
                Already have your scope? Pick the service, one-time or monthly, type the number Ryan
                wrote down, and pay by card through Stripe. Nothing on the page can change what was
                agreed.
              </p>
              <ul>
                <li><Check aria-hidden="true" /> One-time for a setup, build, shoot, or project</li>
                <li><Check aria-hidden="true" /> Monthly for a management fee, cancel yourself</li>
                <li><Check aria-hidden="true" /> Ad spend never passes through The LeadFlow Pro</li>
              </ul>
              <div className="cb-actions">
                <Link href={AGENCY_PAYMENT.payPath} className="cb-btn cb-btn--primary" data-cta="agency_door_pay" data-cta-placement="agency_hub">
                  Pay a written scope
                  <CreditCard aria-hidden="true" />
                </Link>
              </div>
            </div>
            <div className="cb-door cb-door--ink">
              <span className="cb-door-num">03 · Connect</span>
              <h3>Your accounts, your name, one tap.</h3>
              <p>
                Log in with Facebook, tap approve, and the Business Manager, ad account, page, and
                pixel are created in your name or stay there. Google Ads is a manager invite to your
                own customer ID. No passwords, ever. Revoke in one click.
              </p>
              <ul>
                <li><Check aria-hidden="true" /> Nothing is built anywhere but your accounts</li>
                <li><Check aria-hidden="true" /> The first-party trace from ad to lead to outcome stays in your records</li>
                <li><Check aria-hidden="true" /> Fire Ryan tomorrow and everything keeps working</li>
              </ul>
              <div className="cb-actions">
                <Link href="/connect" className="cb-btn cb-btn--ghost" data-cta="agency_door_connect" data-cta-placement="agency_hub">
                  Connect your accounts
                  <KeyRound aria-hidden="true" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="cb-band" aria-labelledby="ownership-title">
        <div className="cb-shell">
          <div className="cb-headrow">
            <div>
              <p className="cb-eyebrow">The ownership promise</p>
              <h2 id="ownership-title" className="cb-h2 cb-heading">
                {OWNERSHIP_PROMISE.headline}
              </h2>
            </div>
            <p className="cb-lead">
              The same promise the free-website program makes, applied to ads, automation, and media.
              It is the part most agencies cannot say out loud.
            </p>
          </div>
          <ul className="sv-form-points mt-8">
            {OWNERSHIP_PROMISE.points.map((point) => (
              <li key={point}>
                <ShieldCheck aria-hidden="true" className="h-5 w-5" />
                {point}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="cb-band cb-band--tint" aria-labelledby="process-title">
        <div className="cb-shell">
          <div className="cb-headrow">
            <div>
              <p className="cb-eyebrow">How it runs</p>
              <h2 id="process-title" className="cb-h2 cb-heading">
                Map, scope, build, launch, measure.
              </h2>
            </div>
            <p className="cb-lead">{AGENCY_HUB.budgetNote}</p>
          </div>
          <ol className="cb-steps mt-8">
            {AGENCY_PROCESS.map((step) => (
              <li key={step.step} className="cb-step">
                <span className="cb-step-num">{step.step}</span>
                <div>
                  <h3 className="cb-h3">{step.name}</h3>
                  <p>{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="plugin" className="cb-band" aria-labelledby="plugin-title" tabIndex={-1}>
        <div className="cb-shell">
          <div className="cb-headrow">
            <div>
              <p className="cb-eyebrow">Plug in</p>
              <h2 id="plugin-title" className="cb-h2 cb-heading">
                Watch the leads land from inside ChatGPT or Claude.
              </h2>
            </div>
            <p className="cb-lead">
              The loop the agency installs is the same loop the plugin runs. Clients who want to see
              their own inbox, brief, and follow-ups without logging into anything install it once.
            </p>
          </div>
          <div className="cb-doors cb-doors--two">
            <div className="cb-door cb-door--ink">
              <span className="cb-door-num">{PLUGIN.connectorName}</span>
              <h3>Every inquiry the build produces, in one inbox, with a who-to-call list.</h3>
              <p>
                Instant reply in your voice, a call-now alert, follow-ups on a ladder, a morning brief,
                and a weekly scoreboard. {PLUGIN.priceLabel}, {PLUGIN.trialDays} days free, cancel
                yourself from your account. Ads reports read your own ad accounts, never a copy.
              </p>
              <div className="cb-actions">
                <Link href="/plugin" className="cb-btn cb-btn--ghost" data-cta="agency_plugin_open" data-cta-placement="agency_hub">
                  See the plugin
                  <Plug aria-hidden="true" />
                </Link>
                <Link href={PLUGIN.signupHref} className="cb-textlink" data-cta="plugin_checkout_start" data-cta-placement="agency_hub">
                  Start the free trial <ArrowRight aria-hidden="true" />
                </Link>
              </div>
            </div>
            <div className="cb-door">
              <span className="cb-door-num">Or your own tools</span>
              <h3>Already run a CRM, a phone system, or an email tool? It gets built there.</h3>
              <p>
                The automation service installs the loop in the accounts you already pay for, with
                every automation documented: trigger, consent rule, delay, stop condition, owner. The
                plugin is one option, never a requirement.
              </p>
              <div className="cb-actions">
                <Link href="/agency/automation" className="cb-btn cb-btn--ghost" data-cta="agency_service_open" data-cta-placement="automation_plugin_band">
                  See the automation service
                  <ArrowRight aria-hidden="true" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="cb-band cb-band--tint" aria-labelledby="proof-title">
        <div className="cb-shell">
          <div className="cb-headrow">
            <div>
              <p className="cb-eyebrow">Proof, with definitions</p>
              <h2 id="proof-title" className="cb-h2 cb-heading">
                Businesses running on the same loop.
              </h2>
            </div>
            <p className="cb-lead">
              Every figure names the business, the window, the source, and the date it was read. Lead
              records are not unique people and not customers.
            </p>
          </div>
          <div className="mt-10">
            <CaseStudies />
          </div>
        </div>
      </section>

      <section className="cb-band" aria-labelledby="fit-title">
        <div className="cb-shell">
          <div className="cb-headrow">
            <div>
              <p className="cb-eyebrow">Before you fill in the form</p>
              <h2 id="fit-title" className="cb-h2 cb-heading">
                Three things that are always true here.
              </h2>
            </div>
          </div>
          <ul className="sv-form-points mt-8">
            {ALWAYS_TRUE.map((line) => (
              <li key={line}>
                <Check aria-hidden="true" className="h-5 w-5" />
                {line}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="intake" className="cb-band sv-form-band cb-agency-intake scroll-mt-24" aria-labelledby="intake-title" tabIndex={-1}>
        <div className="cb-shell sv-form-grid">
          <div className="sv-form-intro">
            <p className="cb-eyebrow">The intake</p>
            <h2 id="intake-title" className="cb-h2 cb-heading">
              Tell Ryan what is leaking.
            </h2>
            <p className="cb-lead">
              Ten questions. The answers land on Ryan&rsquo;s desk the moment you send them, with a
              note back to your inbox. Expect a text or call within one business day to map the first
              ninety days.
            </p>
            <ul className="sv-form-points">
              <li>
                <Check aria-hidden="true" className="h-5 w-5" />
                Nothing is scoped, built, or billed until you see it in writing.
              </li>
              <li>
                <Check aria-hidden="true" className="h-5 w-5" />
                Your accounts stay in your name. Ad spend goes from your card to the platform.
              </li>
              <li>
                <Check aria-hidden="true" className="h-5 w-5" />
                Rather talk first? Call or text {BUSINESS.phone.display}. That is Ryan&rsquo;s direct line.
              </li>
            </ul>
          </div>
          <div className="sv-form-card">
            <AgencyIntake
              services={AGENCY_SERVICES.map((s) => ({ slug: s.slug, label: s.navLabel }))}
              preselected={null}
              placement="agency_hub"
            />
          </div>
        </div>
      </section>

      <FinalCta
        eyebrow="Run it for me"
        title="Scope in writing. Paid by card. Built in your name."
        body="If you already have the scope, pay it and Ryan starts the Map call. If you do not, the intake above gets you one within one business day."
        primary={{ href: AGENCY_PAYMENT.payPath, label: "Pay a written scope" }}
        secondary={{ href: BUSINESS.phone.tel, label: `Call or text ${BUSINESS.phone.display}`, external: true }}
      />
    </main>
  );
}
