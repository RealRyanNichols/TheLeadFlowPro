import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Bot,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  DollarSign,
  Gauge,
  GitBranch,
  Inbox,
  LayoutDashboard,
  Megaphone,
  MessageCircle,
  MousePointerClick,
  PhoneCall,
  Route,
  Send,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { Footer } from "@/components/site/Footer";
import { Header } from "@/components/site/Header";
import { cn } from "@/lib/utils";

export const metadata = {
  title: "Build My System | The LeadFlow Pro",
  description:
    "Implementation services for business owners who need lead capture, AI agents, follow-up, websites, ads, dashboards, tracking, reporting, and execution.",
};

const leakItems: Array<{
  title: string;
  body: string;
  icon: LucideIcon;
}> = [
  {
    title: "Missed calls",
    body: "The phone rings while your team is busy, driving, on a job, or already talking to somebody else.",
    icon: PhoneCall,
  },
  {
    title: "Missed texts",
    body: "A buyer asks a real question, then the reply comes too late or never gets assigned.",
    icon: MessageCircle,
  },
  {
    title: "Missed DMs",
    body: "Instagram, Facebook, TikTok, and LinkedIn interest gets buried inside inboxes nobody owns.",
    icon: Inbox,
  },
  {
    title: "Forms that go nowhere",
    body: "The website captures a name, then the lead sits in email instead of moving into a follow-up path.",
    icon: ClipboardCheck,
  },
  {
    title: "Ads with no follow-up",
    body: "Traffic gets paid for, but the system behind the click is too slow, unclear, or disconnected.",
    icon: Megaphone,
  },
  {
    title: "Websites with no clear next step",
    body: "A visitor lands, scans, hesitates, and leaves because the page never tells them what to do now.",
    icon: MousePointerClick,
  },
];

const buildItems: Array<{
  title: string;
  body: string;
  icon: LucideIcon;
  accent: "cyan" | "lead" | "accent";
}> = [
  {
    title: "AI receptionist",
    body: "Answer common questions, capture context, route urgent leads, and keep after-hours interest alive.",
    icon: Bot,
    accent: "cyan",
  },
  {
    title: "Lead capture forms",
    body: "Forms that ask useful questions and create a better first conversation.",
    icon: ClipboardCheck,
    accent: "lead",
  },
  {
    title: "Lead scoring",
    body: "Score intent, urgency, fit, contact route, and next action before the lead gets cold.",
    icon: Gauge,
    accent: "accent",
  },
  {
    title: "CRM automation",
    body: "Move calls, forms, texts, DMs, and booked calls into one clean operating lane.",
    icon: GitBranch,
    accent: "cyan",
  },
  {
    title: "Follow-up sequences",
    body: "Texts, emails, reminders, handoffs, and owner alerts that keep the next step moving.",
    icon: Send,
    accent: "lead",
  },
  {
    title: "Website funnels",
    body: "Pages that make the offer clear, collect the right signal, and push people to action.",
    icon: Route,
    accent: "accent",
  },
  {
    title: "Dashboards",
    body: "A command view for leads, source, status, follow-up, buyer fit, and owner decisions.",
    icon: LayoutDashboard,
    accent: "cyan",
  },
  {
    title: "Ads setup",
    body: "Campaign structure, landing paths, tracking, and reporting without pretending ads fix a broken system.",
    icon: Target,
    accent: "lead",
  },
  {
    title: "Sales workflow",
    body: "A practical path for who answers, what gets asked, when to follow up, and what happens next.",
    icon: TrendingUp,
    accent: "accent",
  },
];

const offerLadder: Array<{
  price: string;
  title: string;
  fit: string;
  deliverables: string[];
  tone: "entry" | "core" | "premium";
}> = [
  {
    price: "$497",
    title: "Audit",
    fit: "You know something is leaking, but you need the order of attack.",
    deliverables: ["Lead leak review", "Website and follow-up notes", "Next move map"],
    tone: "entry",
  },
  {
    price: "$1,497",
    title: "Power Bundle",
    fit: "You need the core capture path tightened without a long build cycle.",
    deliverables: ["Offer and CTA cleanup", "Lead capture flow", "Basic follow-up plan"],
    tone: "core",
  },
  {
    price: "$1,997",
    title: "Automation Sprint",
    fit: "You need calls, forms, texts, and DMs moving into a cleaner system.",
    deliverables: ["Routing workflow", "CRM automation", "Owner alert path"],
    tone: "core",
  },
  {
    price: "$4,997",
    title: "Operator Build",
    fit: "You want the website, intake, AI, follow-up, and dashboard built as one machine.",
    deliverables: ["Website funnel", "AI receptionist path", "Dashboard and reporting"],
    tone: "premium",
  },
  {
    price: "$9,997",
    title: "Growth Sprint",
    fit: "You are ready to connect strategy, buildout, tracking, follow-up, and ads support.",
    deliverables: ["Full capture system", "Ads and tracking setup", "Weekly execution rhythm"],
    tone: "premium",
  },
  {
    price: "Custom",
    title: "Strategic Project",
    fit: "You have a bigger workflow, multi-location build, marketplace, or internal lead desk.",
    deliverables: ["System architecture", "Implementation roadmap", "Build and reporting plan"],
    tone: "entry",
  },
];

