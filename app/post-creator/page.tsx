import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ChevronDown, ShieldCheck } from "lucide-react";
import IdeaMachine from "@/components/postCreator/IdeaMachine";
import PlanMonth from "@/components/postCreator/PlanMonth";
import PricingCards from "@/components/postCreator/PricingCards";
import SavedList from "@/components/postCreator/SavedList";
import ShuffleProvider from "@/components/postCreator/ShuffleProvider";
import { aiWritingStatus, postCreatorSalesOpen } from "@/lib/postCreator/ai/config";
import { DEFAULT_INPUT, ideaSpace } from "@/lib/postCreator/ideas/engine";
import {
  FILTER_LINE,
  POST_CREATOR,
  POST_CREATOR_DISCLAIMER,
  UNLIMITED_FINE_PRINT,
  UNLIMITED_TITLE,
  aiNotUnlimited,
  unlimitedBody,
} from "@/lib/postCreator/product";
import { withPublicPageMetadata } from "@/lib/publicPageMetadata";
import { COMPARE_HEADS, COMPARE_ROWS, FAQS, HERO, HOW_IT_WORKS, PLAN_SECTION } from "./copy";

// Post Creator's public page: the free idea machine first, then what AI
// writing adds and what it costs. Rendered per request because whether AI
// writing is on and whether checkout is open are read from the server's
// environment, and a build-time render would freeze both answers.
//
// The idea machine and the planner run in the browser; nothing a visitor
// types here reaches the server.

export const dynamic = "force-dynamic";

export const metadata: Metadata = withPublicPageMetadata("/post-creator", {
  title: "Social Media Post Creator | The LeadFlow Pro",
  description:
    "A free post idea machine for local businesses: a new idea every tap, a 30 day plan, and drafts for five platforms. AI writing in your voice is a separate paid plan. Nothing is posted for you.",
});

// The count in "What ... means here" is for the plainest settings: a named
// trade and no services.
const EXAMPLE_SPACE = ideaSpace({ ...DEFAULT_INPUT, trade: "plumbing" });

