import Link from "next/link";
import {
  ArrowRight,
  BadgeDollarSign,
  Brain,
  CheckCircle2,
  ClipboardList,
  Code2,
  FileText,
  KeyRound,
  MessageSquareText,
} from "lucide-react";
import { LightFooter, LightHeader } from "@/components/site/LightHeader";
import { VisitorIdField } from "@/components/site/VisitorIdField";
import { TOOL_CHALLENGE_DEPOSIT } from "@/lib/challenge-deposit";
import { createSeoMetadata } from "@/lib/seo-metadata";

export const metadata = createSeoMetadata({
  title: "Blueprint Request Received - The LeadFlow Pro",
  description:
    "Your Stump Ryan free build blueprint request was received. Here is what gets reviewed next and how to continue the build if the plan makes sense.",
  path: "/stump-ryan/thank-you",
  imageTitle: "Blueprint Request Received",
  imageSubtitle: "Ryan maps the leak, the first useful tool, and the client-owned build path.",
  noIndex: true,
});

const REVIEW_STEPS = [
  {
    Icon: ClipboardList,
    title: "Ryan reads the leak",
    body: "The first check is the business problem: missed leads, slow follow-up, manual work, poor routing, or no owner visibility.",
  },
  {
    Icon: Brain,
    title: "The tool gets scoped",
    body: "The blueprint maps the first useful version, not a bloated software fantasy that never ships.",
  },
  {
    Icon: KeyRound,
    title: "Ownership gets named",
    body: "The plan should say where the tool lives and how the client keeps the code, data, accounts, keys, and access.",
  },
];

const BLUEPRINT_OUTPUT = [
  "The leak or process bottleneck Ryan thinks matters first.",
  "The first useful tool, page, dashboard, automation, or app version to build.",
  "The platform path: Shopify, Wix, WordPress, Vercel, GitHub, Supabase, or existing site.",
  "What the $250 continuation deposit would unlock if the plan makes sense.",
];

