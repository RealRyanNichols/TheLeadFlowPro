import { withPublicPageMetadata } from "@/lib/publicPageMetadata";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check, CreditCard, KeyRound, MessageSquareText, Plug, ShieldCheck } from "lucide-react";
import SiteHero from "@/components/site/system/SiteHero";
import FinalCta from "@/components/site/system/FinalCta";
import CaseStudies from "@/components/site/CaseStudy";
import AgencyIntake from "./start/AgencyIntake";
import { AGENCY_PAYMENT } from "@/lib/agencyPayment";
import { PLUGIN } from "@/lib/pluginDocs";
import {
  AGENCY_HUB,
  AGENCY_PROCESS,
  AGENCY_SERVICES,
  CORE_AGENCY_SERVICES,
  OWNERSHIP_PROMISE,
  SPECIALTY_AGENCY_SERVICES,
  countWord,
  type AgencyService,
} from "@/lib/site/agency";
import { BUSINESS } from "@/lib/site/business";
import { PRICES, usd } from "@/lib/site/prices";
import {
  MANAGED_PLANS,
  managedAdvertisingExplanation,
  managedBillingExplanation,
  managedCampaignSummary,
  managedCompletionExplanation,
  managedRenewalExplanation,
  managedPlanPrice,
  managedUpfrontSummary,
} from "@/lib/site/managedPlans";
import { breadcrumbJsonLd, graph, jsonLdText, localBusinessJsonLd } from "@/lib/site/structuredData";

// The public campaign is scoped before purchase. Existing clients keep a separate
// signed-scope payment path; their agreed charge rules are unchanged.

export const metadata: Metadata = withPublicPageMetadata("/agency", {
  title: "Agency: Meta ads, Google Ads, websites, automation, video, content | The LeadFlow Pro",
  description:
    "Full-service ads, websites, automation, video, and content for East Texas businesses, plus specialty builds for crypto communities, CPA firms, and shops, run in accounts you own. Advertising is included in your written plan allocation. You keep your accounts and records.",
});

const ALWAYS_TRUE = [
  "No guaranteed leads, cost per lead, ranking, or return on ad spend. Anyone promising those is guessing with your money.",
  managedBillingExplanation(),
];

/** One service card: the promise, the price line, and the two doors. */
function ServiceCard({ service }: { service: AgencyService }) {
  return (
    <article className="cb-servicecard" data-service={service.slug}>
      <p className="cb-eyebrow">{service.eyebrow}</p>
      <h3>{service.name}</h3>
      <p>{service.promise}</p>
      <div className="cb-servicecard-price">
        <strong>Within your agreed campaign</strong>
        <span>The work and advertising allocation are agreed in writing.</span>
      </div>
      <Link href={`/agency/${service.slug}`} className="cb-textlink" data-cta="agency_service_open" data-cta-placement={service.slug}>
        See what is included <ArrowRight aria-hidden="true" />
      </Link>
      <Link href={service.intakeHref} className="cb-textlink" data-cta="agency_service_intake" data-cta-placement={service.slug}>
        Scope this work <ArrowRight aria-hidden="true" />
      </Link>
    </article>
  );
}

