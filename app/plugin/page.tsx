import { withPublicPageMetadata } from "@/lib/publicPageMetadata";
import type { Metadata } from "next";
import Link from "next/link";
import {
  Bell,
  Bot,
  CalendarCheck,
  Check,
  Facebook,
  Globe,
  Inbox,
  MessageSquare,
  MessagesSquare,
  PhoneCall,
  Sparkles,
  Sunrise,
  Terminal,
  Workflow,
  Zap,
} from "lucide-react";
import { TOOL_COUNT } from "@/lib/tools";
import { PRO_TOOLS } from "@/lib/tools/pro";
import { HQ_PLAN } from "@/lib/hq/types";
import { createClient } from "@/lib/supabase/server";
import SiteHero from "@/components/site/system/SiteHero";
import FinalCta from "@/components/site/system/FinalCta";

const BASE = "https://www.theleadflowpro.com";
const MCP_URL = `${BASE}/api/mcp`;
const SIGNUP = "/login?mode=signup&next=%2Fhq%2Fstart";
const PRICE = HQ_PLAN.priceUsd;
const TRIAL = HQ_PLAN.trialDays;

export const metadata: Metadata = withPublicPageMetadata("/plugin", {
  title: `${HQ_PLAN.name}: $${PRICE} a month in ChatGPT and Claude | The LeadFlow Pro`,
  description: `Install ${HQ_PLAN.connectorName} inside ChatGPT or Claude. Every lead lands in one inbox, gets answered in minutes, and gets followed up until you win the job. $${PRICE} a month, ${TRIAL} days free, cancel anytime.`,
  openGraph: {
    title: "Run your leads from inside ChatGPT or Claude",
    description: `One inbox, an instant reply in your voice, a call now alert, follow-ups on a ladder, a morning brief and a weekly scoreboard. $${PRICE} a month.`,
    type: "website",
  },
});

export const dynamic = "force-dynamic";

/* --------------------------------------------------------------------------
   A sample morning brief. Static example copy, not a customer record. The
   business, the people and the numbers are made up so the page can show the
   shape of the brief without borrowing anyone's real leads.
   -------------------------------------------------------------------------- */
