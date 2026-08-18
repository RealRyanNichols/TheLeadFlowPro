import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Activity, MousePointerClick, Radar, Route, Search, Wrench, PhoneCall, Gauge, ShieldCheck } from "lucide-react";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/config";
import CtaLink from "@/components/site/CtaLink";
import LiveDashboard, { type LivePayload } from "@/components/live/LiveDashboard";
import DashboardRequestForm from "@/components/live/DashboardRequestForm";
import WebsiteGrader from "@/components/live/WebsiteGrader";
import styles from "./live.module.css";

// The public proof page. Server-rendered shell (indexable copy, metadata,
// structured data) around a client dashboard that reads ONLY the sanitized
// public projections. Raw analytics are not queryable from this page, its
// API route, or the browser.

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Live Website Analytics & Lead Tracking | The LeadFlow Pro",
  description:
    "See how The LeadFlow Pro tracks website traffic, clicks, tools, conversions, Google visibility, and lead activity through a live, privacy-safe business analytics system.",
  alternates: { canonical: "https://www.theleadflowpro.com/live" },
  openGraph: {
    title: "Real Traffic. Real Actions. Real Systems.",
    description:
      "A live, privacy-safe view of The LeadFlow Pro's own analytics system: traffic, actions, tools, funnel, and Google visibility.",
    url: "https://www.theleadflowpro.com/live",
    siteName: "The LeadFlow Pro",
    images: [{ url: "/og/home.png", width: 1200, height: 630 }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Real Traffic. Real Actions. Real Systems.",
    description:
      "The LeadFlow Pro's own analytics system, live and privacy-safe: traffic, actions, tools, funnel, Google visibility.",
    images: ["/og/home.png"],
  },
};

const TRACK_GRID = [
  {
    icon: Activity,
    title: "Every visit, sourced",
    body: "Where people came from, including Google, social, ads, and referrals, plus which sources produce action instead of just traffic.",
  },
  {
    icon: MousePointerClick,
    title: "Every click that matters",
    body: "Buttons, calls, texts, emails, outbound links, scroll depth. Where attention goes, and where it dies.",
  },
  {
    icon: Route,
    title: "The full funnel",
    body: "Visitor → engaged → action → conversation → lead → booked call. Conversion and drop-off at every stage.",
  },
  {
    icon: Wrench,
    title: "Tools that earn their keep",
    body: "Which free tools get used, finished, and turned into conversations, plus which need fixing.",
  },
  {
    icon: Search,
    title: "Google, verified",
    body: "Impressions, clicks, average position by page and query, plus daily index checks against Google's own API.",
  },
  {
    icon: PhoneCall,
    title: "No missed revenue",
    body: "Calls, texts, forms, and bookings all land in one CRM with visible follow-up and a clear next action.",
  },
  {
    icon: Gauge,
    title: "Pages that need attention",
    body: "Traffic with no conversions, high exits, and slipping rankings are flagged automatically and fixed deliberately.",
  },
  {
    icon: ShieldCheck,
    title: "Privacy-safe by design",
    body: "Anonymous IDs only. No names, no IPs, no form answers in analytics. Aggregates in public, detail stays private.",
  },
  {
    icon: Radar,
    title: "Owned, not rented",
    body: "First-party data stays in the business's own database, not locked inside somebody else's analytics account.",
  },
];

async function getInitialData(): Promise<{ payload: LivePayload; showLeads: boolean; proof: Array<{ value: string; label: string }> }> {
  const supabase = createSupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const [metrics, feed, series, settings] = await Promise.all([
    supabase.rpc("public_live_metrics"),
    supabase.rpc("public_live_feed", { p_limit: 12 }),
    supabase.rpc("public_live_series"),
    supabase.from("site_settings").select("key, value"),
  ]);
  const map = Object.fromEntries((settings.data ?? []).map((r) => [r.key, r.value ?? ""]));
  const proof: Array<{ value: string; label: string }> = [];
  for (const n of [1, 2, 3, 4]) {
    const value = (map[`proof_${n}_value`] ?? "").trim();
    const label = (map[`proof_${n}_label`] ?? "").trim();
    if (value && label) proof.push({ value, label });
  }
  return {
    payload: {
      metrics: metrics.data ?? null,
      feed: feed.data ?? [],
      series: series.data ?? null,
      fetched_at: new Date().toISOString(),
    },
    showLeads: map.live_show_leads === "on",
    proof,
  };
}

