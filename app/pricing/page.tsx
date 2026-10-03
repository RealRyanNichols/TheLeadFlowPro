import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Building2,
  Layers3,
  MapPin,
  Plus,
  ShieldCheck,
  Target,
  Users,
  WalletCards,
} from "lucide-react";
import CtaLink from "@/components/site/CtaLink";
import { withPublicPageMetadata } from "@/lib/publicPageMetadata";
import { CONSULTATION } from "@/lib/site/consultation";
import { usd } from "@/lib/site/prices";
import {
  ACQUISITION_PLANNING_TARGETS,
  MANAGED_COMMERCIAL_TERMS,
  MANAGED_PLANS,
  acquisitionPlanningExplanation,
  managedAdvertisingExplanation,
  managedBillingExplanation,
  managedMonthlySummary,
  managedPlanPrice,
  managedUpfrontSummary,
} from "@/lib/site/managedPlans";
import styles from "./managed-pricing.module.css";
import { agencyIntakeHref } from "@/lib/site/agencyIntake";

export const metadata: Metadata = withPublicPageMetadata("/pricing", {
  title: "Managed Plans & Pricing | The LeadFlow Pro",
  description: `${managedUpfrontSummary()} ${managedMonthlySummary()} Choose a starting plan or a larger custom engagement built around your business.`,
  openGraph: {
    title: managedUpfrontSummary(),
    description: `${managedMonthlySummary()} Scope and ongoing costs are agreed in writing.`,
  },
});

const SCOPE_FACTORS = [
  {
    icon: Layers3,
    title: "The assets already in place",
    body: "Your website, accounts, customer records, content, and existing systems shape what needs to be built or connected.",
  },
  {
    icon: Users,
    title: "The people doing the work",
    body: "Staffing, responsibilities, approvals, and the support your team needs determine the capacity we plan around.",
  },
  {
    icon: Target,
    title: "The business and its market",
    body: "Your offer, industry, locations, service area, and customer demand determine the work that makes sense.",
  },
  {
    icon: WalletCards,
    title: "The advertising budget",
    body: "The proposal names the advertising allocation and how it fits the delivery plan, alongside the agreed billing dates.",
  },
];

const QUESTIONS = [
  {
    question: "What should I expect before we start?",
    answer: `${managedUpfrontSummary()} ${managedMonthlySummary()} Your written proposal names the commitment, billing dates, ongoing price, and the work we are responsible for.`,
  },
  {
    question: "What does the upfront payment cover?",
    answer: managedBillingExplanation(),
  },
  {
    question: "What work can the plan cover?",
    answer:
      "We scope marketing, ads, websites, customer records, follow-up, content, video, and operating systems around what the business needs. Your proposal names the actual work, deliverables, capacity, and review points.",
  },
  {
    question: "How does the advertising budget work?",
    answer: managedAdvertisingExplanation(),
  },
  {
    question: "How does service-area protection work?",
    answer:
      "We review your services and geography before agreeing to territory protection. Interest on the map is not a reservation. Your written agreement defines the services and area protected.",
  },
];