const SAMPLE_BRIEF = {
  business: "Kirby Plumbing",
  place: "Longview, TX",
  day: "Tuesday, March 4",
  sent: "7:00 AM",
  callNow: [
    {
      name: "Dana Whitfield",
      note: "Water heater leaking, wants somebody today",
      source: "Website form",
      waiting: "9 minutes",
      phone: "(903) 555-0148",
    },
    {
      name: "Marcus Ellery",
      note: "Quoted $1,850 on the slab leak, has not answered",
      source: "Text message",
      waiting: "2 days",
      phone: "(903) 555-0172",
    },
    {
      name: "Sheila Odom",
      note: "Asked what drain cleaning runs",
      source: "Meta lead ad",
      waiting: "1 day",
      phone: "(903) 555-0119",
    },
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

const EXCHANGES = [
  {
    ask: "Who do I need to call?",
    did: "Three people are waiting. Dana Whitfield, water heater, came in 9 minutes ago. Marcus Ellery, quoted $1,850, quiet for 2 days. Sheila Odom, drain cleaning question, 1 day. Want the numbers?",
  },
  {
    ask: "Text Jamie back and tell her we can be there Thursday morning.",
    did: "Here is the draft: “Hi Jamie, this is Kirby Plumbing. We can be out Thursday morning between 8 and 10. Want me to hold that for you?” Say send and it goes from your business line.",
  },
  {
    ask: "Draft this week's posts.",
    did: "Three Facebook posts, one lead ad and a thirty-second video script with a shot list for your phone, all written in your voice. Read them, approve the ones you like, and they publish to your Page.",
  },
];

const SOURCES = [
  { icon: Globe, label: "Your website form" },
  { icon: MessageSquare, label: "Text messages" },
  { icon: Facebook, label: "Meta lead ads" },
  { icon: MessagesSquare, label: "Told to the assistant" },
  { icon: Workflow, label: "Zapier" },
];

const INSTALL = [
  {
    icon: Sparkles,
    where: "ChatGPT",
    steps: [
      "Open Settings, then Apps and Connectors, then Add.",
      "Paste the address below and save it.",
      "Sign in once with your LeadFlow account. That is the install.",
    ],
  },
  {
    icon: Bot,
    where: "Claude",
    steps: [
      "Open Settings, then Connectors, then Add custom connector.",
      "Paste the same address and approve the sign in.",
      "Ask it who do I need to call and it answers.",
    ],
  },
  {
    icon: Terminal,
    where: "Claude Code or Cursor",
    steps: [
      "Add it as an HTTP MCP server with the same address.",
      "In Claude Code that is one line: claude mcp add --transport http leadflow, then the address.",
      "Everything the assistant can do, your terminal can do.",
    ],
  },
];

const INCLUDED = [
  "Autopilot working every five minutes for your business",
  "Every lead in one inbox: website forms, texts, Meta lead ads, Zapier, or one you add by talking to the assistant",
  "An instant reply in your own voice, text back when you have a connected line and they said yes to texts, email otherwise",
  "A call this person now alert the moment a lead arrives, and again if nobody answered inside your response target",
  "Follow-ups scheduled and drafted on a ladder: day 1, day 3, day 7, day 14 and day 30",
  "A morning brief every day, by email and inside the assistant",
  "A scoreboard every Monday: leads by source, how fast they were answered, booked, won",
  "Every week: 3 Facebook posts, 1 lead ad and 1 thirty-second video script with a phone shot list, approved in one tap",
  `All ${TOOL_COUNT} free LeadFlow calculators, callable inside the assistant`,
  `All ${PRO_TOOLS.length} Pro Kits, normally $10 to $29 each, included while you subscribe`,
];

const FAQS = [
  {
    q: "Do I have to learn new software?",
    a: "No. You use ChatGPT or Claude the way you already do and ask it questions in plain words. There is a web page you can open if you want to see everything at once, but most owners never need it.",
  },
  {
    q: "What am I actually installing?",
    a: `${HQ_PLAN.connectorName} is a connector, the same standard apps like Figma and Descript use inside ChatGPT. You paste one address, sign in once, and the assistant can then work on your leads.`,
  },
  {
    q: "Do I need a text line for this to work?",
    a: "No. Without a connected text line, new leads get an email reply instead and your alerts arrive by email. Connect a text line later and the text back turns on. Texts only go to people who agreed to be texted.",
  },
  {
    q: "Will it send things without asking me?",
    a: "The instant reply to a brand new lead is the one thing that goes out on its own, because answering fast is the whole point, and you write the rules it follows. Follow-ups, posts, ads and video scripts are drafted and wait for your yes.",
  },
  {
    q: "What if I do not have a Facebook Page?",
    a: "You still get the posts, the ad and the video script every week. They sit in the approved list so you can copy them anywhere. Connect a Page later and approved posts publish straight to it.",
  },
  {
    q: "Who owns the leads and the messages?",
    a: "Your business does. Everything is built in accounts you control, and you can export your leads and messages at any time. If you cancel, they are still yours.",
  },
  {
    q: "Is this going to make me money?",
    a: "That depends on your market, your prices and whether you call the people it puts in front of you. What this does is make sure every lead is answered and nothing gets forgotten. Speed to lead is a real thing: the first business to answer usually gets the job.",
  },
  {
    q: `What happens after the ${TRIAL} days?`,
    a: `It becomes $${PRICE} a month. Cancel any time from your account and it stops at the end of the period. No setup fee, no contract, no cancellation call.`,
  },
];

function WeekChart() {
  const top = Math.max(...SAMPLE_BRIEF.week.map((d) => d.leads));
  return (
    <svg
      viewBox="0 0 296 104"
      role="img"
      aria-label="Sample chart of leads for each of the last seven days"
      className="plugin-chart"
    >
      <line x1="8" y1="78" x2="288" y2="78" stroke="var(--line)" strokeWidth="1" />
      {SAMPLE_BRIEF.week.map((d, i) => {
        const height = Math.round((d.leads / top) * 62) + 6;
        const x = 14 + i * 40;
        return (
          <g key={`${d.day}-${i}`}>
            <rect
              x={x}
              y={78 - height}
              width="26"
              height={height}
              rx="5"
              fill="var(--blue)"
              opacity={i === SAMPLE_BRIEF.week.length - 1 ? 1 : 0.42}
            />
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

  const ctaHref = signedIn ? "/hq/start" : SIGNUP;
  const ctaLabel = `Start your ${TRIAL} days free`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SoftwareApplication",
        name: HQ_PLAN.name,
        alternateName: HQ_PLAN.shortName,
        applicationCategory: "BusinessApplication",
        operatingSystem: "ChatGPT, Claude, Web",
        url: `${BASE}/plugin`,
        description: `A connector for ChatGPT and Claude that puts every lead in one inbox, answers new leads in the business owner's voice, alerts the owner to call, schedules follow-ups, and drafts the week's posts, ad and video script.`,
        publisher: { "@type": "Organization", name: "The LeadFlow Pro", url: BASE },
        offers: {
          "@type": "Offer",
          price: PRICE,
          priceCurrency: "USD",
          url: `${BASE}/plugin`,
          availability: "https://schema.org/InStock",
          priceSpecification: {
            "@type": "UnitPriceSpecification",
            price: PRICE,
            priceCurrency: "USD",
            billingIncrement: 1,
            unitCode: "MON",
          },
        },
      },
      {
        "@type": "FAQPage",
        mainEntity: FAQS.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: BASE },
          { "@type": "ListItem", position: 2, name: "Plugin", item: `${BASE}/plugin` },
        ],
      },
    ],
  };

  return (
    <main className="cb-page plugin-page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />

      <SiteHero
        compact
        eyebrow={`Install in ChatGPT or Claude · $${PRICE} a month · ${TRIAL} days free`}
        mutedTitle="You already have ChatGPT open."
        title="Now it runs your follow-up."
        body={`${HQ_PLAN.connectorName} installs inside ChatGPT or Claude like any other app. Behind it, Autopilot works every five minutes: every lead lands in one inbox, gets an answer while they are still holding the phone, and gets followed up until you win the job or they tell you no.`}
        media={{
          src: "/images/homepage-v2/company-operating-loop.webp",
          alt: "A loop of connected stages carrying a lead from the first alert through to the report",
          kicker: "Autopilot",
          caption: "Runs every five minutes, all day, without you.",
        }}
        primary={{ href: ctaHref, label: ctaLabel }}
        secondary={{ href: "#inside", label: "See it inside ChatGPT" }}
        trustLine="Built in accounts you control. Your leads and your messages belong to your business."
      />

      {/* ------------------------------------------------ what it does daily */}
      <section id="autopilot" className="cb-band" tabIndex={-1}>
        <div className="cb-shell">
          <div className="cb-headrow">
            <div>
              <p className="cb-eyebrow">What it does every day</p>
              <h2 className="cb-h2 cb-heading">Three rhythms. None of them need you.</h2>
            </div>
            <p className="cb-lead">
              You do not log in, tick boxes or learn a system. Autopilot runs on its own clock and
              only comes to you when there is a person to call or something to approve.
            </p>
          </div>

          <div className="plugin-rail mt-10">
            <article className="plugin-card">
              <span className="plugin-icon">
                <Zap aria-hidden="true" className="h-5 w-5" />
              </span>
              <span className="plugin-when">Every 5 minutes</span>
              <h3>A lead lands, and it is already handled.</h3>
              <svg viewBox="0 0 320 40" aria-hidden="true" focusable="false" className="plugin-pulse">
                <path
                  d="M0 20 H54 l8 -14 l10 28 l9 -14 H150 l8 -14 l10 28 l9 -14 H262 l8 -14 l10 28 l9 -14 H320"
                  fill="none"
                  stroke="var(--blue)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <p>
                The new lead gets a reply in your voice straight away: a text back when you have a
                connected line and they said yes to texts, an email when you do not. Your phone gets a
                call this person now alert the second it arrives, and a second one if nobody has
                replied inside your response target. Fifteen minutes out of the box.
              </p>
            </article>

            <article className="plugin-card">
              <span className="plugin-icon">
                <Sunrise aria-hidden="true" className="h-5 w-5" />
              </span>
              <span className="plugin-when">Every morning</span>
              <h3>A brief lands before your first coffee.</h3>
              <p>
                Who is waiting, what is due today and three things to do, in your email and inside
                the assistant. Follow-ups are already written and scheduled on a ladder: day 1, day 3,
                day 7, day 14 and day 30. A lead does not go quiet because you forgot it.
              </p>
              <ul className="plugin-list">
                <li>
                  <Check aria-hidden="true" className="h-4 w-4" />
                  <span>Who is waiting on a call back</span>
                </li>
                <li>
                  <Check aria-hidden="true" className="h-4 w-4" />
                  <span>What is due today, already drafted</span>
                </li>
                <li>
                  <Check aria-hidden="true" className="h-4 w-4" />
                  <span>Three things to do before noon</span>
                </li>
              </ul>
            </article>

            <article className="plugin-card">
              <span className="plugin-icon">
                <CalendarCheck aria-hidden="true" className="h-5 w-5" />
              </span>
              <span className="plugin-when">Every Monday</span>
              <h3>The scoreboard, then the week&apos;s content.</h3>
              <p>
                Leads by source, how fast each one was answered, how many booked, how many won. Then
                three Facebook posts, one lead ad and one thirty-second video script with a shot list
                you can shoot on your phone, all drafted in your voice. Approve in one tap and they
                publish to your Facebook Page when it is connected.
              </p>
            </article>
          </div>
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
                This is the whole point. Not a dashboard you have to go read, a short list that comes
                to you with the names, the numbers and how long each person has been waiting.
              </p>
              <ul className="plugin-list">
                <li>
                  <PhoneCall aria-hidden="true" className="h-4 w-4" />
                  <span>Call now rows, newest and coldest first, with the phone number right there</span>
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
                A made up example for a made up plumber. Your brief is built from your own leads.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------ what you say to it */}
      <section id="inside" className="cb-band" tabIndex={-1}>
        <div className="cb-shell">
          <div className="cb-headrow">
            <div>
              <p className="cb-eyebrow">Inside ChatGPT and Claude</p>
              <h2 className="cb-h2 cb-heading">What you say, and what it does.</h2>
            </div>
            <p className="cb-lead">
              No menus, no fields, no setup wizard. You type the way you would talk to the person who
              answers your phone.
            </p>
          </div>

          <div className="plugin-chat mt-10">
            {EXCHANGES.map((x) => (
              <div key={x.ask} className="plugin-turn">
                <p className="plugin-ask">{x.ask}</p>
                <p className="plugin-say">{x.did}</p>
              </div>
            ))}
          </div>

          <p className="plugin-note">
            Every one of the {TOOL_COUNT} free LeadFlow calculators answers in there too. Ask what a
            missed call costs you and it runs the math on your own numbers.
          </p>
        </div>
      </section>

      {/* ----------------------------------------------- every lead, one inbox */}
      <section id="inbox" className="cb-band cb-band--tint" tabIndex={-1}>
        <div className="cb-shell">
          <div className="cb-headrow">
            <div>
              <p className="cb-eyebrow">Every lead, one inbox</p>
              <h2 className="cb-h2 cb-heading--wide">
                Speed to lead: the first business to answer usually gets the job.
              </h2>
            </div>
            <p className="cb-lead">
              That only works when every lead is in the same place. Five ways in, one list, one
              status on each person, one history of what was said.
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
      <section id="install" className="cb-band" tabIndex={-1}>
        <div className="cb-shell">
          <div className="cb-headrow">
            <div>
              <p className="cb-eyebrow">Install in 60 seconds</p>
              <h2 className="cb-h2 cb-heading">Paste one address. Sign in once.</h2>
            </div>
            <p className="cb-lead">
              {HQ_PLAN.connectorName} is a connector, the same standard that apps like Figma and
              Descript use inside ChatGPT. Nothing to download, nothing to install on your computer.
            </p>
          </div>

          <div className="plugin-url">
            <span className="plugin-url-tag">Paste this address</span>
            <code>{MCP_URL}</code>
          </div>

          <div className="plugin-rail plugin-rail--plain mt-6">
            {INSTALL.map((step, i) => (
              <article key={step.where} className="plugin-card">
                <span className="plugin-step-top">
                  <span className="plugin-step-num">{i + 1}</span>
                  <step.icon aria-hidden="true" className="h-5 w-5" />
                </span>
                <h3>{step.where}</h3>
                <ol className="plugin-steps">
                  {step.steps.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ol>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ pricing */}
      <section id="pricing" className="cb-band cb-band--tint" tabIndex={-1}>
        <div className="cb-shell">
          <div className="plugin-buy">
            <p className="cb-eyebrow">{HQ_PLAN.name}</p>
            <p className="plugin-price">
              ${PRICE}
              <small>per month</small>
            </p>
            <p className="plugin-trial">
              {TRIAL} days free, then ${PRICE} a month. Cancel any time.
            </p>
            <ul className="plugin-list plugin-list--buy">
              {INCLUDED.map((item) => (
                <li key={item}>
                  <Check aria-hidden="true" className="h-4 w-4" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <Link href={ctaHref} className="pro-buy-button">
              {ctaLabel}
            </Link>
            <p className="plugin-fine">
              No setup fee, no contract, no cancellation call. Your card is not charged until the
              trial ends.
            </p>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- faq */}
      <section id="faq" className="cb-band" tabIndex={-1}>
        <div className="cb-shell">
          <h2 className="cb-h2 cb-heading">Straight answers.</h2>
          <div className="plugin-faq">
            {FAQS.map((f) => (
              <details key={f.q} className="plugin-faq-item">
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
          <p className="plugin-note">
            Still deciding? The {TOOL_COUNT} calculators are free with no account, and every{" "}
            <Link href="/tools/pro">Pro Kit</Link> is a one time payment if you would rather buy one
            outright.
          </p>
        </div>
      </section>

      <FinalCta
        eyebrow="The next lead is already coming"
        title="Answer it in two minutes instead of two days."
        body={`Install ${HQ_PLAN.connectorName} in ChatGPT or Claude, point your form at it, and let Autopilot carry the follow-up. ${TRIAL} days free, then $${PRICE} a month.`}
        primary={{ href: ctaHref, label: ctaLabel }}
        secondary={{ href: "/tools", label: `Try the ${TOOL_COUNT} free tools first` }}
      />
    </main>
  );
}
