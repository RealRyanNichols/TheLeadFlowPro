import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  MapPin,
  Plus,
  ShieldCheck,
  Target,
  TrendingUp,
  WalletCards,
} from "lucide-react";
import CtaLink from "@/components/site/CtaLink";
import { withPublicPageMetadata } from "@/lib/publicPageMetadata";
import { CONSULTATION } from "@/lib/site/consultation";
import { PRICES, usd } from "@/lib/site/prices";
import {
  MANAGED_COMMERCIAL_TERMS,
  MANAGED_PLANS,
  managedAdditionalScopeExplanation,
  managedAdvertisingExplanation,
  managedBillingExplanation,
  managedCampaignSummary,
  managedCompletionExplanation,
  managedRenewalExplanation,
} from "@/lib/site/managedPlans";
import {
  agencyIntakeHref,
  productProjectIntakeHref,
} from "@/lib/site/agencyIntake";
import { PROJECT_QUOTE_SUMMARY } from "@/lib/site/projectQuotes";
import styles from "./managed-pricing.module.css";

export const metadata: Metadata = withPublicPageMetadata("/pricing", {
  title: "90-Day Campaign Pricing | The LeadFlow Pro",
  description: `Start a 90-day campaign from ${usd(PRICES.managedStartingUpfront)} upfront. Agree on your territory, signed-job target, advertising allocation, and scope before launch.`,
  openGraph: {
    title: "One campaign. Up to 90 days.",
    description: managedCampaignSummary(),
  },
});

const QUESTIONS = [
  {
    question: "What if I need a smaller storefront or product project?",
    answer: PROJECT_QUOTE_SUMMARY,
  },
  {
    question: "What does the upfront investment include?",
    answer: managedBillingExplanation(),
  },
  {
    question: "What happens if we reach the target early?",
    answer: managedCompletionExplanation(),
  },
  {
    question: "Can I invest more in the initial campaign?",
    answer: managedAdditionalScopeExplanation(),
  },
  {
    question: "Is advertising spend included?",
    answer: managedAdvertisingExplanation(),
  },
  {
    question: "What happens at the 90-day review?",
    answer: managedRenewalExplanation(),
  },
  {
    question: "What counts as an acquired job?",
    answer:
      "A farm/ag job must have signed or paid confirmation, with attribution and reporting agreed in the written scope. We count real estate and mortgage deals at completion. An inquiry, appointment, or unaccepted estimate is not a completed outcome. We agree on how cancellations and disputed attribution are handled before launch.",
  },
  {
    question: "Are the outcome targets guaranteed?",
    answer:
      "No. A target gives the campaign a clear objective; it is not a promise of sales. Market demand, qualification, your pricing, response time, capacity, and closing process affect results. We review the evidence together at day 90 if the target has not been reached; there is no automatic extension.",
  },
  {
    question: "How does service-area protection work?",
    answer:
      "We check your services and geography before agreeing to territory protection. Interest on the map is not a reservation. Your written agreement defines the services and area protected.",
  },
];