const operatingPromises = [
  "Strategy before spend.",
  "Implementation before theory.",
  "Tracking before opinion.",
  "Reporting before guessing.",
  "Execution before another meeting.",
];

export default function BuildMySystemPage() {
  return (
    <>
      <Header />
      <main className="pb-24">
        <section className="relative isolate overflow-hidden border-b border-white/10 py-14 md:py-20">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_18%_10%,rgba(255,186,61,0.2),transparent_32%),radial-gradient(circle_at_80%_16%,rgba(35,184,255,0.18),transparent_34%),linear-gradient(135deg,#030711_0%,#07101c_50%,#101108_100%)]" />
          <div className="container">
            <div className="grid gap-8 lg:grid-cols-[minmax(0,0.92fr)_minmax(360px,0.78fr)] lg:items-center">
              <div>
                <p className="inline-flex items-center gap-2 rounded-lg border border-accent-300/30 bg-accent-300/10 px-4 py-2 text-xs font-extrabold uppercase tracking-wider text-accent-200">
                  <Sparkles className="h-4 w-4" />
                  Build my system
                </p>
                <h1 className="mt-6 max-w-5xl text-4xl font-black leading-[0.96] tracking-normal text-white md:text-7xl">
                  You do not need more attention until you can catch the attention you already have.
                </h1>
                <p className="mt-6 max-w-3xl text-lg leading-8 text-ink-100 md:text-xl">
                  The LeadFlow Pro builds the system that catches calls, texts, DMs, forms, comments, and after-hours interest before good leads slip away.
                </p>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                  <Link
                    href="/book"
                    className="btn-accent text-base"
                    data-conversion-event="build_system_fit_call_click"
                    data-conversion-cta="Book the 10-minute fit call"
                    data-conversion-source-page="/build-my-system"
                    data-conversion-destination="/book"
                  >
                    Book the 10-minute fit call
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link
                    href="/contact?topic=build-my-system"
                    className="btn-ghost text-base"
                    data-conversion-event="build_system_next_move_click"
                    data-conversion-cta="Send me your business and I'll tell you the next move"
                    data-conversion-source-page="/build-my-system"
                    data-conversion-destination="/contact"
                  >
                    Send me your business and I&apos;ll tell you the next move
                  </Link>
                </div>

                <div className="mt-8 grid gap-3 sm:grid-cols-3">
                  {[
                    ["No blind spend", "Fix capture before pushing traffic."],
                    ["No fake promises", "Strategy, buildout, tracking, reporting, execution."],
                    ["Built by an operator", "Practical systems a business can actually run."],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
                      <p className="text-xs font-extrabold uppercase tracking-wider text-ink-400">{label}</p>
                      <p className="mt-2 text-sm font-bold leading-5 text-white">{value}</p>
                    </div>
                  ))}
                </div>
              </div>

              <SystemCaptureGraphic />
            </div>
          </div>
        </section>

        <section className="border-b border-white/10 bg-ink-900/45 py-14 md:py-20">
          <div className="container">
            <div className="grid gap-8 lg:grid-cols-[minmax(0,0.46fr)_minmax(0,1fr)] lg:items-start">
              <div className="lg:sticky lg:top-24">
                <p className="text-xs font-extrabold uppercase tracking-wider text-red-200">The leak</p>
                <h2 className="mt-3 text-3xl font-black leading-tight text-white md:text-5xl">
                  Most businesses are not short on interest. They are short on capture.
                </h2>
                <p className="mt-4 text-base leading-7 text-ink-200 md:text-lg">
                  If the lead comes in and nobody routes it, scores it, answers it, or follows up, the next ad is not the fix.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {leakItems.map((item) => (
                  <LeakCard key={item.title} item={item} />
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="py-14 md:py-20">
          <div className="container">
            <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
              <div className="max-w-3xl">
                <p className="text-xs font-extrabold uppercase tracking-wider text-cyan-300">What we build</p>
                <h2 className="mt-3 text-3xl font-black leading-tight text-white md:text-5xl">
                  The capture system, not another pretty page with nowhere to send a lead.
                </h2>
                <p className="mt-4 text-base leading-7 text-ink-200 md:text-lg">
                  The work is practical: intake, routing, scoring, automation, follow-up, dashboards, ads setup, and sales workflow.
                </p>
              </div>
              <Link href="/tools" className="btn-ghost justify-center text-sm">
                See intake tools
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {buildItems.map((item) => (
                <BuildCard key={item.title} item={item} />
              ))}
            </div>
          </div>
        </section>

        <section className="border-y border-white/10 bg-ink-900/45 py-14 md:py-20">
          <div className="container">
            <div className="grid gap-8 lg:grid-cols-[minmax(0,0.5fr)_minmax(0,1fr)] lg:items-start">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-wider text-accent-300">Offer ladder</p>
                <h2 className="mt-3 text-3xl font-black leading-tight text-white md:text-5xl">
                  Pick the size of the fix.
                </h2>
                <p className="mt-4 text-base leading-7 text-ink-200 md:text-lg">
                  Start with the leak audit, tighten the machine, or build the full operating path. No revenue promises. No ROAS promises. Just real strategy, implementation, tracking, reporting, and execution.
                </p>
                <div className="mt-6 grid gap-2">
                  {operatingPromises.map((promise) => (
                    <div key={promise} className="flex gap-3 rounded-lg border border-white/10 bg-white/[0.035] p-3 text-sm font-bold text-ink-100">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-lead-300" />
                      {promise}
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 xl:grid-cols-2">
                {offerLadder.map((offer) => (
                  <OfferCard key={`${offer.price}-${offer.title}`} offer={offer} />
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="py-14 md:py-20">
          <div className="container">
            <div className="lead-shell overflow-hidden p-6 md:p-8">
              <div className="grid gap-8 lg:grid-cols-[minmax(0,0.86fr)_minmax(300px,0.44fr)] lg:items-center">
                <div>
                  <p className="inline-flex items-center gap-2 rounded-lg border border-lead-300/25 bg-lead-300/10 px-3 py-2 text-xs font-extrabold uppercase tracking-wider text-lead-100">
                    <CalendarClock className="h-4 w-4" />
                    Next move
                  </p>
                  <h2 className="mt-5 max-w-4xl text-3xl font-black leading-tight text-white md:text-5xl">
                    Send the business. I&apos;ll find the leak, name the first fix, and tell you what I would build next.
                  </h2>
                  <p className="mt-4 max-w-3xl text-base leading-7 text-ink-200 md:text-lg">
                    The call is short on purpose. I need to know what you sell, where leads come from, what gets missed, and whether you are ready to install the machine.
                  </p>
                  <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                    <Link href="/book" className="btn-accent text-base">
                      Book the 10-minute fit call
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                    <Link href="/problem-intake" className="btn-ghost text-base">
                      Start with the leak audit
                    </Link>
                  </div>
                </div>

                <div className="grid gap-3">
                  {[
                    ["1", "Business", "What you sell, where leads come from, what breaks."],
                    ["2", "Leak", "Calls, forms, DMs, texts, ads, website, or follow-up."],
                    ["3", "Build", "The smallest system that gives you control first."],
                  ].map(([number, title, body]) => (
                    <div key={title} className="grid grid-cols-[2.75rem_minmax(0,1fr)] gap-3 rounded-lg border border-white/10 bg-white/[0.035] p-4">
                      <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-cyan-300/25 bg-cyan-300/10 text-sm font-black text-cyan-100">
                        {number}
                      </div>
                      <div>
                        <p className="text-sm font-black text-white">{title}</p>
                        <p className="mt-1 text-sm leading-6 text-ink-300">{body}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

function SystemCaptureGraphic() {
  const inputs = [
    { label: "Calls", icon: PhoneCall },
    { label: "Texts", icon: MessageCircle },
    { label: "DMs", icon: Inbox },
    { label: "Forms", icon: ClipboardCheck },
    { label: "Comments", icon: Megaphone },
  ];

  return (
    <aside className="lead-shell overflow-hidden p-5">
      <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-wider text-cyan-300">Lead capture console</p>
          <h2 className="mt-1 text-2xl font-black text-white">Catch, score, route, follow up.</h2>
        </div>
        <ShieldCheck className="h-7 w-7 text-lead-300" />
      </div>

      <div className="mt-5 rounded-lg border border-white/10 bg-[#04070d]/90 p-4">
        <div className="grid gap-3 sm:grid-cols-5 lg:grid-cols-1 xl:grid-cols-5">
          {inputs.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="rounded-lg border border-white/10 bg-white/[0.04] p-3 text-center">
                <Icon className="mx-auto h-5 w-5 text-cyan-200" />
                <p className="mt-2 text-xs font-black uppercase tracking-wider text-ink-100">{item.label}</p>
              </div>
            );
          })}
        </div>

        <div className="my-5 grid place-items-center">
          <div className="h-12 w-px bg-gradient-to-b from-cyan-300 via-accent-300 to-lead-300" />
          <div className="rounded-full border border-accent-300/35 bg-accent-300/12 px-4 py-2 text-xs font-extrabold uppercase tracking-wider text-accent-100">
            LeadFlow routing
          </div>
          <div className="h-12 w-px bg-gradient-to-b from-lead-300 via-cyan-300 to-transparent" />
        </div>

        <div className="grid gap-3">
          {[
            ["Score", "Intent, urgency, fit, contact route"],
            ["Assign", "Owner, rep, AI, CRM, follow-up"],
            ["Report", "Source, status, next action, outcome"],
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg border border-white/10 bg-white/[0.035] p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-extrabold uppercase tracking-wider text-ink-400">{label}</p>
                <BarChart3 className="h-4 w-4 text-lead-300" />
              </div>
              <p className="mt-2 text-sm font-bold leading-5 text-white">{value}</p>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}

function LeakCard({ item }: { item: (typeof leakItems)[number] }) {
  const Icon = item.icon;

  return (
    <article className="lead-panel min-h-52 p-5">
      <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-red-300/20 bg-red-400/10 text-red-100">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="mt-5 text-2xl font-black leading-tight text-white">{item.title}</h3>
      <p className="mt-3 text-sm leading-6 text-ink-200">{item.body}</p>
    </article>
  );
}

function BuildCard({ item }: { item: (typeof buildItems)[number] }) {
  const Icon = item.icon;
  const accentClass = {
    accent: "border-accent-300/25 bg-accent-300/10 text-accent-100",
    cyan: "border-cyan-300/25 bg-cyan-300/10 text-cyan-100",
    lead: "border-lead-300/25 bg-lead-300/10 text-lead-100",
  }[item.accent];

  return (
    <article className="lead-panel flex min-h-64 flex-col p-5">
      <div className={cn("flex h-11 w-11 items-center justify-center rounded-lg border", accentClass)}>
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="mt-5 text-2xl font-black leading-tight text-white">{item.title}</h3>
      <p className="mt-3 text-sm leading-6 text-ink-200">{item.body}</p>
    </article>
  );
}

function OfferCard({ offer }: { offer: (typeof offerLadder)[number] }) {
  const toneClass = {
    entry: "border-white/10 bg-white/[0.035]",
    core: "border-cyan-300/20 bg-cyan-300/10",
    premium: "border-accent-300/25 bg-accent-300/10",
  }[offer.tone];

  return (
    <article className={cn("rounded-lg border p-5 shadow-2xl shadow-black/20", toneClass)}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-wider text-ink-400">Implementation lane</p>
          <h3 className="mt-2 text-2xl font-black leading-tight text-white">{offer.title}</h3>
        </div>
        <div className="grid min-h-14 min-w-24 place-items-center rounded-lg border border-white/10 bg-ink-950/60 px-3 text-center">
          <DollarSign className="h-4 w-4 text-accent-300" />
          <strong className="text-lg font-black leading-none text-white">{offer.price}</strong>
        </div>
      </div>
      <p className="mt-4 text-sm leading-6 text-ink-200">{offer.fit}</p>
      <div className="mt-5 grid gap-2">
        {offer.deliverables.map((item) => (
          <div key={item} className="flex gap-3 rounded-lg border border-white/10 bg-ink-950/45 p-3 text-sm font-bold text-ink-100">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-lead-300" />
            {item}
          </div>
        ))}
      </div>
      <Link href="/book" className="btn-ghost mt-5 w-full justify-center text-sm">
        Talk through this
        <ArrowRight className="h-4 w-4" />
      </Link>
    </article>
  );
}
