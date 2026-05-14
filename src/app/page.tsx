import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  Globe2,
  MessageSquareText,
  MousePointerClick,
  PhoneCall,
  Radar,
  Route,
  Sparkles,
  Target,
  Zap,
} from "lucide-react";
import { LightFooter, LightHeader } from "@/components/site/LightHeader";
import { VisitorIdField } from "@/components/site/VisitorIdField";
import { createSeoMetadata } from "@/lib/seo-metadata";

export const revalidate = 86400;

export const metadata = createSeoMetadata({
  title: "The LeadFlow Pro - Business Funnel, AI Follow-Up, and Growth Systems",
  description:
    "The LeadFlow Pro helps owner-led businesses capture leads, route follow-up, read the data, and book the next move with Ryan Nichols.",
  path: "/",
  imageTitle: "The LeadFlow Pro",
  imageSubtitle: "A clearer lead funnel for owner-led businesses.",
});

const DAILY_FOCUS = [
  {
    label: "Missed-call recovery",
    title: "Catch the lead before they call the next business.",
    metric: "0-2 min",
    note: "Response window to protect",
  },
  {
    label: "Social proof",
    title: "Turn attention into a reason to book.",
    metric: "3 posts",
    note: "Minimum proof assets to review",
  },
  {
    label: "Offer clarity",
    title: "Make the next click obvious on every page.",
    metric: "1 CTA",
    note: "Primary action per screen",
  },
  {
    label: "Pipeline cleanup",
    title: "Separate hot leads from people just browsing.",
    metric: "A/B/C",
    note: "Simple lead-quality split",
  },
  {
    label: "Calendar pressure",
    title: "Push serious buyers to a real time slot.",
    metric: "10 min",
    note: "Fit call, not a ramble",
  },
  {
    label: "Ad-account triage",
    title: "Find the spend leak before buying more traffic.",
    metric: "$50-$200",
    note: "Typical paid-lead risk band",
  },
  {
    label: "Follow-up rhythm",
    title: "Make every lead hear from you more than once.",
    metric: "5 touch",
    note: "Text, email, call, retarget, recap",
  },
];

const BEST_DEMOS = [
  {
    title: "Lead Leak Audit",
    body: "Find where calls, clicks, forms, DMs, and follow-up are turning into lost money.",
    href: "/lead-leak-audit",
    cta: "Run audit",
    Icon: Route,
  },
  {
    title: "Missed Call Machine",
    body: "Turn phone leaks into instant text-back, tracking, and follow-up tasks.",
    href: "/dashboard/leads/missed-call",
    cta: "See the system",
    Icon: PhoneCall,
  },
  {
    title: "Live Pulse Dashboard",
    body: "Read visitors, sources, share-backs, clicks, and movement without guessing.",
    href: "/pulse",
    cta: "Open pulse",
    Icon: Radar,
  },
  {
    title: "Ad Account Autopsy",
    body: "A sharper review path for businesses burning money before the funnel is fixed.",
    href: "/tools/ad-account-autopsy",
    cta: "Run autopsy",
    Icon: ClipboardCheck,
  },
];

const ROUTES = [
  { label: "Free Lead Leak Audit", href: "/lead-leak-audit", body: "Find the first money leak without buying ads." },
  { label: "Organic Growth Plan", href: "/organic-growth", body: "See the no-ads distribution system." },
  { label: "Proof", href: "/proof", body: "Receipts, tools, tracking, and examples." },
  { label: "Social Media", href: "/services", body: "Done-for-you platform growth." },
  { label: "Consulting", href: "/services/consulting", body: "Operator help, audits, decisions." },
];

const GLOBE_NODES = [
  { label: "Calls", value: "12", x: "18%", y: "35%" },
  { label: "Forms", value: "7", x: "70%", y: "22%" },
  { label: "DMs", value: "18", x: "62%", y: "70%" },
  { label: "Ads", value: "$", x: "30%", y: "72%" },
];