export default async function PricingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const upfront = usd(MANAGED_COMMERCIAL_TERMS.startingUpfrontUsd);
  const farmRate = usd(PRICES.farmAcquiredJobPlanningTarget);
  const propertyRate = usd(PRICES.propertyCompletedDealPlanningTarget);
  const intake = agencyIntakeHref(MANAGED_PLANS[0].id, query);
  const projectIntake = productProjectIntakeHref(query);
  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <section className={styles.hero}>
          <div>
            <p className={styles.eyebrow}>
              Managed acquisition. A clear starting offer.
            </p>
            <h1>
              Your first 90 days. <span>Built to win work.</span>
            </h1>
            <p className={styles.lead}>
              Start at {upfront} upfront. We build one acquisition campaign
              around your business, your territory, and the jobs you want to
              win. The campaign runs for up to 90 days, with its outcome target
              agreed before launch.
            </p>
            <div className={styles.actions}>
              <CtaLink
                href={intake}
                event="managed_plan_intake"
                placement="pricing_hero"
                className={styles.primary}
              >
                Scope my campaign
                <ArrowRight size={16} aria-hidden="true" />
              </CtaLink>
              <Link href="/service-areas" className={styles.secondary}>
                Check my service area
                <MapPin size={16} aria-hidden="true" />
              </Link>
            </div>
            <p className={styles.trust}>
              <ShieldCheck size={16} aria-hidden="true" />
              Your scope, advertising allocation, outcome target, and
              responsibilities are agreed in writing before you pay.
            </p>
          </div>
          <aside
            className={styles.commitment}
            aria-label="The single initial campaign offer"
          >
            <small>90-Day Acquisition Campaign</small>
            <strong>{upfront}</strong>
            <span>minimum upfront · up to 90 days</span>
            <p>
              Includes onboarding, the agreed build, and the agreed advertising
              allocation. One campaign investment, with no separate setup fee.
            </p>
            <div className={styles.outcome}>
              <Target size={23} aria-hidden="true" />
              <div>
                <strong>15 farm/ag jobs</strong>
                <span>
                  Initial target · signed or paid confirmation
                  <br />
                  {farmRate} per targeted acquired job
                </span>
              </div>
            </div>
          </aside>
        </section>

        <section
          className={styles.projectScope}
          aria-labelledby="project-scope-title"
        >
          <div>
            <p className={styles.eyebrow}>Build around what you need</p>
            <h2 id="project-scope-title">Have a product ready to sell?</h2>
            <p>{PROJECT_QUOTE_SUMMARY}</p>
          </div>
          <CtaLink
            href={projectIntake}
            event="product_project_intake"
            placement="pricing_project_scope"
            className={styles.secondary}
          >
            Scope my product project
            <ArrowRight size={16} aria-hidden="true" />
          </CtaLink>
        </section>

        <section
          id="plans"
          aria-labelledby="plans-title"
          className={styles.campaignSection}
        >
          <div className={styles.intro}>
            <div>
              <p className={styles.eyebrow}>Define it. Build it. Measure it.</p>
              <h2 id="plans-title">A campaign with a finish line.</h2>
            </div>
            <p>
              We measure the work you actually win. Leads and appointments help
              create opportunities; they do not count as acquired jobs.
            </p>
          </div>
          <ol className={styles.steps}>
            <li>
              <span>01</span>
              <h3>Agree on the campaign</h3>
              <p>
                Confirm your services, territory, capacity, start date,
                acquisition target, and included advertising allocation.
              </p>
            </li>
            <li>
              <span>02</span>
              <h3>Launch and improve</h3>
              <p>
                Connect the agreed build, creative, advertising, and follow-up.
                Review inquiries and attributed signed or paid jobs together.
              </p>
            </li>
            <li>
              <span>03</span>
              <h3>Reach the target or review</h3>
              <p>
                Acquisition ends at the agreed target or day 90. If the target
                is reached on day 45, acquisition is complete. Captured
                inquiries are still handed over.
              </p>
            </li>
          </ol>
          <p className={styles.finePrint}>
            Day 90 is a results review if the target is still unmet. There is no
            automatic extension, renewal charge, or promise of a specific
            result.
          </p>
        </section>

        <section className={styles.benchmarks} aria-labelledby="targets-title">
          <div>
            <p className={styles.eyebrow}>Add acquisition scope</p>
            <h2 id="targets-title">
              Same campaign.
              <br />
              More room to grow.
            </h2>
            <p>{managedAdditionalScopeExplanation()}</p>
            <p>
              Our CPA planning rates describe the investment per targeted
              acquired outcome. They are our commercial rates, not published
              industry averages or the price of an unclosed lead.
            </p>
          </div>
          <div className={styles.benchmarkGrid}>
            <article>
              <small>Farm/ag & service industries</small>
              <strong>{farmRate}</strong>
              <span>per additional targeted signed or paid job</span>
              <p>
                The {upfront} farm/ag base campaign targets 15 acquired jobs.
                Other service industries confirm their outcome goal in writing.
              </p>
            </article>
            <article>
              <small>Real estate & mortgage</small>
              <strong>{propertyRate}</strong>
              <span>
                per additional targeted completed deal while we dial it in
              </span>
              <p>
                At this planning rate, {upfront} targets 5 completed deals. Your
                scope confirms the goal.
              </p>
            </article>
          </div>
        </section>

        <section className={styles.growth} aria-labelledby="growth-title">
          <div>
            <p className={styles.eyebrow}>The next engagement</p>
            <h2 id="growth-title">
              When it works,
              <br />
              build on it.
            </h2>
            <p>{managedRenewalExplanation()}</p>
          </div>
          <div className={styles.growthCheck}>
            <TrendingUp size={32} aria-hidden="true" />
            <h3>Grow with the evidence.</h3>
            <ul>
              <li>
                <Check size={17} aria-hidden="true" />
                Review acquired outcomes and campaign costs
              </li>
              <li>
                <Check size={17} aria-hidden="true" />
                Confirm staffing and capacity for more work
              </li>
              <li>
                <Check size={17} aria-hidden="true" />
                Agree on a larger scope and price in writing
              </li>
            </ul>
            <CtaLink
              href={intake}
              event="managed_plan_intake"
              placement="pricing_growth"
              className={styles.primary}
            >
              Talk through my business
              <ArrowRight size={16} aria-hidden="true" />
            </CtaLink>
          </div>
        </section>

        <section className={styles.faq} aria-labelledby="faq-title">
          <div>
            <p className={styles.eyebrow}>Before you commit</p>
            <h2 id="faq-title">Know what you’re buying.</h2>
          </div>
          <div>
            {QUESTIONS.map(({ question, answer }) => (
              <details key={question}>
                <summary>
                  {question}
                  <Plus size={17} aria-hidden="true" />
                </summary>
                <p>{answer}</p>
              </details>
            ))}
          </div>
        </section>
        <section className={styles.next}>
          <p className={styles.eyebrow}>Make the first move</p>
          <h2>Give the campaign a business worth growing.</h2>
          <p>
            Tell us what you do, where you work, and how much new work you can
            take on. We’ll check territory availability and confirm whether the
            campaign fits.
          </p>
          <div className={styles.actions}>
            <CtaLink
              href={intake}
              event="managed_plan_intake"
              placement="pricing_footer"
              className={styles.primary}
            >
              Scope my 90-day campaign
              <ArrowRight size={16} aria-hidden="true" />
            </CtaLink>
            <CtaLink
              href={CONSULTATION.href}
              event={CONSULTATION.funnel}
              placement="pricing_consultation"
              className={styles.secondary}
            >
              Book a free consultation
              <WalletCards size={16} aria-hidden="true" />
            </CtaLink>
          </div>
          <p className={styles.finePrint}>
            Looking for a separate software tool?{" "}
            <Link href="/tools">Explore our tools and their own pricing.</Link>
          </p>
        </section>
      </div>
    </main>
  );
}
