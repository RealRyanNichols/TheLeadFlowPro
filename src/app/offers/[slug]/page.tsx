// src/app/offers/[slug]/page.tsx - Universal offer sales page.
//
// Renders any offer from /lib/offers.ts. The visual language follows the
// "Journey" aesthetic Ryan approved: dark glass cards on a navy gradient
// with gradient text and animated milestone dots. Hopeful, premium, and
// makes a small investment feel like an investment in yourself.

import Link from "next/link";
import { notFound } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  BadgeCheck,
  Calendar,
  Check,
  Clock,
  FileText,
  Lightbulb,
  MousePointerClick,
  Route,
  ShieldCheck,
  Sparkles,
  X as XIcon,
} from "lucide-react";
import { LightHeader, LightFooter } from "@/components/site/LightHeader";
import { BandwidthMeter } from "@/components/BandwidthMeter";
import { InteractiveOfferDecision } from "@/components/offers/InteractiveOfferDecision";
import { OFFERS, type Offer, type OfferSlug } from "@/lib/offers";
import { formatHours, getOfferWorkload, type OfferWorkload } from "@/lib/workload";
import { createSeoMetadata } from "@/lib/seo-metadata";

export function generateStaticParams() {
  return Object.keys(OFFERS).map((slug) => ({ slug }));
}

type Props = { params: { slug: string } };
type PageProps = Props & {
  searchParams?: {
    source?: string;
    fit?: string;
    budget?: string;
  };
};

export function generateMetadata({ params }: Props) {
  const offer = OFFERS[params.slug as OfferSlug];
  if (!offer) return { title: "Offer · The LeadFlow Pro" };
  return createSeoMetadata({
    title: offer.metaTitle,
    description: offer.metaDescription,
    path: `/offers/${offer.slug}`,
    imageTitle: offer.hero.h1Highlight,
    imageSubtitle: `${offer.price.big}${offer.price.sub ? ` ${offer.price.sub}` : ""}. ${offer.metaDescription}`,
    imageKicker: offer.badge,
  });
}