const DAILY_BUILD_DROPS = [
  {
    label: "Instant Quote Tool",
    audience: "Contractors, cleaners, med spas, repair shops",
    title: "A calculator that prices the job and captures the buyer.",
    build: "Questions, price range, contact capture, and a follow-up path.",
    hook: "People play with the number, then leave their info.",
    Icon: MousePointerClick,
  },
  {
    label: "Missed-Call Rescue",
    audience: "Local service businesses and appointment shops",
    title: "A phone leak catcher that turns silence into a text-back.",
    build: "Missed-call page, SMS wording, callback task, and simple tracking.",
    hook: "Shows owners exactly how many buyers they are losing.",
    Icon: PhoneCall,
  },
  {
    label: "Lead Magnet Quiz",
    audience: "Coaches, gyms, consultants, real estate, legal support",
    title: "A quiz that tells the buyer what package fits them.",
    build: "Short quiz, result screen, email capture, and recommended offer.",
    hook: "Feels personal without forcing a sales call first.",
    Icon: Route,
  },
  {
    label: "Owner Dashboard",
    audience: "Any business tired of guessing what is working",
    title: "A command board for leads, calls, clicks, tasks, and sales.",
    build: "One screen with the numbers that decide the next move.",
    hook: "Makes the business feel like a game they can win.",
    Icon: BarChart3,
  },
  {
    label: "Before/After Builder",
    audience: "Beauty, fitness, home services, creative services",
    title: "A visual proof page that turns results into booked calls.",
    build: "Gallery, proof blocks, story captions, and CTA routing.",
    hook: "Lets prospects see themselves in the result.",
    Icon: Sparkles,
  },
  {
    label: "Referral Game",
    audience: "Restaurants, boutiques, creators, communities",
    title: "A simple points or reward page that gets customers sharing.",
    build: "Referral code, reward tracker, share CTA, and owner view.",
    hook: "Turns happy customers into a visible growth loop.",
    Icon: Zap,
  },
  {
    label: "File-to-Funnel Page",
    audience: "Experts with PDFs, forms, packets, or messy assets",
    title: "A download, checklist, or intake asset that becomes a lead path.",
    build: "Upload/download flow, lead capture, follow-up copy, and routing.",
    hook: "Turns old files into something that sells.",
    Icon: ClipboardCheck,
  },
];

const WEEKLY_BUILD_OFFERS = [
  {
    label: "$250 Build Slot",
    title: "$250 down. Pick the thing. Ryan builds the first serious version.",
    body: "Website, landing page, app prototype, HTML tool, quote calculator, domain setup, lead magnet, or dashboard. The deposit reserves the work and gets credited toward the scoped build.",
    bullets: ["No vague agency retainer", "A real asset people can click", "Scope decided after the intake"],
  },
  {
    label: "72-Hour Funnel Flip",
    title: "Turn a dead homepage into a lead-capture path.",
    body: "A focused sprint for businesses whose site looks fine but does not make buyers leave a name, phone, email, or booking request.",
    bullets: ["One clear offer", "One clean intake", "One next-click path"],
  },
  {
    label: "Bright Object Build Week",
    title: "Give your business one interactive thing people remember.",
    body: "A quiz, calculator, scoreboard, checker, map, tracker, or booking tool that makes the business feel more advanced than the competition.",
    bullets: ["Fun to click", "Useful to the buyer", "Built around follow-up"],
  },
  {
    label: "Owner Control Room",
    title: "Stop asking where the leads came from.",
    body: "A small dashboard that shows lead source, status, follow-up, and the next move so an owner can stop hunting through tabs.",
    bullets: ["Lead visibility", "Simple status board", "Decision-ready metrics"],
  },
];

function todayFocus() {
  const dayIndex = Math.floor(Date.now() / 86_400_000) % DAILY_FOCUS.length;
  return DAILY_FOCUS[dayIndex];
}

function todayBuildDrop() {
  const dayIndex = Math.floor(Date.now() / 86_400_000) % DAILY_BUILD_DROPS.length;
  return DAILY_BUILD_DROPS[dayIndex];
}