export default function AgencyHubPage() {
  const jsonLd = graph(
    localBusinessJsonLd({
      id: `${BUSINESS.siteUrl}/agency#localbusiness`,
      name: `${BUSINESS.name} Agency`,
      catalogName: "Agency services",
      offerIds: [],
      knowsAbout: ["Meta ads management", "Google Ads management", "Business websites", "Marketing automation", "Video production", "Content marketing", "Community help desks", "Crypto tax client intake", "XRP Ledger treasury alerts", "Crypto payment setup"],
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
        eyebrow="Run my marketing"
        mutedTitle="Your marketing."
        title="Handled for you."
        body={`Ads, websites, follow-up, video, and content, managed in accounts you own. ${managedUpfrontSummary()} ${managedCampaignSummary()} Advertising is included.`}
        media={{
          src: "/images/services/quote-follow-up-light.webp",
          alt: "A quote clipboard, reminder bell, calendar, and phone connected across a bright cream desk",
          kicker: "The work keeps moving",
          caption: "Ads, inquiries, follow-up, and the next decision. Handled in your accounts.",
        }}
        primary={{ href: "#intake", label: "Get my scope" }}
        secondary={{ href: "#plans", label: "See campaign terms" }}
        trustLine={OWNERSHIP_PROMISE.headline}
      />

      <section id="plans" className="cb-band cb-band--tint" aria-labelledby="plans-title" tabIndex={-1}>
        <div className="cb-shell">
          <div className="cb-headrow">
            <div>
              <p className="cb-eyebrow">One minimum starting campaign</p>
              <h2 id="plans-title" className="cb-h2 cb-heading">Up to 90 days, with a clear target.</h2>
            </div>
            <p className="cb-lead">{managedBillingExplanation()}</p>
          </div>
          <div className="cb-servicegrid mt-8" style={{ gridTemplateColumns: "minmax(0, 1fr)" }}>
            {MANAGED_PLANS.map((plan) => {
              const price = managedPlanPrice(plan);
              return (
                <article key={plan.id} className="cb-servicecard" data-managed-plan={plan.id}>
                  <p className="cb-eyebrow">{plan.badge ?? "Managed marketing"}</p>
                  <h3>{plan.name}</h3>
                  <p>{plan.description}</p>
                  <div className="cb-servicecard-price">
                    <strong>{price.amount} {price.unit}</strong>
                    <span>{plan.billingNote}</span>
                  </div>
                  <Link href="#intake" className="cb-textlink" data-cta="agency_plan_intake" data-cta-placement={plan.id}>
                    {plan.cta} <ArrowRight aria-hidden="true" />
                  </Link>
                </article>
              );
            })}
          </div>
          <p className="cb-lead mt-6">{managedAdvertisingExplanation()}</p>
          <p className="cb-lead mt-6">
            For farm/ag work, the planning goal is 15 acquired jobs with signed or
            paid confirmation at a {usd(PRICES.farmAcquiredJobPlanningTarget)} cost per acquisition. It is a target, not
            a promise. A lead or appointment is not an acquired job.
          </p>
          <p className="cb-lead mt-6">{managedCompletionExplanation()}</p>
          <p className="cb-lead mt-6">{managedRenewalExplanation()}</p>
        </div>
      </section>

      <section id="services" className="cb-band" tabIndex={-1}>
        <div className="cb-shell">
          <div className="cb-headrow">
            <div>
              <p className="cb-eyebrow">{countWord(CORE_AGENCY_SERVICES.length, true)} services, one loop</p>
              <h2 className="cb-h2 cb-heading">Pick the piece that is leaking.</h2>
            </div>
            <p className="cb-lead">
              Choose the priorities within your campaign. We define the work, acquisition target, capacity, and advertising allocation before it starts.
              {" "}<Link href="/services" className="underline underline-offset-4">Want a build your own team runs? Explore build services.</Link>
            </p>
          </div>
          <div className="cb-servicegrid">
            {CORE_AGENCY_SERVICES.map((service) => (
              <ServiceCard key={service.slug} service={service} />
            ))}
          </div>
        </div>
      </section>

      <section id="specialty" className="cb-band cb-band--tight cb-band--hair" aria-labelledby="specialty-title" tabIndex={-1}>
        <div className="cb-shell">
          <div className="cb-headrow">
            <div>
              <p className="cb-eyebrow">Specialty builds</p>
              <h2 id="specialty-title" className="cb-h2 cb-heading">
                Built for one kind of client.
              </h2>
            </div>
            <p className="cb-lead">
              {countWord(SPECIALTY_AGENCY_SERVICES.length, true)} services with a narrower audience, on the
              same rules as the rest of the lane: scoped and priced in writing, and built in accounts you own.
            </p>
          </div>
          <div className={SPECIALTY_AGENCY_SERVICES.length % 3 === 0 ? "cb-servicegrid" : "cb-servicegrid cb-servicegrid--two"}>
            {SPECIALTY_AGENCY_SERVICES.map((service) => (
              <ServiceCard key={service.slug} service={service} />
            ))}
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
                Business, channels, the campaign you are prepared to support, the bottleneck,
                who decides, and when. Saved the second you send it, with an alert on Ryan&rsquo;s phone.
              </p>
              <ul>
                <li><Check aria-hidden="true" /> A written reply within one business day</li>
                <li><Check aria-hidden="true" /> The scope, ownership, and price in writing before anything starts</li>
                <li><Check aria-hidden="true" /> Advertising is included in the agreed plan allocation</li>
              </ul>
              <div className="cb-actions">
                <Link href="#intake" className="cb-btn cb-btn--primary" data-cta="agency_door_intake" data-cta-placement="agency_hub">
                  Start the intake
                  <MessageSquareText aria-hidden="true" />
                </Link>
              </div>
            </div>
            <div className="cb-door">
              <span className="cb-door-num">Existing clients · Pay</span>
              <h3>Pay an existing written scope.</h3>
              <p>
                Already have your scope? Pick the service, one-time or monthly, type the number Ryan
                wrote down, and pay by card through Stripe. Nothing on the page can change what was
                agreed.
              </p>
              <ul>
                <li><Check aria-hidden="true" /> One-time for a setup, build, shoot, or project</li>
                <li><Check aria-hidden="true" /> Monthly for a management fee, cancel yourself</li>
                <li><Check aria-hidden="true" /> Your existing signed agreement controls this payment</li>
              </ul>
              <div className="cb-actions">
                <Link href={AGENCY_PAYMENT.payPath} className="cb-btn cb-btn--primary" data-cta="agency_door_pay" data-cta-placement="agency_hub">
                  Pay a written scope
                  <CreditCard aria-hidden="true" />
                </Link>
              </div>
            </div>
            <div className="cb-door cb-door--ink">
              <span className="cb-door-num">Existing clients · Connect</span>
              <h3>Your accounts, your name, one tap.</h3>
              <p>
                Log in with Facebook, tap approve, and the Business Manager, ad account, page, and
                pixel are created in your name or stay there. Google Ads is a manager invite to your
                own customer ID. No passwords, ever. Revoke in one click.
              </p>
              <ul>
                <li><Check aria-hidden="true" /> Nothing is built anywhere but your accounts</li>
                <li><Check aria-hidden="true" /> The first-party trace from ad to lead to outcome stays in your records</li>
                <li><Check aria-hidden="true" /> Your accounts, records, and owned systems stay with you</li>
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
              The same ownership promise every website build makes, applied to ads, automation, and media.
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
                {countWord(ALWAYS_TRUE.length, true)} things that are always true here.
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
                Your accounts stay in your name. The included advertising allocation is defined in your written campaign scope.
              </li>
              <li>
                <Check aria-hidden="true" className="h-5 w-5" />
                Rather talk first? Call or text {BUSINESS.phone.display}. That is Ryan&rsquo;s direct line.
              </li>
            </ul>
          </div>
          <div className="sv-form-card">
            <AgencyIntake
              services={[...CORE_AGENCY_SERVICES.map((s) => ({ slug: s.slug, label: s.navLabel })), { slug: "custom", label: "A custom build or another priority" }]}
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
