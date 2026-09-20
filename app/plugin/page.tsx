import { withPublicPageMetadata } from "@/lib/publicPageMetadata";
import type { Metadata } from "next";
import Link from "next/link";
import {
  Bell,
  CalendarCheck,
  Check,
  Facebook,
  Globe,
  Inbox,
  MessageSquare,
  MessagesSquare,
  PhoneCall,
  ShieldCheck,
  Sunrise,
  Workflow,
  Zap,
} from "lucide-react";
import { TOOL_COUNT } from "@/lib/tools";
import { PRO_TOOLS } from "@/lib/tools/pro";
import { createClient } from "@/lib/supabase/server";
import SiteHero from "@/components/site/system/SiteHero";
import FinalCta from "@/components/site/system/FinalCta";
import {
  PLUGIN,
  PLUGIN_DATA_HANDLING,
  PLUGIN_DEMOS,
  PLUGIN_FAQ,
  PLUGIN_INCLUDED,
  PLUGIN_PLATFORMS,
} from "@/lib/pluginDocs";
import { BUSINESS } from "@/lib/site/business";
import { PRICES, usd } from "@/lib/site/prices";
import {
  breadcrumbJsonLd,
  faqJsonLd,
  graph,
  jsonLdText,
} from "@/lib/site/structuredData";

// The product page for the plugin. Every price, trial length, install step,
// FAQ answer, and demonstration comes from lib/pluginDocs.ts, which in turn
// reads the plan from lib/hq/types.ts. The checkout itself lives in HQ
// (/hq/billing -> Stripe) and only works once STRIPE_SECRET_KEY is set in
// Vercel, which is Ryan's go-live switch.

const SITE = BUSINESS.siteUrl;
const PRICE = PLUGIN.priceUsd;
const TRIAL = PLUGIN.trialDays;

export const metadata: Metadata = withPublicPageMetadata("/plugin", {
  title: `${PLUGIN.name}: ${usd(PRICE)} a month in ChatGPT and Claude | The LeadFlow Pro`,
  description: `Install ${PLUGIN.connectorName} inside ChatGPT or Claude. Every lead lands in one inbox, gets answered in minutes, and gets followed up until you win the job. ${usd(PRICE)} a month, ${TRIAL} days free, cancel yourself any time.`,
  openGraph: {
    title: "Run your leads from inside ChatGPT or Claude",
    description: `One inbox, an instant reply in your voice, a call-now alert, follow-ups on a ladder, a morning brief, and a weekly scoreboard. ${usd(PRICE)} a month.`,
    type: "website",
  },
});

export const dynamic = "force-dynamic";

/* --------------------------------------------------------------------------
   A sample morning brief. Static example copy, not a customer record. The
   business, the people, and the numbers are made up so the page can show the
   shape of the brief without borrowing anyone's real leads.
   -------------------------------------------------------------------------- */
const SAMPLE_BRIEF = {
  business: "Kirby Plumbing",
  place: "Longview, TX",
  day: "Tuesday, March 4",
  sent: "7:00 AM",
  callNow: [
    { name: "Dana Whitfield", note: "Water heater leaking, wants somebody today", source: "Website form", waiting: "9 minutes", phone: "(903) 555-0148" },
    { name: "Marcus Ellery", note: "Quoted $1,850 on the slab leak, has not answered", source: "Text message", waiting: "2 days", phone: "(903) 555-0172" },
    { name: "Sheila Odom", note: "Asked what drain cleaning runs", source: "Meta lead ad", waiting: "1 day", phone: "(903) 555-0119" },
  ],
  week: [
    { day: "M", leads: 3 },
    { day: "T", leads: 5 },
    { day: "W", leads: 2 },
    { day: "T", leads: 6 },
    { day: "F", leads: 4 },
    { day: "S", leads: 7 },
    { day: "S", leads: 5 },
  ],
  due: "4 follow-ups are drafted and waiting on your yes.",
};

const SOURCES = [
  { icon: Globe, label: "Your website form" },
  { icon: MessageSquare, label: "Text messages" },
  { icon: Facebook, label: "Meta lead ads" },
  { icon: MessagesSquare, label: "Told to the assistant" },
  { icon: Workflow, label: "Zapier" },
];