export default async function PricingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const upfront = usd(MANAGED_COMMERCIAL_TERMS.startingUpfrontUsd);
  const monthly = usd(MANAGED_COMMERCIAL_TERMS.minimumMonthlyUsd);
  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <section className={styles.hero}>
          <div>
            <p className={styles.eyebrow}>A serious plan for the business</p>
            <h1>
              <span>{upfront} upfront.</span>Built for your business.
            </h1>
            <p className={styles.lead}>
              Expect {upfront} upfront for the initial month. Ongoing service
              starts at {monthly}/month. Your plan includes onboarding, the
              agreed build, and its advertising allocation.
            </p>
            <div className={styles.actions}>
              <CtaLink
                href={agencyIntakeHref(null, query)}
                event="managed_plan_intake"
                placement="pricing_hero"
                className={styles.primary}
              >
                Find my plan
                <ArrowRight size={16} aria-hidden="true" />
              </CtaLink>
              <Link href="/service-areas" className={styles.secondary}>
                Check my service area
                <MapPin size={16} aria-hidden="true" />
              </Link>
            </div>
            <p className={styles.trust}>
              <ShieldCheck size={16} aria-hidden="true" />
              Every proposal names the work, advertising allocation,
              responsibilities, and billing dates before we start.
            </p>
          </div>
          <aside
            className={styles.commitment}
            aria-label="Starting investment and ongoing monthly minimum"
          >
            <small>Your starting expectation</small>
            <strong>{upfront}</strong>
            <span>upfront · first month of our most chosen plan</span>
            <p>{managedBillingExplanation()}</p>
            <div className={styles.monthlyFloor}>
              <WalletCards size={23} aria-hidden="true" />
              <div>
                <strong>{monthly} / month minimum</strong>
                <span>Ongoing service · exact scope agreed in writing</span>
              </div>
            </div>
          </aside>
        </section>

        <section aria-labelledby="plans-title" id="plans">
          <div className={styles.intro}>
            <div>
              <p className={styles.eyebrow}>Clear expectations</p>
              <h2 id="plans-title">Choose the right level of work.</h2>
            </div>
            <p>
              The first month is paid upfront. Each plan includes its
              advertising allocation and agreed delivery scope. Larger business
              needs receive a custom quote.
            </p>
          </div>
          <div className={styles.plans}>
            {MANAGED_PLANS.map((plan) => {
              const price = managedPlanPrice(plan);
              return (
                <article
                  key={plan.id}
                  id={plan.id}
                  className={`${styles.plan} ${plan.id === "recommended" ? styles.recommended : ""}`}
                >
                  {plan.badge ? (
                    <span className={styles.badge}>{plan.badge}</span>
                  ) : null}
                  <small>
                    {plan.id === "recommended"
                      ? "The recommended plan"
                      : plan.id === "foundation"
                        ? "The minimum monthly engagement"
                        : "More capacity. More moving parts."}
                  </small>
                  <h3>{plan.name}</h3>
                  <div className={styles.price}>
                    <strong>{price.amount}</strong>
                    <span>{price.unit}</span>
                    <small className={styles.initialPayment}>
                      {usd(plan.firstMonthUsd)} first month · paid upfront
                    </small>
                  </div>
                  <p>{plan.description}</p>
                  <div className={styles.billingNote}>
                    <ShieldCheck size={14} aria-hidden="true" />
                    <span>{plan.billingNote}</span>
                  </div>
                  <CtaLink
                    href={agencyIntakeHref(plan.id, query)}
                    event="managed_plan_intake"
                    placement={`pricing_${plan.id}`}
                    className={
                      plan.id === "recommended"
                        ? styles.primary
                        : styles.secondary
                    }
                  >
                    {plan.cta}
                    <ArrowRight size={15} aria-hidden="true" />
                  </CtaLink>
                </article>
              );
            })}
          </div>
          <div className={styles.custom}>
            <div>
              <p className={styles.eyebrow}>Custom engagement</p>
              <h3>Need more than a structured plan?</h3>
              <p>
                Higher capacity, larger teams, more locations, and broader
                systems are scoped around the real business. We define the work,
                resources, and price together.
              </p>
            </div>
            <CtaLink
              href={agencyIntakeHref("custom", query)}
              event="managed_plan_intake"
              placement="pricing_custom"
              className={styles.secondary}
            >
              Scope my business
              <ArrowRight size={16} aria-hidden="true" />
            </CtaLink>
          </div>
        </section>

        <section className={styles.scope} aria-labelledby="scope-title">
          <p className={styles.eyebrow}>Why the plan changes</p>
          <h2 id="scope-title">The scope follows the business.</h2>
          <div className={styles.scopeGrid}>
            {SCOPE_FACTORS.map((factor) => (
              <article key={factor.title}>
                <factor.icon size={25} aria-hidden="true" />
                <h3>{factor.title}</h3>
                <p>{factor.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section
          className={styles.benchmarks}
          aria-labelledby="benchmarks-title"
        >
          <div>
            <p className={styles.eyebrow}>Plan around winning work</p>
            <h2 id="benchmarks-title">Planning targets by industry.</h2>
            <p>{acquisitionPlanningExplanation()}</p>
          </div>
          <div className={styles.benchmarkGrid}>
            {ACQUISITION_PLANNING_TARGETS.map((target) => (
              <article key={target.industry}>
                <small>{target.industry}</small>
                <strong>About {usd(target.amountUsd)}</strong>
                <span>Per {target.outcome.toLowerCase()}</span>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.faq} aria-labelledby="questions-title">
          <div>
            <p className={styles.eyebrow}>Before we get to work</p>
            <h2 id="questions-title">Know what you are agreeing to.</h2>
          </div>
          <div>
            {QUESTIONS.map((item) => (
              <details key={item.question}>
                <summary>
                  {item.question}
                  <Plus size={16} aria-hidden="true" />
                </summary>
                <p>{item.answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section className={styles.next}>
          <p className={styles.eyebrow}>Your next move</p>
          <h2>
            Bring the business.
            <br />
            We&rsquo;ll build the plan.
          </h2>
          <p>
            Start with a practical conversation about your goals, team, assets,
            and market. Leave with a clear direction for the work and the scope
            we need to agree.
          </p>
          <div className={styles.actions}>
            <CtaLink
              href={CONSULTATION.href}
              event="consultation_cta"
              placement="pricing_final"
              className={styles.primary}
            >
              Book a consultation
              <ArrowRight size={16} aria-hidden="true" />
            </CtaLink>
            <Link href="/agency" className={styles.secondary}>
              See the managed services
              <Building2 size={16} aria-hidden="true" />
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