const SECTION = "mx-auto w-full max-w-2xl px-4";
const H2 = "text-[28px] font-black leading-tight tracking-[-0.02em] text-[var(--heading)] sm:text-[34px]";

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export default async function PostCreatorPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const aiOn = aiWritingStatus(process.env).on;
  const salesOpen = postCreatorSalesOpen(process.env);
  const cancelled = first(params.cancelled) === "1";

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };

  return (
    <main className="cb-page pb-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />

      <section className="cb-hero">
        <div className={SECTION}>
          <p className="cb-eyebrow">{HERO.eyebrow}</p>
          <h1 className="cb-h1" style={{ fontSize: "clamp(40px, 9vw, 68px)" }}>
            {HERO.title}
          </h1>
          <p className="cb-hero-lead">{HERO.body}</p>
          <p className="cb-hero-own">
            <ShieldCheck aria-hidden="true" className="h-5 w-5" />
            {HERO.trust}
          </p>
        </div>
      </section>

      <ShuffleProvider mode="free">
        <section aria-labelledby="idea-machine-title" className={`${SECTION} scroll-mt-24 pt-8`} id="ideas">
          <h2 id="idea-machine-title" className="sr-only">
            Idea machine
          </h2>
          <IdeaMachine aiHref={`${POST_CREATOR.path}#pricing`} />
          <div className="mt-6">
            <SavedList />
          </div>
        </section>

        <section aria-labelledby="how-title" className={`${SECTION} pt-14`}>
          <h2 id="how-title" className={H2}>
            How it works
          </h2>
          <ol className="mt-5 space-y-4">
            {HOW_IT_WORKS.map((step, i) => (
              <li key={step.title} className="tool-step">
                <span className="tool-step-num" aria-hidden="true">
                  {i + 1}
                </span>
                <span className="pt-0.5">
                  <strong className="block text-[17px] text-[var(--heading)]">{step.title}</strong>
                  <span className="mt-0.5 block text-[15px] leading-relaxed text-[var(--muted)]">{step.body}</span>
                </span>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="plan-title" id="plan" className={`${SECTION} scroll-mt-24 pt-14`}>
          <h2 id="plan-title" className={H2}>
            {PLAN_SECTION.title}
          </h2>
          <div className="mt-2">
            <PlanMonth />
          </div>
        </section>
      </ShuffleProvider>

      <section aria-labelledby="compare-title" className={`${SECTION} pt-14`}>
        <h2 id="compare-title" className={H2}>
          {COMPARE_HEADS.title}
        </h2>
        <div className="mt-5 overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--panel)]">
          <table className="w-full table-fixed border-collapse text-left text-[15px] leading-snug">
            <thead>
              <tr className="bg-[var(--fill-2)]">
                <th scope="col" className="w-1/2 px-4 py-3 text-[13px] font-extrabold uppercase tracking-[0.1em] text-[var(--muted)]">
                  {COMPARE_HEADS.free}
                </th>
                <th scope="col" className="w-1/2 px-4 py-3 text-[13px] font-extrabold uppercase tracking-[0.1em] text-[var(--blue)]">
                  {COMPARE_HEADS.paid}
                </th>
              </tr>
            </thead>
            {COMPARE_ROWS.map((row) => (
              <tbody key={row.label} className="border-t border-[var(--line)]">
                <tr>
                  <th scope="rowgroup" colSpan={2} className="px-4 pt-3 text-[15px] font-extrabold text-[var(--heading)]">
                    {row.label}
                  </th>
                </tr>
                <tr>
                  <td className="px-4 pb-3 pt-1 align-top text-[var(--text)]">{row.free}</td>
                  <td className="px-4 pb-3 pt-1 align-top text-[var(--text)]">{row.paid}</td>
                </tr>
              </tbody>
            ))}
          </table>
        </div>
      </section>

      <section aria-labelledby="free-title" className={`${SECTION} pt-14`}>
        <h2 id="free-title" className={H2}>
          {UNLIMITED_TITLE}
        </h2>
        <div className="mt-4 space-y-3 text-[16px] leading-relaxed text-[var(--text)]">
          <p>{unlimitedBody(EXAMPLE_SPACE.coreCount)}</p>
          <p>{aiNotUnlimited()}</p>
          <p className="text-[15px] text-[var(--muted)]">{UNLIMITED_FINE_PRINT}</p>
        </div>
      </section>

      <section id="pricing" aria-label="Pricing" className={`${SECTION} scroll-mt-24 pt-14`}>
        <PricingCards salesOpen={salesOpen} aiOn={aiOn} cancelled={cancelled} />
      </section>

      <section aria-labelledby="faq-title" className={`${SECTION} pt-14`}>
        <h2 id="faq-title" className={H2}>
          Questions people ask
        </h2>
        <div className="mt-5 space-y-3">
          {FAQS.map((f) => (
            <details key={f.q} className="group rounded-xl border border-[var(--line)] bg-[var(--panel)]">
              <summary className="flex min-h-[48px] cursor-pointer list-none items-center gap-3 px-4 py-3 text-[16px] font-extrabold text-[var(--heading)] [&::-webkit-details-marker]:hidden">
                <span className="flex-1">{f.q}</span>
                <ChevronDown aria-hidden="true" className="h-5 w-5 flex-none text-[var(--muted)] group-open:rotate-180 motion-safe:transition-transform" />
              </summary>
              <div className="px-4 pb-4 text-[15px] leading-relaxed text-[var(--text)]">
                <p>{f.a}</p>
                {f.link ? (
                  <Link href={f.link.href} className="mt-1 inline-flex min-h-[44px] items-center gap-1.5 font-bold text-[var(--blue)] underline underline-offset-4">
                    {f.link.label}
                    <ArrowRight aria-hidden="true" className="h-4 w-4" />
                  </Link>
                ) : null}
              </div>
            </details>
          ))}
        </div>
      </section>

      <section aria-label="Before you post" className={`${SECTION} pt-14`}>
        <div className="tool-disclaimer space-y-3 text-[15px] leading-relaxed text-[var(--text)]">
          <p>{POST_CREATOR_DISCLAIMER}</p>
          <p>{FILTER_LINE}</p>
          <p className="flex flex-wrap gap-x-5">
            <Link href={POST_CREATOR.termsPath} className="inline-flex min-h-[44px] items-center font-bold text-[var(--blue)] underline underline-offset-4">
              Read the terms
            </Link>
            <Link href={POST_CREATOR.appPath} className="inline-flex min-h-[44px] items-center font-bold text-[var(--blue)] underline underline-offset-4">
              Already a buyer? Open your Post Creator
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