export default async function OfferPage({ params, searchParams }: PageProps) {
  const offer = OFFERS[params.slug as OfferSlug];
  if (!offer) notFound();

  const O = offer;
  const Icon = O.Icon;
  const recommendedFromStart = searchParams?.source === "start";
  const workload = getOfferWorkload(O.slug);
  const story = getOfferStory(O.slug);

  return (
    <div className="min-h-screen bg-[#fff8f1] text-slate-900">
      <LightHeader />

      {recommendedFromStart && (
        <div className="border-b border-cyan-200 bg-gradient-to-r from-cyan-50 via-white to-accent-300/20">
          <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-3 text-sm text-slate-700 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-2">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-cyan-700" />
              <span>
                Recommended from your intake. This is the cleanest next click based on the problem,
                budget, and urgency you picked.
              </span>
            </div>
            <Link href="/start" className="font-semibold text-cyan-700 hover:text-cyan-800">
              Reroute me
            </Link>
          </div>
        </div>
      )}

      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(135deg, #fff8f1 0%, #f6f9ff 38%, #eef9ff 70%, #f3eaff 100%)",
          }}
        />
        <div
          aria-hidden
          className="absolute -top-32 -right-32 h-[520px] w-[520px] rounded-full opacity-50 blur-3xl"
          style={{ background: "radial-gradient(circle, rgba(35,184,255,0.55) 0%, transparent 65%)" }}
        />
        <div
          aria-hidden
          className="absolute -bottom-40 -left-32 h-[560px] w-[560px] rounded-full opacity-55 blur-3xl"
          style={{ background: "radial-gradient(circle, rgba(255,154,31,0.45) 0%, transparent 65%)" }}
        />
        <div
          aria-hidden
          className="absolute top-1/2 right-1/3 h-[320px] w-[320px] rounded-full opacity-30 blur-3xl"
          style={{ background: "radial-gradient(circle, rgba(176,107,255,0.35) 0%, transparent 60%)" }}
        />

        <div className="relative mx-auto max-w-7xl px-4 pb-10 pt-8 sm:pb-12 sm:pt-12">
          <div className="grid gap-8 lg:grid-cols-5 lg:items-center">
            <div className="lg:col-span-3">
              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300 bg-white/70 backdrop-blur px-3 py-1 text-xs uppercase tracking-widest text-cyan-700 font-semibold shadow-sm">
                  <Icon className="h-3.5 w-3.5" /> {O.badge}
                </div>
                <BandwidthMeter variant="compact" />
              </div>
              <h1 className="mt-5 text-4xl font-semibold leading-tight tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
                {O.hero.h1Lead}{" "}
                <span className="bg-gradient-to-r from-brand-700 via-cyan-500 to-accent-500 bg-clip-text text-transparent">
                  {O.hero.h1Highlight}
                </span>
              </h1>
              <p className="mt-5 text-lg text-slate-700 leading-relaxed">{O.hero.paragraph}</p>
              {O.hero.paragraph2 && (
                <p className="mt-3 text-base text-slate-700 leading-relaxed">{O.hero.paragraph2}</p>
              )}
              <div className="mt-7 flex flex-col sm:flex-row gap-3">
                <Link
                  href={O.primaryCta.href}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 py-3 font-semibold text-white shadow-lg shadow-slate-900/30 hover:bg-slate-800"
                >
                  {O.primaryCta.label} <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href={O.secondaryCta.href}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white/80 backdrop-blur px-6 py-3 font-semibold text-slate-800 hover:border-brand-500 hover:text-brand-700"
                >
                  {O.secondaryCta.label}
                </Link>
              </div>
              <p className="mt-3 text-xs text-slate-500">
                Secure Stripe checkout. Texas-law engagement letter + mutual NDA. No specific-outcome
                guarantees.
              </p>
            </div>

            <div className="lg:col-span-2">
              <div className="relative rounded-3xl border border-white/60 bg-white/70 backdrop-blur-xl p-6 shadow-[0_30px_70px_-20px_rgba(15,23,42,0.20)] ring-1 ring-slate-900/5">
                <div className="flex items-center justify-between">
                  <div className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">Price</div>
                  {O.price.badge && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-50 border border-cyan-200 px-2.5 py-0.5 text-xs font-semibold text-cyan-800">
                      {O.price.badge}
                    </span>
                  )}
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-5xl font-bold text-slate-950 tabular-nums">{O.price.big}</span>
                  <span className="text-sm text-slate-500">{O.price.sub}</span>
                </div>
                <ul className="mt-5 space-y-2.5 text-sm text-slate-700">
                  {O.price.deliverables.map((d) => (
                    <li key={d} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-cyan-600" />
                      <span>{d}</span>
                    </li>
                  ))}
                </ul>

                {O.price.addOn && (
                  <div className="mt-5 rounded-xl border border-cyan-300 bg-cyan-50/80 p-3 text-xs text-cyan-900">
                    <div className="flex items-center gap-1.5 font-semibold">
                      <Sparkles className="h-3.5 w-3.5" /> {O.price.addOn.title}
                    </div>
                    <p className="mt-1 leading-relaxed">{O.price.addOn.body}</p>
                  </div>
                )}

                {workload && (
                  <div className="mt-5 rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-700">
                    <div className="flex items-start gap-2">
                      <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan-600" />
                      <div>
                        <div className="font-semibold text-slate-950">Capacity math</div>
                        <p className="mt-1 leading-relaxed">
                          {workload.visibleTime} reserves {formatHours(workload.reserveHours)} of
                          Ryan-led strategy, review, and delivery capacity. Planning estimate:{" "}
                          {formatHours(workload.planningHours)}.
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 flex items-start gap-2">
                      <Calendar className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent-600" />
                      <div>
                        <div className="font-semibold text-slate-950">Delivery promise</div>
                        <p className="mt-1 leading-relaxed">{workload.deliveryPromise}</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="mt-3 rounded-xl bg-slate-50 border border-slate-200 p-3 text-xs text-slate-600">
                  <Calendar className="inline h-3.5 w-3.5 mr-1 text-cyan-600" />
                  Cancel/reschedule with 24hr notice. Mutual NDA. No specific-outcome guarantees.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <OfferStorySpine offer={O} story={story} workload={workload} />

      <InteractiveOfferDecision
        slug={O.slug}
        category={O.category}
        priceBig={O.price.big}
        priceSub={O.price.sub}
        primaryCta={O.primaryCta}
        secondaryCta={O.secondaryCta}
        rightFit={O.rightFit}
        wrongFit={O.wrongFit}
        upgradeCredit={O.upgradeCredit}
        workload={workload}
      />

      <section className="relative overflow-hidden bg-gradient-to-br from-[#fff8f1] via-[#eef9ff] to-[#f3eaff]">
        <SoftConnector tone="light" label="Why this is worth paying for" />
        <div className="mx-auto max-w-7xl px-4 pb-12 pt-10 sm:pb-14">
          <div className="max-w-3xl">
            <div className="mb-2 text-xs font-semibold uppercase tracking-widest text-cyan-700">
              Why buy this
            </div>
            <h2 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
              The purchase has to make practical sense before it feels exciting.
            </h2>
            <p className="mt-3 text-base leading-relaxed text-slate-700">
              This is where the offer stops being a price card. You are paying for Ryan to narrow
              the problem, remove the fog, create the deliverable, and hand you a next move you can
              actually use.
            </p>
          </div>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {O.whyBuy.map((r) => (
              <Reason key={r.title} {...r} />
            ))}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-brand-950 text-white">
        <SoftConnector tone="dark" label="Then Ryan turns it into work" />
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
        <div className="relative mx-auto max-w-7xl px-4 pb-12 pt-10 sm:pb-14">
          <div className="max-w-3xl">
            <div className="mb-2 text-xs font-semibold uppercase tracking-widest text-cyan-300">
              What happens when you buy
            </div>
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Start to finish, this is the handoff path.
            </h2>
            <p className="mt-3 text-base leading-relaxed text-slate-300">
              The buyer should never wonder what happens after payment. This is the visible path
              from checkout to delivery, with the real workload accounted for in Ryan's capacity.
            </p>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {O.timeline.map((s) => (
              <Step key={s.n} {...s} />
            ))}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-gradient-to-br from-[#eef9ff] via-[#fff8f1] to-[#fff1dd]">
        <SoftConnector tone="light" label="Now qualify yourself" />
        <div className="mx-auto max-w-7xl px-4 pb-12 pt-10 sm:pb-14">
          <div className="mb-8 max-w-3xl">
            <div className="mb-2 text-xs font-semibold uppercase tracking-widest text-cyan-700">Save us both time</div>
            <h2 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
              Are you the right buyer for this?
            </h2>
            <p className="mt-3 text-base leading-relaxed text-slate-700">
              The page should tell people what to do. If it fits, reserve the work. If it does not,
              step down, book the call, or leave the spot open for someone ready.
            </p>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            <FitBlock tone="lead" title="Buy this if" items={O.rightFit} />
            <FitBlock tone="rose" title="Don't buy this if" items={O.wrongFit} />
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-brand-950 text-white">
        <SoftConnector tone="dark" label="Then look at the cost of waiting" />
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
        <div className="relative mx-auto max-w-7xl px-4 pb-12 pt-10 sm:pb-14">
          <div className="text-xs uppercase tracking-widest text-amber-300 font-semibold mb-2">The math</div>
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight mb-2">
            What it costs to NOT do this.
          </h2>
          <p className="text-slate-300 max-w-2xl">
            Spending money on me <em>is</em> spending money on you - because I turn around and put it back
            into your business as a real result. Here's the math both ways.
          </p>
          <div className="mt-8 grid gap-5 md:grid-cols-2">
            <CostBlock tone="amber" title="If you stay stuck" big={O.costMath.stuck.big} sub={O.costMath.stuck.sub} />
            <CostBlock tone="lead"  title="If you invest"     big={O.costMath.buy.big}   sub={O.costMath.buy.sub} />
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-gradient-to-br from-[#f6f9ff] via-[#ecfbff] to-[#fff4e3]">
        <SoftConnector tone="light" label="Then check who is doing the work" />
        <div className="mx-auto max-w-7xl px-4 pb-12 pt-10 sm:pb-14">
          <div className="text-xs uppercase tracking-widest text-cyan-700 font-semibold mb-2">
            Why trust Ryan with this
          </div>
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-slate-950">
            I do this in my own businesses every week.
          </h2>
          <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {O.proof.map((p) => (
              <ProofTile key={p.label} big={p.big} label={p.label} />
            ))}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-gradient-to-br from-[#fff8f1] via-[#f6f9ff] to-[#eef9ff]">
        <SoftConnector tone="light" label="Last objections" />
        <div className="mx-auto max-w-7xl px-4 pb-12 pt-10 sm:pb-14">
          <div className="text-xs uppercase tracking-widest text-cyan-700 font-semibold mb-2">Common questions</div>
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-slate-950 mb-8">
            Before you buy.
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {O.faqs.map((f) => (
              <FAQ key={f.q} q={f.q} a={f.a} />
            ))}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-brand-900 to-cyan-900 text-white">
        <SoftConnector tone="dark" label="Make the move" />
        <div
          aria-hidden
          className="absolute -top-24 left-1/2 -translate-x-1/2 h-[400px] w-[600px] rounded-full opacity-25 blur-3xl"
          style={{ background: "radial-gradient(circle, #ff9a1f 0%, transparent 60%)" }}
        />
        <div className="relative mx-auto max-w-4xl px-4 pb-16 pt-12 text-center">
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight">
            Decide. Move. Build the next chapter.
          </h2>
          {O.upgradeCredit && (
            <p className="mt-3 text-sm text-cyan-200">
              <Sparkles className="inline h-4 w-4 mr-1" /> {O.upgradeCredit}
            </p>
          )}
          <div className="mt-7 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href={O.primaryCta.href}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent-500 px-6 py-3 font-semibold text-white shadow-lg shadow-accent-500/30 hover:bg-accent-600"
            >
              {O.primaryCta.label} <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href={O.secondaryCta.href}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/5 backdrop-blur px-6 py-3 font-semibold text-white hover:bg-white/10"
            >
              {O.secondaryCta.label}
            </Link>
          </div>
          <p className="mt-4 text-xs text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Real Ryan Nichols LLC · Texas-governed under mutual NDA. We do not promise specific outcomes -
            we deliver the work and the deliverables described above.
          </p>
        </div>
      </section>

      <LightFooter />
    </div>
  );
}

/* ─── components ──────────────────────────────────────────────── */

type OfferStory = {
  eyebrow: string;
  headline: string;
  body: string;
  beats: Array<{
    Icon: LucideIcon;
    title: string;
    body: string;
  }>;
};

const DEFAULT_STORIES: Record<OfferSlug, OfferStory> = {
  "quick-look": {
    eyebrow: "The first signal",
    headline: "Before you buy a full plan, get the obvious leaks called out.",
    body:
      "The Quick-Look is built for the owner who knows the account needs help but does not need a full audit yet. Ryan looks at the real accounts, records direct notes, and points you to the next useful action.",
    beats: [
      { Icon: MousePointerClick, title: "You send the handles", body: "Business account, personal account, or both. No theory without seeing the real page." },
      { Icon: Lightbulb, title: "Ryan spots the leak", body: "Bio, offer, content angle, posting rhythm, proof, or follow-up path." },
      { Icon: FileText, title: "You get the next move", body: "A small video package and a follow-on proposal if you want Ryan involved." },
    ],
  },
  "decision-sprint": {
    eyebrow: "One stuck decision",
    headline: "The call is not the product. The decision, worksheet, and next three moves are.",
    body:
      "A 90-minute Sprint only works when the page makes the buyer feel the pressure of waiting. You are not buying a meeting. You are buying focused operator time, transcript handling, research, worksheet finalization, and a clear path you can act on.",
    beats: [
      { Icon: Route, title: "Name the stuck point", body: "Pricing, offer, hiring, software, lead flow, content, sales process, or the next business move." },
      { Icon: Clock, title: "Ryan reserves the full block", body: "The calendar says 90 minutes, but the workload behind it is closer to five hours when prep and delivery are counted." },
      { Icon: FileText, title: "You leave with a worksheet", body: "Recording, transcript, action notes, and the next three moves in writing." },
    ],
  },
  "business-audit": {
    eyebrow: "Find the leak",
    headline: "A business owner cannot fix what has never been written down clearly.",
    body:
      "The audit takes the scattered pieces of the business and turns them into a written diagnosis: offer, lead flow, sales process, tech stack, pricing, and what to fix first.",
    beats: [
      { Icon: BadgeCheck, title: "Collect the real context", body: "Access, screenshots, links, numbers, and the current operating rhythm." },
      { Icon: Lightbulb, title: "Rank the damage", body: "Not every problem matters equally. The audit tells you what to fix first." },
      { Icon: FileText, title: "Hand the team a plan", body: "A document that can be reread, assigned, and executed." },
    ],
  },
  "working-session": {
    eyebrow: "Build one useful thing",
    headline: "Stop talking about the asset. Sit down and ship it.",
    body:
      "The working session is for the buyer who already knows what has to exist: a page, offer, script, workflow, dashboard, or deliverable. Ryan gets in the work with you and turns the session into a shipped asset.",
    beats: [
      { Icon: Route, title: "Pick the asset", body: "One deliverable. One working block. No bloated scope." },
      { Icon: MousePointerClick, title: "Build in real time", body: "Ryan prompts, writes, structures, tests, and packages the work." },
      { Icon: ShieldCheck, title: "Leave with ownership", body: "The asset belongs inside your business, not in an agency black box." },
    ],
  },
  "sprint-4-week": {
    eyebrow: "Four weeks to ship",
    headline: "A sprint gives the business a working system, not another strategy document.",
    body:
      "The 4-week sprint is for bigger work that needs checkpoints, implementation, review, and handoff. It moves from idea to useful business system in a defined window.",
    beats: [
      { Icon: Route, title: "Week one sets direction", body: "Offer, workflow, customer path, content engine, or internal tool gets mapped." },
      { Icon: MousePointerClick, title: "Weeks two and three ship", body: "The system gets built, revised, and pressure-tested against real use." },
      { Icon: ShieldCheck, title: "Week four hands it over", body: "Documentation, owner view, next steps, and what continues after the sprint." },
    ],
  },
  "light-retainer": {
    eyebrow: "Keep Ryan close",
    headline: "Some owners do not need a full operator. They need a sharp second brain nearby.",
    body:
      "The light retainer keeps Ryan close enough to review decisions, unclog bottlenecks, and keep the owner from drifting back into scattered execution.",
    beats: [
      { Icon: Calendar, title: "Regular touchpoints", body: "Scheduled rhythm, not random emergency guessing." },
      { Icon: Lightbulb, title: "Fast operator feedback", body: "Decisions, offers, content, systems, and lead flow get reviewed." },
      { Icon: ShieldCheck, title: "You still own the work", body: "Ryan advises and shapes; your business keeps the system." },
    ],
  },
  "power-bundle": {
    eyebrow: "Social engine",
    headline: "The goal is not more posts. The goal is attention that can be followed up.",
    body:
      "The Power Bundle turns the public-facing rhythm into a managed system: platform selection, angles, posting, engagement, proof, and what happens after attention arrives.",
    beats: [
      { Icon: MousePointerClick, title: "Pick the platforms", body: "The work follows where your audience and offer actually belong." },
      { Icon: Lightbulb, title: "Create repeatable angles", body: "Hooks, clips, posts, proof, and field content become a content rhythm." },
      { Icon: Route, title: "Point attention somewhere", body: "Clicks, calls, forms, DMs, and follow-up need a home." },
    ],
  },
  "fb-ads": {
    eyebrow: "Ad control",
    headline: "Ryan does not take a percentage of your ad spend. The account and power stay yours.",
    body:
      "The ad offer is built around keeping ownership in the client's hands. You pay Meta directly, keep your account, and get Ryan focused on the offer, creative, tracking, and follow-up path.",
    beats: [
      { Icon: ShieldCheck, title: "Your ad account", body: "Spend stays with Meta, under your business, not hidden inside an agency invoice." },
      { Icon: MousePointerClick, title: "Track the click path", body: "Creative, landing page, lead form, follow-up, and sales action are connected." },
      { Icon: Lightbulb, title: "Improve what the data shows", body: "Ads only matter if the business learns from the signals." },
    ],
  },
  "monthly-operator": {
    eyebrow: "Operator rhythm",
    headline: "When the owner is overloaded, the business needs a weekly operating system.",
    body:
      "Monthly Operator is for businesses that need Ryan inside the rhythm: decisions, dashboards, follow-up, team handoff, content, and systems that keep moving.",
    beats: [
      { Icon: Calendar, title: "Weekly priorities", body: "The business stops drifting and gets a written operating rhythm." },
      { Icon: Route, title: "Execution path", body: "Tasks, tools, and follow-up move from scattered to visible." },
      { Icon: ShieldCheck, title: "Owner control", body: "The system is built around the business owning the process." },
    ],
  },
  "annual-advisor": {
    eyebrow: "Board-level access",
    headline: "This is for owners who want Ryan thinking with them before the decision gets expensive.",
    body:
      "The advisor track reserves deeper context and higher-level decision support. It is not a casual call package; it is a relationship for major owner decisions.",
    beats: [
      { Icon: BadgeCheck, title: "Deep context", body: "Ryan learns the business, history, risks, and owner priorities." },
      { Icon: Lightbulb, title: "Decision review", body: "Big moves get challenged before the company pays for the wrong path." },
      { Icon: ShieldCheck, title: "Private owner lane", body: "Quarterly and async access stays under Texas-law NDA." },
    ],
  },
};

function getOfferStory(slug: OfferSlug) {
  return DEFAULT_STORIES[slug];
}

function OfferStorySpine({
  offer,
  story,
  workload,
}: {
  offer: Offer;
  story: OfferStory;
  workload: OfferWorkload | null;
}) {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-[#fff8f1] via-[#f6f9ff] to-slate-950">
      <div className="mx-auto max-w-7xl px-4 pb-10 pt-2">
        <div className="overflow-hidden rounded-[2rem] border border-white/70 bg-white/80 shadow-[0_28px_80px_-38px_rgba(15,23,42,0.45)] ring-1 ring-slate-900/5 backdrop-blur-xl">
          <div className="grid gap-0 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="border-b border-slate-200 p-5 sm:p-7 lg:border-b-0 lg:border-r">
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300 bg-cyan-50 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-cyan-700">
                <Sparkles className="h-3.5 w-3.5" /> {story.eyebrow}
              </div>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                {story.headline}
              </h2>
              <p className="mt-4 text-base leading-relaxed text-slate-700">{story.body}</p>
              <div className="mt-5 grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
                <StoryStat label="Price" value={`${offer.price.big} ${offer.price.sub}`} />
                <StoryStat label="Ryan reserves" value={workload ? formatHours(workload.reserveHours) : "real time"} />
                <StoryStat label="Delivery" value={workload?.deliveryPromise ?? "written handoff"} />
              </div>
            </div>
            <div className="relative bg-slate-950 p-5 text-white sm:p-7">
              <div
                aria-hidden
                className="absolute inset-0 opacity-[0.08]"
                style={{
                  backgroundImage:
                    "linear-gradient(rgba(255,255,255,.45) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.45) 1px, transparent 1px)",
                  backgroundSize: "30px 30px",
                }}
              />
              <div className="relative">
                <div className="text-xs font-semibold uppercase tracking-widest text-cyan-200">
                  The buyer path
                </div>
                <div className="mt-5 grid gap-3">
                  {story.beats.map((beat, index) => (
                    <StoryBeat key={beat.title} index={index + 1} {...beat} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function StoryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white/80 p-3">
      <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">{label}</div>
      <div className="mt-1 text-sm font-semibold leading-snug text-slate-950">{value}</div>
    </div>
  );
}

function StoryBeat({
  Icon,
  index,
  title,
  body,
}: {
  Icon: LucideIcon;
  index: number;
  title: string;
  body: string;
}) {
  return (
    <div className="relative rounded-2xl border border-white/10 bg-white/[0.06] p-4">
      <div className="flex items-start gap-3">
        <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-300 to-accent-300 text-slate-950">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <div className="text-xs font-semibold uppercase tracking-widest text-cyan-100">Step {index}</div>
          <h3 className="mt-1 font-semibold text-white">{title}</h3>
          <p className="mt-1 text-sm leading-relaxed text-slate-300">{body}</p>
        </div>
      </div>
    </div>
  );
}

function SoftConnector({ tone, label }: { tone: "light" | "dark"; label: string }) {
  const dark = tone === "dark";
  return (
    <div className="relative mx-auto flex max-w-7xl justify-center px-4">
      <div
        className={`-mt-5 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-widest shadow-lg backdrop-blur ${
          dark
            ? "border-white/10 bg-slate-950 text-cyan-100 shadow-black/25"
            : "border-white/70 bg-white/85 text-cyan-700 shadow-slate-900/10"
        }`}
      >
        <span className={`h-2 w-2 rounded-full ${dark ? "bg-accent-300" : "bg-cyan-500"}`} />
        {label}
      </div>
    </div>
  );
}

function Reason({ Icon, title, body }: { Icon: LucideIcon; title: string; body: string }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/70 bg-white/80 p-6 shadow-[0_22px_55px_-18px_rgba(15,23,42,0.18)] ring-1 ring-cyan-300/20 backdrop-blur">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-cyan-400 via-brand-500 to-accent-500" />
      <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-brand-600 text-white">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="mt-4 font-semibold text-slate-950 text-lg">{title}</h3>
      <p className="mt-2 text-sm text-slate-700 leading-relaxed">{body}</p>
    </div>
  );
}

function Step({ n, minutes, title, body }: { n: string; minutes: string; title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur p-5 shadow-2xl shadow-black/30">
      <div className="flex items-center justify-between">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-brand-500 text-white text-sm font-bold">
          {n}
        </span>
        <span className="text-[10px] uppercase tracking-widest text-cyan-300 bg-cyan-400/10 border border-cyan-400/30 px-2 py-0.5 rounded-full">
          {minutes}
        </span>
      </div>
      <div className="mt-3 font-semibold text-white">{title}</div>
      <p className="mt-1 text-sm text-slate-300 leading-relaxed">{body}</p>
    </div>
  );
}

function FitBlock({ tone, title, items }: { tone: "lead" | "rose"; title: string; items: string[] }) {
  const styles =
    tone === "lead"
      ? "border-cyan-200 bg-cyan-50"
      : "border-rose-200 bg-rose-50";
  const chip =
    tone === "lead"
      ? "border-cyan-300 bg-cyan-100 text-cyan-800"
      : "border-rose-300 bg-rose-100 text-rose-800";
  const iconColor = tone === "lead" ? "text-cyan-600" : "text-rose-600";
  const Pill = tone === "lead" ? Check : XIcon;
  return (
    <div className={`rounded-2xl border ${styles} p-6`}>
      <div className={`inline-flex items-center gap-2 rounded-full border ${chip} px-3 py-1 text-xs font-semibold uppercase tracking-widest`}>
        <Pill className="h-3.5 w-3.5" /> {tone === "lead" ? "Right fit" : "Wrong fit"}
      </div>
      <h3 className="mt-3 text-xl font-semibold text-slate-950">{title}</h3>
      <ul className="mt-4 space-y-2.5">
        {items.map((line) => (
          <li key={line} className="flex items-start gap-2 text-slate-800 text-sm">
            <Pill className={`mt-0.5 h-5 w-5 shrink-0 ${iconColor}`} />
            <span>{line}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function CostBlock({ tone, title, big, sub }: { tone: "lead" | "amber"; title: string; big: string; sub: string }) {
  const ring = tone === "lead" ? "border-cyan-400/30 bg-cyan-400/10" : "border-amber-400/30 bg-amber-400/10";
  const chip = tone === "lead" ? "text-cyan-300" : "text-amber-300";
  return (
    <div className={`rounded-2xl border ${ring} backdrop-blur p-6`}>
      <div className={`text-xs uppercase tracking-widest ${chip} font-semibold`}>{title}</div>
      <div className="mt-2 text-4xl sm:text-5xl font-bold tabular-nums text-white">{big}</div>
      <p className="mt-2 text-sm text-slate-200 leading-relaxed">{sub}</p>
    </div>
  );
}

function ProofTile({ big, label }: { big: string; label: string }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/70 bg-white/85 p-5 shadow-[0_20px_50px_-15px_rgba(15,23,42,0.14)] ring-1 ring-cyan-300/20 backdrop-blur">
      <div
        aria-hidden
        className="absolute -right-10 -top-10 h-24 w-24 rounded-full opacity-45 blur-2xl"
        style={{ background: "radial-gradient(circle, rgba(92,208,255,0.75) 0%, transparent 70%)" }}
      />
      <div className="relative text-3xl sm:text-4xl font-bold bg-gradient-to-r from-brand-700 via-cyan-600 to-accent-500 bg-clip-text text-transparent tabular-nums">{big}</div>
      <div className="mt-2 text-sm text-slate-600 leading-snug">{label}</div>
    </div>
  );
}

function FAQ({ q, a }: { q: string; a: string }) {
  return (
    <div className="rounded-2xl border border-white/70 bg-white/80 p-5 shadow-[0_20px_50px_-15px_rgba(15,23,42,0.12)] ring-1 ring-slate-900/5 backdrop-blur">
      <div className="font-semibold text-slate-950">{q}</div>
      <p className="mt-2 text-sm text-slate-700 leading-relaxed">{a}</p>
    </div>
  );
}
