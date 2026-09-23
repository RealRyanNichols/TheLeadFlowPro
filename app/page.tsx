import { withPublicPageMetadata } from "@/lib/publicPageMetadata";
export const metadata = withPublicPageMetadata("/", {
  title: "Marketing Agency in Longview, TX: Ads, Websites, Follow-Up | The LeadFlow Pro",
  description:
    "The LeadFlow Pro builds and runs the lead system for Longview and East Texas businesses: ads, websites, funnels, and follow-up in accounts you own. Start with a free 30-minute consultation.",
});
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Globe,
  MapPin,
  Megaphone,
  MessageSquareText,
  ShieldCheck,
} from "lucide-react";
import ConsultationForm from "@/components/site/ConsultationForm";
import HomeScoreboard from "@/components/site/HomeScoreboard";
import { TOOL_COUNT } from "@/lib/tools";
import { BUSINESS } from "@/lib/site/business";
import { CONSULTATION } from "@/lib/site/consultation";
import { PRICES, usd } from "@/lib/site/prices";
import { TEXT_LABEL, smsHref } from "@/lib/site/textLinks";
import {
  graph,
  jsonLdText,
  localBusinessJsonLd,
  organizationJsonLd,
  webPageJsonLd,
  websiteJsonLd,
} from "@/lib/site/structuredData";

// The homepage has one job: get a business owner to ask for the free
// thirty-minute consultation. No events, no courses. What we build and run,
// how the sit-down works, proof from the scoreboard, and the form.
//
// Re-rendered every 15 minutes so the scoreboard rows stay current.
export const revalidate = 900;

const HOME_JSONLD = graph(
  organizationJsonLd(),
  localBusinessJsonLd(),
  websiteJsonLd(),
  webPageJsonLd(
    "/",
    "Marketing Agency in Longview, TX: Ads, Websites, Follow-Up | The LeadFlow Pro",
    "Ads, websites, funnels, and follow-up built and run for Longview and East Texas businesses in accounts they own. Start with a free 30-minute consultation.",
  ),
);

const STEPS = [
  {
    title: "Send the form.",
    body: "Name, business, phone, and what is getting in the way. That is it. Ryan calls or texts within one business day to set the time and the place.",
  },
  {
    title: "Pick the place.",
    body: `Your shop, the ${BUSINESS.city} office, or a call. In ${BUSINESS.city} and ${BUSINESS.region}, Ryan comes to you and sees the business the way your customers do.`,
  },
  {
    title: "Bring everything.",
    body: "Thirty minutes, all of it on the table. You leave with the first thing to fix and your next three moves, whether you hire us or not.",
  },
] as const;

const CONSULT_HREF = `#${CONSULTATION.anchor}`;

