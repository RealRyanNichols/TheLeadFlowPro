import Link from "next/link";
import {
  ArrowRight,
  Brain,
  CheckCircle2,
  Code2,
  KeyRound,
  MessageSquareText,
  MousePointerClick,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { PromptBuildLab } from "@/components/challenge/PromptBuildLab";
import { LightFooter, LightHeader } from "@/components/site/LightHeader";
import {
  STUMP_RYAN_BUILD_EXAMPLES,
  STUMP_RYAN_FACEBOOK_OFFER,
} from "@/lib/facebook-offer";
import { createSeoMetadata } from "@/lib/seo-metadata";

export const metadata = createSeoMetadata({
  title: "Free Build Blueprint - Stump Ryan",
  description:
    "Stump Ryan with the business tool, app, dashboard, calculator, portal, or follow-up system you wish existed. Get the free build blueprint first.",
  path: "/facebook-ad-offer",
  imageTitle: "Stump Ryan Free Build Blueprint",
  imageSubtitle: "Tell Ryan the leak or dream tool. Get the first useful version mapped before paid buildout.",
  image: "/images/stump-me-tool-challenge-poster.jpg",
});

const TRUST_POINTS = [
  {
    Icon: MousePointerClick,
    title: "One useful first version",
    body: "The blueprint narrows the idea into the first screen, flow, or tool that can actually help the business.",
  },
  {
    Icon: KeyRound,
    title: "Built in your account",
    body: "Shopify, Wix, WordPress, Vercel, GitHub, Supabase, or another setup you control.",
  },
  {
    Icon: ShieldCheck,
    title: "You own the asset",
    body: "The point is not to hold your code, keys, data, website, ads, or customer access hostage.",
  },
];

const HOW_IT_WORKS = [
  "Submit the business, site, lead leak, or tool idea.",
  "Ryan maps a 1-3 page blueprint for the first useful version.",
  "If the plan makes sense, $250 continues into the first build block.",
];

export default function FacebookAdOfferPage() {
  return (
    <div className="min-h-screen bg-white text-slate-950">
      <LightHeader activePath="/stump-ryan" />

      <main>
        <section className="relative overflow-hidden border-b border-slate-200 bg-slate-950 text-white">
          <div
            aria-hidden
            className="absolute inset-0 opacity-[0.11]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(125,211,252,0.22) 1px, transparent 1px), linear-gradient(90deg, rgba(125,211,252,0.18) 1px, transparent 1px)",
              backgroundSize: "42px 42px",
            }}
          />
          <div
            aria-hidden
            className="absolute inset-0 bg-[radial-gradient(circle_at_78%_18%,rgba(34,211,238,0.24),transparent_34%),radial-gradient(circle_at_12%_72%,rgba(249,115,22,0.22),transparent_36%),linear-gradient(135deg,rgba(2,6,23,0.96),rgba(8,47,73,0.92))]"
          />

          <div className="relative mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,0.86fr)_minmax(470px,1.14fr)] lg:px-8 lg:py-12">
            <div className="flex flex-col justify-center">
              <div className="inline-flex w-fit items-center gap-2 rounded-md border border-cyan-300/35 bg-cyan-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-cyan-100">
                <Sparkles className="h-3.5 w-3.5" />
                Free blueprint first
              </div>
              <h1 className="mt-5 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
                {STUMP_RYAN_FACEBOOK_OFFER.title}
              </h1>
              <p className="mt-5 max-w-3xl text-base leading-7 text-slate-200 sm:text-lg">
                {STUMP_RYAN_FACEBOOK_OFFER.promise}
              </p>
              <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.06] p-4">
                <div className="flex items-start gap-3">
                  <Brain className="mt-0.5 h-5 w-5 shrink-0 text-cyan-200" />
                  <p className="text-sm leading-6 text-slate-200">
                    This is not "anything for free." The free offer is the plan: Ryan looks at the
                    leak, maps the tool, and tells you what the first useful version should be.
                  </p>
                </div>
              </div>
              <div className="mt-7 grid gap-3">
                {HOW_IT_WORKS.map((item, index) => (
                  <div key={item} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3">
                    <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-cyan-300/15 text-xs font-black text-cyan-100">
                      {index + 1}
                    </span>
                    <p className="text-sm font-semibold text-slate-100">{item}</p>
                  </div>
                ))}
              </div>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="#blueprint-form"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-accent-500 px-6 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-accent-500/20 hover:bg-accent-400"
                >
                  Start free blueprint <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/proof"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/10 px-6 py-3 text-sm font-bold text-white hover:bg-white/15"
                >
                  See proof
                </Link>
              </div>
            </div>

            <div id="blueprint-form" className="scroll-mt-28">
              <PromptBuildLab source="facebook-ad-stump-ryan" landingPage="/facebook-ad-offer" />
            </div>
          </div>
        </section>

        <section className="border-b border-slate-200 bg-white">
          <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
            <div className="max-w-3xl">
              <div className="text-xs font-semibold uppercase tracking-widest text-cyan-700">
                What Ryan can map
              </div>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                The tool does not have to be complicated. It has to be useful.
              </h2>
              <p className="mt-4 text-base leading-7 text-slate-700">
                Cold traffic needs examples. These are the kinds of first versions people can
                understand fast enough to submit the form.
              </p>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {STUMP_RYAN_BUILD_EXAMPLES.map((example) => (
                <div key={example.title} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <Code2 className="h-6 w-6 text-cyan-700" />
                  <h3 className="mt-4 text-lg font-bold text-slate-950">{example.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{example.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-b border-slate-200 bg-slate-50">
          <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[0.85fr_1.15fr] lg:px-8 lg:py-16">
            <div>
              <div className="inline-flex items-center gap-2 rounded-md border border-accent-300 bg-accent-100 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-slate-950">
                <MessageSquareText className="h-3.5 w-3.5" />
                Why this converts
              </div>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                The ask is small. The outcome feels concrete.
              </h2>
              <p className="mt-4 text-base leading-7 text-slate-700">
                People may not know they need a custom app. They do know what keeps breaking. This
                page lets them show the mess first, then see what Ryan would build from it.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {TRUST_POINTS.map(({ Icon, title, body }) => (
                <div key={title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <Icon className="h-6 w-6 text-cyan-700" />
                  <h3 className="mt-4 text-lg font-bold text-slate-950">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-white">
          <div className="mx-auto max-w-4xl px-4 py-12 text-center sm:px-6 lg:px-8 lg:py-16">
            <div className="inline-flex items-center gap-2 rounded-md border border-cyan-300 bg-cyan-50 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-cyan-800">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Client-owned by default
            </div>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
              Nobody should hold your business hostage.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-700">
              The point of the build is to put the asset in your hands: your site, repo, domain,
              database, customer data, keys, access, and accounts. Managed hosting can be separate
              later. Ownership is the default.
            </p>
            <Link
              href="#blueprint-form"
              className="mt-7 inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-slate-950 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-slate-900/15 hover:bg-slate-800"
            >
              Get the free blueprint <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </main>

      <LightFooter />
    </div>
  );
}