export default async function LivePage() {
  const { payload, showLeads, proof } = await getInitialData();

  return (
    <main className={`cb-page ${styles.page}`}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebPage",
            name: "The LeadFlow Pro Live | Real Traffic, Real Actions, Real Systems",
            url: "https://www.theleadflowpro.com/live",
            description:
              "A live, privacy-safe view of The LeadFlow Pro's own analytics system: traffic, actions, tools, funnel, and Google visibility.",
            isPartOf: { "@type": "WebSite", name: "The LeadFlow Pro", url: "https://www.theleadflowpro.com" },
          }),
        }}
      />

      {/* ---- hero ---- */}
      <section className="cb-hero">
        <div className="cb-shell cb-hero-layout">
          <div className="cb-hero-copy">
            <p className="cb-eyebrow">The LeadFlow Pro Live</p>
            <h1 className="cb-h1">
              Real traffic. Real actions.
              <em>Real systems.</em>
            </h1>
            <p className="cb-hero-lead">
              Anybody can claim they know how to build websites, capture attention, and
              create lead systems. This is the actual system working on the business you are
              looking at right now, with visitor privacy protected the whole way.
            </p>
            <div className="cb-actions">
              <CtaLink
                href="/start"
                event="build_this_for_me"
                placement="live_hero"
                className="cb-btn cb-btn--primary"
              >
                Build This for My Business
                <ArrowRight aria-hidden="true" />
              </CtaLink>
              <Link href="/tools" className="cb-btn cb-btn--ghost">
                Explore the Tools
              </Link>
            </div>
            <p className="cb-hero-own">
              <ShieldCheck aria-hidden="true" />
              Privacy-safe public aggregates. Detailed customer data stays private.
            </p>
          </div>

          <figure className="cb-hero-visual">
            <Image
              src="/images/homepage-v2/proof-cockpit.webp"
              alt="A dark measurement cockpit representing traffic, actions, tools, and revenue signals"
              width={1920}
              height={1080}
              priority
              sizes="(max-width: 900px) 100vw, 56vw"
            />
            <figcaption>
              <span>Live proof system</span>
              <strong>First-party signals. One owner view.</strong>
            </figcaption>
          </figure>
        </div>
      </section>

      {/* ---- live dashboard ---- */}
      <section className={styles.dashboardSection}>
        <LiveDashboard initial={payload} showLeads={showLeads} />
        <p className={styles.dataNote}>
          Every number on this page is a real aggregate from The LeadFlow Pro&apos;s own first-party
          analytics. Nothing is simulated, estimated, or seeded. Public metrics never include
          identities, exact locations, IP addresses, or anything a visitor typed. Detailed
          interaction tracking went live in August 2026 and grows from here.
        </p>
      </section>

      {/* ---- website grader ---- */}
      <section className={styles.graderSection} aria-labelledby="grader-heading">
        <div className="lfp-ink p-5 sm:p-8">
          <div className="relative">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#5b87ff]">
              The LeadFlow Radar
            </p>
            <h2 id="grader-heading" className="mt-2 font-display text-2xl font-black tracking-tight text-white sm:text-3xl">
              How does your website compare?
            </h2>
            <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-[#c9d3e4]">
              Plug in your address. We run the same checks Google runs, plus our own lead-capture
              radar, and put your grades next to this site&apos;s and the average of every site
              graded here. Three columns. Same ruler. No guessing.
            </p>
            <div className="mt-5">
              <WebsiteGrader />
            </div>
          </div>
        </div>
      </section>

      {/* ---- what this can track ---- */}
      <section className={`cb-band ${styles.trackSection}`} aria-labelledby="track-heading">
        <div className="cb-shell">
        <h2 id="track-heading" className="cb-h2">
          What this system can track for your business
        </h2>
        <p className="cb-lead">
          The post gets attention. The system makes money. This page is the reporting layer of the
          same machine we install for clients: websites, lead capture, CRM, follow-up, and
          analytics, connected in accounts you own.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {TRACK_GRID.map((item) => (
            <div key={item.title} className="card card-hover !p-5">
              <item.icon aria-hidden="true" className="h-5 w-5 text-[var(--blue)]" />
              <h3 className="mt-3 font-bold text-[var(--heading)]">{item.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-[var(--muted)]">{item.body}</p>
            </div>
          ))}
        </div>
        </div>
      </section>

      {/* ---- operator proof ---- */}
      <section className={`cb-band cb-band--ink ${styles.operatorSection}`} aria-labelledby="operator-heading">
        <div className="cb-shell">
        <div className="lfp-ink p-6 sm:p-10">
          <div className="relative">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#5b87ff]">Built by an operator</p>
            <h2 id="operator-heading" className="mt-3 max-w-2xl font-display text-3xl font-black tracking-tight text-white sm:text-4xl">
              I have already built what you are trying to build. Now let&apos;s build yours.
            </h2>
            <p className="mt-4 max-w-2xl leading-relaxed text-[#c9d3e4]">
              Companies, offers, audiences, ecommerce operations, fulfillment, sales processes,
              websites, and software built under real pressure, with real money on the line.
              This dashboard is not a demo somebody designed for a portfolio. It is the reporting
              layer of a working business, and the same machine gets installed for clients.
            </p>
            {proof.length > 0 && (
              <dl className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
                {proof.map((p) => (
                  <div key={p.label} className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
                    <dt className="order-2 mt-1 text-[12px] leading-snug text-[#a8b4c8]">{p.label}</dt>
                    <dd className="order-1 text-2xl font-black text-white">{p.value}</dd>
                  </div>
                ))}
              </dl>
            )}
            <div className="mt-8">
              <Link href="/about" className="inline-flex items-center gap-2 text-sm font-bold text-[#5b87ff] hover:text-white">
                The full operator story
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
        </div>
      </section>

      {/* ---- closing CTA ---- */}
      <section className={`cb-band ${styles.closingSection}`} aria-labelledby="closing-heading">
        <div className="cb-shell">
        <div className={styles.closingPanel}>
          <h2 id="closing-heading" className="font-display text-3xl font-black tracking-tight text-[var(--heading)] sm:text-4xl">
            This Is What Your Business Could See.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl leading-relaxed text-[var(--text)]">
            Your website should not leave you guessing. You should know where people came from,
            what they clicked, where they left, which pages created leads, and what needs to be
            fixed next. Turn attention into conversations. Turn conversations into sales.
          </p>
          <div id="dashboard-request" className="mt-8 scroll-mt-24">
            <DashboardRequestForm />
          </div>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <CtaLink href="/start" event="build_my_system" placement="live_closing" className="button-secondary">
              Map My Whole Company First
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </CtaLink>
            <Link href="/book" className="button-secondary">
              Book a 10-Minute Fit Call
            </Link>
          </div>
          <p className="mt-6 text-xs text-[var(--quiet)]">
            No missed calls, no missed texts, no missed revenue.
          </p>
        </div>
        </div>
      </section>
    </main>
  );
}