const WHO = [
  {
    title: "Owners who answer the phone themselves",
    body: "Trades, home services, clinics, shops. You are the sales team and the crew, and the lead that came in while you were on a roof is the one you lose.",
  },
  {
    title: "Businesses already using ChatGPT or Claude",
    body: "You do not want a new dashboard. You want the assistant you already talk to every day to know who is waiting and what to say.",
  },
  {
    title: "Teams with one person working inbound",
    body: "Give them one inbox, a ranked list each morning, and drafts they approve instead of write.",
  },
];

const NOT_FOR = [
  "Businesses that want an agency to run their ads and content for them. That is the agency lane, not the plugin.",
  "Anyone who needs texts sent to people who never agreed to be texted. The plugin will not do it.",
  "Teams that need a full CRM with pipelines, quotes, and invoices today. The plugin tracks leads and conversations; a Company OS build covers the rest.",
];

function WeekChart() {
  const top = Math.max(...SAMPLE_BRIEF.week.map((d) => d.leads));
  return (
    <svg viewBox="0 0 296 104" role="img" aria-label="Sample chart of leads for each of the last seven days" className="plugin-chart">
      <line x1="8" y1="78" x2="288" y2="78" stroke="var(--line)" strokeWidth="1" />
      {SAMPLE_BRIEF.week.map((d, i) => {
        const height = Math.round((d.leads / top) * 62) + 6;
        const x = 14 + i * 40;
        return (
          <g key={`${d.day}-${i}`}>
            <rect x={x} y={78 - height} width="26" height={height} rx="5" fill="var(--blue)" opacity={i === SAMPLE_BRIEF.week.length - 1 ? 1 : 0.42} />
            <text x={x + 13} y={95} textAnchor="middle" fontSize="11" fontWeight="700" fill="var(--quiet)">
              {d.day}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export default async function PluginPage() {
  let signedIn = false;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    signedIn = Boolean(user);
  } catch {
    // No session, or Supabase unreachable. The signed out path is correct.
  }

  const ctaHref = signedIn ? "/hq/start" : PLUGIN.signupHref;
  const ctaLabel = `Start your ${TRIAL} days free`;

  const jsonLd = graph(
    {
      "@type": "SoftwareApplication",
      name: PLUGIN.name,
      alternateName: PLUGIN.shortName,
      applicationCategory: "BusinessApplication",
      operatingSystem: "ChatGPT, Claude, Web",
      softwareVersion: PLUGIN.version,
      url: `${SITE}/plugin`,
      description:
        "A connector for ChatGPT and Claude that puts every lead in one inbox, answers new leads in the business owner's voice, alerts the owner to call, schedules follow-ups, and drafts the week's posts, ad, and video script.",
      publisher: { "@type": "Organization", name: BUSINESS.name, url: SITE },
      offers: {
        "@type": "Offer",
        price: PRICE,
        priceCurrency: "USD",
        url: `${SITE}/plugin`,
        availability: "https://schema.org/InStock",
        priceSpecification: { "@type": "UnitPriceSpecification", price: PRICE, priceCurrency: "USD", billingIncrement: 1, unitCode: "MON" },
      },
    },
    faqJsonLd(PLUGIN_FAQ),
    breadcrumbJsonLd([
      { name: "Home", path: "/" },
      { name: "Plugin", path: "/plugin" },
    ]),
  );

  return (
    <main className="cb-page plugin-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdText(jsonLd) }} />

      <SiteHero
        compact
        eyebrow={`Install in ChatGPT or Claude · ${usd(PRICE)} a month · ${TRIAL} days free`}
        mutedTitle="You already have ChatGPT open."
        title="Now it runs your follow-up."
        body={`${PLUGIN.connectorName} installs inside ChatGPT or Claude like any other app. Behind it, Autopilot works every five minutes: every lead lands in one inbox, gets an answer while they are still holding the phone, and gets followed up until you win the job or they tell you no.`}
        media={{
          src: "/images/homepage-v2/company-operating-loop.webp",
          alt: "A loop of connected stages carrying a lead from the first alert through to the report",
          kicker: "Autopilot",
          caption: "Runs every five minutes, all day, without you.",
        }}
        primary={{ href: ctaHref, label: ctaLabel }}
        secondary={{ href: "#demos", label: "See it inside ChatGPT" }}
        trustLine="Built in accounts you control. Your leads and your messages belong to your business."
      />

      {/* ---------------------------------------------- what it does, plainly */}
      <section id="autopilot" className="cb-band" tabIndex={-1}>
        <div className="cb-shell">
          <div className="cb-headrow">
            <div>
              <p className="cb-eyebrow">What it does, in plain English</p>
              <h2 className="cb-h2 cb-heading">Three rhythms. None of them need you.</h2>
            </div>
            <p className="cb-lead">
              You do not log in, tick boxes, or learn a system. Autopilot runs on its own clock and only
              comes to you when there is a person to call or something to approve.
            </p>
          </div>

          <div className="plugin-rail mt-10">
            <article className="plugin-card">
              <span className="plugin-icon">
                <Zap aria-hidden="true" className="h-5 w-5" />
              </span>
              <span className="plugin-when">Every 5 minutes</span>
              <h3>A lead lands, and it is already handled.</h3>
              <p>
                The new lead gets a reply in your voice straight away: a text back when you have a
                connected line and they said yes to texts, an email when you do not. You get a
                call-this-person-now alert by email the second it arrives, by text too once a line is
                connected, and a second one if nobody has replied inside your response target. Fifteen minutes out of the box.
              </p>
            </article>
            <article className="plugin-card">
              <span className="plugin-icon">
                <Sunrise aria-hidden="true" className="h-5 w-5" />
              </span>
              <span className="plugin-when">Every morning</span>
              <h3>A brief lands before your first coffee.</h3>
              <p>
                Who is waiting, what is due today, and three things to do, in your email and inside the
                assistant. Follow-ups are already written and scheduled on a ladder: day 1, day 3, day 7,
                day 14, and day 30. A lead does not go quiet because you forgot it.
              </p>
            </article>
            <article className="plugin-card">
              <span className="plugin-icon">
                <CalendarCheck aria-hidden="true" className="h-5 w-5" />
              </span>
              <span className="plugin-when">Every Monday</span>
              <h3>The scoreboard, then the week&apos;s content.</h3>
              <p>
                Leads by source, how fast each one was answered, how many booked, how many won. Then three
                Facebook posts, one lead ad, and one thirty-second video script with a shot list you can
                shoot on your phone, all drafted in your voice. Approve in one tap and they publish to your
                Facebook Page when it is connected.
              </p>
            </article>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------- who it is for */}
      <section id="who" className="cb-band cb-band--tint" tabIndex={-1}>
        <div className="cb-shell">
          <div className="cb-headrow">
            <div>
              <p className="cb-eyebrow">Who it is for</p>
              <h2 className="cb-h2 cb-heading">Built for the owner who is also the sales team.</h2>
            </div>
            <p className="cb-lead">
              It is not for everyone, and the page should say so before you spend a trial finding out.
            </p>
          </div>
          <div className="plugin-rail plugin-rail--plain mt-10">
            {WHO.map((item) => (
              <article key={item.title} className="plugin-card">
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </article>
            ))}
          </div>
          <ul className="plugin-list mt-8">
            {NOT_FOR.map((line) => (
              <li key={line}>
                <span aria-hidden="true">&times;</span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ------------------------------------------------------- demonstrations */}
      <section id="demos" className="cb-band" tabIndex={-1}>
        <div className="cb-shell">
          <div className="cb-headrow">
            <div>
              <p className="cb-eyebrow">Three workflows, shown</p>
              <h2 className="cb-h2 cb-heading">What you say, and what it does.</h2>
            </div>
            <p className="cb-lead">
              No menus, no fields, no setup wizard. You type the way you would talk to the person who
              answers your phone. The exchanges below are made-up examples for a made-up plumber; screen
              recordings of the real thing are being captured.
            </p>
          </div>
          <div className="plugin-rail mt-10">
            {PLUGIN_DEMOS.map((demo) => (
              <article key={demo.id} id={`demo-${demo.id}`} className="plugin-card">
                <h3>{demo.title}</h3>
                <div className="plugin-chat mt-4">
                  {demo.exchange.map((x) => (
                    <div key={x.ask} className="plugin-turn">
                      <p className="plugin-ask">{x.ask}</p>
                      <p className="plugin-say">{x.did}</p>
                    </div>
                  ))}
                </div>
                <p className="plugin-fine">Illustrative exchange. Your assistant answers from your own leads.</p>
              </article>
            ))}
          </div>
          <p className="plugin-note">
            Every one of the {TOOL_COUNT} free LeadFlow calculators answers in there too. Ask what a
            missed call costs you and it runs the math on your own numbers.
          </p>
        </div>
      </section>

      {/* -------------------------------------------------- the morning brief */}
      <section id="brief" className="cb-band cb-band--tint" tabIndex={-1}>
        <div className="cb-shell">
          <div className="plugin-split">
            <div>
              <p className="cb-eyebrow">The morning brief</p>
              <h2 className="cb-h2 cb-heading">Open your phone. Know who to call.</h2>
              <p className="cb-lead">
                Not a dashboard you have to go read. A short list that comes to you with the names, the
                numbers, and how long each person has been waiting.
              </p>
              <ul className="plugin-list">
                <li>
                  <PhoneCall aria-hidden="true" className="h-4 w-4" />
                  <span>Call-now rows, newest and coldest first, with the phone number right there</span>
                </li>
                <li>
                  <Bell aria-hidden="true" className="h-4 w-4" />
                  <span>Anything that slipped past your response target is flagged</span>
                </li>
                <li>
                  <Inbox aria-hidden="true" className="h-4 w-4" />
                  <span>The week so far, so you can see a slow Tuesday coming</span>
                </li>
              </ul>
            </div>
            <div>
              <div className="plugin-phone">
                <div className="plugin-phone-bar">
                  <span>{SAMPLE_BRIEF.sent}</span>
                  <span>Morning brief</span>
                </div>
                <div className="plugin-brief-head">
                  <strong>{SAMPLE_BRIEF.business}</strong>
                  <span>
                    {SAMPLE_BRIEF.day} · {SAMPLE_BRIEF.place}
                  </span>
                </div>
                <p className="plugin-brief-label">Call these three first</p>
                {SAMPLE_BRIEF.callNow.map((lead) => (
                  <div key={lead.name} className="plugin-brief-row">
                    <b>{lead.name}</b>
                    <small>{lead.note}</small>
                    <span className="plugin-brief-meta">
                      <span>{lead.phone}</span>
                      <span>{lead.source}</span>
                      <span>waiting {lead.waiting}</span>
                    </span>
                  </div>
                ))}
                <p className="plugin-brief-label">Leads, last 7 days</p>
                <WeekChart />
                <p className="plugin-brief-due">{SAMPLE_BRIEF.due}</p>
              </div>
              <p className="plugin-fine plugin-fine--center">
                A made-up example for a made-up plumber. Your brief is built from your own leads.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ----------------------------------------------- every lead, one inbox */}
      <section id="inbox" className="cb-band" tabIndex={-1}>
        <div className="cb-shell">
          <div className="cb-headrow">
            <div>
              <p className="cb-eyebrow">Every lead, one inbox</p>
              <h2 className="cb-h2 cb-heading--wide">
                Speed to lead: the first business to answer usually gets the job.
              </h2>
            </div>
            <p className="cb-lead">
              That only works when every lead is in the same place. Five ways in, one list, one status
              on each person, one history of what was said.
            </p>
          </div>
          <ul className="plugin-sources">
            {SOURCES.map((s) => (
              <li key={s.label} className="plugin-source">
                <s.icon aria-hidden="true" className="h-5 w-5" />
                <span>{s.label}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* --------------------------------------------------------- install it */}
      <section id="install" className="cb-band cb-band--tint" tabIndex={-1}>
        <div className="cb-shell">
          <div className="cb-headrow">
            <div>
              <p className="cb-eyebrow">Install in 60 seconds</p>
              <h2 className="cb-h2 cb-heading">Paste one address. Sign in once.</h2>
            </div>
            <p className="cb-lead">
              {PLUGIN.connectorName} is a connector, the same standard that apps like Figma and Descript
              use inside ChatGPT. Nothing to download, nothing to install on your computer.
            </p>
          </div>
          <div className="plugin-url">
            <span className="plugin-url-tag">Paste this address</span>
            <code>{PLUGIN.mcpUrl}</code>
          </div>
          <div className="plugin-rail plugin-rail--plain mt-6">
            {PLUGIN_PLATFORMS.map((platform, i) => (
              <article key={platform.id} className="plugin-card">
                <span className="plugin-step-top">
                  <span className="plugin-step-num">{i + 1}</span>
                </span>
                <h3>{platform.name}</h3>
                <ol className="plugin-steps">
                  {platform.steps.slice(0, 3).map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ol>
                {platform.requires ? (
                  <p className="plugin-fine">
                    <strong>Needs:</strong> {platform.requires}
                  </p>
                ) : null}
              </article>
            ))}
          </div>
          <p className="plugin-note">
            Every step, with the check that proves it took, is in the{" "}
            <Link href={PLUGIN.docsHref}>plugin docs</Link>.
          </p>
        </div>
      </section>

      {/* ----------------------------------------------------------- your data */}
      <section id="data" className="cb-band" tabIndex={-1}>
        <div className="cb-shell">
          <div className="cb-headrow">
            <div>
              <p className="cb-eyebrow">Your data</p>
              <h2 className="cb-h2 cb-heading">Your leads stay yours. Texts only go to people who agreed.</h2>
            </div>
            <p className="cb-lead">
              The rules below are code, not policy pages. Every draft the engine writes is tested
              against them before it ships.
            </p>
          </div>
          <div className="plugin-rail plugin-rail--plain mt-10">
            {PLUGIN_DATA_HANDLING.slice(0, 3).map((item) => (
              <article key={item.title} className="plugin-card">
                <span className="plugin-icon">
                  <ShieldCheck aria-hidden="true" className="h-5 w-5" />
                </span>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </article>
            ))}
          </div>
          <p className="plugin-note">
            The full data-handling notes, including how sign-in and keys work, are in the{" "}
            <Link href={`${PLUGIN.docsHref}#data`}>docs</Link>.
          </p>
        </div>
      </section>

      {/* ------------------------------------------------------------ pricing */}
      <section id="pricing" className="cb-band cb-band--tint" tabIndex={-1}>
        <div className="cb-shell">
          <div className="plugin-buy">
            <p className="cb-eyebrow">{PLUGIN.name}</p>
            <p className="plugin-price">
              {usd(PRICE)}
              <small>per month</small>
            </p>
            <p className="plugin-trial">
              {TRIAL} days free, then {usd(PRICE)} a month. Cancel yourself, any time.
            </p>
            <ul className="plugin-list plugin-list--buy">
              {PLUGIN_INCLUDED.map((item) => (
                <li key={item}>
                  <Check aria-hidden="true" className="h-4 w-4" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <Link href={ctaHref} className="pro-buy-button" data-cta="plugin_checkout_start" data-cta-placement="plugin_pricing">
              {ctaLabel}
            </Link>
            <p className="plugin-fine">
              No setup fee, no contract, no cancellation call. Your card is not charged until the trial
              ends. Cancelling is two taps in HQ, then Billing, and it stops at the end of the period.
            </p>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- faq */}
      <section id="faq" className="cb-band" tabIndex={-1}>
        <div className="cb-shell">
          <h2 className="cb-h2 cb-heading">Straight answers.</h2>
          <div className="plugin-faq">
            {PLUGIN_FAQ.map((f) => (
              <details key={f.q} className="plugin-faq-item">
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
          <p className="plugin-note">
            Still deciding? Start with the <Link href="/chatgpt/free">free ChatGPT lesson</Link>, join
            the list for the <Link href="/events">next Longview workshop</Link>, or if you would rather
            have the follow-up and the content run for you, see the{" "}
            <Link href="/agency">agency lane</Link>. The {TOOL_COUNT} calculators are free with no
            account, and every <Link href="/tools/pro">Pro Kit</Link> ({usd(PRICES.proKitMin)} to{" "}
            {usd(PRICES.proKitMax)}, {PRO_TOOLS.length} of them) is a one-time payment if you would rather
            buy one outright.
          </p>
        </div>
      </section>

      <FinalCta
        eyebrow="The next lead is already coming"
        title="Answer it in two minutes instead of two days."
        body={`Install ${PLUGIN.connectorName} in ChatGPT or Claude, point your form at it, and let Autopilot carry the follow-up. ${TRIAL} days free, then ${usd(PRICE)} a month.`}
        primary={{ href: ctaHref, label: ctaLabel }}
        secondary={{ href: PLUGIN.docsHref, label: "Read the docs first" }}
      />
    </main>
  );
}