export default function StumpRyanThankYouPage() {
  return (
    <div className="min-h-screen bg-white text-slate-950">
      <LightHeader activePath="/stump-ryan" />

      <main>
        <section className="relative overflow-hidden border-b border-slate-200">
          <div
            aria-hidden
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(135deg, #fff8f1 0%, #f6f9ff 36%, #eef9ff 70%, #f3eaff 100%)",
            }}
          />
          <div
            aria-hidden
            className="absolute -right-32 -top-36 h-[520px] w-[520px] rounded-full opacity-45 blur-3xl"
            style={{ background: "radial-gradient(circle, rgba(35,184,255,0.58) 0%, transparent 65%)" }}
          />
          <div
            aria-hidden
            className="absolute -bottom-40 -left-28 h-[540px] w-[540px] rounded-full opacity-40 blur-3xl"
            style={{ background: "radial-gradient(circle, rgba(255,154,31,0.44) 0%, transparent 64%)" }}
          />

          <div className="relative mx-auto grid max-w-7xl gap-6 px-4 py-10 sm:px-6 lg:grid-cols-[minmax(0,1fr)_430px] lg:px-8 lg:py-14">
            <div className="rounded-3xl border border-white/70 bg-white/82 p-6 shadow-[0_30px_70px_-24px_rgba(15,23,42,0.25)] backdrop-blur-xl sm:p-8">
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300 bg-cyan-50 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-cyan-800">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Blueprint request received
              </div>
              <h1 className="mt-5 max-w-4xl text-4xl font-semibold leading-tight tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
                Good. Now Ryan turns the idea into a buildable first move.
              </h1>
              <p className="mt-5 max-w-3xl text-base leading-7 text-slate-700 sm:text-lg">
                The free deliverable is a 1-3 page Lead Leak + Dream Tool Build Blueprint. It is not
                the finished app. It is the plan that decides whether the first build is worth
                continuing.
              </p>

              <div className="mt-7 grid gap-3 md:grid-cols-3">
                {REVIEW_STEPS.map(({ Icon, title, body }) => (
                  <div key={title} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <Icon className="h-5 w-5 text-cyan-700" />
                    <h2 className="mt-3 text-base font-bold text-slate-950">{title}</h2>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{body}</p>
                  </div>
                ))}
              </div>
            </div>

            <aside className="rounded-3xl border border-slate-900/10 bg-slate-950 p-6 text-white shadow-[0_30px_70px_-24px_rgba(15,23,42,0.42)]">
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-cyan-100">
                <FileText className="h-3.5 w-3.5" />
                What comes back
              </div>
              <h2 className="mt-4 text-2xl font-semibold tracking-tight">The blueprint should answer four things.</h2>
              <div className="mt-5 grid gap-3">
                {BLUEPRINT_OUTPUT.map((item) => (
                  <div key={item} className="flex gap-3 rounded-2xl border border-white/10 bg-white/[0.06] p-3">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-cyan-200" />
                    <p className="text-sm leading-6 text-slate-200">{item}</p>
                  </div>
                ))}
              </div>
              <Link
                href="/proof"
                className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-semibold text-white hover:bg-white/15"
              >
                See what has been built <ArrowRight className="h-4 w-4" />
              </Link>
            </aside>
          </div>
        </section>

        <section className="border-b border-slate-200 bg-white">
          <div className="mx-auto grid max-w-7xl gap-6 px-4 py-12 sm:px-6 lg:grid-cols-[0.82fr_1.18fr] lg:px-8">
            <div>
              <div className="inline-flex items-center gap-2 rounded-md border border-accent-300 bg-accent-100 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-slate-950">
                <Code2 className="h-3.5 w-3.5" />
                Optional continuation
              </div>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
                If the blueprint hits, $250 starts the first build block.
              </h2>
              <p className="mt-4 text-base leading-7 text-slate-700">
                Do not pay the continuation because you submitted the form. Pay it only when the
                plan makes sense and you want Ryan to move from blueprint into the first useful
                version.
              </p>
            </div>

            <div className="overflow-hidden rounded-3xl border border-slate-900/10 bg-slate-950 text-white shadow-[0_28px_70px_-30px_rgba(15,23,42,0.75)]">
              <div className="grid gap-0 sm:grid-cols-[1fr_auto]">
                <div className="p-5">
                  <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-cyan-100">
                    <BadgeDollarSign className="h-3.5 w-3.5" />
                    Continue only if it fits
                  </div>
                  <h3 className="mt-3 text-2xl font-semibold tracking-tight">
                    Reserve {TOOL_CHALLENGE_DEPOSIT.reserveHours} hours toward the first owned asset.
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-300">
                    The continuation deposit credits toward the scoped build. If the next phase is
                    larger, Ryan quotes that before the work keeps moving.
                  </p>
                </div>
                <div className="border-t border-white/10 bg-gradient-to-br from-cyan-500/20 via-slate-900 to-accent-500/20 p-5 sm:w-56 sm:border-l sm:border-t-0">
                  <form action="/api/challenge/deposit" method="POST" className="grid gap-3">
                    <VisitorIdField />
                    <button
                      type="submit"
                      className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-accent-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-accent-500/20 hover:bg-accent-600"
                    >
                      Continue the build <ArrowRight className="h-4 w-4" />
                    </button>
                    <Link
                      href="/book?source=stump-ryan-thank-you"
                      className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-semibold text-white hover:bg-white/15"
                    >
                      Talk first
                    </Link>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-slate-50">
          <div className="mx-auto grid max-w-7xl gap-4 px-4 py-12 sm:px-6 md:grid-cols-3 lg:px-8">
            <NextCard
              href="/tools/ad-account-autopsy"
              Icon={MessageSquareText}
              title="If ads are part of the problem"
              body="Run the ad account autopsy and bring those numbers into the next conversation."
              cta="Open autopsy"
            />
            <NextCard
              href="/tools/seo-grader"
              Icon={FileText}
              title="If the website feels weak"
              body="Grade the page basics so the blueprint has cleaner public-page context."
              cta="Grade the site"
            />
            <NextCard
              href="/stump-ryan"
              Icon={Code2}
              title="Need to add more detail?"
              body="Submit a second request if you forgot an important account, process, or tool idea."
              cta="Add detail"
            />
          </div>
        </section>
      </main>

      <LightFooter />
    </div>
  );
}

function NextCard({
  href,
  Icon,
  title,
  body,
  cta,
}: {
  href: string;
  Icon: typeof MessageSquareText;
  title: string;
  body: string;
  cta: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-cyan-300 hover:shadow-lg"
    >
      <Icon className="h-6 w-6 text-cyan-700" />
      <h2 className="mt-4 text-lg font-bold text-slate-950">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">{body}</p>
      <div className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-cyan-700 group-hover:text-cyan-950">
        {cta} <ArrowRight className="h-4 w-4" />
      </div>
    </Link>
  );
}
