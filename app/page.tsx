import { withPublicPageMetadata } from "@/lib/publicPageMetadata";
export const metadata = withPublicPageMetadata("/", { title: "Your next move starts here | The LeadFlow Pro", description: "Find the right next step for your website, leads, follow-up, or business skills." });
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Megaphone,
  Wrench,
  ShieldCheck,
} from "lucide-react";
import NextStepGuide from "@/components/site/NextStepGuide";
import HomeScoreboard from "@/components/site/HomeScoreboard";
import BusinessTaskPreview from "@/components/site/BusinessTaskPreview";
import FeaturedEventBanner from "@/components/site/FeaturedEventBanner";
import FeaturedEventHero from "@/components/site/FeaturedEventHero";
import FeaturedEventPathCard from "@/components/site/FeaturedEventPathCard";
import { TOOL_COUNT } from "@/lib/tools";
import { PRICES, usd } from "@/lib/site/prices";
import { getFeaturedEventState } from "@/lib/site/eventState.server";
import {
  graph,
  jsonLdText,
  localBusinessJsonLd,
  organizationJsonLd,
  webPageJsonLd,
  websiteJsonLd,
} from "@/lib/site/structuredData";

// Re-rendered every 15 minutes, so the workshop surfaces swap to the
// post-event state on their own within a quarter hour of the room closing.
export const revalidate = 900;

const HOME_JSONLD = graph(
  organizationJsonLd(),
  localBusinessJsonLd(),
  websiteJsonLd(),
  webPageJsonLd(
    "/",
    "More Attention. More Leads. More Revenue. | The LeadFlow Pro",
    "Turn attention into conversations, conversations into qualified leads, and qualified leads into customers with one connected business system.",
  ),
);