function weeklyBuildOffer() {
  const weekIndex = Math.floor(Date.now() / (86_400_000 * 7)) % WEEKLY_BUILD_OFFERS.length;
  return WEEKLY_BUILD_OFFERS[weekIndex];
}

export default function HomePage() {
  const focus = todayFocus();
  const buildDrop = todayBuildDrop();
  const weeklyOffer = weeklyBuildOffer();

  return (
    <div className="min-h-screen bg-white text-slate-950">
      <LightHeader activePath="/" />

      <main>
        <Hero focus={focus} />
        <BuildDropSection dailyDrop={buildDrop} weeklyOffer={weeklyOffer} />
        <CommandGlobeSection />
        <BestDemoSection />
        <LeadFunnelSection />
        <RouteSection />
      </main>

      <LightFooter />
    </div>
  );
}

function Hero({
  focus,
}: {
  focus: (typeof DAILY_FOCUS)[number];
}) {
  return (
    <section className="relative isolate min-h-[calc(100svh-112px)] overflow-hidden bg-slate-950 text-white">
      <Image
        src="/images/premier-dental-academy-makeover-poster.jpg"
        alt="Business website and content work produced through The LeadFlow Pro"
        fill
        priority
        sizes="100vw"
        className="object-cover"
      />
      <div className="absolute inset-0 bg-slate-950/72" />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(2,6,23,0.95)_0%,rgba(2,6,23,0.78)_45%,rgba(2,6,23,0.38)_100%)]" />

      <div className="relative mx-auto flex min-h-[calc(100svh-112px)] max-w-7xl flex-col justify-center px-4 pb-32 pt-12 sm:px-6 sm:pb-24 lg:px-8">
        <div className="max-w-5xl">
          <div className="inline-flex items-center gap-2 rounded-md border border-cyan-300/50 bg-cyan-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-cyan-100">
            <Sparkles className="h-3.5 w-3.5" />
            The LeadFlow Pro
          </div>
          <h1 className="mt-5 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
            Build the business funnel that catches the lead, reads the data, and books the next move.
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-7 text-slate-200 sm:text-lg">
            For owner-led businesses that need more than a pretty website: lead capture,
            missed-call recovery, social proof, follow-up, dashboards, and a clear reason for
            buyers to leave their information.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/lead-leak-audit"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-accent-500 px-6 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-accent-500/20 hover:bg-accent-400"
            >
              Run lead leak audit <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/organic-growth"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-white/25 bg-white/10 px-6 py-3 text-sm font-bold text-white backdrop-blur hover:bg-white/15"
            >
              See no-ads plan <CalendarClock className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-6 flex max-w-2xl flex-wrap gap-2 text-sm">
            <span className="rounded-md border border-white/15 bg-white/10 px-3 py-2 font-semibold text-cyan-100">
              Today: {focus.label}
            </span>
            <span className="rounded-md border border-white/15 bg-white/10 px-3 py-2 text-slate-200">
              {focus.metric} - {focus.note}
            </span>
            <span className="rounded-md border border-white/15 bg-white/10 px-3 py-2 text-slate-200">
              Path: name + phone + email
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