export default function HomePage() {
  return (
    <main className="lf-home">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdText(HOME_JSONLD) }}
      />
      <section className="lf-hero lf-shell">
        <div className="lf-hero-copy">
          <p className="lf-eyebrow">
            THE LEADFLOW PRO / {BUSINESS.city.toUpperCase()}, {BUSINESS.region.toUpperCase()} AND BEYOND
          </p>
          <h1>
            More leads for {BUSINESS.region} businesses.
            <br />
            Less busywork.
            <br />
            <em>We handle it for you.</em>
          </h1>
          <p className="lf-intro">
            Websites, funnels, lead follow-up, and the automation behind them.
            Built and run for your business, in accounts you own. You run the
            business. We run the system.
          </p>
          <div className="lf-actions">
            <a className="lf-button" href={CONSULT_HREF} data-cta="consultation_cta" data-cta-placement="home_hero_copy">
              Book my free {CONSULTATION.minutes}-minute consultation{" "}
              <ArrowRight size={19} aria-hidden="true" />
            </a>
            <a className="lf-text-link" href="#what-we-do">
              See what we build and run <ArrowUpRight size={18} aria-hidden="true" />
            </a>
          </div>
          <div className="lf-hero-trust">
            <span>
              <ShieldCheck size={16} aria-hidden="true" /> Your business. Your
              accounts. Your leads.
            </span>
            <span>
              <MapPin size={16} aria-hidden="true" /> We come to you in{" "}
              {BUSINESS.region}. Or meet at the {BUSINESS.city} office.
            </span>
          </div>
        </div>
        <div className="lf-hero-feature" id={CONSULTATION.anchor}>
          <div className="lf-consult">
            <div className="lf-consult-head">
              <span>{CONSULTATION.eyebrow.toUpperCase()}</span>
              <h2 id="free-consultation-title">{CONSULTATION.headline}</h2>
              <p>{CONSULTATION.body}</p>
            </div>
            <ConsultationForm placement={CONSULTATION.placement} labelledBy="free-consultation-title" />
          </div>
        </div>
      </section>

      <section className="lf-section lf-section-raised" id="what-we-do">
        <div className="lf-shell">
          <div className="lf-section-heading">
            <div>
              <p className="lf-eyebrow">WE DO THE WORK</p>
              <h2>
                You run the business.
                <br />
                <em>We run the system.</em>
              </h2>
            </div>
            <p>
              No courses to finish. No software to learn. Tell us what you sell
              and who you want more of. We build it, run it, and hand you the
              results in accounts you own.
            </p>
          </div>
          <div className="lf-path-grid">
            <article>
              <span className="lf-path-number">01 / LEADS</span>
              <Megaphone aria-hidden="true" />
              <h3>Leads that reach your phone, not a spreadsheet.</h3>
              <p>
                Facebook, Instagram, and Google ads built in your own accounts.
                Lead forms wired to your inbox, your CRM, and your phone. You
                can see which ad paid for which job.
              </p>
              <Link href="/agency/meta-ads">
                See the lead service <ArrowRight size={18} aria-hidden="true" />
              </Link>
              <small>
                Customers search for you by name or need?{" "}
                <Link href="/agency/google-ads">See Google Ads.</Link>
              </small>
            </article>
            <article>
              <span className="lf-path-number">02 / FOLLOW-UP</span>
              <MessageSquareText aria-hidden="true" />
              <h3>Follow-up that runs whether you are free or not.</h3>
              <p>
                Every inquiry becomes a record with an owner. The first reply
                goes out fast. The rest runs on a ladder you approve, with
                consent and STOP handled. Documented and pausable, in your
                accounts.
              </p>
              <Link href="/agency/automation">
                See the automation service <ArrowRight size={18} aria-hidden="true" />
              </Link>
              <small>
                Just want the messages written?{" "}
                <Link href="/go/lead-follow-up">
                  Follow-Up Campaign, {usd(PRICES.leadFollowUpCampaign)}.
                </Link>
              </small>
            </article>
            <article>
              <span className="lf-path-number">03 / WEBSITES AND FUNNELS</span>
              <Globe aria-hidden="true" />
              <h3>A website and a funnel that give people a next step.</h3>
              <p>
                Five pages that say what you do, what it costs, and how to
                reach you from a phone. One offer page with the follow-up
                behind it. Built in accounts you own.
              </p>
              <Link href="/agency/websites">
                See the website service <ArrowRight size={18} aria-hidden="true" />
              </Link>
              <small>
                Know you want the five pages?{" "}
                <Link href="/packages/launch">
                  Website Launch is {usd(PRICES.websiteLaunchTotal)}.
                </Link>
              </small>
            </article>
          </div>
        </div>
      </section>

      <section className="lf-section lf-shell" id="how-it-works">
        <div className="lf-section-heading">
          <div>
            <p className="lf-eyebrow">THE FREE CONSULTATION</p>
            <h2>
              Thirty minutes.
              <br />
              <em>Bring everything.</em>
            </h2>
          </div>
          <p>
            No pitch deck. No homework you have to finish first. Show Ryan the
            real business and get straight answers.
          </p>
        </div>
        <div className="lf-consult-grid">
          <ol className="lf-steps">
            {STEPS.map((step, index) => (
              <li key={step.title}>
                <span aria-hidden="true">{index + 1}</span>
                <div>
                  <h3>{step.title}</h3>
                  <p>{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
          <aside className="lf-bring" aria-labelledby="bring-title">
            <h3 id="bring-title">What to bring</h3>
            <ul>
              {CONSULTATION.bring.map((item) => (
                <li key={item}>
                  <Check size={18} aria-hidden="true" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <div className="lf-actions">
              <a className="lf-button" href={CONSULT_HREF} data-cta="consultation_cta" data-cta-placement="home_how_it_works">
                Book my free consultation <ArrowRight size={18} aria-hidden="true" />
              </a>
              <a className="lf-text-link" href={BUSINESS.phone.tel} data-cta="call" data-cta-placement="home_how_it_works">
                Or call {BUSINESS.phone.display}
              </a>
              <a className="lf-text-link" href={smsHref("home_how_it_works")} data-cta="text" data-cta-placement="home_how_it_works">
                {TEXT_LABEL}
              </a>
            </div>
          </aside>
        </div>
      </section>

      <section className="lf-section lf-section-raised" id="results">
        <div className="lf-shell">
          <div className="lf-section-heading">
            <div>
              <p className="lf-eyebrow">PROOF, NOT PROMISES</p>
              <h2>
                The work should
                <br />
                <em>show up on the board.</em>
              </h2>
            </div>
            <p>
              Our own businesses, running on the same system we build for
              clients. Real records from their own accounts. Definitions
              printed on every board.
            </p>
          </div>
          <HomeScoreboard />
          <div className="lf-actions">
            <Link className="lf-text-link" href="/scoreboard">
              Explore every business’s scoreboard{" "}
              <ArrowRight size={18} aria-hidden="true" />
            </Link>
            <Link className="lf-text-link" href="/results">
              See the work behind the numbers{" "}
              <ArrowRight size={18} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      <section className="lf-section lf-shell">
        <div className="lf-resource-grid">
          <Link href="/tools">
            <span className="lf-eyebrow">YOUR TOOLBOX</span>
            <strong>
              {TOOL_COUNT} free tools.
              <br />
              Find one that helps today.
            </strong>
            <p>
              Work out a price, see what missed calls cost, or plan your next
              move. No login.
            </p>
            <span className="lf-text-link">
              Open the tools <ArrowRight aria-hidden="true" />
            </span>
          </Link>
          <Link href="/articles">
            <span className="lf-eyebrow">PLAIN-ENGLISH GUIDES</span>
            <strong>
              Read it.
              <br />
              Use it in your business.
            </strong>
            <p>
              Practical answers with steps you can use. No wall of technical
              jargon.
            </p>
            <span className="lf-text-link">
              Read the articles <ArrowRight aria-hidden="true" />
            </span>
          </Link>
        </div>
      </section>

      <section className="lf-final">
        <div className="lf-shell">
          <p className="lf-eyebrow">
            {BUSINESS.city.toUpperCase()}. {BUSINESS.region.toUpperCase()}. ANYWHERE.
          </p>
          <h2>
            You run the business.
            <br />
            <em>We will run the system.</em>
          </h2>
          <p>
            Thirty minutes. Bring what you have got. Leave knowing what to fix
            first.
          </p>
          <div className="lf-actions">
            <a className="lf-button" href={CONSULT_HREF} data-cta="consultation_cta" data-cta-placement="home_final">
              Book my free consultation <ArrowRight aria-hidden="true" />
            </a>
            <a className="lf-text-link" href={BUSINESS.phone.tel} data-cta="call" data-cta-placement="home_final">
              Call {BUSINESS.phone.display} <ArrowRight aria-hidden="true" />
            </a>
            <a className="lf-text-link" href={smsHref("home_final")} data-cta="text" data-cta-placement="home_final">
              {TEXT_LABEL} <ArrowRight aria-hidden="true" />
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