export default async function HomePage() {
  const event = await getFeaturedEventState();
  return (
    <main className="lf-home">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdText(HOME_JSONLD) }}
      />
      <FeaturedEventBanner state={event} />
      <section className="lf-hero lf-shell">
        <div className="lf-hero-copy">
          <p className="lf-eyebrow">THE LEAD FLOW PRO / EAST TEXAS & BEYOND</p>
          <h1>
            More customers.
            <br />
            Less busywork.
            <br />
            <em>It’s not too late.</em>
          </h1>
          <p className="lf-intro">
            You don’t need to understand every new tool. You need a better way
            to get customers, follow up, and get work done. We’ll build it with
            you, run it for you, or show you how.
          </p>
          <div className="lf-actions">
            <Link className="lf-button" href="#qualify">
              Find my next step <ArrowRight size={19} aria-hidden="true" />
            </Link>
            <Link className="lf-text-link" href="#see-it-work">
              See how this helps <ArrowUpRight size={18} aria-hidden="true" />
            </Link>
          </div>
          <div className="lf-hero-trust">
            <span>
              <ShieldCheck size={16} aria-hidden="true" /> Your business. Your
              accounts.
            </span>
            <span>Beginners welcome.</span>
          </div>
        </div>
        <FeaturedEventHero state={event} />
      </section>
      <BusinessTaskPreview />
      <section className="lf-section lf-section-raised" id="qualify">
        <div className="lf-shell">
          <div className="lf-section-heading">
            <div>
              <p className="lf-eyebrow">LET’S MAKE THIS SIMPLE</p>
              <h2>
                You have a business to run.
                <br />
                <em>Start with what you need.</em>
              </h2>
            </div>
            <p>
              More leads? More time? A skill you can use? You belong here. Two
              choices will point you in the right direction.
            </p>
          </div>
          <NextStepGuide
            event={{
              status: event.status,
              shortDate: event.when.shortDate,
              detailsHref: event.detailsHref,
            }}
          />
        </div>
      </section>
      <section className="lf-section lf-shell" id="results">
        <div className="lf-section-heading">
          <div>
            <p className="lf-eyebrow">WE ALL WIN WHEN WE ALL WIN</p>
            <h2>
              The work should
              <br />
              <em>show up on the board.</em>
            </h2>
          </div>
          <p>
            Follow our progress and the businesses running on systems we’ve
            built. Real records. Clear definitions. Room to improve.
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
      </section>
      <section className="lf-section lf-section-raised" id="what-we-build">
        <div className="lf-shell">
          <div className="lf-section-heading">
            <div>
              <p className="lf-eyebrow">THREE WAYS TO MOVE FORWARD</p>
              <h2>
                Learn it. Build it.
                <br />
                <em>Put it to work.</em>
              </h2>
            </div>
            <p>
              Start where you are. Your age, experience, or last attempt does
              not decide what you can do next.
            </p>
          </div>
          <div className="lf-path-grid">
            <article>
              <span className="lf-path-number">01 / BUILD</span>
              <Wrench aria-hidden="true" />
              <h3>A website that gives people a next step.</h3>
              <p>
                Clear pages, an inquiry form, and the follow-up behind it. Apply
                for a five-page website with a {usd(PRICES.freeBuildFee)} build fee.
              </p>
              <Link href="/free-build">
                Check the free website program{" "}
                <ArrowRight size={18} aria-hidden="true" />
              </Link>
              <small>
                For approved businesses. Hosting and optional services are
                explained before you commit. Want it run for you too?{" "}
                <Link href="/agency">See the agency lane.</Link>
              </small>
            </article>
            <article>
              <span className="lf-path-number">02 / LEARN</span>
              <BookOpen aria-hidden="true" />
              <h3>A useful skill you can learn at your pace.</h3>
              <p>
                Written lessons, worked examples, and practical exercises. Start
                free, then choose the course that solves your next problem.
              </p>
              <Link href="/operator-academy">
                Explore the courses <ArrowRight size={18} aria-hidden="true" />
              </Link>
              <small>
                Prefer to try it first?{" "}
                <Link href="/chatgpt/free">Open the free starter lesson.</Link>
              </small>
            </article>
            <FeaturedEventPathCard state={event} />
          </div>
        </div>
      </section>
      <section className="lf-section lf-shell" id="run-it-for-me">
        <div className="lf-resource-grid">
          <Link href="/agency">
            <span className="lf-eyebrow">RUN IT FOR ME</span>
            <strong>
              Ads, content, follow-up, and media.
              <br />
              Handled, in accounts you own.
            </strong>
            <p>
              Meta and Google ads, websites, automation, video, and content, with
              the ad account, pixel, audiences, and leads in your name.
            </p>
            <span className="lf-text-link">
              See the agency lane <Megaphone aria-hidden="true" />
            </span>
          </Link>
          <Link href="/tools">
            <span className="lf-eyebrow">YOUR TOOLBOX</span>
            <strong>
              {TOOL_COUNT} free tools.
              <br />
              Find one that helps today.
            </strong>
            <p>
              Work out a price, spot a missed opportunity, or plan your next
              move.
            </p>
            <span className="lf-text-link">
              Open the tools <ArrowRight aria-hidden="true" />
            </span>
          </Link>
        </div>
      </section>
      <section className="lf-section lf-shell">
        <div className="lf-resource-grid">
          <Link href="/articles">
            <span className="lf-eyebrow">PLAIN-ENGLISH GUIDES</span>
            <strong>
              Read it.
              <br />
              Try it in your business.
            </strong>
            <p>
              Practical answers with steps you can use. No wall of technical
              jargon.
            </p>
            <span className="lf-text-link">
              Read the articles <ArrowRight aria-hidden="true" />
            </span>
          </Link>
          <Link href="/plugin">
            <span className="lf-eyebrow">INSIDE CHATGPT AND CLAUDE</span>
            <strong>
              Your leads, answered
              <br />
              from the assistant you already use.
            </strong>
            <p>
              The LeadFlow Pro Plugin puts every lead in one inbox and drafts the
              follow-up. {PRICES.pluginTrialDays} days free.
            </p>
            <span className="lf-text-link">
              See the plugin <ArrowRight aria-hidden="true" />
            </span>
          </Link>
        </div>
      </section>
      <section className="lf-final">
        <div className="lf-shell">
          <p className="lf-eyebrow">YOUNG. OLDER. SOMEWHERE IN BETWEEN.</p>
          <h2>
            You’re not behind.
            <br />
            <em>You just need a next step.</em>
          </h2>
          <p>
            We’ll explain it in plain English and start with one thing that
            matters to you.
          </p>
          <div className="lf-actions">
            <Link className="lf-button" href="#qualify">
              Find my next step <ArrowRight aria-hidden="true" />
            </Link>
            <Link className="lf-text-link" href="/contact">
              Talk with Ryan <ArrowRight aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