function BuildDropSection({
  dailyDrop,
  weeklyOffer,
}: {
  dailyDrop: (typeof DAILY_BUILD_DROPS)[number];
  weeklyOffer: (typeof WEEKLY_BUILD_OFFERS)[number];
}) {
  const DropIcon = dailyDrop.Icon;

  return (
    <section id="build-drops" className="border-b border-slate-200 bg-white">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[0.92fr_1.08fr] lg:px-8 lg:py-16">
        <div className="flex flex-col justify-center">
          <div className="inline-flex w-fit items-center gap-2 rounded-md border border-accent-300 bg-accent-100 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-slate-950">
            <Sparkles className="h-3.5 w-3.5" />
            Weekly business teaser
          </div>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
            Do not sell "anything." Show them the thing they did not know their business could have.
          </h2>
          <p className="mt-4 text-base leading-7 text-slate-700">
            The $250-down offer works when the examples are concrete: a tool, page, dashboard,
            calculator, booking path, or mini app that makes their business feel bigger and more
            organized the second they see it.
          </p>

          <div className="mt-7 rounded-lg border border-slate-200 bg-slate-950 p-5 text-white shadow-xl shadow-slate-200/80">
            <div className="text-xs font-semibold uppercase tracking-widest text-accent-200">
              {weeklyOffer.label}
            </div>
            <h3 className="mt-3 text-2xl font-black tracking-tight">{weeklyOffer.title}</h3>
            <p className="mt-3 text-sm leading-6 text-slate-300">{weeklyOffer.body}</p>
            <div className="mt-5 grid gap-2">
              {weeklyOffer.bullets.map((bullet) => (
                <div key={bullet} className="flex items-center gap-2 text-sm font-semibold text-slate-100">
                  <CheckCircle2 className="h-4 w-4 text-accent-300" />
                  {bullet}
                </div>
              ))}
            </div>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/lead-leak-audit"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-accent-500 px-5 py-3 text-sm font-bold text-slate-950 hover:bg-accent-400"
              >
                Audit my lead path <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/challenge"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/10 px-5 py-3 text-sm font-bold text-white hover:bg-white/15"
              >
                Reserve $250 build slot
              </Link>
            </div>
          </div>
        </div>

        <div>
          <div className="rounded-lg border border-cyan-200 bg-cyan-50 p-5 shadow-xl shadow-cyan-100/70 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-widest text-cyan-800">
                  Today's bright object
                </div>
                <h3 className="mt-3 text-2xl font-black tracking-tight text-slate-950">
                  {dailyDrop.label}
                </h3>
              </div>
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-white text-cyan-700 shadow-sm">
                <DropIcon className="h-6 w-6" />
              </div>
            </div>

            <p className="mt-4 text-xl font-semibold leading-8 text-slate-950">{dailyDrop.title}</p>

            <div className="mt-6 grid gap-3">
              <BuildDropDetail label="Best fit" value={dailyDrop.audience} />
              <BuildDropDetail label="What gets built" value={dailyDrop.build} />
              <BuildDropDetail label="Why it gets attention" value={dailyDrop.hook} />
            </div>

            <div className="mt-6 rounded-lg border border-cyan-200 bg-white p-4">
              <div className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                Simple public copy
              </div>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-800">
                "$250 down. I will help you turn one business idea into a real page, tool, app,
                calculator, or funnel people can actually click."
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {DAILY_BUILD_DROPS.slice(0, 4).map((drop) => (
              <div key={drop.label} className="rounded-lg border border-slate-200 bg-white p-4">
                <drop.Icon className="h-5 w-5 text-cyan-700" />
                <div className="mt-3 text-sm font-black text-slate-950">{drop.label}</div>
                <p className="mt-1 text-xs leading-5 text-slate-600">{drop.hook}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function BuildDropDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-cyan-200 bg-white p-4">
      <div className="text-xs font-semibold uppercase tracking-widest text-cyan-800">{label}</div>
      <p className="mt-2 text-sm font-semibold leading-6 text-slate-800">{value}</p>
    </div>
  );
}

function CommandGlobeSection() {
  return (
    <section className="border-b border-slate-200 bg-slate-950 text-white">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8 lg:py-16">
        <div className="flex flex-col justify-center">
          <div className="inline-flex w-fit items-center gap-2 rounded-md border border-cyan-300/35 bg-cyan-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-cyan-100">
            <Globe2 className="h-3.5 w-3.5" />
            Business command globe
          </div>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
            A business should feel like a control room, not a pile of tabs.
          </h2>
          <p className="mt-4 text-base leading-7 text-slate-300">
            The homepage demo is built around the idea Ryan keeps asking for: view the business
            in a globe-style command layer where leads, files, analytics, calls, ads, and follow-up
            make sense fast.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <MiniMetric icon={MousePointerClick} label="Clicks" value="Tracked" />
            <MiniMetric icon={MessageSquareText} label="Follow-up" value="Queued" />
            <MiniMetric icon={BarChart3} label="Analytics" value="Readable" />
            <MiniMetric icon={Zap} label="Next move" value="Obvious" />
          </div>
        </div>

        <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4 shadow-2xl shadow-black/30">
          <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
            <div className="relative min-h-[360px] overflow-hidden rounded-lg border border-white/10 bg-[radial-gradient(circle_at_center,rgba(34,184,255,0.22),rgba(15,23,42,0.98)_58%)]">
              <div className="absolute inset-8 rounded-full border border-cyan-200/20" />
              <div className="absolute inset-16 rounded-full border border-cyan-200/15" />
              <div className="absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-300/35 bg-cyan-300/10" />
              <div className="absolute left-1/2 top-1/2 h-px w-[76%] -translate-x-1/2 bg-cyan-200/20" />
              <div className="absolute left-1/2 top-1/2 h-[76%] w-px -translate-y-1/2 bg-cyan-200/20" />
              {GLOBE_NODES.map((node) => (
                <div
                  key={node.label}
                  className="absolute min-w-24 rounded-lg border border-white/15 bg-slate-950/80 px-3 py-2 shadow-lg shadow-black/25"
                  style={{ left: node.x, top: node.y }}
                >
                  <div className="text-[10px] font-semibold uppercase tracking-widest text-cyan-200">
                    {node.label}
                  </div>
                  <div className="mt-1 text-xl font-black text-white">{node.value}</div>
                </div>
              ))}
              <div className="absolute bottom-4 left-4 right-4 rounded-lg border border-accent-300/25 bg-accent-300/10 p-3">
                <div className="text-xs font-semibold uppercase tracking-widest text-accent-100">
                  Recommended move
                </div>
                <div className="mt-1 text-sm font-semibold text-white">
                  Fix intake first, then scale traffic.
                </div>
              </div>
            </div>

            <div className="grid gap-3">
              <PipelineStep n="01" title="Lead arrives" body="Call, form, DM, ad click, or referral." />
              <PipelineStep n="02" title="System tags it" body="Source, intent, service fit, urgency." />
              <PipelineStep n="03" title="Follow-up fires" body="Text, email, task, or calendar path." />
              <PipelineStep n="04" title="Ryan sees the move" body="The dashboard shows what to fix next." />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function MiniMetric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof MousePointerClick;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
      <Icon className="h-5 w-5 text-cyan-200" />
      <div className="mt-3 text-sm font-semibold text-slate-300">{label}</div>
      <div className="mt-1 text-lg font-bold text-white">{value}</div>
    </div>
  );
}

function PipelineStep({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
      <div className="text-xs font-semibold uppercase tracking-widest text-cyan-200">{n}</div>
      <div className="mt-2 font-bold text-white">{title}</div>
      <p className="mt-1 text-sm leading-5 text-slate-300">{body}</p>
    </div>
  );
}

function BestDemoSection() {
  return (
    <section className="border-b border-slate-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="max-w-3xl">
          <div className="text-xs font-semibold uppercase tracking-widest text-cyan-700">
            Best of what is here
          </div>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
            Show the strongest tools first. Let the rest live where it belongs.
          </h2>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {BEST_DEMOS.map((demo) => (
            <Link
              key={demo.title}
              href={demo.href}
              className="group rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-cyan-300 hover:shadow-lg"
            >
              <demo.Icon className="h-6 w-6 text-cyan-700" />
              <h3 className="mt-4 text-lg font-bold text-slate-950">{demo.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{demo.body}</p>
              <div className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-cyan-700 group-hover:text-cyan-900">
                {demo.cta} <ArrowRight className="h-4 w-4" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function LeadFunnelSection() {
  return (
    <section id="lead-funnel" className="border-b border-slate-200 bg-slate-50">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[0.88fr_1.12fr] lg:px-8 lg:py-16">
        <div>
          <div className="inline-flex items-center gap-2 rounded-md border border-accent-300 bg-accent-100 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-slate-950">
            <Target className="h-3.5 w-3.5" />
            The clean funnel
          </div>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
            Leave the info. Pick calendar or router. Move.
          </h2>
          <p className="mt-4 text-base leading-7 text-slate-700">
            This is the home-page job: collect a real buyer, get the business context, and send
            them to the right next step. No clutter. No maze.
          </p>
          <div className="mt-6 space-y-3">
            <FunnelPoint title="For fast buyers" body="They can book the 10-minute call immediately." />
            <FunnelPoint title="For uncertain buyers" body="The router asks enough to place them in the right offer." />
            <FunnelPoint title="For Ryan" body="The intake saves context instead of making every conversation start from zero." />
          </div>
        </div>

        <form
          action="/api/intake"
          method="post"
          className="rounded-lg border border-slate-200 bg-white p-5 shadow-xl shadow-slate-200/70 sm:p-6"
        >
          <VisitorIdField />
          <input type="hidden" name="workStyle" value="hands-on-build" />
          <input type="hidden" name="budgetTier" value="2000-5000" />
          <input type="hidden" name="urgency" value="this-week" />
          <input type="hidden" name="bestContactMethod" value="any" />

          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-cyan-700">
            <CheckCircle2 className="h-4 w-4" />
            Start the business review
          </div>
          <h3 className="mt-3 text-2xl font-bold text-slate-950">
            Send Ryan the lead.
          </h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            This goes into the intake system and routes you to the cleanest next page.
          </p>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field label="Name" name="fullName" placeholder="Your name" required />
            <Field label="Phone" name="phone" placeholder="Best number" required />
            <Field label="Email" name="email" type="email" placeholder="you@business.com" required />
            <Field label="Business" name="businessName" placeholder="Business name" />
          </div>

          <label className="mt-4 block">
            <span className="text-sm font-bold text-slate-800">What do you need first?</span>
            <select
              name="primaryNeed"
              defaultValue="working-session"
              className="mt-2 min-h-12 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-900 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
            >
              <option value="working-session">Build my website, app, funnel, or HTML tool</option>
              <option value="managed-social">Run my social and content machine</option>
              <option value="ads">Fix or launch my Meta ads</option>
              <option value="audit">Show me what is leaking</option>
              <option value="operator">Bring Ryan into the business operation</option>
              <option value="one-decision">Unstick one important decision</option>
            </select>
          </label>

          <label className="mt-4 block">
            <span className="text-sm font-bold text-slate-800">Short context</span>
            <textarea
              name="notes"
              rows={4}
              placeholder="What are you selling, where are leads coming from, and what is currently broken?"
              className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-sm text-slate-900 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
            />
          </label>

          <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto]">
            <button
              type="submit"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-slate-950 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-slate-900/15 hover:bg-slate-800"
            >
              Send and route me <ArrowRight className="h-4 w-4" />
            </button>
            <Link
              href="/book"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-950 hover:bg-slate-50"
            >
              Calendar instead
            </Link>
          </div>
        </form>
      </div>
    </section>
  );
}

function Field({
  label,
  name,
  placeholder,
  type = "text",
  required,
}: {
  label: string;
  name: string;
  placeholder: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-slate-800">{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        className="mt-2 min-h-12 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
      />
    </label>
  );
}

function FunnelPoint({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="font-bold text-slate-950">{title}</div>
      <p className="mt-1 text-sm leading-6 text-slate-600">{body}</p>
    </div>
  );
}

function RouteSection() {
  return (
    <section className="bg-white">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="grid gap-8 lg:grid-cols-[0.82fr_1.18fr]">
          <div>
            <div className="text-xs font-semibold uppercase tracking-widest text-cyan-700">
              Everything else has a place
            </div>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
              The homepage points. The inside pages explain.
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {ROUTES.map((route) => (
              <Link
                key={route.href}
                href={route.href}
                className="group rounded-lg border border-slate-200 bg-slate-50 p-5 transition hover:border-cyan-300 hover:bg-white hover:shadow-lg"
              >
                <div className="font-bold text-slate-950">{route.label}</div>
                <p className="mt-2 text-sm leading-6 text-slate-600">{route.body}</p>
                <div className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-cyan-700 group-hover:text-cyan-900">
                  Go there <ArrowRight className="h-4 w-4" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
